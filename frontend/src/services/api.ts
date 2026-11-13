import {
  OverviewData,
  BondSummary,
  BondResearchDetail,
  Surface3DData,
  ModelBenchmarkItem,
  FeatureImportanceItem,
  BacktestResult,
  DataQualityReport,
  PeerResult,
  CaseStudyData,
  ProvenanceData
} from '../types';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '') + '/api';

export async function fetchOverview(): Promise<OverviewData> {
  const res = await fetch(`${API_BASE_URL}/overview`);
  if (!res.ok) throw new Error('Failed to fetch platform overview');
  return res.json();
}

export async function fetchBonds(params?: {
  sector?: string;
  rating_bucket?: string;
  min_rv_score?: number;
  search?: string;
}): Promise<BondSummary[]> {
  const query = new URLSearchParams();
  if (params?.sector && params.sector !== 'All') query.append('sector', params.sector);
  if (params?.rating_bucket && params.rating_bucket !== 'All') query.append('rating_bucket', params.rating_bucket);
  if (params?.min_rv_score !== undefined) query.append('min_rv_score', params.min_rv_score.toString());
  if (params?.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE_URL}/bonds?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch bond universe');
  return res.json();
}

export async function fetchBondResearch(isin: string): Promise<BondResearchDetail> {
  const res = await fetch(`${API_BASE_URL}/bonds/${isin}`);
  if (!res.ok) throw new Error(`Failed to fetch research for bond ${isin}`);
  return res.json();
}

export async function fetchCustomPeers(payload: {
  isin: string;
  max_peers?: number;
  same_sector_only?: boolean;
  max_rating_notch_diff?: number;
  weight_rating?: number;
  weight_sector?: number;
  weight_duration?: number;
  weight_liquidity?: number;
  weight_maturity?: number;
}): Promise<PeerResult> {
  const res = await fetch(`${API_BASE_URL}/peers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to compute custom peers');
  return res.json();
}

export async function fetchSurface3D(params?: {
  surface_mode?: string;
  sector?: string;
  rating_bucket?: string;
  max_duration?: number;
}): Promise<Surface3DData> {
  const query = new URLSearchParams();
  if (params?.surface_mode) query.append('surface_mode', params.surface_mode);
  if (params?.sector && params.sector !== 'All') query.append('sector', params.sector);
  if (params?.rating_bucket && params.rating_bucket !== 'All') query.append('rating_bucket', params.rating_bucket);
  if (params?.max_duration) query.append('max_duration', params.max_duration.toString());

  const res = await fetch(`${API_BASE_URL}/surface-3d?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch 3D surface');
  return res.json();
}

export async function fetchModelBenchmarks(): Promise<{
  models: ModelBenchmarkItem[];
  feature_importances: FeatureImportanceItem[];
}> {
  const res = await fetch(`${API_BASE_URL}/fair-value/models`);
  if (!res.ok) throw new Error('Failed to fetch model benchmarks');
  return res.json();
}

export async function fetchBacktest(holdingPeriodDays: number = 60, minRvGapBps: number = 15): Promise<BacktestResult> {
  const res = await fetch(`${API_BASE_URL}/backtest?holding_period_days=${holdingPeriodDays}&min_rv_gap_bps=${minRvGapBps}`);
  if (!res.ok) throw new Error('Failed to fetch backtest results');
  return res.json();
}

export async function fetchDataQuality(): Promise<DataQualityReport> {
  const res = await fetch(`${API_BASE_URL}/data-quality`);
  if (!res.ok) throw new Error('Failed to fetch data quality report');
  return res.json();
}

export async function updateScoringWeights(weights: {
  valuation_gap: number;
  liquidity: number;
  credit_quality: number;
  model_confidence: number;
}) {
  const res = await fetch(`${API_BASE_URL}/settings/scoring-weights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(weights)
  });
  if (!res.ok) throw new Error('Failed to update scoring weights');
  return res.json();
}

export async function fetchCaseStudy(isin?: string): Promise<CaseStudyData> {
  const url = isin ? `${API_BASE_URL}/case-study/${isin}` : `${API_BASE_URL}/case-study`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch analyst case study');
  return res.json();
}

export async function fetchProvenance(isin?: string): Promise<ProvenanceData> {
  const url = isin ? `${API_BASE_URL}/provenance/${isin}` : `${API_BASE_URL}/provenance`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch methodology and data provenance');
  return res.json();
}
