"""
Transparent Risk-Adjusted Relative Value Scoring Engine.
Addresses senior analyst audit points:
1. Eliminates raw AAA credit bias: credit component measures spread buffer against downgrade risk rather than granting free points for high-grade issuers.
2. Direct integration of Net Realizable Spread Gap (after bid-ask crossing cost).
3. Explicit identification and penalization of Liquidity Traps.
4. Configurable weights with complete mathematical transparency.
"""

from typing import Dict, Any, List, Optional
import numpy as np


DEFAULT_SCORING_WEIGHTS = {
    "valuation_gap": 0.40,
    "net_liquidity": 0.25,
    "credit_resilience": 0.20,
    "model_confidence": 0.15
}


class RelativeValueScoringEngine:
    """
    Computes transparent, risk-adjusted Relative Value scores [0 to 100].
    """
    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or DEFAULT_SCORING_WEIGHTS

    def calculate_score(
        self,
        valuation_eval: Dict[str, Any],
        bond: Dict[str, Any],
        peer_stats: Optional[Dict[str, Any]] = None,
        weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        w = weights or self.weights
        total_w = sum(w.values())
        w_val = w.get("valuation_gap", 0.40) / total_w
        w_liq = w.get("net_liquidity", 0.25) / total_w
        w_cred = w.get("credit_resilience", 0.20) / total_w
        w_conf = w.get("model_confidence", 0.15) / total_w

        # 1. Valuation Gap Component (0 to 100) based on studentized cohort z-score
        z_score = valuation_eval.get("z_score", 0.0)
        # z = 0 -> 50, z = +2.0 -> 90, z = -2.0 -> 10
        val_score = float(np.clip(50.0 + (z_score * 20.0), 0.0, 100.0))

        # 2. Net Liquidity Component (0 to 100)
        # Combines secondary liquidity score with Net Realizable Gap
        base_liq = float(bond.get("liquidity_score", 50.0))
        net_gap = valuation_eval.get("net_realizable_gap_bps", valuation_eval.get("relative_value_gap_bps", 0.0))
        is_trap = valuation_eval.get("is_liquidity_trap", False)
        
        # If net realizable gap is negative despite positive gross gap, penalize
        if is_trap:
            net_liq_score = max(10.0, base_liq * 0.5)
        else:
            net_liq_score = base_liq

        # 3. Credit Resilience / Spread Cushion Component (0 to 100)
        # Measures spread buffer over expected default/loss rates for that rating notch
        # Rather than blindly giving AAA 100 points, it evaluates how well the spread compensates for rating-specific volatility
        rating_notch = bond.get("rating_notch", 8)
        observed_spread = bond.get("credit_spread_bps", 100.0)
        
        # Approximate historical expected credit loss in bps by rating:
        # AAA ~ 2 bps, A ~ 10 bps, BBB ~ 30 bps, BB ~ 110 bps, B ~ 320 bps
        expected_loss_bps = float(1.5 + (rating_notch ** 2.2) * 0.5)
        spread_to_loss_ratio = observed_spread / max(1.0, expected_loss_bps)
        # Ratio >= 3.5 -> 100, Ratio <= 1.0 -> 20
        credit_resilience_score = float(np.clip(20.0 + (spread_to_loss_ratio - 1.0) * 32.0, 10.0, 100.0))

        # 4. Model Confidence & Peer Dispersion Component (0 to 100)
        base_confidence = valuation_eval.get("model_confidence_score", 75.0)
        if peer_stats and peer_stats.get("spread_std_bps", 0) > 40.0:
            dispersion_penalty = min(20.0, (peer_stats["spread_std_bps"] - 40.0) * 0.4)
            confidence_score = max(30.0, base_confidence - dispersion_penalty)
        else:
            confidence_score = base_confidence

        # Composite score
        composite_score = (
            w_val * val_score +
            w_liq * net_liq_score +
            w_cred * credit_resilience_score +
            w_conf * confidence_score
        )
        composite_score = round(float(composite_score), 1)

        # Liquidity-adjusted opportunity score
        if is_trap:
            liquidity_adjusted_score = round(min(composite_score, 45.0), 1)
        else:
            liquidity_adjusted_score = composite_score

        # Driver and Risk Identification
        reasons = []
        risks = []

        if is_trap:
            cost_bps = valuation_eval.get('bid_ask_spread_cost_bps', bond.get('bid_ask_spread_cost_bps', 0.0))
            risks.append(f"LIQUIDITY TRAP: Gross gap +{valuation_eval['relative_value_gap_bps']:.1f} bps wiped out by {cost_bps:.1f} bps bid-ask cost")
        elif net_gap > 12.0:
            reasons.append(f"Net realizable gap +{net_gap:.1f} bps excess spread after bid-ask crossing costs")
        elif z_score < -1.0:
            reasons.append(f"Rich valuation: trades {abs(valuation_eval['relative_value_gap_bps']):.1f} bps tighter than model peers")
        else:
            reasons.append("Trades within normal statistical fair-value band")

        if net_liq_score >= 70.0:
            reasons.append(f"Liquid issue (Score {base_liq:.0f}/100, bid-ask spread {bond.get('bid_ask_spread_bps', 0):.1f} bps)")
        else:
            risks.append(f"Constrained liquidity (Score {base_liq:.0f}/100, bid-ask spread cost {valuation_eval.get('bid_ask_spread_cost_bps', 0):.1f} bps)")

        if rating_notch > 10:
            risks.append("Sub-investment grade default & migration risk")
        elif bond.get("modified_duration", 0) > 12.0:
            risks.append(f"High duration exposure (Mod Dur: {bond.get('modified_duration', 0):.1f} yrs)")

        if not risks:
            risks.append("Standard macro credit spread risk")

        return {
            "relative_value_score": composite_score,
            "liquidity_adjusted_score": liquidity_adjusted_score,
            "valuation_gap_component": round(val_score, 1),
            "net_liquidity_component": round(net_liq_score, 1),
            "credit_resilience_component": round(credit_resilience_score, 1),
            "model_confidence_component": round(confidence_score, 1),
            "is_liquidity_trap": is_trap,
            "net_realizable_gap_bps": net_gap,
            "weights_used": {
                "valuation_gap": round(w_val, 2),
                "net_liquidity": round(w_liq, 2),
                "credit_resilience": round(w_cred, 2),
                "model_confidence": round(w_conf, 2)
            },
            "main_reason": reasons[0] if reasons else "Neutral relative value",
            "main_risk": risks[0] if risks else "Standard market risk",
            "all_reasons": reasons,
            "all_risks": risks
        }
