"""
Stress Testing and Scenario Analysis Engine with Exact Interaction Breakdown.
Addresses senior analyst audit points:
1. Exact mathematical decomposition of simultaneous Rate and Spread shocks:
   ΔP / P ≈ -D*(Δr + Δs) + 0.5*C*(Δr + Δs)^2
          = -D*·Δr - D*·Δs + 0.5·C·(Δr)^2 + 0.5·C·(Δs)^2 + C·Δr·Δs
2. Reports pure rate duration, spread duration, pure rate convexity, pure spread convexity,
   and cross-interaction term, ensuring 100% mathematical closure.
"""

from typing import Dict, Any, List, Optional
import numpy as np


class StressTestingEngine:
    """
    Stress-tests individual securities under simultaneous interest rate and credit spread shocks.
    """
    RATE_SHOCKS = [-100, -50, -25, 0, 25, 50, 100, 200]
    SPREAD_SHOCKS = [-50, -25, 0, 25, 50, 100, 200]

    @staticmethod
    def calculate_shock_impact(
        dirty_price: float,
        mod_duration: float,
        convexity: float,
        rate_shock_bps: float,
        spread_shock_bps: float
    ) -> Dict[str, Any]:
        """
        Calculates exact Taylor decomposition and price impact:
        Total shock Δy = Δr + Δs
        Attribution:
          - Rate Duration: -D* · Δr
          - Spread Duration: -D* · Δs
          - Rate Convexity: 0.5 · C · (Δr)^2
          - Spread Convexity: 0.5 · C · (Δs)^2
          - Cross-Convexity: C · Δr · Δs
        """
        dr = rate_shock_bps / 10000.0
        ds = spread_shock_bps / 10000.0
        dy_total = dr + ds

        # Components (expressed in %)
        rate_duration_pct = -mod_duration * dr * 100.0
        spread_duration_pct = -mod_duration * ds * 100.0
        rate_convexity_pct = 0.5 * convexity * (dr ** 2) * 100.0
        spread_convexity_pct = 0.5 * convexity * (ds ** 2) * 100.0
        cross_convexity_pct = convexity * dr * ds * 100.0

        total_pct_change = (
            rate_duration_pct +
            spread_duration_pct +
            rate_convexity_pct +
            spread_convexity_pct +
            cross_convexity_pct
        )

        estimated_price = max(0.0, dirty_price * (1.0 + total_pct_change / 100.0))
        dollar_pnl = estimated_price - dirty_price

        return {
            "rate_shock_bps": rate_shock_bps,
            "spread_shock_bps": spread_shock_bps,
            "total_yield_shock_bps": rate_shock_bps + spread_shock_bps,
            "estimated_price": round(estimated_price, 4),
            "dollar_pnl": round(dollar_pnl, 4),
            "estimated_total_return_pct": round(total_pct_change, 3),
            "attribution": {
                "rate_duration_pct": round(rate_duration_pct, 4),
                "spread_duration_pct": round(spread_duration_pct, 4),
                "rate_convexity_pct": round(rate_convexity_pct, 4),
                "spread_convexity_pct": round(spread_convexity_pct, 4),
                "cross_interaction_pct": round(cross_convexity_pct, 4)
            }
        }

    def generate_stress_matrix(
        self,
        bond: Dict[str, Any],
        rate_shocks: Optional[List[int]] = None,
        spread_shocks: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        r_shocks = rate_shocks or self.RATE_SHOCKS
        s_shocks = spread_shocks or self.SPREAD_SHOCKS

        dirty_p = bond["dirty_price"]
        mod_dur = bond["modified_duration"]
        conv = bond.get("convexity", 0.0)

        matrix = []
        surface_points = []
        z_grid = []

        for s_bps in s_shocks:
            row = []
            z_row = []
            for r_bps in r_shocks:
                impact = self.calculate_shock_impact(dirty_p, mod_dur, conv, r_bps, s_bps)
                row.append(impact)
                z_row.append(impact["estimated_total_return_pct"])
                surface_points.append({
                    "rate_shock_bps": r_bps,
                    "spread_shock_bps": s_bps,
                    "estimated_return_pct": impact["estimated_total_return_pct"],
                    "estimated_price": impact["estimated_price"]
                })
            matrix.append({
                "spread_shock_bps": s_bps,
                "scenarios": row
            })
            z_grid.append(z_row)

        return {
            "isin": bond["isin"],
            "dirty_price": dirty_p,
            "modified_duration": mod_dur,
            "convexity": conv,
            "rate_shocks": r_shocks,
            "spread_shocks": s_shocks,
            "matrix": matrix,
            "surface_3d": {
                "x_rate_shocks": r_shocks,
                "y_spread_shocks": s_shocks,
                "z_return_grid": z_grid,
                "points": surface_points
            }
        }
