"""
Peer Group Construction Engine.
Identifies economically comparable bonds using multi-attribute distance metrics
(Rating notch, Sector, Duration, Maturity, Liquidity, Seniority).
Produces transparent similarity scores and explicit human-readable selection rationales.
"""

from typing import List, Dict, Any, Optional
import numpy as np


class PeerGroupEngine:
    """
    Selects and ranks comparable peers for any target bond using configurable multi-attribute distance.
    """
    def __init__(self, all_bonds: List[Dict[str, Any]]):
        self.all_bonds = all_bonds

    def find_peers(
        self,
        target_isin: str,
        max_peers: int = 10,
        same_sector_only: bool = False,
        max_rating_notch_diff: int = 2,
        weight_rating: float = 0.35,
        weight_sector: float = 0.25,
        weight_duration: float = 0.20,
        weight_liquidity: float = 0.10,
        weight_maturity: float = 0.10
    ) -> Dict[str, Any]:
        target = next((b for b in self.all_bonds if b["isin"] == target_isin), None)
        if not target:
            raise ValueError(f"Target bond ISIN {target_isin} not found in universe.")

        candidates = [b for b in self.all_bonds if b["isin"] != target_isin]

        # Normalization ranges across universe
        max_notch_span = max(1.0, float(max(b["rating_notch"] for b in self.all_bonds) - min(b["rating_notch"] for b in self.all_bonds)))
        max_dur_span = max(1.0, float(max(b["modified_duration"] for b in self.all_bonds) - min(b["modified_duration"] for b in self.all_bonds)))
        max_mat_span = max(1.0, float(max(b["maturity_years"] for b in self.all_bonds) - min(b["maturity_years"] for b in self.all_bonds)))
        max_liq_span = 100.0

        scored_peers = []

        for b in candidates:
            notch_diff = abs(b["rating_notch"] - target["rating_notch"])
            if max_rating_notch_diff is not None and notch_diff > max_rating_notch_diff:
                continue

            is_same_sector = (b["sector"] == target["sector"])
            if same_sector_only and not is_same_sector:
                continue

            is_same_issuer = (b["issuer"] == target["issuer"])
            
            # Gower distance components [0, 1]
            d_rating = notch_diff / max_notch_span
            d_sector = 0.0 if is_same_sector else 1.0
            d_duration = abs(b["modified_duration"] - target["modified_duration"]) / max_dur_span
            d_maturity = abs(b["maturity_years"] - target["maturity_years"]) / max_mat_span
            d_liquidity = abs(b.get("liquidity_score", 50) - target.get("liquidity_score", 50)) / max_liq_span

            # Composite weighted distance
            weights_sum = weight_rating + weight_sector + weight_duration + weight_liquidity + weight_maturity
            norm_w_r = weight_rating / weights_sum
            norm_w_s = weight_sector / weights_sum
            norm_w_d = weight_duration / weights_sum
            norm_w_l = weight_liquidity / weights_sum
            norm_w_m = weight_maturity / weights_sum

            composite_dist = (
                norm_w_r * d_rating +
                norm_w_s * d_sector +
                norm_w_d * d_duration +
                norm_w_l * d_liquidity +
                norm_w_m * d_maturity
            )

            similarity_score = max(0.0, round((1.0 - composite_dist) * 100.0, 1))

            # Build explicit explainable selection rationale
            reasons = []
            if is_same_issuer:
                reasons.append("Same Issuer Curve")
            elif is_same_sector:
                reasons.append(f"Same Sector ({b['sector']})")
            else:
                reasons.append(f"Sector: {b['sector']}")

            if notch_diff == 0:
                reasons.append(f"Identical Rating ({b['rating']})")
            elif notch_diff == 1:
                reasons.append(f"Adjacent Rating ({b['rating']})")
            else:
                reasons.append(f"Rating {b['rating']} (Δ{notch_diff} notches)")

            dur_diff = b["modified_duration"] - target["modified_duration"]
            reasons.append(f"Dur Δ {dur_diff:+.1f}y")

            spread_diff = b["credit_spread_bps"] - target["credit_spread_bps"]

            peer_entry = {
                **b,
                "similarity_score": similarity_score,
                "composite_distance": round(composite_dist, 4),
                "rating_notch_diff": notch_diff,
                "duration_diff": round(dur_diff, 2),
                "spread_diff_bps": round(spread_diff, 1),
                "is_same_sector": is_same_sector,
                "selection_rationale": " • ".join(reasons)
            }
            scored_peers.append(peer_entry)

        # Sort by similarity descending
        scored_peers.sort(key=lambda x: x["similarity_score"], reverse=True)
        top_peers = scored_peers[:max_peers]

        # Aggregate peer group metrics
        if top_peers:
            peer_spreads = [p["credit_spread_bps"] for p in top_peers]
            peer_durations = [p["modified_duration"] for p in top_peers]
            peer_ytms = [p["ytm_pct"] for p in top_peers]
            peer_median_spread = float(np.median(peer_spreads))
            peer_mean_spread = float(np.mean(peer_spreads))
            peer_spread_std = float(np.std(peer_spreads)) if len(peer_spreads) > 1 else 0.0
            spread_gap_vs_median = round(target["credit_spread_bps"] - peer_median_spread, 1)
        else:
            peer_median_spread = target["credit_spread_bps"]
            peer_mean_spread = target["credit_spread_bps"]
            peer_spread_std = 0.0
            spread_gap_vs_median = 0.0
            peer_durations = [target["modified_duration"]]
            peer_ytms = [target["ytm_pct"]]

        return {
            "target_bond": target,
            "peer_count": len(top_peers),
            "peer_group_stats": {
                "median_spread_bps": round(peer_median_spread, 1),
                "mean_spread_bps": round(peer_mean_spread, 1),
                "spread_std_bps": round(peer_spread_std, 1),
                "min_spread_bps": round(min(p["credit_spread_bps"] for p in top_peers), 1) if top_peers else target["credit_spread_bps"],
                "max_spread_bps": round(max(p["credit_spread_bps"] for p in top_peers), 1) if top_peers else target["credit_spread_bps"],
                "median_duration": round(float(np.median(peer_durations)), 2),
                "median_ytm_pct": round(float(np.median(peer_ytms)), 2),
                "spread_gap_vs_median_bps": spread_gap_vs_median,
            },
            "parameters": {
                "same_sector_only": same_sector_only,
                "max_rating_notch_diff": max_rating_notch_diff,
                "weights": {
                    "rating": weight_rating,
                    "sector": weight_sector,
                    "duration": weight_duration,
                    "liquidity": weight_liquidity,
                    "maturity": weight_maturity
                }
            },
            "peers": top_peers
        }
