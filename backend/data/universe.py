"""
Institutional Bond Universe Dataset & Generator.
Clearly labelled realistic synthetic fixed-income security master
spanning 120+ bonds across 7 industry sectors, ratings from AAA to B-,
with realistic maturities, coupons, liquidity metrics, and market bid/ask quotes.
"""

from datetime import date, timedelta
from typing import List, Dict, Any, Optional
import numpy as np

from fixed_income.pricing import run_full_bond_analytics
from curves.benchmark import BenchmarkCurve


# Explicit rating notch integer scale
RATING_NOTCH_MAP = {
    "AAA": 1,
    "AA+": 2, "AA": 3, "AA-": 4,
    "A+": 5, "A": 6, "A-": 7,
    "BBB+": 8, "BBB": 9, "BBB-": 10,
    "BB+": 11, "BB": 12, "BB-": 13,
    "B+": 14, "B": 15, "B-": 16,
    "CCC": 17
}

INV_RATING_NOTCH_MAP = {v: k for k, v in RATING_NOTCH_MAP.items()}

# Representative institutional issuers across sectors
ISSUER_DEFINITIONS = [
    # Technology
    {"issuer": "Microsoft Corp", "sector": "Technology", "rating": "AAA", "seniority": "Senior Unsecured"},
    {"issuer": "Apple Inc", "sector": "Technology", "rating": "AA+", "seniority": "Senior Unsecured"},
    {"issuer": "Alphabet Inc", "sector": "Technology", "rating": "AA+", "seniority": "Senior Unsecured"},
    {"issuer": "Cisco Systems", "sector": "Technology", "rating": "AA-", "seniority": "Senior Unsecured"},
    {"issuer": "Oracle Corp", "sector": "Technology", "rating": "BBB", "seniority": "Senior Unsecured"},
    {"issuer": "Broadcom Inc", "sector": "Technology", "rating": "BBB-", "seniority": "Senior Unsecured"},
    {"issuer": "Intel Corp", "sector": "Technology", "rating": "BBB+", "seniority": "Senior Unsecured"},
    {"issuer": "NVIDIA Corp", "sector": "Technology", "rating": "AA-", "seniority": "Senior Unsecured"},
    {"issuer": "Dell Technologies", "sector": "Technology", "rating": "BBB", "seniority": "Senior Unsecured"},
    {"issuer": "Western Digital", "sector": "Technology", "rating": "BB", "seniority": "Senior Unsecured"},

    # Financials
    {"issuer": "JPMorgan Chase & Co", "sector": "Financials", "rating": "A-", "seniority": "Senior Unsecured"},
    {"issuer": "Bank of America Corp", "sector": "Financials", "rating": "A-", "seniority": "Senior Unsecured"},
    {"issuer": "Morgan Stanley", "sector": "Financials", "rating": "A-", "seniority": "Senior Unsecured"},
    {"issuer": "Goldman Sachs Group", "sector": "Financials", "rating": "BBB+", "seniority": "Senior Unsecured"},
    {"issuer": "Citigroup Inc", "sector": "Financials", "rating": "BBB+", "seniority": "Senior Unsecured"},
    {"issuer": "Wells Fargo & Co", "sector": "Financials", "rating": "BBB+", "seniority": "Senior Unsecured"},
    {"issuer": "BlackRock Inc", "sector": "Financials", "rating": "AA-", "seniority": "Senior Unsecured"},
    {"issuer": "Capital One Financial", "sector": "Financials", "rating": "BBB", "seniority": "Senior Unsecured"},
    {"issuer": "Ally Financial", "sector": "Financials", "rating": "BB+", "seniority": "Senior Unsecured"},
    {"issuer": "Navient Corp", "sector": "Financials", "rating": "B+", "seniority": "Senior Unsecured"},

    # Energy & Utilities
    {"issuer": "ExxonMobil Corp", "sector": "Energy", "rating": "AA-", "seniority": "Senior Unsecured"},
    {"issuer": "Chevron Corp", "sector": "Energy", "rating": "AA-", "seniority": "Senior Unsecured"},
    {"issuer": "ConocoPhillips", "sector": "Energy", "rating": "A-", "seniority": "Senior Unsecured"},
    {"issuer": "Occidental Petroleum", "sector": "Energy", "rating": "BB+", "seniority": "Senior Unsecured"},
    {"issuer": "NextEra Energy", "sector": "Utilities", "rating": "A-", "seniority": "Senior Unsecured"},
    {"issuer": "Duke Energy Corp", "sector": "Utilities", "rating": "BBB+", "seniority": "Senior Unsecured"},
    {"issuer": "Southern Company", "sector": "Utilities", "rating": "BBB+", "seniority": "Senior Unsecured"},
    {"issuer": "Kinder Morgan", "sector": "Energy", "rating": "BBB", "seniority": "Senior Unsecured"},
    {"issuer": "Transocean Ltd", "sector": "Energy", "rating": "B", "seniority": "Senior Secured"},

    # Healthcare
    {"issuer": "Johnson & Johnson", "sector": "Healthcare", "rating": "AAA", "seniority": "Senior Unsecured"},
    {"issuer": "Pfizer Inc", "sector": "Healthcare", "rating": "A", "seniority": "Senior Unsecured"},
    {"issuer": "Merck & Co", "sector": "Healthcare", "rating": "A+", "seniority": "Senior Unsecured"},
    {"issuer": "AbbVie Inc", "sector": "Healthcare", "rating": "A-", "seniority": "Senior Unsecured"},
    {"issuer": "UnitedHealth Group", "sector": "Healthcare", "rating": "A+", "seniority": "Senior Unsecured"},
    {"issuer": "Eli Lilly & Co", "sector": "Healthcare", "rating": "A+", "seniority": "Senior Unsecured"},
    {"issuer": "CVS Health Corp", "sector": "Healthcare", "rating": "BBB", "seniority": "Senior Unsecured"},
    {"issuer": "Bausch Health", "sector": "Healthcare", "rating": "B-", "seniority": "Senior Secured"},

    # Industrials & Aerospace
    {"issuer": "Caterpillar Inc", "sector": "Industrials", "rating": "A", "seniority": "Senior Unsecured"},
    {"issuer": "Deere & Co", "sector": "Industrials", "rating": "A", "seniority": "Senior Unsecured"},
    {"issuer": "Honeywell International", "sector": "Industrials", "rating": "A", "seniority": "Senior Unsecured"},
    {"issuer": "Lockheed Martin", "sector": "Industrials", "rating": "A-", "seniority": "Senior Unsecured"},
    {"issuer": "Boeing Co", "sector": "Industrials", "rating": "BBB-", "seniority": "Senior Unsecured"},
    {"issuer": "General Electric", "sector": "Industrials", "rating": "BBB+", "seniority": "Senior Unsecured"},
    {"issuer": "Delta Air Lines", "sector": "Industrials", "rating": "BB+", "seniority": "Senior Secured"},
    {"issuer": "American Airlines", "sector": "Industrials", "rating": "B+", "seniority": "Senior Secured"},

    # Consumer & Retail
    {"issuer": "Amazon.com Inc", "sector": "Consumer", "rating": "AA-", "seniority": "Senior Unsecured"},
    {"issuer": "Walmart Inc", "sector": "Consumer", "rating": "AA", "seniority": "Senior Unsecured"},
    {"issuer": "Home Depot", "sector": "Consumer", "rating": "A", "seniority": "Senior Unsecured"},
    {"issuer": "Procter & Gamble", "sector": "Consumer", "rating": "AA-", "seniority": "Senior Unsecured"},
    {"issuer": "Coca-Cola Co", "sector": "Consumer", "rating": "A+", "seniority": "Senior Unsecured"},
    {"issuer": "PepsiCo Inc", "sector": "Consumer", "rating": "A+", "seniority": "Senior Unsecured"},
    {"issuer": "Target Corp", "sector": "Consumer", "rating": "A", "seniority": "Senior Unsecured"},
    {"issuer": "Ford Motor Co", "sector": "Consumer", "rating": "BB+", "seniority": "Senior Unsecured"},
    {"issuer": "General Motors", "sector": "Consumer", "rating": "BBB", "seniority": "Senior Unsecured"},
    {"issuer": "Royal Caribbean", "sector": "Consumer", "rating": "B", "seniority": "Senior Secured"},

    # Telecommunications
    {"issuer": "AT&T Inc", "sector": "Telecommunications", "rating": "BBB", "seniority": "Senior Unsecured"},
    {"issuer": "Verizon Communications", "sector": "Telecommunications", "rating": "BBB+", "seniority": "Senior Unsecured"},
    {"issuer": "T-Mobile US Inc", "sector": "Telecommunications", "rating": "BBB-", "seniority": "Senior Unsecured"},
    {"issuer": "Charter Communications", "sector": "Telecommunications", "rating": "BB+", "seniority": "Senior Unsecured"},
    {"issuer": "DISH Network Corp", "sector": "Telecommunications", "rating": "B", "seniority": "Senior Secured"}
]

# Maturity tenor profiles for issuers
TENOR_PROFILES = [
    {"tenor_yrs": 2.5,  "coupon_spread": 0.0030},
    {"tenor_yrs": 5.0,  "coupon_spread": 0.0065},
    {"tenor_yrs": 7.0,  "coupon_spread": 0.0090},
    {"tenor_yrs": 10.0, "coupon_spread": 0.0125},
    {"tenor_yrs": 20.0, "coupon_spread": 0.0160},
    {"tenor_yrs": 30.0, "coupon_spread": 0.0185},
]


def generate_representative_bond_universe(settlement_date: Optional[date] = None) -> List[Dict[str, Any]]:
    """
    Constructs an institutional universe of 120+ fixed-income securities.
    Calculates exact clean/dirty prices, YTM, Macaulay/Modified duration,
    convexity, G-spread against Treasury benchmark, and realistic liquidity metrics.
    """
    if settlement_date is None:
        settlement_date = date(2026, 9, 1)

    bench = BenchmarkCurve()
    bonds = []
    
    # Pseudo-random generator with fixed seed for determinism and repeatability
    rng = np.random.RandomState(42)

    isin_counter = 1001

    for issuer_info in ISSUER_DEFINITIONS:
        issuer = issuer_info["issuer"]
        sector = issuer_info["sector"]
        rating = issuer_info["rating"]
        seniority = issuer_info["seniority"]
        rating_notch = RATING_NOTCH_MAP[rating]

        # Select 2 to 4 maturities for each issuer
        num_bonds = 2 if rating_notch > 13 else (3 if rating_notch > 7 else 4)
        chosen_tenors = rng.choice(TENOR_PROFILES, size=num_bonds, replace=False)
        chosen_tenors = sorted(chosen_tenors, key=lambda x: x["tenor_yrs"])

        for profile in chosen_tenors:
            tenor = profile["tenor_yrs"]
            
            # Base benchmark yield for this tenor
            bench_yield = bench.get_benchmark_yield(tenor)

            # Realistic credit spread in bps based on rating notch:
            # AAA ~ 35-55 bps, AA ~ 50-80 bps, A ~ 80-130 bps, BBB ~ 120-210 bps, BB ~ 240-380 bps, B ~ 420-750 bps
            base_spread_bps = 25.0 + (rating_notch ** 1.85) * 8.5 + (tenor * 2.2)
            
            # Sector nuance: Financials & Telecom trade slightly wider, Tech slightly tighter
            sector_bias = {
                "Technology": -10.0,
                "Healthcare": -8.0,
                "Consumer": 4.0,
                "Financials": 15.0,
                "Energy": 18.0,
                "Industrials": 8.0,
                "Utilities": -2.0,
                "Telecommunications": 22.0
            }.get(sector, 0.0)

            # Idiosyncratic market noise / mispricing signal component
            # In real institutional markets, spread volatility scales with credit risk (heteroskedasticity):
            # AAA noise ~ 6-9 bps, BBB noise ~ 20-30 bps, High Yield B noise ~ 50-80 bps
            noise_sigma = 5.0 + (rating_notch ** 1.35) * 1.6
            idiosyncratic_noise = rng.normal(0.0, noise_sigma)

            observed_spread_bps = max(20.0, base_spread_bps + sector_bias + idiosyncratic_noise)
            market_ytm = bench_yield + (observed_spread_bps / 10000.0)

            # Coupon rate set around original issuance par yield with small jitter
            coupon_rate = round(float(bench_yield + (base_spread_bps / 10000.0) + rng.uniform(-0.004, 0.004)), 4)
            coupon_rate = max(0.015, coupon_rate)

            # Dates
            maturity_date = settlement_date + timedelta(days=int(tenor * 365.25))
            issue_date = settlement_date - timedelta(days=int(rng.uniform(180, 1200)))

            # ISIN generation (US corporate standard format)
            isin = f"US{isin_counter:09d}"
            isin_counter += 1

            # Liquidity characteristics
            # Higher rating / recent issue / larger size -> lower bid-ask spread and higher volume
            is_ig = rating_notch <= 10
            base_volume_mm = 45.0 if is_ig else 12.0
            volume_mm = round(max(1.5, base_volume_mm * rng.uniform(0.6, 1.8) / (1.0 + (tenor / 25.0))), 2)
            
            # Bid-ask spread: 1.5 to 12 cents (0.015 to 0.120 clean price points)
            bid_ask_spread_pts = round(float(0.02 + (rating_notch * 0.008) + (20.0 / max(5.0, volume_mm)) * 0.01), 3)

            # Calculate exact bond analytics (Cashflows, Dirty, Clean, Duration, Convexity, DV01)
            analytics = run_full_bond_analytics(
                settlement_date=settlement_date,
                maturity_date=maturity_date,
                coupon_rate=coupon_rate,
                ytm=market_ytm,
                frequency=2,
                face_value=100.0,
                day_count="30/360"
            )

            clean_price = analytics.clean_price
            dirty_price = analytics.dirty_price
            bid_price = round(clean_price - (bid_ask_spread_pts / 2.0), 4)
            ask_price = round(clean_price + (bid_ask_spread_pts / 2.0), 4)

            # Liquidity score from 0 to 100 (composite of bid-ask tightness, volume, and age)
            bid_ask_score = max(0.0, 100.0 - (bid_ask_spread_pts * 400.0))
            volume_score = min(100.0, (volume_mm / 40.0) * 100.0)
            liquidity_score = round(0.55 * bid_ask_score + 0.45 * volume_score, 1)

            # Institutional Bid-Ask Spread in Spread (Yield) Basis Points:
            # ΔSpread_cost ≈ (ΔPrice_cost / ModDuration) * 100
            bid_ask_spread_cost_bps = round((bid_ask_spread_pts / max(0.5, analytics.modified_duration)) * 100.0, 1)

            # Calculate Zero-Volatility Spread (Z-Spread) vs Bootstrapped Spot Curve
            g_spread_bps = round((analytics.ytm - bench_yield) * 10000.0, 1)
            from fixed_income.pricing import calculate_z_spread_bps
            z_spread_bps = calculate_z_spread_bps(
                dirty_price=dirty_price,
                cash_flows=analytics.cash_flows,
                spot_curve_fn=bench.get_spot_rate,
                frequency=2
            )
            g_to_z_diff_bps = round(z_spread_bps - g_spread_bps, 1)

            bonds.append({
                "isin": isin,
                "issuer": issuer,
                "sector": sector,
                "rating": rating,
                "rating_notch": rating_notch,
                "seniority": seniority,
                "currency": "USD",
                "face_value": 100.0,
                "coupon": coupon_rate,
                "coupon_pct": round(coupon_rate * 100, 3),
                "frequency": 2,
                "settlement_date": settlement_date.isoformat(),
                "issue_date": issue_date.isoformat(),
                "maturity_date": maturity_date.isoformat(),
                "maturity_years": round(tenor, 2),
                "clean_price": clean_price,
                "dirty_price": dirty_price,
                "accrued_interest": analytics.accrued_interest,
                "bid_price": bid_price,
                "ask_price": ask_price,
                "bid_ask_spread_pts": bid_ask_spread_pts,
                "bid_ask_spread_bps": round(bid_ask_spread_pts * 100, 1),
                "bid_ask_spread_cost_bps": bid_ask_spread_cost_bps,
                "trading_volume_mm": volume_mm,
                "liquidity_score": liquidity_score,
                "ytm": round(analytics.ytm, 6),
                "ytm_pct": round(analytics.ytm * 100, 3),
                "benchmark_yield": round(bench_yield, 6),
                "benchmark_yield_pct": round(bench_yield * 100, 3),
                "credit_spread_bps": round(observed_spread_bps, 1),
                "g_spread_bps": g_spread_bps,
                "z_spread_bps": z_spread_bps,
                "g_to_z_diff_bps": g_to_z_diff_bps,
                "macaulay_duration": analytics.macaulay_duration,
                "modified_duration": analytics.modified_duration,
                "convexity": analytics.convexity,
                "dv01": analytics.dv01,
                "price_sensitivity": analytics.price_sensitivity,
                "is_synthetic_demo": True,
                "data_source": "Representative Institutional Market Simulation"
            })

    return bonds


class BondUniverseRepository:
    """
    Thread-safe repository for querying and caching the bond universe and benchmark curves.
    """
    _instance: Optional["BondUniverseRepository"] = None

    def __init__(self, settlement_date: Optional[date] = None):
        self.settlement_date = settlement_date or date(2026, 9, 1)
        self.benchmark_curve = BenchmarkCurve()
        self._bonds: List[Dict[str, Any]] = generate_representative_bond_universe(self.settlement_date)
        self._bond_map: Dict[str, Dict[str, Any]] = {b["isin"]: b for b in self._bonds}

    @classmethod
    def get_instance(cls) -> "BondUniverseRepository":
        if cls._instance is None:
            cls._instance = BondUniverseRepository()
        return cls._instance

    def get_all_bonds(self) -> List[Dict[str, Any]]:
        return self._bonds

    def get_bond(self, isin: str) -> Optional[Dict[str, Any]]:
        return self._bond_map.get(isin)

    def filter_bonds(
        self,
        sector: Optional[str] = None,
        min_rating_notch: Optional[int] = None,
        max_rating_notch: Optional[int] = None,
        min_duration: Optional[float] = None,
        max_duration: Optional[float] = None,
        min_spread_bps: Optional[float] = None,
        max_spread_bps: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        results = self._bonds
        if sector and sector != "All":
            results = [b for b in results if b["sector"] == sector]
        if min_rating_notch is not None:
            results = [b for b in results if b["rating_notch"] >= min_rating_notch]
        if max_rating_notch is not None:
            results = [b for b in results if b["rating_notch"] <= max_rating_notch]
        if min_duration is not None:
            results = [b for b in results if b["modified_duration"] >= min_duration]
        if max_duration is not None:
            results = [b for b in results if b["modified_duration"] <= max_duration]
        if min_spread_bps is not None:
            results = [b for b in results if b["credit_spread_bps"] >= min_spread_bps]
        if max_spread_bps is not None:
            results = [b for b in results if b["credit_spread_bps"] <= max_spread_bps]
        return results
