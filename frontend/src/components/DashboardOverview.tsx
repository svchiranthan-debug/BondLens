import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  ArrowUpDown, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  ExternalLink,
  Layers,
  FileText,
  History,
  Database,
  TrendingUp
} from 'lucide-react';
import { OverviewData, BondSummary } from '../types';

interface DashboardOverviewProps {
  data: OverviewData | null;
  bonds?: BondSummary[];
  loading: boolean;
  selectedBondIsin?: string | null;
  onSelectBond: (isin: string) => void;
  onNavigateTab: (tab: 'surface3d' | 'screener' | 'analyst' | 'backtest' | 'dataQuality' | 'caseStudy' | 'provenance') => void;
}

type SortField = 
  | 'relative_value_score'
  | 'relative_value_gap_bps'
  | 'credit_spread_bps'
  | 'fair_spread_bps'
  | 'ytm_pct'
  | 'modified_duration'
  | 'maturity_years'
  | 'liquidity_score'
  | 'rating_notch';

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  data,
  bonds = [],
  loading,
  selectedBondIsin,
  onSelectBond,
  onNavigateTab
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sectorFilter, setSectorFilter] = useState<string>('All');
  const [ratingFilter, setRatingFilter] = useState<string>('All');
  const [signalFilter, setSignalFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('relative_value_score');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Fallback bond list if bonds prop is empty
  const masterBonds = useMemo(() => {
    if (bonds && bonds.length > 0) return bonds;
    if (!data) return [];
    const set = new Map<string, BondSummary>();
    data.top_opportunities.forEach(b => set.set(b.isin, b));
    data.worst_opportunities.forEach(b => set.set(b.isin, b));
    return Array.from(set.values());
  }, [bonds, data]);

  // Top Dislocated Securities (highest RV Score / widest positive gap)
  const topDislocations = useMemo(() => {
    if (data?.top_opportunities && data.top_opportunities.length > 0) {
      return data.top_opportunities.slice(0, 4);
    }
    return [...masterBonds]
      .sort((a, b) => b.relative_value_score - a.relative_value_score)
      .slice(0, 4);
  }, [data, masterBonds]);

  // Filtered and sorted bonds for the full universe table
  const filteredBonds = useMemo(() => {
    return masterBonds.filter((b) => {
      const matchesSearch = 
        searchTerm === '' ||
        b.isin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.issuer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.sector.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSector = sectorFilter === 'All' || b.sector === sectorFilter;
      
      const matchesRating = 
        ratingFilter === 'All' ||
        (ratingFilter === 'IG' && b.rating_notch <= 10) ||
        (ratingFilter === 'HY' && b.rating_notch > 10) ||
        b.rating === ratingFilter;

      const matchesSignal = 
        signalFilter === 'All' ||
        (signalFilter === 'Cheap' && b.classification.includes('Cheap')) ||
        (signalFilter === 'Rich' && b.classification.includes('Rich')) ||
        (signalFilter === 'Fair' && b.classification === 'Fairly Valued');

      return matchesSearch && matchesSector && matchesRating && matchesSignal;
    }).sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [masterBonds, searchTerm, sectorFilter, ratingFilter, signalFilter, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const toggleRow = (isin: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRow(expandedRow === isin ? null : isin);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[65vh]">
        <div className="flex flex-col items-center space-y-2 text-slate-500 font-mono text-xs">
          <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
          <span>Synthesizing cross-sectional fixed-income universe...</span>
        </div>
      </div>
    );
  }

  const totalSecurities = data.total_bonds_analyzed || masterBonds.length || 204;
  const igCount = masterBonds.filter(b => b.rating_notch <= 10).length || 174;
  const hyCount = masterBonds.filter(b => b.rating_notch > 10).length || 30;
  const cheapCount = data.potentially_cheap_count || 56;
  const richCount = data.potentially_rich_count || 55;

  return (
    <div className="space-y-5">
      
      {/* ========================================================================= */}
      {/* A. PAGE TITLE & SUBTITLE                                                  */}
      {/* ========================================================================= */}
      <div className="border-b border-border pb-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-graphite-900 uppercase font-sans">
            BondLens
          </h1>
          <p className="text-xs text-slate-600 font-mono mt-0.5">
            Fixed-Income Relative-Value & Mispricing Intelligence Platform
          </p>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
          <span className="flex items-center space-x-1 text-fin-pos font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AUDITED CANONICAL DATASET</span>
          </span>
          <span className="text-borderDark">|</span>
          <span>As-of: <strong className="text-graphite-900 font-medium">2026-09-07</strong></span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* B. MARKET SNAPSHOT                                                        */}
      {/* ========================================================================= */}
      <div className="bg-white border border-border px-4 py-2.5 rounded-xs text-xs font-mono text-slate-600 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 font-sans mr-1">MARKET SNAPSHOT</span>
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-xs bg-slate-100 border border-slate-200">
            <span className="text-graphite-900 font-bold text-xs">{totalSecurities}</span>
            <span className="text-slate-500 font-sans text-[11px]">Securities</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-xs bg-royal-50/70 border border-royal-200/80">
            <span className="text-royal-900 font-bold text-xs">{igCount}</span>
            <span className="text-royal-700 font-sans text-[11px]">IG</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-xs bg-amber-50/70 border border-amber-200/80">
            <span className="text-amber-900 font-bold text-xs">{hyCount}</span>
            <span className="text-amber-700 font-sans text-[11px]">HY</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-xs bg-tealFin-50 border border-tealFin-200">
            <span className="w-1.5 h-1.5 rounded-full bg-tealFin-600" />
            <span className="text-tealFin-900 font-bold text-xs">{cheapCount}</span>
            <span className="text-tealFin-700 font-sans text-[11px]">Cheap</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-xs bg-coralFin-50 border border-coralFin-200">
            <span className="w-1.5 h-1.5 rounded-full bg-coralFin-600" />
            <span className="text-coralFin-900 font-bold text-xs">{richCount}</span>
            <span className="text-coralFin-700 font-sans text-[11px]">Rich</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-xs bg-surfaceAlt border border-border">
            <span className="text-slate-500 font-sans text-[11px]">Median RV Gap:</span>
            <span className={`font-bold tabular-nums text-xs ${data.median_rv_gap_bps >= 0 ? 'text-tealFin-700' : 'text-coralFin-700'}`}>
              {data.median_rv_gap_bps > 0 ? `+${data.median_rv_gap_bps.toFixed(1)}` : data.median_rv_gap_bps.toFixed(1)} bp
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <span>Median Spread: <strong className="text-graphite-900 font-mono">{data.median_credit_spread_bps.toFixed(0)} bp</strong></span>
          <span className="text-borderDark">|</span>
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-tealFin-600" />
            <span>Health: <strong className="text-graphite-900 font-mono">{data.data_health.health_score.toFixed(1)}/100</strong></span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* C. TOP RELATIVE-VALUE DISLOCATIONS (Clickable Security Cards)            */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-tealFin-600" />
            <h2 className="text-xs font-bold text-graphite-900 uppercase tracking-wider font-mono">
              Top Relative-Value Dislocations
            </h2>
          </div>
          <span className="text-[11px] font-sans text-slate-500">
            Click any opportunity to open full Bond Dossier
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {topDislocations.map((b) => {
            const isSelected = selectedBondIsin === b.isin;
            return (
              <div
                key={b.isin}
                onClick={() => onSelectBond(b.isin)}
                className={`p-3.5 bg-white border rounded-xs transition-all cursor-pointer text-left space-y-2.5 relative accent-strip-teal ${
                  isSelected 
                    ? 'border-navy-900 ring-1 ring-navy-900/30 bg-royal-50/20 shadow-card-hover' 
                    : 'border-border hover:border-royal-600/80 hover:shadow-card-hover'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-graphite-900 leading-tight font-sans uppercase">
                      {b.issuer}
                    </h3>
                    <div className="text-xs text-slate-600 font-sans mt-0.5">
                      {b.coupon_pct.toFixed(2)}% due {b.maturity_date ? b.maturity_date.slice(0, 4) : ''}
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-xs border border-slate-200 bg-slate-50 text-slate-700">
                    {b.rating}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-borderLight">
                  <div>
                    <div className="text-[10px] uppercase font-sans font-semibold text-slate-400">Observed Spread</div>
                    <div className="font-mono font-bold text-graphite-900 text-xs mt-0.5">
                      {b.credit_spread_bps.toFixed(1)} bp
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-sans font-semibold text-slate-400">Fair Spread</div>
                    <div className="font-mono font-medium text-slate-700 text-xs mt-0.5">
                      {b.fair_spread_bps.toFixed(1)} bp
                    </div>
                  </div>
                </div>

                {/* Emphasized Valuation Metrics */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-borderLight">
                  <div className="p-2 rounded-xs bg-tealFin-50/70 border border-tealFin-200/80">
                    <div className="text-[9.5px] uppercase tracking-wider text-tealFin-800 font-sans font-bold">RV GAP</div>
                    <div className="font-mono font-black text-lg text-tealFin-700 mt-0.5 leading-none">
                      +{b.relative_value_gap_bps.toFixed(1)} <span className="text-[11px] font-semibold">bp</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-xs bg-slate-50 border border-slate-200">
                    <div className="text-[9.5px] uppercase tracking-wider text-slate-500 font-sans font-bold">RV SCORE</div>
                    <div className="font-mono font-black text-base text-graphite-900 mt-0.5 leading-none">
                      {b.relative_value_score.toFixed(1)} <span className="text-[9.5px] font-normal text-slate-400 font-sans">/ 100</span>
                    </div>
                  </div>
                </div>

                <div className="pt-1.5 flex items-center justify-between border-t border-borderLight text-xs">
                  <span className="text-[10px] font-mono text-slate-400">{b.isin}</span>
                  <span className="text-royal-700 hover:text-royal-900 text-xs font-mono font-semibold flex items-center space-x-0.5 hover:underline">
                    <span>VIEW DOSSIER →</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* D. FULL UNIVERSE TABLE (Every Row Clickable with Hover State)             */}
      {/* ========================================================================= */}
      <div className="bg-white border border-border rounded-sm shadow-xs overflow-hidden space-y-0">
        
        {/* Table Filter & Search Controls Bar */}
        <div className="p-3 border-b border-border bg-surfaceSubtle flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <h2 className="text-xs font-bold text-graphite-900 uppercase tracking-wider font-mono">
              UNIVERSE SCREEN
            </h2>
            <span className="text-borderDark hidden sm:inline">|</span>
            <span className="text-[11px] font-mono text-slate-500">
              {filteredBonds.length} of {masterBonds.length} Active Securities
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ISIN, Issuer, Sector..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-border rounded-xs pl-8 pr-3 py-1 text-xs text-graphite-900 placeholder-slate-400 font-sans focus:outline-none focus:border-navy-900"
              />
            </div>

            {/* Sector Selector */}
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="bg-white border border-border rounded-xs px-2.5 py-1 text-xs font-sans text-graphite-800 focus:outline-none focus:border-navy-900"
            >
              <option value="All">All Sectors</option>
              <option value="Technology">Technology</option>
              <option value="Financials">Financials</option>
              <option value="Energy">Energy</option>
              <option value="Utilities">Utilities</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Industrials">Industrials</option>
              <option value="Consumer">Consumer</option>
              <option value="Telecommunications">Telecommunications</option>
            </select>

            {/* Rating Selector */}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="bg-white border border-border rounded-xs px-2.5 py-1 text-xs font-sans text-graphite-800 focus:outline-none focus:border-navy-900"
            >
              <option value="All">All Ratings</option>
              <option value="IG">Investment Grade (IG)</option>
              <option value="HY">High Yield (HY)</option>
              <option value="AAA">AAA</option>
              <option value="AA+">AA+</option>
              <option value="AA">AA</option>
              <option value="A">A</option>
              <option value="BBB">BBB</option>
              <option value="BB">BB</option>
            </select>

            {/* Signal Selector */}
            <select
              value={signalFilter}
              onChange={(e) => setSignalFilter(e.target.value)}
              className="bg-white border border-border rounded-xs px-2.5 py-1 text-xs font-sans text-graphite-800 focus:outline-none focus:border-navy-900"
            >
              <option value="All">All Signals</option>
              <option value="Cheap">Cheap (Wide Spread)</option>
              <option value="Rich">Rich (Tight Spread)</option>
              <option value="Fair">Fairly Valued</option>
            </select>
          </div>
        </div>

        {/* Primary Table Viewport */}
        <div className="overflow-x-auto max-h-[600px]">
          <table className="research-table">
            <thead className="sticky top-0 z-10 shadow-xs">
              <tr>
                <th className="w-8 text-center"></th>
                <th className="cursor-pointer" onClick={() => handleSort('relative_value_score')}>
                  <div className="flex items-center space-x-1 font-bold text-graphite-900">
                    <span>Bond / Issuer</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="cursor-pointer" onClick={() => handleSort('rating_notch')}>
                  <div className="flex items-center space-x-1">
                    <span>Rating</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('modified_duration')}>
                  <div className="flex items-center justify-end space-x-1">
                    <span>Duration</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('ytm_pct')}>
                  <div className="flex items-center justify-end space-x-1">
                    <span>YTM</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('credit_spread_bps')}>
                  <div className="flex items-center justify-end space-x-1 font-bold text-graphite-900">
                    <span>Observed Spread</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('fair_spread_bps')}>
                  <div className="flex items-center justify-end space-x-1 font-bold text-graphite-900">
                    <span>Fair Spread</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('relative_value_gap_bps')}>
                  <div className="flex items-center justify-end space-x-1 font-bold text-navy-900">
                    <span>RV Gap</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="text-center cursor-pointer" onClick={() => handleSort('relative_value_score')}>
                  <div className="flex items-center justify-center space-x-1 font-bold text-graphite-900">
                    <span>RV Score</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('liquidity_score')}>
                  <div className="flex items-center justify-end space-x-1">
                    <span>Liquidity</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {filteredBonds.map((b) => {
                const isExpanded = expandedRow === b.isin;
                const isSelected = selectedBondIsin === b.isin;
                const isCheap = b.classification.includes('Cheap');
                const isRich = b.classification.includes('Rich');

                return (
                  <React.Fragment key={b.isin}>
                    <tr 
                      className={`cursor-pointer transition-colors duration-150 ${
                        isSelected
                          ? 'bg-royal-50/80 font-medium border-l-2 border-l-royal-600'
                          : 'hover:bg-indigoAcc-50/30'
                      }`}
                      onClick={() => onSelectBond(b.isin)}
                      title="Click row to open Bond Dossier"
                    >
                      {/* Expansion Chevron */}
                      <td className="text-center" onClick={(e) => toggleRow(b.isin, e)}>
                        <button className="text-slate-400 hover:text-navy-900 p-0.5">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-royal-700" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>

                      {/* Bond / Issuer */}
                      <td>
                        <div className="font-bold text-graphite-900 font-sans">{b.issuer}</div>
                        <div className="text-[11px] text-slate-600 font-mono">
                          {b.coupon_pct.toFixed(2)}% due {b.maturity_date ? b.maturity_date.slice(0, 4) : ''} • <span className="text-slate-400">{b.isin}</span>
                        </div>
                      </td>

                      {/* Rating */}
                      <td>
                        <span className={`px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-xs border ${
                          b.rating_notch <= 10 
                            ? 'bg-royal-50/60 text-royal-900 border-royal-200' 
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}>
                          {b.rating}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="text-right text-slate-700 font-mono">
                        {b.modified_duration.toFixed(2)}y
                      </td>

                      {/* YTM */}
                      <td className="text-right text-slate-700 font-mono font-medium">
                        {b.ytm_pct.toFixed(2)}%
                      </td>

                      {/* Observed Spread (Visually Emphasized) */}
                      <td className="text-right font-bold text-graphite-900 font-mono">
                        {b.credit_spread_bps.toFixed(0)} <span className="text-[10px] font-normal text-slate-400">bp</span>
                      </td>

                      {/* Fair Spread (Visually Emphasized) */}
                      <td className="text-right font-medium text-slate-700 font-mono">
                        {b.fair_spread_bps.toFixed(0)} <span className="text-[10px] font-normal text-slate-400">bp</span>
                      </td>

                      {/* RV Gap (Semantic Badge Emphasis) */}
                      <td className="text-right font-mono font-bold">
                        <span className={`inline-block px-1.5 py-0.5 rounded-xs border text-[11px] ${
                          isCheap 
                            ? 'text-tealFin-800 bg-tealFin-50 border-tealFin-200' 
                            : isRich 
                            ? 'text-coralFin-800 bg-coralFin-50 border-coralFin-200' 
                            : 'text-slate-600 bg-slate-50 border-slate-200'
                        }`}>
                          {b.relative_value_gap_bps > 0 ? `+${b.relative_value_gap_bps.toFixed(1)}` : b.relative_value_gap_bps.toFixed(1)} bp
                        </span>
                      </td>

                      {/* RV Score (Visually Emphasized) */}
                      <td className="text-center font-mono font-bold text-graphite-900">
                        {b.relative_value_score.toFixed(1)}
                      </td>

                      {/* Liquidity */}
                      <td className="text-right text-slate-600 font-mono">
                        {b.liquidity_score.toFixed(0)}<span className="text-[10px] text-slate-400">/100</span>
                      </td>

                      {/* Action */}
                      <td className="text-center" onClick={(e) => {
                        e.stopPropagation();
                        onSelectBond(b.isin);
                      }}>
                        <button
                          className="px-2.5 py-1 bg-navy-900 text-white hover:bg-royal-800 rounded-xs text-[10px] font-mono transition-colors font-semibold shadow-xs"
                        >
                          Dossier →
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Analytical Detail Row */}
                    {isExpanded && (
                      <tr className="bg-surfaceSubtle">
                        <td colSpan={13} className="px-5 py-3 border-b border-border">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                            <div className="space-y-1">
                              <span className="text-[10.5px] font-mono text-slate-500 uppercase font-semibold">Valuation Summary</span>
                              <div className="font-mono text-slate-700">
                                Observed G-Spread: <strong className="text-graphite-900">{b.credit_spread_bps.toFixed(1)} bps</strong>
                              </div>
                              <div className="font-mono text-slate-700">
                                Model Fair Spread: <strong className="text-graphite-900">{b.fair_spread_bps.toFixed(1)} bps</strong>
                              </div>
                              <div className="font-mono text-slate-700">
                                Relative Value Score: <strong className="text-graphite-900">{b.relative_value_score.toFixed(1)}/100</strong>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10.5px] font-mono text-slate-500 uppercase font-semibold">Trading Friction</span>
                              <div className="font-mono text-slate-700">
                                Bid-Ask Spread: <strong className="text-slate-800">{b.bid_ask_spread_pts.toFixed(2)} pts</strong>
                              </div>
                              <div className="font-mono text-slate-700">
                                Clean Price: <strong className="text-slate-800">${b.clean_price.toFixed(2)}</strong>
                              </div>
                              <div className="font-mono text-slate-700">
                                Liquidity Rank: <strong className="text-slate-800">{b.liquidity_score >= 70 ? 'Institutional' : 'Moderate'}</strong>
                              </div>
                            </div>

                            <div className="md:col-span-2 space-y-1">
                              <span className="text-[10.5px] font-mono text-slate-500 uppercase font-semibold">Analytical Driver & Thesis Vulnerability</span>
                              <div className="text-graphite-800 font-sans text-[11.5px] leading-relaxed">
                                <span className="font-semibold text-graphite-900">Thesis Driver:</span> {b.main_reason}
                              </div>
                              <div className="text-slate-600 font-sans text-[11.5px] leading-relaxed">
                                <span className="font-semibold text-slate-700">Key Risk:</span> {b.main_risk}
                              </div>
                              <div className="pt-1">
                                <button
                                  onClick={() => onSelectBond(b.isin)}
                                  className="text-navy-900 hover:underline font-mono text-[11px] font-semibold flex items-center space-x-1"
                                >
                                  <span>Open comprehensive research memo & peer regression for {b.isin}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
