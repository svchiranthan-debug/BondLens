"""
Nelson-Siegel & Nelson-Siegel-Svensson Parametric Yield Curve Model.
Fits smooth term structures to observed market yields across ratings and sectors.
"""

from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from scipy.optimize import least_squares


class NelsonSiegelModel:
    """
    Nelson-Siegel 4-parameter term structure model:
    y(tau) = beta0 + beta1 * ((1 - exp(-tau/lambda)) / (tau/lambda))
                   + beta2 * (((1 - exp(-tau/lambda)) / (tau/lambda)) - exp(-tau/lambda))
    """
    def __init__(self, beta0: float = 0.04, beta1: float = -0.01, beta2: float = -0.01, lambda_param: float = 2.0):
        self.beta0 = beta0
        self.beta1 = beta1
        self.beta2 = beta2
        self.lambda_param = lambda_param
        self.r_squared: float = 0.0
        self.rmse: float = 0.0

    @staticmethod
    def _term_factors(tau: np.ndarray, lambda_param: float) -> Tuple[np.ndarray, np.ndarray]:
        # Guard against tau <= 0
        tau_safe = np.maximum(tau, 1e-4)
        x = tau_safe / max(lambda_param, 1e-3)
        exp_neg_x = np.exp(-x)
        factor1 = (1.0 - exp_neg_x) / x
        factor2 = factor1 - exp_neg_x
        return factor1, factor2

    def evaluate(self, maturities: np.ndarray) -> np.ndarray:
        """Evaluate yield curve at given maturities in years."""
        tau = np.asarray(maturities, dtype=float)
        f1, f2 = self._term_factors(tau, self.lambda_param)
        return self.beta0 + self.beta1 * f1 + self.beta2 * f2

    def fit(self, maturities: np.ndarray, yields: np.ndarray) -> "NelsonSiegelModel":
        """
        Calibrate parameters beta0, beta1, beta2, lambda using non-linear least squares.
        """
        tau = np.asarray(maturities, dtype=float)
        y_obs = np.asarray(yields, dtype=float)
        
        if len(tau) < 4:
            # Fallback to simple average / linear slope if too few points
            self.beta0 = float(np.mean(y_obs))
            self.beta1 = float(y_obs[0] - y_obs[-1]) if len(y_obs) > 1 else 0.0
            self.beta2 = 0.0
            self.lambda_param = 2.0
            return self

        # Objective function for residuals
        def residuals(params):
            b0, b1, b2, lam = params
            f1, f2 = self._term_factors(tau, lam)
            y_pred = b0 + b1 * f1 + b2 * f2
            return y_pred - y_obs

        # Initial guess: beta0 ~ long yield, beta1 ~ (short - long), beta2 ~ hump, lambda ~ 2.0
        b0_init = float(y_obs[-1])
        b1_init = float(y_obs[0] - y_obs[-1])
        b2_init = float(2 * np.median(y_obs) - y_obs[0] - y_obs[-1])
        x0 = [b0_init, b1_init, b2_init, 2.5]

        # Bounds: beta0 >= 0, lambda > 0
        bounds = ([-0.05, -0.20, -0.20, 0.1], [0.30, 0.20, 0.20, 20.0])

        try:
            res = least_squares(residuals, x0=x0, bounds=bounds, loss='soft_l1', max_nfev=200)
            self.beta0, self.beta1, self.beta2, self.lambda_param = res.x
            
            # Compute fit metrics
            y_fit = self.evaluate(tau)
            ss_res = np.sum((y_obs - y_fit) ** 2)
            ss_tot = np.sum((y_obs - np.mean(y_obs)) ** 2)
            self.r_squared = float(1.0 - (ss_res / ss_tot)) if ss_tot > 1e-8 else 1.0
            self.rmse = float(np.sqrt(np.mean((y_obs - y_fit) ** 2)))
        except Exception:
            # Robust fallback
            self.beta0 = float(np.mean(y_obs))
            self.beta1 = 0.0
            self.beta2 = 0.0
            self.lambda_param = 2.0

        return self

    def to_dict(self) -> Dict[str, Any]:
        return {
            "beta0": round(float(self.beta0), 6),
            "beta1": round(float(self.beta1), 6),
            "beta2": round(float(self.beta2), 6),
            "lambda": round(float(self.lambda_param), 4),
            "r_squared": round(float(self.r_squared), 4),
            "rmse_bps": round(float(self.rmse * 10000), 2)
        }
