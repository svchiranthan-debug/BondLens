"""
Benchmark Curve, Spot Curve Bootstrapping, and Spread Engine.
Provides sovereign benchmark yields, bootstrapped zero-coupon spot curve,
G-spreads, Z-spreads (Zero-Volatility Spread), and curve shape analytics.
"""

from typing import List, Dict, Tuple, Optional, Any
import math
import numpy as np
from scipy.interpolate import PchipInterpolator
from .nelson_siegel import NelsonSiegelModel


# Default realistic US Treasury Benchmark Curve (Tenors in years, yields in decimal)
DEFAULT_TREASURY_BENCHMARK = [
    {"tenor": "1M",  "years": 0.083, "yield": 0.0525},
    {"tenor": "3M",  "years": 0.25,  "yield": 0.0515},
    {"tenor": "6M",  "years": 0.50,  "yield": 0.0495},
    {"tenor": "1Y",  "years": 1.0,   "yield": 0.0460},
    {"tenor": "2Y",  "years": 2.0,   "yield": 0.0425},
    {"tenor": "3Y",  "years": 3.0,   "yield": 0.0405},
    {"tenor": "5Y",  "years": 5.0,   "yield": 0.0395},
    {"tenor": "7Y",  "years": 7.0,   "yield": 0.0400},
    {"tenor": "10Y", "years": 10.0,  "yield": 0.0410},
    {"tenor": "20Y", "years": 20.0,  "yield": 0.0438},
    {"tenor": "30Y", "years": 30.0,  "yield": 0.0435},
]


class BenchmarkCurve:
    """
    Sovereign Benchmark Curve with PCHIP interpolation,
    bootstrapped zero-coupon spot curve, and parametric Nelson-Siegel model.
    """
    def __init__(self, curve_data: Optional[List[Dict[str, float]]] = None):
        if curve_data is None:
            curve_data = DEFAULT_TREASURY_BENCHMARK
            
        self.raw_points = sorted(curve_data, key=lambda x: x["years"])
        self.maturities = np.array([p["years"] for p in self.raw_points])
        self.yields = np.array([p["yield"] for p in self.raw_points])
        
        # Monotonic cubic interpolation for par benchmark yields
        self.interpolator = PchipInterpolator(self.maturities, self.yields, extrapolate=True)
        
        # Calibrate Nelson-Siegel model
        self.ns_model = NelsonSiegelModel().fit(self.maturities, self.yields)

        # Bootstrap Zero-Coupon Spot Curve
        self._bootstrap_spot_curve()

    def _bootstrap_spot_curve(self):
        """
        Derive zero-coupon spot rates r_spot(t) from par benchmark yields using standard bootstrapping:
        For par bond: 100 = sum_k [ (C/2) / (1 + r_spot(t_k)/2)^(2*t_k) ] + 100 / (1 + r_spot(T)/2)^(2*T)
        """
        grid_maturities = [0.25, 0.5, 1.0, 2.0, 3.0, 5.0, 7.0, 10.0, 20.0, 30.0]
        spot_rates = []
        discount_factors = {}

        for T in grid_maturities:
            par_y = float(self.interpolator(T))
            if T <= 0.5:
                # Money market / single period: par yield == spot yield
                spot_rates.append(par_y)
                discount_factors[T] = 1.0 / (1.0 + par_y * T)
            else:
                # Semi-annual coupon cash flows
                freq = 2
                periods = int(round(T * freq))
                cpn_amount = (par_y * 100.0) / freq
                
                # Discount intermediate cash flows using previously determined spot rates
                pv_intermediate = 0.0
                for p in range(1, periods):
                    t_k = p / freq
                    # Interpolate earlier spot rate
                    if t_k in discount_factors:
                        df_k = discount_factors[t_k]
                    else:
                        r_interp = float(np.interp(t_k, grid_maturities[:len(spot_rates)], spot_rates))
                        df_k = 1.0 / math.pow(1.0 + r_interp / freq, freq * t_k)
                    pv_intermediate += cpn_amount * df_k
                    
                # Solve for spot rate at maturity T:
                # 100 - pv_intermediate = (cpn_amount + 100) * df_T
                target = max(1e-4, 100.0 - pv_intermediate)
                df_T = target / (cpn_amount + 100.0)
                discount_factors[T] = df_T
                
                # df_T = (1 + r_spot / freq)^(-freq * T)  =>  r_spot = freq * (df_T^(-1 / (freq * T)) - 1)
                r_spot = freq * (math.pow(df_T, -1.0 / (freq * T)) - 1.0)
                spot_rates.append(r_spot)

        self.spot_maturities = np.array(grid_maturities)
        self.spot_rates = np.array(spot_rates)
        self.spot_interpolator = PchipInterpolator(self.spot_maturities, self.spot_rates, extrapolate=True)

    def get_benchmark_yield(self, maturity_years: float, use_ns: bool = False) -> float:
        """Par benchmark yield for maturity in years."""
        tau = max(0.05, float(maturity_years))
        if use_ns:
            return float(self.ns_model.evaluate(np.array([tau]))[0])
        else:
            return float(self.interpolator(tau))

    def get_spot_rate(self, maturity_years: float) -> float:
        """Zero-coupon spot rate for maturity in years."""
        tau = max(0.05, float(maturity_years))
        return float(self.spot_interpolator(tau))

    def calculate_g_spread_bps(self, bond_ytm: float, maturity_years: float) -> float:
        """
        G-Spread = (Bond YTM - Interpolated Benchmark Yield) * 10,000
        """
        bench_yield = self.get_benchmark_yield(maturity_years)
        return round((bond_ytm - bench_yield) * 10000.0, 2)

    def generate_curve_points(self, num_points: int = 60, max_years: float = 30.0) -> List[Dict[str, float]]:
        """Generate smooth curve points including spot rates."""
        tau_grid = np.linspace(0.25, max_years, num_points)
        interp_yields = self.interpolator(tau_grid)
        spot_rates = self.spot_interpolator(tau_grid)
        ns_yields = self.ns_model.evaluate(tau_grid)
        
        points = []
        for t, y_int, y_spot, y_ns in zip(tau_grid, interp_yields, spot_rates, ns_yields):
            points.append({
                "maturity": round(float(t), 2),
                "interpolated_yield_pct": round(float(y_int * 100), 4),
                "spot_rate_pct": round(float(y_spot * 100), 4),
                "nelson_siegel_yield_pct": round(float(y_ns * 100), 4),
            })
        return points

    def get_raw_points(self) -> List[Dict[str, Any]]:
        return [
            {
                "tenor": p.get("tenor", f"{p['years']}Y"),
                "maturity_years": p["years"],
                "yield_pct": round(p["yield"] * 100, 3)
            }
            for p in self.raw_points
        ]
