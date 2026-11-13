"""
Platform Analytical Coordinator Service.
Integrates universe data, data quality auditing, pricing analytics,
benchmark curves, peer group engine, fair value models, transparent RV scoring,
stress testing, and backtesting.
"""

from typing import List, Dict, Any, Optional
from datetime import date
import numpy as np

from data.universe import BondUniverseRepository
from data.validation import DataQualityEngine
from curves.benchmark import BenchmarkCurve
from curves.nelson_siegel import NelsonSiegelModel
from peer_group.engine import PeerGroupEngine
from valuation.fair_value import FairValueEngine
from relative_value.scoring import RelativeValueScoringEngine, DEFAULT_SCORING_WEIGHTS
from relative_value.decomposition import SpreadDecompositionEngine
from relative_value.surface_3d import Surface3DEngine
from risk.stress_testing import StressTestingEngine
from backtesting.engine import WalkForwardBacktestEngine
from analytics.provenance import DataProvenanceEngine


class PlatformAnalyticsService:
    """
    Singleton platform coordinator managing analytical state and pipelines.
    """
    _instance: Optional["PlatformAnalyticsService"] = None

    def __init__(self):
        self.repo = BondUniverseRepository.get_instance()
        self.raw_bonds = self.repo.get_all_bonds()
        self.benchmark_curve = self.repo.benchmark_curve
        
        # 1. Run Data Quality Audit
        self.data_quality_engine = DataQualityEngine(self.raw_bonds)
        self.data_quality_report = self.data_quality_engine.run_full_audit()

        # 2. Peer Group Engine
        self.peer_engine = PeerGroupEngine(self.raw_bonds)

        # 3. Fair Value Engine
        self.fair_value_engine = FairValueEngine(self.raw_bonds)

        # 4. Relative Value Scoring Engine
        self.scoring_engine = RelativeValueScoringEngine()

        # 5. Spread Decomposition Engine
        self.decomposition_engine = SpreadDecompositionEngine(self.raw_bonds)

        # 6. Stress Testing Engine
        self.stress_engine = StressTestingEngine()

        # 7. Backtesting Engine
        self.backtest_engine = WalkForwardBacktestEngine()

        # Pre-compute relative value evaluations across entire universe
        self.enriched_bonds: List[Dict[str, Any]] = []
        self._enrich_universe()

        # 8. 3D Surface Engine
        self.surface_engine = Surface3DEngine(self.enriched_bonds)

        # 9. Data Provenance & Forensic Audit Engine
        self.provenance_engine = DataProvenanceEngine(self)

    @classmethod
    def get_instance(cls) -> "PlatformAnalyticsService":
        if cls._instance is None:
            cls._instance = PlatformAnalyticsService()
        return cls._instance

    def _enrich_universe(self):
        self.enriched_bonds = []
        for b in self.raw_bonds:
            # Model fair value
            val_eval = self.fair_value_engine.evaluate_bond_fair_spread(b)
            # RV Score
            score_eval = self.scoring_engine.calculate_score(val_eval, b)

            enriched = {
                **b,
                "fair_spread_bps": val_eval["fair_spread_bps"],
                "relative_value_gap_bps": val_eval["relative_value_gap_bps"],
                "net_realizable_gap_bps": val_eval["net_realizable_gap_bps"],
                "is_liquidity_trap": val_eval["is_liquidity_trap"],
                "cohort_standard_error_bps": val_eval["cohort_standard_error_bps"],
                "rating_cohort": val_eval["rating_cohort"],
                "z_score": val_eval["z_score"],
                "classification": val_eval["classification"],
                "tone": val_eval["tone"],
                "model_confidence_score": val_eval["model_confidence_score"],
                "relative_value_score": score_eval["relative_value_score"],
                "liquidity_adjusted_score": score_eval["liquidity_adjusted_score"],
                "main_reason": score_eval["main_reason"],
                "main_risk": score_eval["main_risk"],
                "scoring_breakdown": score_eval
            }
            self.enriched_bonds.append(enriched)

        self._enriched_map = {b["isin"]: b for b in self.enriched_bonds}

    def get_overview_metrics(self) -> Dict[str, Any]:
        total = len(self.enriched_bonds)
        cheap_bonds = [b for b in self.enriched_bonds if "Cheap" in b["classification"]]
        rich_bonds = [b for b in self.enriched_bonds if "Rich" in b["classification"]]
        fair_bonds = [b for b in self.enriched_bonds if b["classification"] == "Fairly Valued"]

        spreads = [b["credit_spread_bps"] for b in self.enriched_bonds]
        rv_gaps = [b["relative_value_gap_bps"] for b in self.enriched_bonds]
        liq_scores = [b["liquidity_score"] for b in self.enriched_bonds]

        sorted_by_score = sorted(self.enriched_bonds, key=lambda x: x["relative_value_score"], reverse=True)
        top_opportunities = sorted_by_score[:5]
        worst_opportunities = sorted_by_score[-5:][::-1]

        # Sector breakdown
        sectors = sorted(list(set(b["sector"] for b in self.enriched_bonds)))
        sector_stats = []
        for s in sectors:
            s_bonds = [b for b in self.enriched_bonds if b["sector"] == s]
            sector_stats.append({
                "sector": s,
                "bond_count": len(s_bonds),
                "avg_spread_bps": round(float(np.mean([b["credit_spread_bps"] for b in s_bonds])), 1),
                "avg_rv_score": round(float(np.mean([b["relative_value_score"] for b in s_bonds])), 1),
                "cheap_count": sum(1 for b in s_bonds if "Cheap" in b["classification"]),
                "rich_count": sum(1 for b in s_bonds if "Rich" in b["classification"]),
            })

        return {
            "total_bonds_analyzed": total,
            "potentially_cheap_count": len(cheap_bonds),
            "potentially_rich_count": len(rich_bonds),
            "fairly_valued_count": len(fair_bonds),
            "median_credit_spread_bps": round(float(np.median(spreads)), 1),
            "median_rv_gap_bps": round(float(np.median(rv_gaps)), 1),
            "average_liquidity_score": round(float(np.mean(liq_scores)), 1),
            "data_health": {
                "status": self.data_quality_report["status"],
                "health_score": self.data_quality_report["data_health_score"],
                "critical_issues": self.data_quality_report["critical_issues"],
                "warning_issues": self.data_quality_report["warning_issues"],
            },
            "top_opportunities": top_opportunities,
            "worst_opportunities": worst_opportunities,
            "sector_stats": sector_stats
        }

    def get_all_bonds(
        self,
        sector: Optional[str] = None,
        rating_bucket: Optional[str] = None,
        min_rv_score: Optional[float] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        results = self.enriched_bonds
        if sector and sector != "All":
            results = [b for b in results if b["sector"] == sector]
        if rating_bucket and rating_bucket != "All":
            if rating_bucket == "IG":
                results = [b for b in results if b["rating_notch"] <= 10]
            elif rating_bucket == "HY":
                results = [b for b in results if b["rating_notch"] > 10]
            else:
                results = [b for b in results if b["rating"] == rating_bucket]
        if min_rv_score is not None:
            results = [b for b in results if b["relative_value_score"] >= min_rv_score]
        if search:
            q = search.lower()
            results = [b for b in results if q in b["isin"].lower() or q in b["issuer"].lower() or q in b["sector"].lower()]
        return results

    def get_bond_research(self, isin: str) -> Optional[Dict[str, Any]]:
        bond = self._enriched_map.get(isin)
        if not bond:
            return None

        # Peer analysis
        peer_res = self.peer_engine.find_peers(isin, max_peers=8)

        # Fair value valuation
        val_eval = self.fair_value_engine.evaluate_bond_fair_spread(bond)

        # Factor decomposition and analyst memo
        decomp = self.decomposition_engine.decompose(bond, val_eval, peer_res)

        # Stress testing
        stress = self.stress_engine.generate_stress_matrix(bond)

        # Yield curve points (Benchmark curve + sector/peers)
        bench_pts = self.benchmark_curve.generate_curve_points(num_points=40, max_years=30.0)

        return {
            "bond": bond,
            "peers": peer_res,
            "valuation": val_eval,
            "decomposition": decomp,
            "stress_testing": stress,
            "benchmark_curve": {
                "points": bench_pts,
                "current_bond_benchmark_yield": bond["benchmark_yield_pct"]
            }
        }

    def get_provenance(self, isin: Optional[str] = None) -> Dict[str, Any]:
        target = isin or "US000001108"
        return self.provenance_engine.get_bond_provenance(target)
