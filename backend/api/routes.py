"""
FastAPI REST API Endpoints for BondLens — Fixed-Income Relative-Value & Mispricing Intelligence Platform.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field

from api.service import PlatformAnalyticsService

router = APIRouter(prefix="/api")
service = PlatformAnalyticsService.get_instance()


class PeerQueryRequest(BaseModel):
    isin: str
    max_peers: int = Field(default=8, ge=2, le=25)
    same_sector_only: bool = False
    max_rating_notch_diff: Optional[int] = 2
    weight_rating: float = 0.35
    weight_sector: float = 0.25
    weight_duration: float = 0.20
    weight_liquidity: float = 0.10
    weight_maturity: float = 0.10


class StressCustomRequest(BaseModel):
    isin: str
    rate_shocks_bps: List[int] = Field(default=[-100, -50, -25, 0, 25, 50, 100, 200])
    spread_shocks_bps: List[int] = Field(default=[-50, -25, 0, 25, 50, 100, 200])


class ScoringWeightsRequest(BaseModel):
    valuation_gap: float = 0.40
    liquidity: float = 0.20
    credit_quality: float = 0.20
    model_confidence: float = 0.20


@router.get("/overview")
def get_overview():
    """Returns top-level market and valuation dashboard metrics."""
    return service.get_overview_metrics()


@router.get("/bonds")
def get_bonds(
    sector: Optional[str] = Query(None),
    rating_bucket: Optional[str] = Query(None),
    min_rv_score: Optional[float] = Query(None),
    search: Optional[str] = Query(None)
):
    """Returns universe of securities with filter and search options."""
    return service.get_all_bonds(
        sector=sector,
        rating_bucket=rating_bucket,
        min_rv_score=min_rv_score,
        search=search
    )


@router.get("/bonds/{isin}")
def get_bond_research(isin: str):
    """Returns full analytical research dossier for selected security."""
    res = service.get_bond_research(isin)
    if not res:
        raise HTTPException(status_code=404, detail=f"Bond with ISIN {isin} not found.")
    return res


@router.post("/peers")
def find_custom_peers(req: PeerQueryRequest):
    """Finds peers with user-customized similarity weights and constraints."""
    try:
        return service.peer_engine.find_peers(
            target_isin=req.isin,
            max_peers=req.max_peers,
            same_sector_only=req.same_sector_only,
            max_rating_notch_diff=req.max_rating_notch_diff,
            weight_rating=req.weight_rating,
            weight_sector=req.weight_sector,
            weight_duration=req.weight_duration,
            weight_liquidity=req.weight_liquidity,
            weight_maturity=req.weight_maturity
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/surface-3d")
def get_surface_3d(
    surface_mode: str = Query("spread_surface"),
    sector: Optional[str] = Query(None),
    rating_bucket: Optional[str] = Query(None),
    max_duration: Optional[float] = Query(None)
):
    """Generates 3D coordinates (Duration, Credit Spread / Rating, RV Score) and regular mesh surface."""
    return service.surface_engine.generate_surface_data(
        surface_mode=surface_mode,
        sector=sector,
        rating_bucket=rating_bucket,
        max_duration=max_duration
    )


@router.get("/fair-value/models")
def get_model_benchmarks():
    """Returns model validation comparison (R², RMSE, MAE, Cross-Val) and feature importances."""
    return {
        "models": service.fair_value_engine.get_all_model_benchmarks(),
        "feature_importances": service.fair_value_engine.get_feature_importances()
    }


@router.post("/stress")
def run_custom_stress(req: StressCustomRequest):
    """Computes custom 2D/3D stress grid for a security."""
    bond = service.repo.get_bond(req.isin)
    if not bond:
        raise HTTPException(status_code=404, detail=f"Bond {req.isin} not found.")
    return service.stress_engine.generate_stress_matrix(
        bond=bond,
        rate_shocks=req.rate_shocks_bps,
        spread_shocks=req.spread_shocks_bps
    )


@router.get("/backtest")
def get_backtest_results(
    holding_period_days: int = Query(60, ge=15, le=180),
    min_rv_gap_bps: float = Query(15.0, ge=5.0, le=50.0)
):
    """Runs walk-forward backtest simulation of spread mean-reversion signals."""
    return service.backtest_engine.run_backtest(
        holding_period_days=holding_period_days,
        min_rv_gap_bps=min_rv_gap_bps
    )


@router.get("/data-quality")
def get_data_quality_report():
    """Returns comprehensive data quality diagnostics and audit log."""
    return service.data_quality_report


@router.get("/case-study")
@router.get("/case-study/{isin}")
def get_analyst_case_study(isin: Optional[str] = None):
    """Generates an institutional 12-section analyst relative-value research dossier."""
    from relative_value.case_study import AnalystCaseStudyEngine
    case_engine = AnalystCaseStudyEngine(service)
    try:
        return case_engine.generate_case_study(isin)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/provenance")
@router.get("/provenance/{isin}")
def get_methodology_provenance(isin: Optional[str] = None):
    """Returns complete mathematical and forensic data provenance for all metrics."""
    try:
        return service.get_provenance(isin)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settings/scoring-weights")
def update_scoring_weights(weights: ScoringWeightsRequest):
    """Updates relative value score weights dynamically and re-enriches universe."""
    w_dict = {
        "valuation_gap": weights.valuation_gap,
        "liquidity": weights.liquidity,
        "credit_quality": weights.credit_quality,
        "model_confidence": weights.model_confidence
    }
    service.scoring_engine.weights = w_dict
    service._enrich_universe()
    service.surface_engine.bonds = service.enriched_bonds
    return {"status": "SUCCESS", "updated_weights": w_dict}
