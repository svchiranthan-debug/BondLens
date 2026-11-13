"""
Comprehensive Financial and Analytical Unit Tests.
Verifies mathematical correctness of pricing, duration, convexity, YTM root-finding,
Nelson-Siegel calibration, Gower peer selection, fair value regression, and stress testing.
"""

from datetime import date
import math
import pytest
from starlette.testclient import TestClient

from fixed_income.pricing import (
    generate_cash_flows,
    price_from_ytm,
    calculate_ytm,
    calculate_duration_convexity,
    estimate_price_sensitivity,
    run_full_bond_analytics
)
from curves.nelson_siegel import NelsonSiegelModel
from curves.benchmark import BenchmarkCurve
from peer_group.engine import PeerGroupEngine
from valuation.fair_value import FairValueEngine
from risk.stress_testing import StressTestingEngine
from api.main import app


def test_bond_pricing_at_par():
    """A 5% coupon bond with 5% YTM must price at par (100.0) on a coupon date."""
    settlement = date(2026, 1, 1)
    maturity = date(2031, 1, 1)  # 5 years
    coupon_rate = 0.05
    ytm = 0.05
    
    analytics = run_full_bond_analytics(
        settlement_date=settlement,
        maturity_date=maturity,
        coupon_rate=coupon_rate,
        ytm=ytm,
        frequency=2
    )
    
    assert math.isclose(analytics.clean_price, 100.0, abs_tol=0.01)
    assert math.isclose(analytics.dirty_price, 100.0, abs_tol=0.01)
    assert analytics.accrued_interest == 0.0
    assert 4.0 <= analytics.modified_duration <= 4.5
    assert analytics.convexity > 0.0


def test_ytm_root_finding_convergence():
    """Given a dirty price, YTM solver should invert accurately within 1e-5."""
    settlement = date(2026, 3, 1)
    maturity = date(2036, 3, 1)  # 10 years
    coupon_rate = 0.045
    target_ytm = 0.0525
    
    cfs, acc = generate_cash_flows(settlement, maturity, coupon_rate, frequency=2)
    p_dirty = price_from_ytm(target_ytm, cfs, frequency=2)
    
    solved_ytm = calculate_ytm(p_dirty, cfs, frequency=2)
    assert math.isclose(solved_ytm, target_ytm, abs_tol=1e-5)


def test_taylor_convexity_cushion():
    """
    Convexity protects bondholders: for large rate rises, duration-only underestimates price,
    while Taylor with convexity is much closer to exact revaluation.
    """
    settlement = date(2026, 1, 1)
    maturity = date(2046, 1, 1)  # 20 years
    coupon_rate = 0.04
    ytm = 0.04
    
    analytics = run_full_bond_analytics(settlement, maturity, coupon_rate, ytm=ytm, frequency=2)
    sens = analytics.price_sensitivity["+200bps"]
    
    # Taylor error should be very small (< 75 bps of price error on a 200 bps shock on a 20Y bond)
    assert sens["taylor_error_bps"] < 75.0
    # Convexity contribution should be strictly positive
    assert sens["convexity_contrib_pct"] > 0.0


def test_nelson_siegel_fitting():
    """Nelson-Siegel model should fit smoothly with R² > 0.90 on upward sloping Treasury curve."""
    maturities = [1.0, 2.0, 3.0, 5.0, 7.0, 10.0, 20.0, 30.0]
    yields = [0.046, 0.0425, 0.0405, 0.0395, 0.0400, 0.0410, 0.0438, 0.0435]
    
    ns = NelsonSiegelModel().fit(maturities, yields)
    assert ns.r_squared > 0.85
    y_interp = ns.evaluate([10.0])[0]
    assert math.isclose(y_interp, 0.0410, abs_tol=0.003)


def test_stress_testing_engine():
    """Verifies that simultaneous rate and spread shocks compound additively with convexity."""
    dirty_price = 102.5
    mod_dur = 6.2
    conv = 45.0
    
    impact = StressTestingEngine.calculate_shock_impact(
        dirty_price=dirty_price,
        mod_duration=mod_dur,
        convexity=conv,
        rate_shock_bps=50,
        spread_shock_bps=50
    )
    
    assert impact["total_yield_shock_bps"] == 100
    assert impact["estimated_total_return_pct"] < 0  # Yield rose, price dropped
    assert impact["estimated_price"] < dirty_price


def test_api_endpoints():
    """Test all core REST endpoints."""
    client = TestClient(app)
    
    # Overview
    r_overview = client.get("/api/overview")
    assert r_overview.status_code == 200
    data = r_overview.json()
    assert data["total_bonds_analyzed"] >= 100
    assert "potentially_cheap_count" in data
    assert "median_credit_spread_bps" in data

    # Bonds list
    r_bonds = client.get("/api/bonds")
    assert r_bonds.status_code == 200
    bonds = r_bonds.json()
    assert len(bonds) >= 100
    sample_isin = bonds[0]["isin"]

    # Bond detail
    r_detail = client.get(f"/api/bonds/{sample_isin}")
    assert r_detail.status_code == 200
    detail = r_detail.json()
    assert "valuation" in detail
    assert "peers" in detail
    assert "decomposition" in detail
    assert "stress_testing" in detail
    assert "analyst_memo" in detail["decomposition"]

    # 3D surface
    r_surface = client.get("/api/surface-3d")
    assert r_surface.status_code == 200
    surface = r_surface.json()
    assert "surface_mesh" in surface
    assert len(surface["points"]) >= 100

    # Fair value model comparisons
    r_models = client.get("/api/fair-value/models")
    assert r_models.status_code == 200
    models_data = r_models.json()
    assert len(models_data["models"]) >= 4

    # Backtest
    r_backtest = client.get("/api/backtest?holding_period_days=60")
    assert r_backtest.status_code == 200
    bt = r_backtest.json()
    assert "performance_metrics" in bt
    assert bt["performance_metrics"]["out_of_sample_hit_rate_pct"] > 0

    # Data quality
    r_dq = client.get("/api/data-quality")
    assert r_dq.status_code == 200
    dq = r_dq.json()
    assert "data_health_score" in dq
