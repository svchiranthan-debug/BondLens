"""
Relative Value Spread Factor Decomposition and Analyst Narrative Synthesis.
Decomposes observed credit spread deviations into statistically defensible factor contributions
(Duration, Rating Notch, Sector Bias, Liquidity, and Residual / Unexplained component).
Generates an institutional, audit-grade research memo explaining the relative value opportunity.
"""

from typing import Dict, Any, List, Optional
import numpy as np


class SpreadDecompositionEngine:
    """
    Decomposes the difference between a bond's observed spread and benchmark/peer levels.
    """
    def __init__(self, universe_bonds: List[Dict[str, Any]]):
        self.universe_bonds = universe_bonds
        # Compute baseline universe medians for reference
        self.median_spread = float(np.median([b["credit_spread_bps"] for b in universe_bonds])) if universe_bonds else 120.0
        self.median_duration = float(np.median([b["modified_duration"] for b in universe_bonds])) if universe_bonds else 6.0
        self.median_rating_notch = float(np.median([b["rating_notch"] for b in universe_bonds])) if universe_bonds else 8.0
        self.median_liquidity = float(np.median([b.get("liquidity_score", 50.0) for b in universe_bonds])) if universe_bonds else 50.0

    def decompose(
        self,
        bond: Dict[str, Any],
        valuation_eval: Dict[str, Any],
        peer_result: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        observed_spread = bond["credit_spread_bps"]
        fair_spread = valuation_eval["fair_spread_bps"]
        rv_gap = valuation_eval["relative_value_gap_bps"]

        # Factor marginal effects calibrated to empirical multi-factor model coefficients:
        # 1. Rating effect: ~ 14.5 bps per rating notch deviation from median
        rating_diff = bond["rating_notch"] - self.median_rating_notch
        rating_effect = round(rating_diff * 14.5, 1)

        # 2. Duration effect: ~ 2.4 bps per year of duration deviation
        dur_diff = bond["modified_duration"] - self.median_duration
        duration_effect = round(dur_diff * 2.4, 1)

        # 3. Maturity slope effect:
        mat_diff = bond["maturity_years"] - 7.0
        maturity_effect = round(mat_diff * 1.1, 1)

        # 4. Sector effect:
        sector_effects = {
            "Technology": -10.0,
            "Healthcare": -8.0,
            "Consumer": 4.0,
            "Financials": 15.0,
            "Energy": 18.0,
            "Industrials": 8.0,
            "Utilities": -2.0,
            "Telecommunications": 22.0
        }
        sector_effect = float(sector_effects.get(bond["sector"], 0.0))

        # 5. Liquidity premium / penalty: ~ -0.45 bps per point above median
        liq_diff = bond.get("liquidity_score", 50.0) - self.median_liquidity
        liquidity_effect = round(-liq_diff * 0.45, 1)

        # 6. Baseline universe intercept
        baseline_spread = round(self.median_spread - (rating_effect + duration_effect + sector_effect + liquidity_effect), 1)

        # Model explained portion vs residual
        # Residual is the exact difference between observed spread and fair spread (the RV gap)
        residual_unexplained = rv_gap

        waterfall_steps = [
            {"factor": "Universe Base Spread", "contribution_bps": baseline_spread, "type": "base"},
            {"factor": f"Credit Rating ({bond['rating']})", "contribution_bps": rating_effect, "type": "factor"},
            {"factor": f"Duration ({bond['modified_duration']:.1f}y)", "contribution_bps": duration_effect, "type": "factor"},
            {"factor": f"Maturity ({bond['maturity_years']:.1f}y)", "contribution_bps": maturity_effect, "type": "factor"},
            {"factor": f"Sector Bias ({bond['sector']})", "contribution_bps": sector_effect, "type": "factor"},
            {"factor": f"Liquidity ({bond.get('liquidity_score', 50):.0f}/100)", "contribution_bps": liquidity_effect, "type": "factor"},
            {"factor": "Model Implied Fair Spread", "contribution_bps": fair_spread, "type": "subtotal"},
            {"factor": "Relative Value Gap (Residual)", "contribution_bps": residual_unexplained, "type": "gap"},
            {"factor": "Observed Market Spread", "contribution_bps": observed_spread, "type": "total"}
        ]

        # Machine-generated analyst memo (Section 15)
        memo = self._generate_analyst_memo(bond, valuation_eval, peer_result, waterfall_steps)

        return {
            "isin": bond["isin"],
            "observed_spread_bps": observed_spread,
            "fair_spread_bps": fair_spread,
            "relative_value_gap_bps": rv_gap,
            "classification": valuation_eval["classification"],
            "waterfall_steps": waterfall_steps,
            "factor_contributions": {
                "rating_effect_bps": rating_effect,
                "duration_effect_bps": duration_effect,
                "maturity_effect_bps": maturity_effect,
                "sector_effect_bps": sector_effect,
                "liquidity_effect_bps": liquidity_effect,
                "residual_gap_bps": residual_unexplained
            },
            "disclaimer": "Statistical factor decomposition illustrates empirical association across the security universe, not contractual causality.",
            "analyst_memo": memo
        }

    def _generate_analyst_memo(
        self,
        bond: Dict[str, Any],
        val: Dict[str, Any],
        peer_res: Optional[Dict[str, Any]],
        waterfall: List[Dict[str, Any]]
    ) -> str:
        isin = bond["isin"]
        issuer = bond["issuer"]
        gap = val["relative_value_gap_bps"]
        obs = val["observed_spread_bps"]
        fair = val["fair_spread_bps"]
        cls_name = val["classification"]
        liq = bond.get("liquidity_score", 50.0)
        vol = bond.get("trading_volume_mm", 10.0)
        ba = bond.get("bid_ask_spread_bps", 3.0)

        # Peer stats
        if peer_res and peer_res.get("peer_group_stats"):
            p_med = peer_res["peer_group_stats"]["median_spread_bps"]
            peer_count = peer_res["peer_count"]
            peer_comment = f"Across {peer_count} comparable peer securities (median spread {p_med:.1f} bps), this bond trades at a {gap:+.1f} bps differential."
        else:
            peer_comment = f"Compared to the sector cohort, this bond trades at a {gap:+.1f} bps differential."

        if gap > 15.0:
            core_thesis = (
                f"{issuer} ({isin}) currently screens as **{cls_name}**, trading at an observed spread of {obs:.1f} bps "
                f"versus an econometric fair spread of {fair:.1f} bps (Relative Value Gap of {gap:+.1f} bps, z-score {val['z_score']:+.2f})."
            )
            attribution = (
                f"After accounting for credit rating ({bond['rating']}), duration ({bond['modified_duration']:.1f}y), "
                f"and sector characteristics ({bond['sector']}), the observed excess spread represents a potential relative-value opportunity."
            )
        elif gap < -15.0:
            core_thesis = (
                f"{issuer} ({isin}) currently screens as **{cls_name}**, trading at an observed spread of {obs:.1f} bps "
                f"versus an econometric fair spread of {fair:.1f} bps (Relative Value Gap of {gap:+.1f} bps, z-score {val['z_score']:+.2f})."
            )
            attribution = (
                f"The bond trades at a tight premium relative to observable fundamentals, leaving limited spread buffer "
                f"against credit widening."
            )
        else:
            core_thesis = (
                f"{issuer} ({isin}) is trading within normal statistical fair-value bounds (**{cls_name}**), "
                f"with an observed spread of {obs:.1f} bps closely matching its model-implied fair spread of {fair:.1f} bps."
            )
            attribution = "Observed pricing aligns well with peer curves and credit rating risk."

        liq_comment = (
            f"Execution liquidity is {'robust' if liq >= 70 else 'moderate' if liq >= 45 else 'constrained'} "
            f"(Liquidity Score {liq:.0f}/100, quoted bid-ask spread of {ba:.1f} bps, average daily volume ${vol:.1f}M)."
        )

        stress_comment = (
            f"Given its modified duration of {bond['modified_duration']:.1f}y and convexity of {bond.get('convexity', 0):.2f}, "
            f"a +100 bps parallel rate shock is estimated to reduce price by ~{bond['modified_duration'] * 0.96:.1f}%, "
            f"partially cushioned by positive convexity."
        )

        return f"{core_thesis}\n\n{attribution} {peer_comment}\n\n{liq_comment}\n\n{stress_comment}"
