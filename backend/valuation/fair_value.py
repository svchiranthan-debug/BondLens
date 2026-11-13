"""
Fair Value Estimation Engine with Out-of-Fold Predictions & Heteroskedasticity Adjustments.
Addresses senior analyst audit points:
1. Out-of-Fold (OOF) Cross-Validation to eliminate in-sample data leakage / self-influence.
2. Rating-conditioned residual standard error to resolve heteroskedasticity (AAA vs HY variance).
3. Net Realizable Gap (deducting bid-ask spread crossing cost in yield terms) to detect Liquidity Traps.
4. Defensible studentized relative value metrics and statistical confidence.
"""

from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression, HuberRegressor, Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import KFold, cross_val_predict, cross_val_score
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error


class FairValueEngine:
    """
    Fits statistical and econometric fair value models across the universe.
    Eliminates data leakage via out-of-fold cross-validation and models rating-conditioned variance.
    """
    def __init__(self, bonds: List[Dict[str, Any]]):
        self.bonds = bonds
        self.df = self._prepare_dataframe(bonds)
        self.models: Dict[str, Any] = {}
        self.metrics: Dict[str, Dict[str, float]] = {}
        self.oof_predictions: Dict[str, np.ndarray] = {}
        self.cohort_stds: Dict[str, float] = {}
        self._fit_all_models()

    def _prepare_dataframe(self, bonds: List[Dict[str, Any]]) -> pd.DataFrame:
        df = pd.DataFrame(bonds)
        # One-hot dummies for sectors
        sector_dummies = pd.get_dummies(df["sector"], prefix="sector", drop_first=True, dtype=float)
        
        feature_df = pd.concat([
            df[[
                "isin", "issuer", "sector", "rating", "rating_notch",
                "modified_duration", "maturity_years", "liquidity_score",
                "bid_ask_spread_bps", "trading_volume_mm", "credit_spread_bps",
                "bid_ask_spread_cost_bps"
            ]],
            sector_dummies
        ], axis=1)

        # Non-linear terms
        feature_df["duration_sq"] = feature_df["modified_duration"] ** 2
        feature_df["rating_sq"] = feature_df["rating_notch"] ** 1.5
        
        return feature_df

    def _fit_all_models(self):
        y = self.df["credit_spread_bps"].values
        kf = KFold(n_splits=5, shuffle=True, random_state=42)

        # 1. Simple Duration-Only OLS
        X_dur = self.df[["modified_duration", "duration_sq"]].values
        ols_dur = LinearRegression().fit(X_dur, y)
        self.models["Duration OLS"] = {"model": ols_dur, "features": ["modified_duration", "duration_sq"], "type": "linear"}
        self.oof_predictions["Duration OLS"] = cross_val_predict(LinearRegression(), X_dur, y, cv=kf)
        
        # 2. Multi-Factor Robust Huber Regression (preferred model)
        factor_cols = ["rating_notch", "rating_sq", "modified_duration", "duration_sq", "maturity_years", "liquidity_score"] + [c for c in self.df.columns if c.startswith("sector_")]
        X_factors = self.df[factor_cols].values
        huber = HuberRegressor(max_iter=1000, epsilon=1.35).fit(X_factors, y)
        self.models["Robust Multi-Factor (Huber)"] = {"model": huber, "features": factor_cols, "type": "linear"}
        self.oof_predictions["Robust Multi-Factor (Huber)"] = cross_val_predict(HuberRegressor(max_iter=1000, epsilon=1.35), X_factors, y, cv=kf)

        # 3. Regularized Ridge Regression
        ridge = Ridge(alpha=1.5).fit(X_factors, y)
        self.models["Regularized Ridge"] = {"model": ridge, "features": factor_cols, "type": "linear"}
        self.oof_predictions["Regularized Ridge"] = cross_val_predict(Ridge(alpha=1.5), X_factors, y, cv=kf)

        # 4. Advanced Non-Linear Random Forest
        rf = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42).fit(X_factors, y)
        self.models["Random Forest (Non-Linear)"] = {"model": rf, "features": factor_cols, "type": "ensemble"}
        self.oof_predictions["Random Forest (Non-Linear)"] = cross_val_predict(RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42), X_factors, y, cv=kf)

        # Calculate validation metrics
        for name, entry in self.models.items():
            features = entry["features"]
            X = self.df[features].values
            y_pred_in_sample = entry["model"].predict(X)
            y_pred_oof = self.oof_predictions[name]

            r2 = float(r2_score(y, y_pred_in_sample))
            cv_r2 = float(r2_score(y, y_pred_oof))
            rmse = float(np.sqrt(mean_squared_error(y, y_pred_oof)))  # Out-of-sample RMSE
            mae = float(mean_absolute_error(y, y_pred_oof))

            self.metrics[name] = {
                "r2": round(r2, 4),
                "cv_r2_5fold": round(cv_r2, 4),
                "rmse_bps": round(rmse, 2),
                "mae_bps": round(mae, 2),
            }

        # Calculate Heteroskedastic Rating Cohort Residual Standard Errors:
        # Group ratings into cohorts to measure conditional variance:
        # High Grade (AAA to AA-), Upper Medium (A+ to A-), Lower Medium (BBB+ to BBB-), High Yield (BB+ to B-)
        pref_residuals = y - self.oof_predictions["Robust Multi-Factor (Huber)"]
        self.df["pref_residual"] = pref_residuals

        def get_cohort(notch):
            if notch <= 4: return "AAA-AA"
            elif notch <= 7: return "A"
            elif notch <= 10: return "BBB"
            elif notch <= 13: return "BB"
            else: return "B"

        self.df["rating_cohort"] = self.df["rating_notch"].apply(get_cohort)
        for cohort in ["AAA-AA", "A", "BBB", "BB", "B"]:
            sub = self.df[self.df["rating_cohort"] == cohort]["pref_residual"]
            std = float(np.std(sub)) if len(sub) > 1 else self.metrics["Robust Multi-Factor (Huber)"]["rmse_bps"]
            self.cohort_stds[cohort] = max(4.0, round(std, 2))

    def evaluate_bond_fair_spread(
        self,
        bond: Dict[str, Any],
        model_name: str = "Robust Multi-Factor (Huber)"
    ) -> Dict[str, Any]:
        """
        Evaluate fair spread for a bond using specified model.
        Uses out-of-fold prediction if available in index to prevent in-sample leakage,
        and rating-cohort standard error to compute studentized z-score.
        """
        if model_name not in self.models:
            model_name = "Robust Multi-Factor (Huber)"

        entry = self.models[model_name]
        model = entry["model"]
        features = entry["features"]

        # Check if bond has an Out-of-Fold prediction
        isin = bond.get("isin")
        match_idx = self.df.index[self.df["isin"] == isin].tolist()
        if match_idx:
            idx = match_idx[0]
            fair_spread_bps = float(self.oof_predictions[model_name][idx])
        else:
            # Fallback for dynamic new bonds
            row_dict = {
                "rating_notch": bond["rating_notch"],
                "modified_duration": bond["modified_duration"],
                "duration_sq": bond["modified_duration"] ** 2,
                "rating_sq": bond["rating_notch"] ** 1.5,
                "maturity_years": bond["maturity_years"],
                "liquidity_score": bond.get("liquidity_score", 50.0)
            }
            for c in features:
                if c.startswith("sector_"):
                    sec_name = c.replace("sector_", "")
                    row_dict[c] = 1.0 if bond["sector"] == sec_name else 0.0
            x_vec = np.array([[row_dict.get(col, 0.0) for col in features]])
            fair_spread_bps = float(model.predict(x_vec)[0])

        fair_spread_bps = max(10.0, fair_spread_bps)
        observed_spread = bond["credit_spread_bps"]
        rv_gap = observed_spread - fair_spread_bps

        # Heteroskedasticity correction: look up rating cohort standard deviation
        notch = bond["rating_notch"]
        if notch <= 4: cohort = "AAA-AA"
        elif notch <= 7: cohort = "A"
        elif notch <= 10: cohort = "BBB"
        elif notch <= 13: cohort = "BB"
        else: cohort = "B"
        
        cohort_std = self.cohort_stds.get(cohort, self.metrics[model_name]["rmse_bps"])
        studentized_z = rv_gap / cohort_std

        # Net Realizable Spread Gap (deducting bid-ask crossing cost in yield terms)
        bid_ask_spread_cost = bond.get("bid_ask_spread_cost_bps", 3.0)
        net_realizable_gap = round(rv_gap - bid_ask_spread_cost, 1)
        is_liquidity_trap = (rv_gap > 0 and net_realizable_gap <= 0)

        # Defensible classification based on studentized z-score
        if studentized_z >= 1.65:
            classification = "Significantly Cheap"
            tone = "positive"
        elif studentized_z >= 0.65:
            classification = "Potentially Cheap"
            tone = "positive"
        elif studentized_z <= -1.65:
            classification = "Significantly Rich"
            tone = "negative"
        elif studentized_z <= -0.65:
            classification = "Potentially Rich"
            tone = "negative"
        else:
            classification = "Fairly Valued"
            tone = "neutral"

        # Model confidence score (0 to 100)
        cv_r2 = max(0.0, self.metrics[model_name]["cv_r2_5fold"])
        confidence_score = round(min(100.0, max(30.0, (cv_r2 * 80.0) + (1.0 / (1.0 + abs(studentized_z) * 0.15)) * 20.0)), 1)

        return {
            "model_name": model_name,
            "observed_spread_bps": round(observed_spread, 1),
            "fair_spread_bps": round(fair_spread_bps, 1),
            "relative_value_gap_bps": round(rv_gap, 1),
            "net_realizable_gap_bps": net_realizable_gap,
            "bid_ask_spread_cost_bps": bid_ask_spread_cost,
            "is_liquidity_trap": is_liquidity_trap,
            "z_score": round(studentized_z, 2),
            "cohort_standard_error_bps": round(cohort_std, 2),
            "rating_cohort": cohort,
            "classification": classification,
            "tone": tone,
            "model_confidence_score": confidence_score,
            "spread_percentile_in_sector": round(self._get_sector_percentile(bond), 1)
        }

    def _get_sector_percentile(self, bond: Dict[str, Any]) -> float:
        sec_bonds = [b["credit_spread_bps"] for b in self.bonds if b["sector"] == bond["sector"]]
        if not sec_bonds:
            return 50.0
        return float(np.mean([s <= bond["credit_spread_bps"] for s in sec_bonds]) * 100.0)

    def get_feature_importances(self) -> List[Dict[str, Any]]:
        rf_entry = self.models.get("Random Forest (Non-Linear)")
        if not rf_entry:
            return []
        rf = rf_entry["model"]
        features = rf_entry["features"]
        importances = rf.feature_importances_
        
        readable_names = {
            "rating_notch": "Credit Rating",
            "modified_duration": "Modified Duration",
            "duration_sq": "Duration Convexity",
            "maturity_years": "Maturity",
            "liquidity_score": "Liquidity Profile",
            "rating_sq": "Rating Acceleration"
        }

        results = []
        for feat, imp in zip(features, importances):
            name = readable_names.get(feat, feat.replace("sector_", "Sector: "))
            results.append({
                "feature": feat,
                "display_name": name,
                "importance_pct": round(float(imp * 100), 2)
            })
        results.sort(key=lambda x: x["importance_pct"], reverse=True)
        return results

    def get_all_model_benchmarks(self) -> List[Dict[str, Any]]:
        output = []
        for name, m in self.metrics.items():
            output.append({
                "model_name": name,
                "r_squared": m["r2"],
                "cv_r_squared": m["cv_r2_5fold"],
                "rmse_bps": m["rmse_bps"],
                "mae_bps": m["mae_bps"],
                "is_preferred": (name == "Robust Multi-Factor (Huber)")
            })
        return output
