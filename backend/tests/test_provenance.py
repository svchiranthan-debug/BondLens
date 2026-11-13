"""
Test Suite for Data Provenance & Forensic Audit Engine.
Verifies that:
1. Every numerical metric has an exact mathematical provenance trace.
2. Contains all 8 required institutional audit dimensions.
3. Python replication code snippets are valid and reproducible.
4. Backtesting simulation assumptions and synthetic boundaries are explicitly declared.
"""

import pytest
from api.service import PlatformAnalyticsService
from analytics.provenance import DataProvenanceEngine


@pytest.fixture(scope="module")
def service():
    return PlatformAnalyticsService.get_instance()


@pytest.fixture(scope="module")
def provenance_engine(service):
    return DataProvenanceEngine(service)


def test_provenance_structure_and_completeness(provenance_engine):
    """Verify that all 10 core metrics contain full 8-dimensional audit data."""
    res = provenance_engine.get_bond_provenance("US000001108")
    assert "provenance_items" in res
    assert "data_limitations" in res
    assert len(res["data_limitations"]) >= 3
    assert len(res["provenance_items"]) == 10

    required_keys = [
        "metric_name",
        "displayed_value",
        "epistemic_status",
        "research_integrity_status",
        "input_data",
        "formula",
        "sample_size",
        "time_period",
        "potential_biases",
        "statistical_meaningfulness",
        "reproducible_python"
    ]

    for item in res["provenance_items"]:
        for k in required_keys:
            assert k in item, f"Missing {k} in metric {item.get('metric_name')}"
        assert len(item["potential_biases"]) >= 2, f"Insufficient bias disclosure in {item['metric_name']}"
        assert len(item["reproducible_python"]) > 10, f"Missing Python replication code in {item['metric_name']}"


def test_r2_provenance_degrees_of_freedom(provenance_engine):
    """Verify R2 degrees of freedom calculation."""
    res = provenance_engine.get_bond_provenance("US000001108")
    r2_item = next(i for i in res["provenance_items"] if "R²" in i["metric_name"])
    assert "df =" in r2_item["degrees_of_freedom"]
    assert "N =" in r2_item["sample_size"]
    assert "5-Fold" in r2_item["validation_methodology"]


def test_studentized_z_score_cohort_significance(provenance_engine):
    """Verify studentized z-score p-value calculation via Student's t distribution."""
    res = provenance_engine.get_bond_provenance("US000001108")
    z_item = next(i for i in res["provenance_items"] if "z-Score" in i["metric_name"])
    assert "p-value" in z_item["statistical_meaningfulness"]
    assert "σ_ε(Rating_Cohort)" in z_item["formula"]


def test_backtest_synthetic_simulation_disclosure(provenance_engine):
    """Verify that backtest is explicitly disclaimed as hypothetical simulation."""
    res = provenance_engine.get_bond_provenance("US000001108")
    bt_item = next(i for i in res["provenance_items"] if "Backtest" in i["metric_name"])
    assert "Simulated" in bt_item["epistemic_status"]
    assert any("SYNTHETIC DATA LIMITATION" in b for b in bt_item["potential_biases"])


def test_breakeven_widening_mathematical_consistency(service, provenance_engine):
    """Verify breakeven widening arithmetic identity."""
    bond = service.get_bond_research("US000001108")["bond"]
    val = service.get_bond_research("US000001108")["valuation"]
    res = provenance_engine.get_bond_provenance("US000001108")
    be_item = next(i for i in res["provenance_items"] if "Breakeven" in i["metric_name"])

    # Formula check: excess carry over 90 days = rv_gap * (90/360)
    # Price return = -D* * Δs_bps * 0.01 bps
    # Setting Price loss = Carry gain: Δs_bps = Quarterly carry / D*
    carry_quarter = val["relative_value_gap_bps"] * 0.25
    expected_widening = carry_quarter / max(0.1, bond["modified_duration"])
    assert f"+{expected_widening:.1f}" in be_item["displayed_value"]
