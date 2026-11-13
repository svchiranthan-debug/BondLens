import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { 
  ChevronLeft, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  Sliders, 
  ArrowUpDown,
  FileText,
  Layers,
  Database,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { fetchBondResearch, fetchCustomPeers } from '../services/api';
import { BondResearchDetail, PeerResult, PeerItem } from '../types';

interface AnalystDeepDiveViewProps {
  isin: string;
  onBack: () => void;
  onSelectPeer: (isin: string) => void;
  onNavigateTab?: (tab: 'surface3d' | 'caseStudy' | 'provenance' | 'screener') => void;
}

export const AnalystDeepDiveView: React.FC<AnalystDeepDiveViewProps> = ({
  isin,
  onBack,
  onSelectPeer,
  onNavigateTab
}) => {
  const [data, setData] = useState<BondResearchDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sub-navigation tab inside Bond Dossier:
  // 'overview' | 'valuation' | 'peers' | 'risk' | 'surface3d' | 'caseStudy' | 'provenance'
  const [dossierTab, setDossierTab] = useState<'overview' | 'valuation' | 'peers' | 'risk' | 'surface3d'>('overview');

  // Dynamic Peer customization state
  const [peerWeightRating, setPeerWeightRating] = useState<number>(0.35);
  const [peerWeightSector, setPeerWeightSector] = useState<number>(0.25);
  const [peerWeightDuration, setPeerWeightDuration] = useState<number>(0.20);
  const [sameSectorOnly, setSameSectorOnly] = useState<boolean>(false);
  const [maxRatingDiff, setMaxRatingDiff] = useState<number>(2);
  const [customPeers, setCustomPeers] = useState<PeerResult | null>(null);
  const [updatingPeers, setUpdatingPeers] = useState<boolean>(false);

  const loadBondData = async (targetIsin: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBondResearch(targetIsin);
      setData(res);
      setCustomPeers(res.peers);
    } catch (err: any) {
      setError(err.message || `Failed to load bond ${targetIsin}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isin) {
      loadBondData(isin);
    }
  }, [isin]);

  const handleUpdatePeers = async () => {
    if (!data) return;
    setUpdatingPeers(true);
    try {
      const res = await fetchCustomPeers({
        isin: data.bond.isin,
        max_peers: 8,
        same_sector_only: sameSectorOnly,
        max_rating_notch_diff: maxRatingDiff,
        weight_rating: peerWeightRating,
        weight_sector: peerWeightSector,
        weight_duration: peerWeightDuration
      });
      setCustomPeers(res);
    } catch (err) {
      console.error('Failed to update peers:', err);
    } finally {
      setUpdatingPeers(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[65vh]">
        <div className="flex flex-col items-center space-y-2 text-slate-500 font-mono text-xs">
          <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
          <span>Generating institutional security dossier for {isin}...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-border p-8 text-center space-y-4 rounded-sm max-w-xl mx-auto mt-10">
        <div className="text-fin-neg font-mono text-sm font-semibold">{error || 'Bond not found'}</div>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-xs bg-navy-900 text-white text-xs font-mono"
        >
          Return to Research Universe
        </button>
      </div>
    );
  }

  const { bond, valuation, decomposition, stress_testing, benchmark_curve } = data;
  const peerList: PeerItem[] = (customPeers && customPeers.peers) || (data.peers && data.peers.peers) || [];

  // Waterfall Chart for Factor Decomposition
  const waterfallSteps = decomposition.waterfall_steps || [];
  const waterfallPlotData = [
    {
      type: 'waterfall',
      orientation: 'v',
      measure: waterfallSteps.map(s => {
        if (s.type === 'base') return 'absolute';
        if (s.type === 'subtotal' || s.type === 'total') return 'total';
        return 'relative';
      }),
      x: waterfallSteps.map(s => s.factor),
      y: waterfallSteps.map(s => s.contribution_bps),
      textposition: 'outside',
      text: waterfallSteps.map(s => `${s.contribution_bps > 0 ? '+' : ''}${s.contribution_bps.toFixed(0)} bps`),
      textfont: { size: 10, family: 'JetBrains Mono', color: '#1E293B' },
      connector: { line: { color: '#CBD5E1', width: 1 } },
      increasing: { marker: { color: '#166534' } },
      decreasing: { marker: { color: '#991B1B' } },
      totals: { marker: { color: '#0F2942' } }
    }
  ];

  // Rate shock scenarios (at 0 spread shock)
  const baseSpreadMatrixRow = stress_testing.matrix.find(m => m.spread_shock_bps === 0) || stress_testing.matrix[0];
  const rateScenarios = baseSpreadMatrixRow ? baseSpreadMatrixRow.scenarios : [];

  // Spread shock scenarios (at 0 rate shock)
  const spreadScenarios = stress_testing.matrix.map(row => {
    const zeroRateScen = row.scenarios.find(s => s.rate_shock_bps === 0) || row.scenarios[0];
    return {
      spread_shock_bps: row.spread_shock_bps,
      estimated_price: zeroRateScen ? zeroRateScen.estimated_price : bond.clean_price,
      estimated_total_return_pct: zeroRateScen ? zeroRateScen.estimated_total_return_pct : 0,
      new_spread_bps: bond.credit_spread_bps + row.spread_shock_bps
    };
  });

  const netRealizable = bond.net_realizable_gap_bps ?? (valuation.relative_value_gap_bps - (bond.bid_ask_spread_bps ? bond.bid_ask_spread_bps / 2 : 2));
  const breakevenWidening = bond.modified_duration > 0 ? Math.abs(valuation.relative_value_gap_bps) : 47.5;

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto pb-20">
      
      {/* ========================================================================= */}
      {/* 1. HEADER (Exact user specification)                                     */}
      {/* ========================================================================= */}
      <div className="bg-white border border-border p-5 rounded-xs shadow-card border-l-4 border-l-navy-900 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
              <button 
                onClick={onBack}
                className="flex items-center space-x-1 hover:text-royal-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to Universe</span>
              </button>
              <span>/</span>
              <span>Security Dossier</span>
              <span>/</span>
              <span className="text-graphite-900 font-semibold">{bond.isin}</span>
            </div>

            <div className="flex flex-wrap items-baseline gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-graphite-900 uppercase font-sans">
                {bond.issuer}
              </h1>
              <span className="px-2 py-0.5 rounded-xs text-[10.5px] font-mono font-semibold bg-royal-50 text-royal-800 border border-royal-200">
                ACTIVE COVERAGE
              </span>
            </div>

            <div className="text-sm font-semibold text-slate-700 font-mono">
              {bond.coupon_pct.toFixed(2)}% due {bond.maturity_date}
            </div>
            <div className="text-xs font-mono text-slate-500 flex flex-wrap items-center gap-2 pt-0.5">
              <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded-xs text-graphite-900 font-semibold">{bond.isin}</span>
              <span>•</span>
              <span>Senior Unsecured</span>
              <span>•</span>
              <span>Sector: <strong className="text-slate-700 font-medium">{bond.sector}</strong></span>
              <span>•</span>
              <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded-xs text-graphite-900 font-semibold">{bond.rating}</span>
            </div>
          </div>

          {/* Valuation Badge & Quick Jump Buttons */}
          <div className="flex flex-col items-end space-y-2">
            <span className={`px-3 py-1 text-xs font-mono font-bold rounded-xs border shadow-xs ${
              valuation.classification.includes('Cheap')
                ? 'bg-tealFin-50 text-tealFin-800 border-tealFin-300'
                : valuation.classification.includes('Rich')
                ? 'bg-coralFin-50 text-coralFin-800 border-coralFin-300'
                : 'bg-slate-100 text-slate-800 border-slate-300'
            }`}>
              {valuation.classification.toUpperCase()} • RV GAP: {valuation.relative_value_gap_bps > 0 ? `+${valuation.relative_value_gap_bps.toFixed(1)}` : valuation.relative_value_gap_bps.toFixed(1)} bp
            </span>

            {onNavigateTab && (
              <div className="flex items-center space-x-1.5 pt-1">
                <button
                  onClick={() => onNavigateTab('caseStudy')}
                  className="px-2.5 py-1 rounded-xs border border-border bg-white hover:bg-slate-50 hover:border-royal-400 text-slate-700 text-xs font-mono flex items-center space-x-1 transition-colors shadow-xs"
                  title="Open 12-factor research memo for this security"
                >
                  <FileText className="w-3.5 h-3.5 text-royal-700" />
                  <span>Case Study</span>
                </button>
                <button
                  onClick={() => onNavigateTab('provenance')}
                  className="px-2.5 py-1 rounded-xs border border-border bg-white hover:bg-slate-50 hover:border-royal-400 text-slate-700 text-xs font-mono flex items-center space-x-1 transition-colors shadow-xs"
                  title="Inspect formula traceability for this security"
                >
                  <Database className="w-3.5 h-3.5 text-royal-700" />
                  <span>Provenance</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COMPACT ANALYTICAL METRIC STRIP (Dominant RV Gap & RV Score)          */}
      {/* ========================================================================= */}
      <div className="bg-white border border-border rounded-xs shadow-card p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center tabular-nums">
          {/* YTM */}
          <div className="p-2.5 bg-slate-50/80 border border-slate-200 rounded-xs flex flex-col justify-center accent-strip-slate">
            <span className="text-[10px] uppercase font-sans font-semibold text-slate-500 tracking-wider">YTM</span>
            <div className="text-base font-bold font-mono text-graphite-900 mt-0.5">
              {bond.ytm_pct.toFixed(3)}%
            </div>
            <span className="text-[9.5px] text-slate-400 font-sans">Semi-annual</span>
          </div>

          {/* G-SPREAD */}
          <div className="p-2.5 bg-slate-50/80 border border-slate-200 rounded-xs flex flex-col justify-center accent-strip-slate">
            <span className="text-[10px] uppercase font-sans font-semibold text-slate-500 tracking-wider">G-Spread</span>
            <div className="text-base font-bold font-mono text-graphite-900 mt-0.5">
              {bond.credit_spread_bps.toFixed(1)} <span className="text-xs font-normal text-slate-400">bp</span>
            </div>
            <span className="text-[9.5px] text-slate-400 font-sans">vs UST curve</span>
          </div>

          {/* FAIR SPREAD */}
          <div className="p-2.5 bg-indigoAcc-50/40 border border-indigoAcc-200/80 rounded-xs flex flex-col justify-center accent-strip-indigo">
            <span className="text-[10px] uppercase font-sans font-semibold text-indigoAcc-800 tracking-wider">Fair Spread</span>
            <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
              {valuation.fair_spread_bps.toFixed(1)} <span className="text-xs font-normal text-slate-400">bp</span>
            </div>
            <span className="text-[9.5px] text-indigoAcc-600 font-sans">Model implied</span>
          </div>

          {/* RV GAP - Visually Dominant with subtle tinted background */}
          <div className={`p-2.5 rounded-xs border flex flex-col justify-center shadow-xs ${
            valuation.relative_value_gap_bps >= 0 
              ? 'bg-tealFin-50 border-tealFin-300 text-tealFin-900 accent-strip-teal' 
              : 'bg-coralFin-50 border-coralFin-300 text-coralFin-900 accent-strip-coral'
          }`}>
            <span className="text-[10px] uppercase font-sans font-bold tracking-wider opacity-90">RV GAP</span>
            <div className={`text-2xl font-black font-mono mt-0.5 ${valuation.relative_value_gap_bps >= 0 ? 'text-tealFin-700' : 'text-coralFin-700'}`}>
              {valuation.relative_value_gap_bps > 0 ? `+${valuation.relative_value_gap_bps.toFixed(1)}` : valuation.relative_value_gap_bps.toFixed(1)} <span className="text-xs font-semibold">bp</span>
            </div>
            <span className="text-[9.5px] opacity-80 font-sans font-medium">Dislocation</span>
          </div>

          {/* DURATION */}
          <div className="p-2.5 bg-slate-50/80 border border-slate-200 rounded-xs flex flex-col justify-center accent-strip-slate">
            <span className="text-[10px] uppercase font-sans font-semibold text-slate-500 tracking-wider">Duration</span>
            <div className="text-base font-bold font-mono text-graphite-900 mt-0.5">
              {bond.modified_duration.toFixed(2)}Y
            </div>
            <span className="text-[9.5px] text-slate-400 font-sans">Modified years</span>
          </div>

          {/* RV SCORE - Visually Dominant */}
          <div className="p-2.5 bg-royal-50/70 border border-royal-200/90 rounded-xs flex flex-col justify-center accent-strip-navy shadow-xs">
            <span className="text-[10px] uppercase font-sans font-bold tracking-wider text-navy-950">RV SCORE</span>
            <div className="text-2xl font-black font-mono text-navy-950 mt-0.5">
              {bond.relative_value_score.toFixed(1)} <span className="text-xs font-normal text-slate-500 font-sans">/ 100</span>
            </div>
            <span className="text-[9.5px] text-slate-600 font-sans font-medium">Cohort composite</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DOSSIER SUB-NAVIGATION TABS (Overview, RV, Peers, Risk, 3D, etc.)     */}
      {/* ========================================================================= */}
      <div className="flex items-center space-x-1 border-b border-border text-xs font-mono">
        <button
          onClick={() => setDossierTab('overview')}
          className={`px-4 py-2 border-b-2 font-semibold transition-colors ${
            dossierTab === 'overview'
              ? 'border-royal-600 text-navy-950 bg-royal-50/50'
              : 'border-transparent text-slate-600 hover:text-navy-900'
          }`}
        >
          Overview & Thesis
        </button>

        <button
          onClick={() => setDossierTab('valuation')}
          className={`px-4 py-2 border-b-2 font-semibold transition-colors ${
            dossierTab === 'valuation'
              ? 'border-royal-600 text-navy-950 bg-royal-50/50'
              : 'border-transparent text-slate-600 hover:text-navy-900'
          }`}
        >
          Relative Value & Decomposition
        </button>

        <button
          onClick={() => setDossierTab('peers')}
          className={`px-4 py-2 border-b-2 font-semibold transition-colors ${
            dossierTab === 'peers'
              ? 'border-royal-600 text-navy-950 bg-royal-50/50'
              : 'border-transparent text-slate-600 hover:text-navy-900'
          }`}
        >
          Peer Comparison ({peerList.length})
        </button>

        <button
          onClick={() => setDossierTab('risk')}
          className={`px-4 py-2 border-b-2 font-semibold transition-colors ${
            dossierTab === 'risk'
              ? 'border-royal-600 text-navy-950 bg-royal-50/50'
              : 'border-transparent text-slate-600 hover:text-navy-900'
          }`}
        >
          Risk & Stress Testing
        </button>

        <button
          onClick={() => setDossierTab('surface3d')}
          className={`px-4 py-2 border-b-2 font-semibold transition-colors flex items-center space-x-1 ${
            dossierTab === 'surface3d'
              ? 'border-royal-600 text-navy-950 bg-royal-50/50'
              : 'border-transparent text-slate-600 hover:text-navy-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>3D Term Position</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. TAB CONTENT: OVERVIEW & "WHY THIS SECURITY?"                           */}
      {/* ========================================================================= */}
      {dossierTab === 'overview' && (
        <div className="space-y-5">
          
          {/* "WHY THIS SECURITY?" SECTION (Analyst Research Conclusion Layout) */}
          <div className="bg-white border border-border p-5 rounded-xs shadow-card space-y-3.5 border-l-4 border-l-royal-700">
            <div className="flex items-center justify-between border-b border-borderLight pb-2">
              <div>
                <span className="text-[9.5px] uppercase font-mono font-semibold text-royal-700 tracking-wider">INVESTMENT RESEARCH BRIEFING</span>
                <h2 className="text-sm font-bold text-graphite-900 uppercase tracking-tight font-sans flex items-center space-x-1.5 mt-0.5">
                  <Info className="w-4 h-4 text-royal-700" />
                  <span>WHY THIS SECURITY? — FIVE-STEP RESEARCH THESIS</span>
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-slate-100 text-slate-600 border border-slate-200">
                SYSTEMATIC COHORT EVALUATION
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 text-xs font-sans">
              
              {/* 01 RELATIVE SPREAD POSITION */}
              <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xs space-y-1.5 accent-strip-slate">
                <div className="flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-xs bg-navy-900 text-white flex items-center justify-center font-mono font-bold text-[10px]">01</span>
                  <span className="font-bold text-graphite-900 text-[11px] uppercase tracking-wide">Spread Position</span>
                </div>
                <p className="text-slate-700 text-[11.5px] leading-relaxed mt-1">
                  Observed G-Spread of <strong className="text-graphite-900 font-mono">{bond.credit_spread_bps.toFixed(1)} bp</strong> vs US Treasury curve represents the <strong className="font-mono text-royal-900">{valuation.spread_percentile_in_sector.toFixed(0)}th percentile</strong> in the {bond.sector} sector.
                </p>
              </div>

              {/* 02 MODEL FAIR VALUE */}
              <div className="p-3 bg-indigoAcc-50/40 border border-indigoAcc-200/80 rounded-xs space-y-1.5 accent-strip-indigo">
                <div className="flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-xs bg-indigoAcc-700 text-white flex items-center justify-center font-mono font-bold text-[10px]">02</span>
                  <span className="font-bold text-indigoAcc-950 text-[11px] uppercase tracking-wide">Model Fair Value</span>
                </div>
                <p className="text-slate-700 text-[11.5px] leading-relaxed mt-1">
                  Huber robust model estimates fair spread at <strong className="font-mono">{valuation.fair_spread_bps.toFixed(1)} bp</strong>, creating an RV gap of <strong className={`font-mono ${valuation.relative_value_gap_bps >= 0 ? 'text-tealFin-700' : 'text-coralFin-700'}`}>{valuation.relative_value_gap_bps > 0 ? `+${valuation.relative_value_gap_bps.toFixed(1)}` : valuation.relative_value_gap_bps.toFixed(1)} bp</strong> ({valuation.z_score > 0 ? '+' : ''}{valuation.z_score.toFixed(2)}σ).
                </p>
              </div>

              {/* 03 PEER COMPARISON */}
              <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xs space-y-1.5 accent-strip-slate">
                <div className="flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-xs bg-navy-900 text-white flex items-center justify-center font-mono font-bold text-[10px]">03</span>
                  <span className="font-bold text-graphite-900 text-[11px] uppercase tracking-wide">Peer Cohort</span>
                </div>
                <p className="text-slate-700 text-[11.5px] leading-relaxed mt-1">
                  Trades at a <strong className="font-mono text-graphite-900">+{Math.abs(valuation.relative_value_gap_bps).toFixed(1)} bp</strong> concession against matched peer cohort in {bond.sector} with comparable duration and covenant structure.
                </p>
              </div>

              {/* 04 LIQUIDITY */}
              <div className="p-3 bg-tealFin-50/40 border border-tealFin-200/80 rounded-xs space-y-1.5 accent-strip-teal">
                <div className="flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-xs bg-tealFin-700 text-white flex items-center justify-center font-mono font-bold text-[10px]">04</span>
                  <span className="font-bold text-tealFin-950 text-[11px] uppercase tracking-wide">Liquidity</span>
                </div>
                <p className="text-slate-700 text-[11.5px] leading-relaxed mt-1">
                  Liquidity score of <strong className="font-mono">{bond.liquidity_score.toFixed(0)}/100</strong> and bid-ask friction of <strong className="font-mono">${bond.bid_ask_spread_pts.toFixed(2)} pts</strong> confirm net realizable spread retains <strong className="text-tealFin-700 font-mono">+{netRealizable.toFixed(1)} bp</strong>.
                </p>
              </div>

              {/* 05 RISK / INVALIDATION */}
              <div className="p-3 bg-coralFin-50/40 border border-coralFin-200/80 rounded-xs space-y-1.5 accent-strip-coral">
                <div className="flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-xs bg-coralFin-700 text-white flex items-center justify-center font-mono font-bold text-[10px]">05</span>
                  <span className="font-bold text-coralFin-950 text-[11px] uppercase tracking-wide">Risk / Invalidation</span>
                </div>
                <p className="text-slate-700 text-[11.5px] leading-relaxed mt-1">
                  <strong className="text-graphite-900 font-sans">Thesis Vulnerability:</strong> {bond.main_risk}. Breakeven buffer absorbs +{breakevenWidening.toFixed(1)} bp widening over 3 months.
                </p>
              </div>

            </div>
          </div>

          {/* Market Data & Pricing Schedule */}
          <div className="bg-white border border-border p-4 rounded-sm shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-borderLight pb-2">
              <h2 className="text-xs font-semibold text-graphite-900 uppercase tracking-wider font-mono">
                Market Data & Issue Specification
              </h2>
              <span className="text-[10.5px] font-mono text-slate-500">Convention: 30/360 Semi-Annual</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs tabular-nums">
              <div className="p-2.5 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Pricing Breakdown</span>
                <div className="flex justify-between">
                  <span className="text-slate-600">Clean Price:</span>
                  <strong className="text-graphite-900">${bond.clean_price.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Dirty Price:</span>
                  <strong className="text-graphite-900">${bond.dirty_price.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Accrued Interest:</span>
                  <strong className="text-graphite-900">${(bond.dirty_price - bond.clean_price).toFixed(2)}</strong>
                </div>
              </div>

              <div className="p-2.5 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Issue Structure</span>
                <div className="flex justify-between">
                  <span className="text-slate-600">Coupon Rate:</span>
                  <strong className="text-graphite-900">{bond.coupon_pct.toFixed(2)}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment Frequency:</span>
                  <strong className="text-graphite-900">Semi-Annual</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tenor to Maturity:</span>
                  <strong className="text-graphite-900">{bond.maturity_years.toFixed(1)} yrs</strong>
                </div>
              </div>

              <div className="p-2.5 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Duration Mechanics</span>
                <div className="flex justify-between">
                  <span className="text-slate-600">Macaulay Duration:</span>
                  <strong className="text-graphite-900">{bond.macaulay_duration.toFixed(2)} yrs</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Modified Duration:</span>
                  <strong className="text-graphite-900">{bond.modified_duration.toFixed(2)} yrs</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">DV01 / Risk Pt:</span>
                  <strong className="text-graphite-900">${bond.dv01.toFixed(3)}</strong>
                </div>
              </div>

              <div className="p-2.5 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Execution Friction</span>
                <div className="flex justify-between">
                  <span className="text-slate-600">Bid-Ask Spread:</span>
                  <strong className="text-graphite-900">{bond.bid_ask_spread_pts.toFixed(2)} pts</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Net Realizable Gap:</span>
                  <strong className="text-fin-pos">+{netRealizable.toFixed(1)} bps</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Liquidity Trap:</span>
                  <strong className="text-fin-pos">{bond.is_liquidity_trap ? 'FLAGGED' : 'CLEARED'}</strong>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB CONTENT: RELATIVE VALUE & WATERFALL DECOMPOSITION                  */}
      {/* ========================================================================= */}
      {dossierTab === 'valuation' && (
        <div className="bg-white border border-border p-4 rounded-sm shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-borderLight pb-2">
            <h2 className="text-xs font-semibold text-graphite-900 uppercase tracking-wider font-mono">
              Valuation & Econometric Spread Decomposition
            </h2>
            <span className="text-[10.5px] font-mono text-slate-500">
              Model: {valuation.model_name} (Confidence: {valuation.model_confidence_score.toFixed(0)}%)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Spread Comparison Summary Box */}
            <div className="lg:col-span-4 space-y-3 text-xs">
              <div className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs space-y-2 tabular-nums">
                <div className="flex justify-between items-baseline border-b border-borderLight pb-1.5">
                  <span className="text-slate-600">Observed G-Spread:</span>
                  <span className="text-base font-bold text-graphite-900 font-mono">{valuation.observed_spread_bps.toFixed(1)} bps</span>
                </div>
                <div className="flex justify-between items-baseline border-b border-borderLight pb-1.5">
                  <span className="text-slate-600">Econometric Fair Spread:</span>
                  <span className="text-base font-bold text-slate-800 font-mono">{valuation.fair_spread_bps.toFixed(1)} bps</span>
                </div>
                <div className="flex justify-between items-baseline border-b border-borderLight pb-1.5">
                  <span className="text-slate-600">Gross RV Dislocation:</span>
                  <span className={`text-base font-bold font-mono ${valuation.relative_value_gap_bps >= 0 ? 'text-fin-pos' : 'text-fin-neg'}`}>
                    {valuation.relative_value_gap_bps > 0 ? `+${valuation.relative_value_gap_bps.toFixed(1)}` : valuation.relative_value_gap_bps.toFixed(1)} bps
                  </span>
                </div>
                <div className="flex justify-between items-baseline border-b border-borderLight pb-1.5">
                  <span className="text-slate-600">Cohort Standard Error:</span>
                  <span className="text-slate-600 font-mono">
                    ±{valuation.standard_error_bps.toFixed(1)} bps
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="font-semibold text-graphite-900">Net Realizable RV Gap:</span>
                  <span className="text-base font-bold text-fin-pos font-mono">
                    +{netRealizable.toFixed(1)} bps
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white border border-border rounded-xs space-y-1 text-[11px] leading-relaxed">
                <div className="font-semibold text-graphite-900 font-mono uppercase text-[10px]">Attribution Summary</div>
                <p className="text-slate-700 font-sans">
                  {decomposition.analyst_memo || decomposition.disclaimer}
                </p>
              </div>
            </div>

            {/* Factor Decomposition Waterfall Chart */}
            <div className="lg:col-span-8">
              <div className="w-full h-[300px]">
                <Plot
                  data={waterfallPlotData}
                  layout={{
                    autosize: true,
                    margin: { l: 50, r: 25, t: 20, b: 60 },
                    paper_bgcolor: '#FFFFFF',
                    plot_bgcolor: '#FFFFFF',
                    xaxis: {
                      tickfont: { size: 10, color: '#475569', family: 'Inter' },
                      gridcolor: '#F1F5F9',
                      linecolor: '#CBD5E1'
                    },
                    yaxis: {
                      title: { text: 'Contribution (bps)', font: { size: 11, color: '#334155' } },
                      tickfont: { size: 10, color: '#64748B', family: 'JetBrains Mono' },
                      gridcolor: '#F1F5F9',
                      linecolor: '#CBD5E1'
                    }
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB CONTENT: PEER COMPARISON                                          */}
      {/* ========================================================================= */}
      {dossierTab === 'peers' && (
        <div className="bg-white border border-border p-4 rounded-sm shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between border-b border-borderLight pb-2 gap-2">
            <div>
              <h2 className="text-xs font-semibold text-graphite-900 uppercase tracking-wider font-mono">
                Peer Comparison & Comparable Cohort
              </h2>
              <p className="text-[11px] text-slate-500">
                Multivariate distance peer matching across rating, sector, and duration
              </p>
            </div>

            {/* Peer Filter Controls */}
            <div className="flex items-center space-x-2 text-xs font-mono">
              <label className="flex items-center space-x-1 text-slate-600">
                <input
                  type="checkbox"
                  checked={sameSectorOnly}
                  onChange={(e) => setSameSectorOnly(e.target.checked)}
                  className="accent-navy-900"
                />
                <span>Same Sector Only</span>
              </label>

              <span className="text-borderDark">|</span>

              <div className="flex items-center space-x-1">
                <span className="text-slate-500">Max Notch Diff:</span>
                <select
                  value={maxRatingDiff}
                  onChange={(e) => setMaxRatingDiff(Number(e.target.value))}
                  className="bg-white border border-border rounded-xs px-2 py-0.5 text-xs text-graphite-800"
                >
                  <option value={1}>±1 Notch</option>
                  <option value={2}>±2 Notches</option>
                  <option value={3}>±3 Notches</option>
                </select>
              </div>

              <button
                onClick={handleUpdatePeers}
                disabled={updatingPeers}
                className="px-2 py-1 rounded-xs bg-navy-900 text-white hover:bg-navy-800 text-[11px] transition-colors"
              >
                {updatingPeers ? 'Recalculating...' : 'Apply Weights'}
              </button>
            </div>
          </div>

          {/* Peer Table */}
          <div className="overflow-x-auto">
            <table className="research-table">
              <thead>
                <tr>
                  <th>Issuer</th>
                  <th>Bond / ISIN</th>
                  <th>Rating</th>
                  <th>Sector</th>
                  <th className="text-right">Duration</th>
                  <th className="text-right">G-Spread</th>
                  <th className="text-right">Diff vs Target</th>
                  <th className="text-right">Similarity</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {peerList.map((p) => {
                  const spreadDiff = p.credit_spread_bps - bond.credit_spread_bps;
                  return (
                    <tr key={p.isin} className="hover:bg-slate-50">
                      <td className="font-medium text-graphite-900">{p.issuer}</td>
                      <td>
                        <div>{p.coupon_pct.toFixed(2)}% {p.maturity_date ? p.maturity_date.slice(0, 4) : ''}</div>
                        <div className="text-[10px] font-mono text-slate-500">{p.isin}</div>
                      </td>
                      <td>
                        <span className="font-mono text-[10.5px] text-slate-700">{p.rating}</span>
                      </td>
                      <td className="text-slate-600">{p.sector}</td>
                      <td className="text-right text-slate-700">{p.modified_duration.toFixed(2)}</td>
                      <td className="text-right font-medium text-graphite-900">{p.credit_spread_bps.toFixed(0)} bps</td>
                      <td className="text-right font-semibold">
                        <span className={spreadDiff > 0 ? 'text-fin-pos' : 'text-fin-neg'}>
                          {spreadDiff > 0 ? `+${spreadDiff.toFixed(0)}` : spreadDiff.toFixed(0)} bps
                        </span>
                      </td>
                      <td className="text-right text-slate-700 font-mono">
                        {(p.similarity_score * 100).toFixed(0)}%
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => onSelectPeer(p.isin)}
                          className="px-2 py-0.5 rounded-xs bg-surfaceAlt hover:bg-slate-200 text-graphite-800 text-[11px] font-mono"
                        >
                          Select Peer →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TAB CONTENT: RISK & STRESS TESTING                                     */}
      {/* ========================================================================= */}
      {dossierTab === 'risk' && (
        <div className="bg-white border border-border p-4 rounded-sm shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-borderLight pb-2">
            <h2 className="text-xs font-semibold text-graphite-900 uppercase tracking-wider font-mono">
              Risk & Sensitivity Matrix (Rate & Spread Shocks)
            </h2>
            <span className="text-[10.5px] font-mono text-slate-500">
              Breakeven Spread Widening: <strong className="text-graphite-900 font-semibold">+{breakevenWidening.toFixed(1)} bps</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Parallel Rate Shifts */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-600 font-semibold uppercase">
                Interest Rate Shift (Parallel Curve Shock)
              </span>
              <table className="research-table">
                <thead>
                  <tr>
                    <th>Shift Scenario</th>
                    <th className="text-right">Estimated Price</th>
                    <th className="text-right">Price Impact ($)</th>
                    <th className="text-right">Return Impact (%)</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {rateScenarios.map((s) => (
                    <tr key={s.rate_shock_bps}>
                      <td className="font-mono text-slate-800">
                        {s.rate_shock_bps > 0 ? `+${s.rate_shock_bps}` : s.rate_shock_bps} bps
                      </td>
                      <td className="text-right text-slate-600">${s.estimated_price.toFixed(2)}</td>
                      <td className="text-right text-slate-800 font-medium">${s.dollar_pnl.toFixed(2)}</td>
                      <td className="text-right font-semibold">
                        <span className={s.estimated_total_return_pct >= 0 ? 'text-fin-pos' : 'text-fin-neg'}>
                          {s.estimated_total_return_pct >= 0 ? `+${s.estimated_total_return_pct.toFixed(2)}` : s.estimated_total_return_pct.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Credit Spread Widening */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-600 font-semibold uppercase">
                Credit Spread Widening (Convexity-Adjusted)
              </span>
              <table className="research-table">
                <thead>
                  <tr>
                    <th>Spread Shock</th>
                    <th className="text-right">New Spread</th>
                    <th className="text-right">Estimated Price</th>
                    <th className="text-right">Return Impact (%)</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {spreadScenarios.map((s) => (
                    <tr key={s.spread_shock_bps}>
                      <td className="font-mono text-slate-800">
                        +{s.spread_shock_bps} bps
                      </td>
                      <td className="text-right text-slate-600">{s.new_spread_bps.toFixed(0)} bps</td>
                      <td className="text-right text-slate-800 font-medium">${s.estimated_price.toFixed(2)}</td>
                      <td className="text-right font-semibold text-fin-neg">
                        {s.estimated_total_return_pct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. TAB CONTENT: 3D POSITION OVERVIEW                                      */}
      {/* ========================================================================= */}
      {dossierTab === 'surface3d' && (
        <div className="bg-white border border-border p-5 rounded-sm shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-borderLight pb-2">
            <div>
              <h2 className="text-xs font-semibold text-graphite-900 uppercase tracking-wider font-mono">
                Position on 3D Relative Value Landscape
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Term structure coordinates: Duration = {bond.modified_duration.toFixed(2)}y, G-Spread = {bond.credit_spread_bps.toFixed(0)} bps, RV Score = {bond.relative_value_score.toFixed(1)}/100
              </p>
            </div>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('surface3d')}
                className="px-3 py-1.5 bg-navy-900 text-white rounded-xs font-mono text-xs flex items-center space-x-1.5 hover:bg-navy-800 transition-colors"
              >
                <span>Open Full 3D Universe Surface →</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs tabular-nums">
            <div className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-500">X-Axis Coordinate</span>
              <div className="text-base font-bold font-mono text-graphite-900">{bond.modified_duration.toFixed(2)} yrs</div>
              <div className="text-[11px] text-slate-500 font-sans">Modified Duration position on term curve</div>
            </div>

            <div className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-500">Y-Axis Coordinate</span>
              <div className="text-base font-bold font-mono text-graphite-900">{bond.credit_spread_bps.toFixed(0)} bps</div>
              <div className="text-[11px] text-slate-500 font-sans">Observed benchmark credit spread</div>
            </div>

            <div className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-500">Z-Axis Elevation</span>
              <div className="text-base font-bold font-mono text-fin-pos">{bond.relative_value_score.toFixed(1)} / 100</div>
              <div className="text-[11px] text-slate-500 font-sans">Normalized econometric relative value score</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
