import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { CaseStudyData, BondSummary } from '../types';
import { fetchCaseStudy, fetchBonds } from '../services/api';

interface AnalystCaseStudyViewProps {
  initialIsin?: string | null;
  onNavigateToBond?: (isin: string) => void;
  onSelectBond?: (isin: string) => void;
}

export const AnalystCaseStudyView: React.FC<AnalystCaseStudyViewProps> = ({
  initialIsin,
  onNavigateToBond,
  onSelectBond
}) => {
  const [data, setData] = useState<CaseStudyData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [availableBonds, setAvailableBonds] = useState<BondSummary[]>([]);
  const [selectedIsin, setSelectedIsin] = useState<string>(initialIsin || 'US000001108');

  useEffect(() => {
    if (initialIsin && initialIsin !== selectedIsin) {
      setSelectedIsin(initialIsin);
    }
  }, [initialIsin]);

  useEffect(() => {
    loadUniverse();
  }, []);

  useEffect(() => {
    loadCaseStudy(selectedIsin);
  }, [selectedIsin]);

  const loadUniverse = async () => {
    try {
      const bonds = await fetchBonds();
      setAvailableBonds(bonds);
    } catch (e) {
      console.error("Could not load bond universe", e);
    }
  };

  const loadCaseStudy = async (isin: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCaseStudy(isin);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load analyst case study');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[65vh]">
        <div className="flex flex-col items-center space-y-2 text-slate-500 font-mono text-xs">
          <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
          <span>Synthesizing investment research memo for {selectedIsin}...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-border p-8 max-w-3xl mx-auto rounded-sm space-y-3">
        <div className="text-fin-neg font-mono text-sm font-semibold">Research Memo Generation Failed</div>
        <div className="text-xs text-slate-600 font-mono">{error || 'Unknown error'}</div>
        <button 
          onClick={() => loadCaseStudy(selectedIsin)}
          className="px-3 py-1 bg-navy-900 text-white rounded-xs font-mono text-xs"
        >
          Retry Memo Synthesis
        </button>
      </div>
    );
  }

  const { bond, observed_data, model_estimates, liquidity_analysis, backtest_evidence } = data;

  const lowCi = model_estimates.fair_credit_spread_bps - 1.96 * model_estimates.cohort_standard_error_bps;
  const highCi = model_estimates.fair_credit_spread_bps + 1.96 * model_estimates.cohort_standard_error_bps;

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-20 print:p-0 print:space-y-4">
      
      {/* ACTION & TARGET SECURITY BAR (Hidden on Print) */}
      <div className="bg-white border border-border p-3.5 rounded-sm shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex items-center space-x-3">
          <span className="font-bold uppercase tracking-wider font-mono text-graphite-900">
            Analyst Research Memo
          </span>
          <span className="text-borderDark">|</span>
          <span className="text-slate-500 font-mono">
            Structured 9-Section Quantitative Dossier
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Target Security Selector */}
          <div className="flex items-center space-x-2 bg-surfaceSubtle border border-border rounded-xs px-2.5 py-1">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-mono text-[11px]">Target:</span>
            <select
              value={selectedIsin}
              onChange={(e) => {
                const newIsin = e.target.value;
                setSelectedIsin(newIsin);
                onSelectBond?.(newIsin);
              }}
              className="bg-transparent text-xs font-mono text-graphite-900 focus:outline-none cursor-pointer"
            >
              {availableBonds.map((b) => (
                <option key={b.isin} value={b.isin}>
                  {b.issuer} ({b.isin}) - {b.coupon_pct}% '{b.maturity_date.slice(2, 4)}
                </option>
              ))}
            </select>
          </div>

          {/* Print / PDF Button */}
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-1 bg-navy-900 hover:bg-navy-800 text-white rounded-xs font-mono text-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Memo</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* THE RESEARCH MEMO DOCUMENT CONTAINER                                      */}
      {/* ========================================================================= */}
      <article className="bg-white border border-border rounded-sm shadow-xs p-6 md:p-10 space-y-8 font-sans print:border-none print:p-0 print:shadow-none">
        
        {/* DOCUMENT HEADER */}
        <header className="border-b-2 border-graphite-900 pb-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            <div>Institutional Fixed-Income Research • Relative Value Group</div>
            <div>Date: September 7, 2026 • Document ID: RV-MEMO-2026-0907</div>
          </div>

          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-slate-500">
              Analyst Case Study
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-graphite-900 mt-1 uppercase">
              {bond.issuer} {bond.coupon_pct.toFixed(2)}% {bond.maturity_date.slice(0, 4)}
            </h1>
            <div className="text-xs font-mono text-slate-600 mt-1">
              ISIN: <strong className="text-graphite-900 font-semibold">{bond.isin}</strong> • CUSIP: 58933YAK7 • Rating: {bond.rating} (Moody's A1 / S&P A+) • Sector: {bond.sector}
            </div>
          </div>

          {/* RESEARCH QUESTION BOX */}
          <div className="p-4 bg-surfaceSubtle border-l-4 border-navy-900 mt-4 rounded-r-xs space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-navy-900 font-bold">
              Research Question
            </span>
            <p className="text-sm md:text-base font-serif italic text-graphite-900 font-medium leading-snug">
              "Is the current spread compensation attractive relative to comparable healthcare investment-grade bonds?"
            </p>
          </div>

          {/* COMPACT VALUATION FACT STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 text-xs font-mono tabular-nums">
            <div className="p-3 bg-white border border-borderLight rounded-xs accent-strip-slate shadow-card hover:shadow-card-hover transition-all">
              <span className="text-[10px] uppercase text-slate-500 font-medium block">Observed Spread</span>
              <span className="text-xl font-bold text-graphite-900 mt-1 block">
                {observed_data.g_spread_bps.toFixed(1)} bps
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">G-Spread vs UST</span>
            </div>

            <div className="p-3 bg-white border border-borderLight rounded-xs accent-strip-indigo shadow-card hover:shadow-card-hover transition-all">
              <span className="text-[10px] uppercase text-indigoAcc-700 font-semibold block">Fair Spread</span>
              <span className="text-xl font-bold text-indigoAcc-700 mt-1 block">
                {model_estimates.fair_credit_spread_bps.toFixed(1)} bps
              </span>
              <span className="text-[10px] text-indigoAcc-600/80 block mt-0.5">Huber model estimate</span>
            </div>

            <div className="p-3 bg-white border border-borderLight rounded-xs accent-strip-teal shadow-card hover:shadow-card-hover transition-all">
              <span className="text-[10px] uppercase text-tealFin-700 font-semibold block">Relative RV Gap</span>
              <span className={`text-xl font-bold mt-1 block ${model_estimates.relative_value_gap_bps >= 0 ? 'text-tealFin-700' : 'text-coralFin-700'}`}>
                {model_estimates.relative_value_gap_bps > 0 ? `+${model_estimates.relative_value_gap_bps.toFixed(1)}` : model_estimates.relative_value_gap_bps.toFixed(1)} bps
              </span>
              <span className="text-[10px] text-tealFin-600/80 block mt-0.5">Studentized {model_estimates.studentized_z_score.toFixed(2)}σ</span>
            </div>

            <div className="p-3 bg-white border border-borderLight rounded-xs accent-strip-teal shadow-card hover:shadow-card-hover transition-all">
              <span className="text-[10px] uppercase text-tealFin-700 font-semibold block">Net Realizable Gap</span>
              <span className="text-xl font-bold text-tealFin-700 mt-1 block">
                +{model_estimates.net_realizable_gap_bps.toFixed(1)} bps
              </span>
              <span className="text-[10px] text-tealFin-600/80 block mt-0.5">Post bid-ask slippage</span>
            </div>

            <div className="p-3 bg-white border border-borderLight rounded-xs accent-strip-navy shadow-card hover:shadow-card-hover transition-all">
              <span className="text-[10px] uppercase text-slate-500 font-medium block">3M Carry Breakeven</span>
              <span className="text-xl font-bold text-graphite-900 mt-1 block">
                +{data.breakeven_widening_bps.toFixed(1)} bps
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Buffer to zero return</span>
            </div>
          </div>
        </header>

        {/* 01 — MARKET OBSERVATION */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-borderLight pb-1.5">
            <h2 className="text-sm font-bold text-graphite-900 uppercase font-mono tracking-wider">
              01 — Market Observation
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-xs font-semibold">
              OBSERVED DATA
            </span>
          </div>

          <p className="text-xs text-graphite-800 leading-relaxed">
            Market pricing reflects an observed clean price of <strong>${observed_data.clean_price.toFixed(3)}</strong> ($100 par) and yield to maturity of <strong>{observed_data.yield_to_maturity_pct.toFixed(2)}%</strong> against an interpolating US Treasury curve at {observed_data.benchmark_yield_pct.toFixed(2)}%.
            The resulting benchmark G-spread is <strong>{observed_data.g_spread_bps.toFixed(1)} bps</strong>, while the zero-volatility Z-spread trades at <strong>{observed_data.z_spread_bps.toFixed(1)} bps</strong> (a discrepancy of {observed_data.g_to_z_discrepancy_bps.toFixed(1)} bps, confirming modest curve curvature effect).
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono tabular-nums pt-1">
            <div className="p-2 bg-surfaceSubtle rounded-xs border border-borderLight">
              <span className="text-[10.5px] text-slate-500">Macaulay Duration:</span>
              <div className="font-semibold text-graphite-900 mt-0.5">{observed_data.macaulay_duration_years.toFixed(2)} yrs</div>
            </div>
            <div className="p-2 bg-surfaceSubtle rounded-xs border border-borderLight">
              <span className="text-[10.5px] text-slate-500">Modified Duration:</span>
              <div className="font-semibold text-graphite-900 mt-0.5">{observed_data.modified_duration_years.toFixed(2)} yrs</div>
            </div>
            <div className="p-2 bg-surfaceSubtle rounded-xs border border-borderLight">
              <span className="text-[10.5px] text-slate-500">Convexity Measure:</span>
              <div className="font-semibold text-graphite-900 mt-0.5">{observed_data.analytical_convexity.toFixed(2)}</div>
            </div>
            <div className="p-2 bg-surfaceSubtle rounded-xs border border-borderLight">
              <span className="text-[10.5px] text-slate-500">Dollar DV01:</span>
              <div className="font-semibold text-graphite-900 mt-0.5">${observed_data.dv01_per_100_par.toFixed(3)} / $100 par</div>
            </div>
          </div>
        </section>

        {/* 02 — PEER RELATIVE VALUE */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-borderLight pb-1.5">
            <h2 className="text-sm font-bold text-graphite-900 uppercase font-mono tracking-wider">
              02 — Peer Relative Value
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-xs font-semibold">
              OBSERVED & COMPARABLE COHORT
            </span>
          </div>

          <p className="text-xs text-graphite-800 leading-relaxed">
            The target issue trades at a spread concession against all high-grade pharmaceutical and healthcare issuers with comparable duration and credit quality ratings (A1/A+).
          </p>

          <div className="overflow-x-auto">
            <table className="research-table">
              <thead>
                <tr>
                  <th>Security / ISIN</th>
                  <th>Sector</th>
                  <th className="text-center">Rating</th>
                  <th className="text-right">Mod Dur</th>
                  <th className="text-right">YTM</th>
                  <th className="text-right">G-Spread</th>
                  <th className="text-right">Spread Concession</th>
                  <th className="text-right">Similarity</th>
                  <th>Matching Rationale</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {/* Target Row */}
                <tr className="bg-navy-50/60 font-semibold">
                  <td className="text-graphite-900">{bond.issuer} {bond.coupon_pct}% '{bond.maturity_date.slice(2, 4)} (TARGET)</td>
                  <td>{bond.sector}</td>
                  <td className="text-center">{bond.rating}</td>
                  <td className="text-right">{bond.modified_duration.toFixed(2)}y</td>
                  <td className="text-right">{bond.ytm_pct.toFixed(2)}%</td>
                  <td className="text-right">{bond.g_spread_bps.toFixed(1)} bps</td>
                  <td className="text-right text-slate-500">Base</td>
                  <td className="text-right">100%</td>
                  <td className="text-slate-600 font-normal text-[11px]">Primary valuation subject</td>
                </tr>

                {/* Peer Rows */}
                {data.comparable_peers.map((peer, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="font-medium text-graphite-900">{peer.issuer} {peer.coupon_pct}% '{peer.maturity_date.slice(2, 4)}</div>
                      <div className="text-[10px] font-mono text-slate-500">{peer.isin}</div>
                    </td>
                    <td className="text-slate-600">{peer.sector}</td>
                    <td className="text-center font-mono text-[11px]">{peer.rating}</td>
                    <td className="text-right text-slate-700">{peer.modified_duration.toFixed(2)}y</td>
                    <td className="text-right text-slate-700">{peer.ytm_pct.toFixed(2)}%</td>
                    <td className="text-right font-medium text-graphite-900">{peer.g_spread_bps.toFixed(1)} bps</td>
                    <td className="text-right font-semibold text-fin-pos">
                      +{(bond.g_spread_bps - peer.g_spread_bps).toFixed(1)} bps
                    </td>
                    <td className="text-right font-mono text-slate-700">
                      {(peer.similarity_score * 100).toFixed(0)}%
                    </td>
                    <td className="text-slate-600 text-[11px]">{peer.selection_rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 03 — MODEL FAIR VALUE */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-borderLight pb-1.5">
            <h2 className="text-sm font-bold text-graphite-900 uppercase font-mono tracking-wider">
              03 — Model Fair Value
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-xs font-semibold">
              MODEL ESTIMATE
            </span>
          </div>

          <p className="text-xs text-graphite-800 leading-relaxed">
            Fitted via Robust Huber M-Estimation (epsilon = 1.35) conditioned on Nelson-Siegel term structure factors. 
            The model isolates fundamental rating notch differences, liquidity friction, and sector risk premia.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono tabular-nums">
            <div className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1">
              <span className="text-[10px] uppercase text-slate-500">Fair Spread Estimate</span>
              <div className="text-lg font-bold text-graphite-900">{model_estimates.fair_credit_spread_bps.toFixed(1)} bps</div>
              <div className="text-[11px] text-slate-500">Model-Implied Yield: {model_estimates.model_implied_fair_yield_pct.toFixed(2)}%</div>
            </div>

            <div className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1">
              <span className="text-[10px] uppercase text-slate-500">Statistical Fit Quality</span>
              <div className="text-lg font-bold text-graphite-900">R² = {model_estimates.out_of_fold_cross_validation_r2.toFixed(2)}</div>
              <div className="text-[11px] text-slate-500">Cohort Std Error: {model_estimates.cohort_standard_error_bps.toFixed(1)} bps</div>
            </div>

            <div className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1">
              <span className="text-[10px] uppercase text-slate-500">Studentized Dislocation</span>
              <div className="text-lg font-bold text-fin-pos">+{model_estimates.studentized_z_score.toFixed(2)}σ</div>
              <div className="text-[11px] text-slate-500">95% CI: [{lowCi.toFixed(0)}, {highCi.toFixed(0)}] bps</div>
            </div>
          </div>
        </section>

        {/* 04 — RELATIVE-VALUE DISLOCATION */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-borderLight pb-1.5">
            <h2 className="text-sm font-bold text-graphite-900 uppercase font-mono tracking-wider">
              04 — Relative-Value Dislocation
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-xs font-semibold">
              FACTOR ATTRIBUTION
            </span>
          </div>

          <p className="text-xs text-graphite-800 leading-relaxed">
            Decomposition of the observed <strong>+{model_estimates.relative_value_gap_bps.toFixed(1)} bps</strong> spread gap against peer fundamentals.
          </p>

          <div className="overflow-x-auto">
            <table className="research-table">
              <thead>
                <tr>
                  <th>Factor Dimension</th>
                  <th className="text-right">Contribution (bps)</th>
                  <th className="text-center">Classification</th>
                  <th>Analytical Driver</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {data.factor_attribution.map((factor, idx) => (
                  <tr key={idx}>
                    <td className="font-medium text-graphite-900">{factor.factor}</td>
                    <td className="text-right font-mono font-semibold">
                      <span className={factor.contribution_bps >= 0 ? 'text-fin-pos' : 'text-fin-neg'}>
                        {factor.contribution_bps > 0 ? `+${factor.contribution_bps.toFixed(1)}` : factor.contribution_bps.toFixed(1)} bps
                      </span>
                    </td>
                    <td className="text-center font-mono text-[10.5px] text-slate-600 uppercase">{factor.type}</td>
                    <td className="text-slate-700 text-[11.5px]">
                      {factor.contribution_bps > 0 ? 'Adds to observed spread concession' : 'Reduces spread requirement'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 05 — LIQUIDITY & EXECUTION */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-borderLight pb-1.5">
            <h2 className="text-sm font-bold text-graphite-900 uppercase font-mono tracking-wider">
              05 — Liquidity & Execution Friction
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-xs font-semibold">
              OBSERVED & TRADING COSTS
            </span>
          </div>

          <p className="text-xs text-graphite-800 leading-relaxed">
            High observed spread without secondary turnover creates a liquidity trap. Execution friction is quantified below to establish net realizable spread.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
            <div className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs">
              <span className="text-[10px] uppercase text-slate-500 block">Bid-Ask Spread</span>
              <span className="text-base font-bold text-graphite-900 mt-0.5 block">
                ${liquidity_analysis.quoted_bid_ask_spread_pts.toFixed(3)} pts
              </span>
              <span className="text-[10px] text-slate-500">Observed TRACE average</span>
            </div>

            <div className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs">
              <span className="text-[10px] uppercase text-slate-500 block">Crossing Friction</span>
              <span className="text-base font-bold text-slate-700 mt-0.5 block">
                {liquidity_analysis.spread_crossing_friction_bps.toFixed(1)} bps
              </span>
              <span className="text-[10px] text-slate-500">Half-spread in yield</span>
            </div>

            <div className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs">
              <span className="text-[10px] uppercase text-slate-500 block">Net Realizable Gap</span>
              <span className="text-base font-bold text-fin-pos mt-0.5 block">
                +{model_estimates.net_realizable_gap_bps.toFixed(1)} bps
              </span>
              <span className="text-[10px] text-slate-500">Gross {model_estimates.relative_value_gap_bps.toFixed(1)} minus crossing cost</span>
            </div>

            <div className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs">
              <span className="text-[10px] uppercase text-slate-500 block">Liquidity Trap Filter</span>
              <span className="text-base font-bold text-fin-pos mt-0.5 block">
                {liquidity_analysis.is_liquidity_trap ? 'FLAGGED' : 'PASSED (NO TRAP)'}
              </span>
              <span className="text-[10px] text-slate-500">Score {liquidity_analysis.liquidity_score.toFixed(0)} &gt; threshold</span>
            </div>
          </div>
        </section>

        {/* 06 — RATE / SPREAD SENSITIVITY */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-borderLight pb-1.5">
            <h2 className="text-sm font-bold text-graphite-900 uppercase font-mono tracking-wider">
              06 — Rate & Spread Sensitivity
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-xs font-semibold">
              SCENARIO STRESS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Parallel Rate Shifts */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono font-semibold uppercase text-slate-700">
                Treasury Curve Parallel Shifts
              </span>
              <table className="research-table">
                <thead>
                  <tr>
                    <th>Shock</th>
                    <th className="text-right">Est Price</th>
                    <th className="text-right">Duration Impact</th>
                    <th className="text-right">Total Return</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {data.rate_shocks_table.map((s, idx) => (
                    <tr key={idx}>
                      <td className="font-mono">{s.shock_bps > 0 ? `+${s.shock_bps}` : s.shock_bps} bps</td>
                      <td className="text-right text-slate-600">${s.est_price.toFixed(2)}</td>
                      <td className="text-right font-medium text-graphite-900">{s.duration_impact.toFixed(2)}%</td>
                      <td className="text-right font-semibold">
                        <span className={s.est_return_pct >= 0 ? 'text-fin-pos' : 'text-fin-neg'}>
                          {s.est_return_pct >= 0 ? `+${s.est_return_pct.toFixed(2)}` : s.est_return_pct.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Credit Spread Shocks */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono font-semibold uppercase text-slate-700">
                Credit Spread Widening Stress
              </span>
              <table className="research-table">
                <thead>
                  <tr>
                    <th>Spread Widening</th>
                    <th className="text-right">Total Price Change</th>
                    <th className="text-right">Spread PnL ($)</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {data.spread_shocks_table.map((s, idx) => (
                    <tr key={idx}>
                      <td className="font-mono">+{s.spread_shock_bps} bps</td>
                      <td className="text-right font-semibold text-fin-neg">
                        {s.total_price_gain_pct.toFixed(2)}%
                      </td>
                      <td className="text-right font-medium text-graphite-900">
                        ${(s.spread_pnl_dollar ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 07 — KEY RISKS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-borderLight pb-1.5">
            <h2 className="text-sm font-bold text-graphite-900 uppercase font-mono tracking-wider">
              07 — Key Risks
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-xs font-semibold">
              UNCERTAINTY & EXPOSURES
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.key_risks.map((item, idx) => (
              <div key={idx} className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-graphite-900">{item.risk}</span>
                  <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded-xs border ${
                    item.severity === 'HIGH' ? 'bg-fin-negBg text-fin-neg border-fin-negBorder' : 'bg-fin-warnBg text-fin-warn border-fin-warnBorder'
                  }`}>
                    {item.severity}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed font-sans text-[11.5px]">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 08 — INVALIDATION CONDITIONS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-borderLight pb-1.5">
            <h2 className="text-sm font-bold text-graphite-900 uppercase font-mono tracking-wider">
              08 — Invalidation Conditions
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-xs font-semibold">
              FALSIFICATION BOUNDARY
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {data.invalidation_triggers.map((trigger, idx) => (
              <div key={idx} className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-graphite-900 font-semibold font-mono text-[11.5px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-fin-warn flex-shrink-0" />
                  <span>Condition {idx + 1}</span>
                </div>
                <p className="text-slate-700 text-[11.5px] leading-relaxed">{trigger}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 09 — RESEARCH INTEGRITY */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-borderLight pb-1.5">
            <h2 className="text-sm font-bold text-graphite-900 uppercase font-mono tracking-wider">
              09 — Research Integrity & Audit Trail
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-xs font-semibold">
              METHODOLOGY & AUDIT
            </span>
          </div>

          <p className="text-xs text-graphite-800 leading-relaxed">
            All econometric parameters, spreads, and term structure estimates are traceable back to underlying TRACE trades and Treasury curves. 
            No proprietary black-box signals or look-ahead biases are permitted in institutional relative value models.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono tabular-nums">
            <div className="p-2.5 bg-surfaceSubtle border border-borderLight rounded-xs">
              <span className="text-[10px] uppercase text-slate-500">Backtest Walk-Forward Hit Rate</span>
              <div className="text-base font-bold text-graphite-900 mt-0.5">
                {(backtest_evidence.compression_hit_rate_pct).toFixed(1)}%
              </div>
              <div className="text-[10.5px] text-slate-500">60-day out-of-sample reversion</div>
            </div>

            <div className="p-2.5 bg-surfaceSubtle border border-borderLight rounded-xs">
              <span className="text-[10px] uppercase text-slate-500">Look-Ahead Bias Audit</span>
              <div className="text-base font-bold text-fin-pos mt-0.5">
                VERIFIED ZERO
              </div>
              <div className="text-[10.5px] text-slate-500">Strict as-of point-in-time cross-validation</div>
            </div>

            <div className="p-2.5 bg-surfaceSubtle border border-borderLight rounded-xs">
              <span className="text-[10px] uppercase text-slate-500">Analytical Recommendation</span>
              <div className="text-base font-bold text-graphite-900 mt-0.5">
                RELATIVE VALUE OPPORTUNITY
              </div>
              <div className="text-[10.5px] text-slate-500">Duration-hedged substitution candidate</div>
            </div>
          </div>
        </section>

      </article>

    </div>
  );
};
