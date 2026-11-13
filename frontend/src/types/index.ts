export interface BondSummary {
  isin: string;
  issuer: string;
  sector: string;
  rating: string;
  rating_notch: number;
  seniority: string;
  currency: string;
  face_value: number;
  coupon: number;
  coupon_pct: number;
  frequency: number;
  settlement_date: string;
  issue_date: string;
  maturity_date: string;
  maturity_years: number;
  clean_price: number;
  dirty_price: number;
  accrued_interest: number;
  bid_price: number;
  ask_price: number;
  bid_ask_spread_pts: number;
  bid_ask_spread_bps: number;
  trading_volume_mm: number;
  liquidity_score: number;
  ytm: number;
  ytm_pct: number;
  benchmark_yield: number;
  benchmark_yield_pct: number;
  credit_spread_bps: number;
  g_spread_bps: number;
  z_spread_bps?: number;
  g_to_z_diff_bps?: number;
  bid_ask_spread_cost_bps?: number;
  macaulay_duration: number;
  modified_duration: number;
  convexity: number;
  dv01: number;
  fair_spread_bps: number;
  relative_value_gap_bps: number;
  net_realizable_gap_bps?: number;
  is_liquidity_trap?: boolean;
  rating_cohort?: string;
  z_score: number;
  classification: "Significantly Cheap" | "Potentially Cheap" | "Fairly Valued" | "Potentially Rich" | "Significantly Rich";
  tone: "positive" | "negative" | "neutral";
  model_confidence_score: number;
  relative_value_score: number;
  liquidity_adjusted_score: number;
  main_reason: string;
  main_risk: string;
  price_sensitivity?: Record<string, any>;
}

export interface OverviewData {
  total_bonds_analyzed: number;
  potentially_cheap_count: number;
  potentially_rich_count: number;
  fairly_valued_count: number;
  median_credit_spread_bps: number;
  median_rv_gap_bps: number;
  average_liquidity_score: number;
  data_health: {
    status: string;
    health_score: number;
    critical_issues: number;
    warning_issues: number;
  };
  top_opportunities: BondSummary[];
  worst_opportunities: BondSummary[];
  sector_stats: Array<{
    sector: string;
    bond_count: number;
    avg_spread_bps: number;
    avg_rv_score: number;
    cheap_count: number;
    rich_count: number;
  }>;
}

export interface PeerItem extends BondSummary {
  similarity_score: number;
  composite_distance: number;
  rating_notch_diff: number;
  duration_diff: number;
  spread_diff_bps: number;
  is_same_sector: boolean;
  selection_rationale: string;
}

export interface PeerResult {
  target_bond: BondSummary;
  peer_count: number;
  peer_group_stats: {
    median_spread_bps: number;
    mean_spread_bps: number;
    spread_std_bps: number;
    min_spread_bps: number;
    max_spread_bps: number;
    median_duration: number;
    median_ytm_pct: number;
    spread_gap_vs_median_bps: number;
  };
  peers: PeerItem[];
}

export interface WaterfallStep {
  factor: string;
  contribution_bps: number;
  type: "base" | "factor" | "subtotal" | "gap" | "total";
}

export interface FactorDecomposition {
  isin: string;
  observed_spread_bps: number;
  fair_spread_bps: number;
  relative_value_gap_bps: number;
  classification: string;
  waterfall_steps: WaterfallStep[];
  factor_contributions: {
    rating_effect_bps: number;
    duration_effect_bps: number;
    maturity_effect_bps: number;
    sector_effect_bps: number;
    liquidity_effect_bps: number;
    residual_gap_bps: number;
  };
  disclaimer: string;
  analyst_memo: string;
}

export interface StressScenario {
  rate_shock_bps: number;
  spread_shock_bps: number;
  total_yield_shock_bps: number;
  estimated_price: number;
  dollar_pnl: number;
  estimated_total_return_pct: number;
  rate_duration_contrib_pct: number;
  spread_duration_contrib_pct: number;
  convexity_contrib_pct: number;
}

export interface StressTestResult {
  isin: string;
  dirty_price: number;
  modified_duration: number;
  convexity: number;
  rate_shocks: number[];
  spread_shocks: number[];
  matrix: Array<{
    spread_shock_bps: number;
    scenarios: StressScenario[];
  }>;
  surface_3d: {
    x_rate_shocks: number[];
    y_spread_shocks: number[];
    z_return_grid: number[][];
    points: Array<{
      rate_shock_bps: number;
      spread_shock_bps: number;
      estimated_return_pct: number;
      estimated_price: number;
    }>;
  };
}

export interface BondResearchDetail {
  bond: BondSummary;
  peers: PeerResult;
  valuation: {
    model_name: string;
    observed_spread_bps: number;
    fair_spread_bps: number;
    relative_value_gap_bps: number;
    z_score: number;
    standard_error_bps: number;
    classification: string;
    tone: string;
    model_confidence_score: number;
    spread_percentile_in_sector: number;
  };
  decomposition: FactorDecomposition;
  stress_testing: StressTestResult;
  benchmark_curve: {
    points: Array<{
      maturity: number;
      interpolated_yield_pct: number;
      nelson_siegel_yield_pct: number;
    }>;
    current_bond_benchmark_yield: number;
  };
}

export interface Surface3DData {
  surface_mode?: "spread_surface" | "rv_score_surface";
  total_points: number;
  points: Array<{
    isin: string;
    issuer: string;
    sector: string;
    rating: string;
    rating_notch: number;
    modified_duration: number;
    credit_spread_bps: number;
    fair_spread_bps?: number;
    relative_value_score: number;
    liquidity_adjusted_score?: number;
    relative_value_gap_bps: number;
    net_realizable_gap_bps?: number;
    is_liquidity_trap?: boolean;
    classification: string;
    liquidity_score: number;
    ytm_pct: number;
    clean_price: number;
    coupon_pct?: number;
    maturity_date?: string;
  }>;
  surface_mesh: {
    x_duration_grid: number[];
    y_spread_grid?: number[];
    y_rating_notch_grid?: number[];
    z_score_mesh?: number[][];
    z_spread_mesh?: number[][];
  };
  axes_meta: {
    x_label: string;
    y_label: string;
    z_label: string;
    surface_meaning?: string;
  };
}

export interface ModelBenchmarkItem {
  model_name: string;
  r_squared: number;
  cv_r_squared: number;
  rmse_bps: number;
  mae_bps: number;
  is_preferred: boolean;
}

export interface FeatureImportanceItem {
  feature: string;
  display_name: string;
  importance_pct: number;
}

export interface BacktestResult {
  parameters: {
    holding_period_days: number;
    min_rv_gap_bps: number;
    max_duration: number;
    min_liquidity_score: number;
  };
  period_breakdown: {
    training_periods: number;
    validation_periods: number;
    out_of_sample_test_periods: number;
    total_trades_analyzed: number;
    test_period_trades: number;
  };
  performance_metrics: {
    out_of_sample_hit_rate_pct: number;
    annualized_sharpe_ratio: number;
    maximum_drawdown_pct: number;
    avg_spread_compression_bps: number;
    cumulative_excess_return_pct: number;
    turnover_monthly_pct: number;
  };
  portfolio_series: Array<{
    date: string;
    period_type: string;
    strategy_cumulative_return_pct: number;
    benchmark_cumulative_return_pct: number;
    excess_cumulative_return_pct: number;
    current_drawdown_pct: number;
  }>;
  recent_trades_sample: Array<{
    date: string;
    period_type: string;
    initial_rv_gap_bps: number;
    subsequent_spread_change_bps: number;
    holding_period_days: number;
    gross_return_pct: number;
    net_return_pct: number;
    is_profitable_compression: boolean;
  }>;
}

export interface DataQualityReport {
  status: string;
  total_securities_audited: number;
  critical_issues: number;
  warning_issues: number;
  info_issues: number;
  data_health_score: number;
  issue_details: Array<{
    isin: string;
    issuer: string;
    field: string;
    severity: "CRITICAL" | "WARNING" | "INFO";
    rule: string;
    value: any;
  }>;
}

export interface CaseStudyData {
  bond: BondSummary;
  target_isin: string;
  executive_summary: string;
  screening_triggers: string[];
  observed_data: {
    isin: string;
    issuer: string;
    sector: string;
    credit_rating: string;
    rating_agency_equivalent: string;
    coupon_rate_pct: number;
    coupon_frequency: string;
    day_count_convention: string;
    issue_date: string;
    maturity_date: string;
    maturity_years: number;
    clean_price: number;
    dirty_price: number;
    accrued_interest: number;
    bid_price: number;
    ask_price: number;
    bid_ask_price_spread_pts: number;
    yield_to_maturity_pct: number;
    us_treasury_benchmark_tenor: string;
    benchmark_yield_pct: number;
    g_spread_bps: number;
    z_spread_bps: number;
    g_to_z_discrepancy_bps: number;
    modified_duration_years: number;
    macaulay_duration_years: number;
    analytical_convexity: number;
    dv01_per_100_par: number;
    average_daily_volume_mm: number;
  };
  model_estimates: {
    model_specification: string;
    fair_credit_spread_bps: number;
    model_implied_fair_yield_pct: number;
    relative_value_gap_bps: number;
    net_realizable_gap_bps: number;
    cohort_standard_error_bps: number;
    studentized_z_score: number;
    classification: string;
    model_confidence_score: number;
    relative_value_score: number;
    liquidity_adjusted_score: number;
    out_of_fold_cross_validation_r2: number;
  };
  underlying_assumptions: string[];
  factor_attribution: WaterfallStep[];
  comparable_peers: PeerItem[];
  liquidity_analysis: {
    liquidity_score: number;
    quoted_bid_ask_spread_pts: number;
    quoted_bid_ask_spread_bps: number;
    spread_crossing_friction_bps: number;
    daily_trading_volume_mm: number;
    is_liquidity_trap: boolean;
    verdict: string;
  };
  rate_shocks_table: Array<{
    shock_bps: number;
    label: string;
    est_price: number;
    est_return_pct: number;
    duration_impact: number;
    convexity_cushion: number;
  }>;
  spread_shocks_table: Array<{
    spread_shock_bps: number;
    label: string;
    total_price_gain_pct: number;
    spread_pnl_dollar?: number;
    alpha_dollar_pnl?: number;
  }>;
  breakeven_widening_bps: number;
  backtest_evidence: {
    strategy_test_horizon: string;
    historical_sample_trades: number;
    compression_hit_rate_pct: number;
    average_spread_compression_bps: number;
    excess_return_sharpe_ratio: number;
    historical_drawdown_pct: number;
    empirical_finding: string;
  };
  key_risks: Array<{
    risk: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    detail: string;
  }>;
  invalidation_triggers: string[];
}

export interface DataProvenanceItem {
  metric_name: string;
  displayed_value: string;
  epistemic_status: "Observed" | "Calculated" | "Estimated" | "Assumed & Simulated" | string;
  research_integrity_status: "VERIFIED" | "CONDITIONAL" | "HYPOTHETICAL" | "UNSUPPORTED";
  input_data: string;
  formula: string;
  sample_size: string;
  degrees_of_freedom: string;
  time_period: string;
  validation_methodology: string;
  potential_biases: string[];
  statistical_meaningfulness: string;
  reproducible_python: string;
}

export interface ProvenanceData {
  bond: BondSummary;
  target_isin: string;
  provenance_items: DataProvenanceItem[];
  data_limitations?: Record<string, string>;
  universe_metadata: {
    total_bonds: number;
    regressor_features_count: number;
    cross_sectional_date: string;
    preferred_model: string;
    data_health_status: string;
    data_health_score: number;
  };
}
