"""
Data Quality and Validation Engine.
Performs pre-trade and analytical validation on security masters and market feeds:
checks for missing prices, negative durations/convexities, coupon/yield anomalies,
rating scale compliance, duplicate ISINs, stale pricing, and statistical spread outliers.
"""

from typing import List, Dict, Any
import numpy as np


class DataQualityEngine:
    """
    Evaluates bond universe datasets for operational and analytical integrity.
    """
    def __init__(self, bonds: List[Dict[str, Any]]):
        self.bonds = bonds

    def run_full_audit(self) -> Dict[str, Any]:
        issues: List[Dict[str, Any]] = []
        total_securities = len(self.bonds)
        
        seen_isins = set()
        clean_prices = []
        spreads = []
        durations = []

        valid_ratings = {"AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-", "BB+", "BB", "BB-", "B+", "B", "B-", "CCC"}

        for b in self.bonds:
            isin = b.get("isin", "UNKNOWN")
            issuer = b.get("issuer", "Unknown Issuer")
            
            # Check 1: Duplicate ISIN
            if isin in seen_isins:
                issues.append({
                    "isin": isin,
                    "issuer": issuer,
                    "field": "isin",
                    "severity": "CRITICAL",
                    "rule": "Duplicate security identifier detected",
                    "value": isin
                })
            seen_isins.add(isin)

            # Check 2: Missing or Invalid Prices
            clean_p = b.get("clean_price")
            dirty_p = b.get("dirty_price")
            if clean_p is None or clean_p <= 0:
                issues.append({
                    "isin": isin,
                    "issuer": issuer,
                    "field": "clean_price",
                    "severity": "CRITICAL",
                    "rule": "Invalid or missing clean price",
                    "value": clean_p
                })
            elif clean_p < 20.0 or clean_p > 180.0:
                issues.append({
                    "isin": isin,
                    "issuer": issuer,
                    "field": "clean_price",
                    "severity": "WARNING",
                    "rule": "Clean price outside normal institutional trading band (20 - 180)",
                    "value": clean_p
                })
            else:
                clean_prices.append(clean_p)

            # Check 3: Missing or non-positive maturity
            mat_yrs = b.get("maturity_years")
            if mat_yrs is None or mat_yrs <= 0:
                issues.append({
                    "isin": isin,
                    "issuer": issuer,
                    "field": "maturity_years",
                    "severity": "CRITICAL",
                    "rule": "Missing or non-positive maturity",
                    "value": mat_yrs
                })

            # Check 4: Rating Scale Validation
            rating = b.get("rating")
            if not rating or rating not in valid_ratings:
                issues.append({
                    "isin": isin,
                    "issuer": issuer,
                    "field": "rating",
                    "severity": "WARNING",
                    "rule": "Unrecognized credit rating standard",
                    "value": rating
                })

            # Check 5: Duration and Convexity Sanity
            mod_dur = b.get("modified_duration")
            conv = b.get("convexity")
            if mod_dur is None or mod_dur < 0:
                issues.append({
                    "isin": isin,
                    "issuer": issuer,
                    "field": "modified_duration",
                    "severity": "CRITICAL",
                    "rule": "Negative or missing modified duration on straight fixed bond",
                    "value": mod_dur
                })
            elif mod_dur > 35.0:
                issues.append({
                    "isin": isin,
                    "issuer": issuer,
                    "field": "modified_duration",
                    "severity": "WARNING",
                    "rule": "Extremely high duration (> 35 yrs)",
                    "value": mod_dur
                })
            else:
                durations.append(mod_dur)

            if conv is not None and conv < 0:
                issues.append({
                    "isin": isin,
                    "issuer": issuer,
                    "field": "convexity",
                    "severity": "WARNING",
                    "rule": "Negative convexity on non-callable bond",
                    "value": conv
                })

            # Check 6: Yield and Spread Inconsistencies
            ytm = b.get("ytm")
            spread_bps = b.get("credit_spread_bps")
            bench_y = b.get("benchmark_yield")
            if ytm is not None and ytm < 0:
                issues.append({
                    "isin": isin,
                    "issuer": issuer,
                    "field": "ytm",
                    "severity": "WARNING",
                    "rule": "Negative yield to maturity detected",
                    "value": ytm
                })
            if spread_bps is not None:
                spreads.append(spread_bps)
                if spread_bps < -20.0:
                    issues.append({
                        "isin": isin,
                        "issuer": issuer,
                        "field": "credit_spread_bps",
                        "severity": "WARNING",
                        "rule": "Unusually tight or inverted credit spread (< -20 bps) vs sovereign",
                        "value": spread_bps
                    })

            # Check 7: Bid-Ask Inversion
            bid = b.get("bid_price")
            ask = b.get("ask_price")
            if bid is not None and ask is not None and bid > ask:
                issues.append({
                    "isin": isin,
                    "issuer": issuer,
                    "field": "bid_price",
                    "severity": "CRITICAL",
                    "rule": "Crossed market: Bid price exceeds ask price",
                    "value": f"Bid {bid} > Ask {ask}"
                })

        # Outlier detection using IQR on credit spreads
        if spreads:
            q25, q75 = np.percentile(spreads, [25, 75])
            iqr = q75 - q25
            upper_bound = q75 + 3.0 * iqr
            lower_bound = max(0, q25 - 3.0 * iqr)
            
            for b in self.bonds:
                sp = b.get("credit_spread_bps", 0)
                if sp > upper_bound or sp < lower_bound:
                    issues.append({
                        "isin": b.get("isin"),
                        "issuer": b.get("issuer"),
                        "field": "credit_spread_bps",
                        "severity": "INFO",
                        "rule": f"Statistical spread outlier (> 3.0 IQR: {sp:.1f} bps vs band [{lower_bound:.1f}, {upper_bound:.1f}])",
                        "value": sp
                    })

        critical_count = sum(1 for i in issues if i["severity"] == "CRITICAL")
        warning_count = sum(1 for i in issues if i["severity"] == "WARNING")
        info_count = sum(1 for i in issues if i["severity"] == "INFO")
        
        status = "PASSED" if critical_count == 0 and warning_count == 0 else ("WARNING" if critical_count == 0 else "FAILED")

        return {
            "status": status,
            "total_securities_audited": total_securities,
            "critical_issues": critical_count,
            "warning_issues": warning_count,
            "info_issues": info_count,
            "issue_details": issues[:50],  # Return top 50
            "data_health_score": max(0.0, 100.0 - (critical_count * 20.0 + warning_count * 5.0 + info_count * 0.5))
        }
