import React, { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { 
  Search, 
  ArrowUpDown, 
  Download, 
  ChevronRight, 
  Sliders, 
  ExternalLink,
  RotateCcw,
  Check
} from 'lucide-react';
import { BondSummary } from '../types';

interface ScreenerViewProps {
  bonds: BondSummary[];
  loading: boolean;
  selectedBondIsin?: string | null;
  onSelectBond: (isin: string, openDossier?: boolean) => void;
}

type SortField = 
  | 'relative_value_score'
  | 'relative_value_gap_bps'
  | 'credit_spread_bps'
  | 'fair_spread_bps'
  | 'ytm_pct'
  | 'modified_duration'
  | 'liquidity_score'
  | 'rating_notch';

export const ScreenerView: React.FC<ScreenerViewProps> = ({
  bonds,
  loading,
  selectedBondIsin,
  onSelectBond
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sectorFilter, setSectorFilter] = useState<string>('All');
  const [ratingFilter, setRatingFilter] = useState<string>('All');
  const [classFilter, setClassFilter] = useState<string>('All');
  const [maxDuration, setMaxDuration] = useState<number>(30);
  const [minLiquidity, setMinLiquidity] = useState<number>(0);
  const [sortField, setSortField] = useState<SortField>('relative_value_score');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Filtered and sorted bonds
  const filteredBonds = useMemo(() => {
    return bonds.filter((b) => {
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

      const matchesClass = 
        classFilter === 'All' ||
        (classFilter === 'Cheap' && b.classification.includes('Cheap')) ||
        (classFilter === 'Rich' && b.classification.includes('Rich')) ||
        (classFilter === 'Fair' && b.classification === 'Fairly Valued');

      const matchesDuration = b.modified_duration <= maxDuration;
      const matchesLiquidity = b.liquidity_score >= minLiquidity;

      return matchesSearch && matchesSector && matchesRating && matchesClass && matchesDuration && matchesLiquidity;
    }).sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [bonds, searchTerm, sectorFilter, ratingFilter, classFilter, maxDuration, minLiquidity, sortField, sortAsc]);

  // Selected bond object (defaults to selectedBondIsin, or filteredBonds[0])
  const selectedBond = useMemo(() => {
    if (selectedBondIsin) {
      const match = bonds.find(b => b.isin === selectedBondIsin);
      if (match) return match;
    }
    return filteredBonds[0] || bonds[0] || null;
  }, [bonds, filteredBonds, selectedBondIsin]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSectorFilter('All');
    setRatingFilter('All');
    setClassFilter('All');
    setMaxDuration(30);
    setMinLiquidity(0);
  };

  const exportCSV = () => {
    const headers = [
      'Rank', 'ISIN', 'Issuer', 'Sector', 'Rating', 'Duration', 'Price', 
      'YTM_pct', 'CreditSpread_bps', 'FairSpread_bps', 'RVGap_bps', 'LiquidityScore', 
      'RVScore', 'Classification', 'MainReason', 'MainRisk'
    ];
    const rows = filteredBonds.map((b, idx) => [
      idx + 1,
      b.isin,
      `"${b.issuer}"`,
      b.sector,
      b.rating,
      b.modified_duration,
      b.clean_price,
      b.ytm_pct,
      b.credit_spread_bps,
      b.fair_spread_bps,
      b.relative_value_gap_bps,
      b.liquidity_score,
      b.relative_value_score,
      b.classification,
      `"${b.main_reason}"`,
      `"${b.main_risk}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `institutional_rv_ranking_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2D Scatter Plot: Observed vs Fair Spread
  const scatterPlotTraces = useMemo(() => {
    if (!filteredBonds || filteredBonds.length === 0) return [];

    const minSpread = Math.min(...filteredBonds.map(b => Math.min(b.fair_spread_bps, b.credit_spread_bps))) - 20;
    const maxSpread = Math.max(...filteredBonds.map(b => Math.max(b.fair_spread_bps, b.credit_spread_bps))) + 30;

    const formatHover = (b: BondSummary) => {
      const gapPrefix = b.relative_value_gap_bps > 0 ? '+' : '';
      return `<b>${b.issuer}</b><br>${b.coupon_pct}% due ${b.maturity_date}<br>ISIN: ${b.isin}<br>Observed Spread: ${b.credit_spread_bps.toFixed(1)} bp<br>Fair Spread: ${b.fair_spread_bps.toFixed(1)} bp<br>RV Gap: ${gapPrefix}${b.relative_value_gap_bps.toFixed(1)} bp<br>RV Score: ${b.relative_value_score.toFixed(1)} / 100`;
    };

    // 1. 45-degree Fair Value Benchmark Diagonal
    const diagonalTrace = {
      type: 'scatter',
      mode: 'lines',
      name: 'Fair Parity (Observed = Fair)',
      x: [minSpread, maxSpread],
      y: [minSpread, maxSpread],
      line: {
        color: '#94A3B8',
        dash: 'dash',
        width: 1.5
      },
      hoverinfo: 'none'
    };

    // 2. Cheap Bonds (Observed > Fair) -> Lean toward Teal
    const cheapBonds = filteredBonds.filter(b => b.relative_value_gap_bps >= 5);
    const cheapTrace = {
      type: 'scatter',
      mode: 'markers',
      name: 'Wide / Cheap (Observed > Fair)',
      x: cheapBonds.map(b => b.fair_spread_bps),
      y: cheapBonds.map(b => b.credit_spread_bps),
      customdata: cheapBonds.map(b => b.isin),
      text: cheapBonds.map(formatHover),
      hoverinfo: 'text',
      marker: {
        color: '#0D9488',
        size: 7.5,
        line: { color: '#0F766E', width: 0.8 }
      }
    };

    // 3. Rich Bonds (Observed < Fair) -> Lean toward Muted Coral
    const richBonds = filteredBonds.filter(b => b.relative_value_gap_bps <= -5);
    const richTrace = {
      type: 'scatter',
      mode: 'markers',
      name: 'Tight / Rich (Observed < Fair)',
      x: richBonds.map(b => b.fair_spread_bps),
      y: richBonds.map(b => b.credit_spread_bps),
      customdata: richBonds.map(b => b.isin),
      text: richBonds.map(formatHover),
      hoverinfo: 'text',
      marker: {
        color: '#E11D48',
        size: 7.5,
        line: { color: '#BE123C', width: 0.8 }
      }
    };

    // 4. Fair Bonds -> Neutral Slate
    const fairBonds = filteredBonds.filter(b => Math.abs(b.relative_value_gap_bps) < 5);
    const fairTrace = {
      type: 'scatter',
      mode: 'markers',
      name: 'Fair Valuation (±5 bp)',
      x: fairBonds.map(b => b.fair_spread_bps),
      y: fairBonds.map(b => b.credit_spread_bps),
      customdata: fairBonds.map(b => b.isin),
      text: fairBonds.map(formatHover),
      hoverinfo: 'text',
      marker: {
        color: '#64748B',
        size: 6,
        line: { color: '#475569', width: 0.5 }
      }
    };

    // 5. Selected Bond Highlighter (Visually Emphasized Diamond with Royal/Indigo Highlight)
    const traces: any[] = [diagonalTrace, cheapTrace, richTrace, fairTrace];
    if (selectedBond) {
      traces.push({
        type: 'scatter',
        mode: 'markers+text',
        name: `Selected: ${selectedBond.issuer}`,
        x: [selectedBond.fair_spread_bps],
        y: [selectedBond.credit_spread_bps],
        customdata: [selectedBond.isin],
        text: [`<b>${selectedBond.issuer}</b> · ${selectedBond.coupon_pct}% '${selectedBond.maturity_date.slice(2, 4)}`],
        textposition: 'top right',
        textfont: { size: 10.5, color: '#1E3A8A', family: 'Inter, sans-serif' },
        hovertext: [formatHover(selectedBond)],
        hoverinfo: 'text',
        marker: {
          color: '#312E81',
          size: 15,
          symbol: 'diamond',
          line: { color: '#FFFFFF', width: 2.5 }
        }
      });
    }

    return traces;
  }, [filteredBonds, selectedBond]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[65vh]">
        <div className="flex flex-col items-center space-y-2 text-slate-500 font-mono text-xs">
          <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
          <span>Loading cross-sectional ranking engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Top Header Bar */}
      <div className="border-b border-border pb-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-graphite-900 uppercase font-sans">
            Relative Value Screen & Security Ranking
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Econometric fair spread dislocation, peer similarity distance, and liquidity friction
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={resetFilters}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xs border border-border hover:bg-slate-100 text-slate-600 text-xs font-mono transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xs bg-navy-900 hover:bg-navy-800 text-white text-xs font-mono transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>Export Table (CSV)</span>
          </button>
        </div>
      </div>

      {/* Main 3-Pane Layout: LEFT Filters | CENTER Ranking Table | RIGHT Selected Security */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        
        {/* LEFT PANE: Filters & Universe Controls (col-span-3) */}
        <div className="xl:col-span-3 bg-white border border-border p-4 rounded-sm shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-borderLight pb-2">
            <span className="text-xs font-semibold text-graphite-900 uppercase tracking-wider font-mono">
              Universe Controls
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {filteredBonds.length}/{bonds.length} Active
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600">Search Security</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ISIN, Issuer, Sector..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-border rounded-xs pl-8 pr-2.5 py-1.5 text-xs text-graphite-900 placeholder-slate-400 focus:outline-none focus:border-navy-900"
                />
              </div>
            </div>

            {/* Sector Select */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600">Industry Sector</label>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="w-full bg-white border border-border rounded-xs px-2.5 py-1.5 text-xs text-graphite-800 focus:outline-none focus:border-navy-900"
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
            </div>

            {/* Rating Category */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600">Credit Rating Bucket</label>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="w-full bg-white border border-border rounded-xs px-2.5 py-1.5 text-xs text-graphite-800 focus:outline-none focus:border-navy-900"
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
            </div>

            {/* Classification Signal */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600">Valuation Signal</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full bg-white border border-border rounded-xs px-2.5 py-1.5 text-xs text-graphite-800 focus:outline-none focus:border-navy-900"
              >
                <option value="All">All Classifications</option>
                <option value="Cheap">Cheap (Wide vs Model)</option>
                <option value="Rich">Rich (Tight vs Model)</option>
                <option value="Fair">Fairly Valued</option>
              </select>
            </div>

            {/* Max Duration Slider */}
            <div className="space-y-1 pt-1 border-t border-borderLight">
              <div className="flex justify-between text-[11px]">
                <span className="font-medium text-slate-600">Max Duration:</span>
                <span className="font-mono text-graphite-900 font-semibold">{maxDuration} yrs</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={maxDuration}
                onChange={(e) => setMaxDuration(Number(e.target.value))}
                className="w-full accent-navy-900 cursor-pointer"
              />
            </div>

            {/* Min Liquidity Slider */}
            <div className="space-y-1 pt-1 border-t border-borderLight">
              <div className="flex justify-between text-[11px]">
                <span className="font-medium text-slate-600">Min Liquidity Score:</span>
                <span className="font-mono text-graphite-900 font-semibold">{minLiquidity}/100</span>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={minLiquidity}
                onChange={(e) => setMinLiquidity(Number(e.target.value))}
                className="w-full accent-navy-900 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* CENTER PANE: Relative-Value Ranking Table (col-span-6) */}
        <div className="xl:col-span-6 bg-white border border-border rounded-sm shadow-xs overflow-hidden">
          
          <div className="p-3 border-b border-border bg-surfaceSubtle flex items-center justify-between">
            <h2 className="text-xs font-semibold text-graphite-900 uppercase tracking-wider font-mono">
              Relative-Value Ranking Table
            </h2>
            <span className="text-[11px] font-mono text-slate-500">
              Ranked by RV Score (0–100)
            </span>
          </div>

          <div className="overflow-x-auto max-h-[640px]">
            <table className="research-table">
              <thead className="sticky top-0 z-10 shadow-xs">
                <tr>
                  <th className="w-10 text-center">Rank</th>
                  <th>Issuer</th>
                  <th>Bond</th>
                  <th>Rating</th>
                  <th className="text-right cursor-pointer" onClick={() => handleSort('modified_duration')}>
                    <span>Duration</span>
                  </th>
                  <th className="text-right cursor-pointer" onClick={() => handleSort('credit_spread_bps')}>
                    <span>Obs Spread</span>
                  </th>
                  <th className="text-right cursor-pointer" onClick={() => handleSort('fair_spread_bps')}>
                    <span>Fair Spread</span>
                  </th>
                  <th className="text-right cursor-pointer" onClick={() => handleSort('relative_value_gap_bps')}>
                    <span>RV Gap</span>
                  </th>
                  <th className="text-right cursor-pointer" onClick={() => handleSort('liquidity_score')}>
                    <span>Liquidity</span>
                  </th>
                  <th className="text-right cursor-pointer" onClick={() => handleSort('relative_value_score')}>
                    <span>Confidence</span>
                  </th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {filteredBonds.map((b, idx) => {
                  const isSelected = selectedBond?.isin === b.isin;
                  const isCheap = b.classification.includes('Cheap');
                  const isRich = b.classification.includes('Rich');

                  return (
                    <tr 
                      key={b.isin}
                      onClick={() => onSelectBond(b.isin, false)}
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-royal-50/80 font-medium border-l-2 border-l-royal-600' 
                          : 'hover:bg-indigoAcc-50/30'
                      }`}
                    >
                      <td className="text-center font-mono text-slate-500 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="font-medium text-graphite-900">
                        {b.issuer}
                      </td>
                      <td>
                        <div className="text-graphite-800">{b.coupon_pct}% {b.maturity_date.slice(0, 4)}</div>
                        <div className="text-[10px] font-mono text-slate-500">{b.isin}</div>
                      </td>
                      <td>
                        <span className="font-mono text-[10.5px] text-slate-700">{b.rating}</span>
                      </td>
                      <td className="text-right text-slate-700">
                        {b.modified_duration.toFixed(2)}
                      </td>
                      <td className="text-right font-medium text-graphite-900">
                        {b.credit_spread_bps.toFixed(0)} <span className="text-[10px] text-slate-400">bp</span>
                      </td>
                      <td className="text-right text-slate-600">
                        {b.fair_spread_bps.toFixed(0)} <span className="text-[10px] text-slate-400">bp</span>
                      </td>
                      <td className="text-right font-semibold">
                        <span className={`inline-block px-1.5 py-0.5 rounded-xs border text-[11px] ${
                          isCheap 
                            ? 'text-tealFin-800 bg-tealFin-50 border-tealFin-200' 
                            : isRich 
                            ? 'text-coralFin-800 bg-coralFin-50 border-coralFin-200' 
                            : 'text-slate-600 bg-slate-50 border-slate-200'
                        }`}>
                          {b.relative_value_gap_bps > 0 ? `+${b.relative_value_gap_bps.toFixed(1)}` : b.relative_value_gap_bps.toFixed(1)}
                        </span>
                      </td>
                      <td className="text-right text-slate-700">
                        {b.liquidity_score.toFixed(0)}
                      </td>
                      <td className="text-right font-mono text-[11px] text-slate-700">
                        {/* Econometric Huber & R2 Confidence representation */}
                        {b.relative_value_score >= 60 ? 'HIGH (88%)' : b.relative_value_score <= 40 ? 'HIGH (86%)' : 'MED (74%)'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* RIGHT PANE: Selected Security Summary (col-span-3) */}
        <div className="xl:col-span-3 bg-white border border-border p-4 rounded-sm shadow-card space-y-4 accent-strip-navy">
          
          <div className="border-b border-borderLight pb-2">
            <span className="text-xs font-semibold text-graphite-900 uppercase tracking-wider font-mono">
              SELECTED SECURITY
            </span>
          </div>

          {selectedBond ? (
            <div className="space-y-4 text-xs">
              
              {/* Header Info */}
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">SECURITY PROFILE</div>
                <h3 className="text-base font-bold text-graphite-900 leading-tight">
                  {selectedBond.issuer}
                </h3>
                <div className="text-xs text-slate-700 font-mono font-medium">
                  {selectedBond.coupon_pct}% due {selectedBond.maturity_date}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {selectedBond.isin}
                </div>
              </div>

              {/* Primary Valuation Metrics Hierarchy */}
              <div className="space-y-2 pt-2 border-t border-borderLight tabular-nums">
                {/* RV Gap - Hero Metric with subtle tinted background */}
                <div className={`p-3 rounded-xs border flex items-center justify-between shadow-xs ${
                  selectedBond.relative_value_gap_bps >= 0
                    ? 'bg-tealFin-50/80 border-tealFin-300'
                    : 'bg-coralFin-50/80 border-coralFin-300'
                }`}>
                  <div>
                    <div className={`text-[10px] uppercase font-mono tracking-wider font-bold ${
                      selectedBond.relative_value_gap_bps >= 0 ? 'text-tealFin-800' : 'text-coralFin-800'
                    }`}>RV GAP</div>
                    <div className="text-[10px] text-slate-500 font-mono">Model dislocation</div>
                  </div>
                  <div className={`text-2xl font-black font-mono tracking-tight ${
                    selectedBond.relative_value_gap_bps >= 0 ? 'text-tealFin-700' : 'text-coralFin-700'
                  }`}>
                    {selectedBond.relative_value_gap_bps > 0 ? `+${selectedBond.relative_value_gap_bps.toFixed(1)}` : selectedBond.relative_value_gap_bps.toFixed(1)}{' '}
                    <span className="text-xs font-semibold">bp</span>
                  </div>
                </div>

                {/* RV Score */}
                <div className="p-2.5 bg-royal-50/60 rounded-xs border border-royal-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-mono text-royal-900 font-semibold tracking-wider">RV SCORE</div>
                    <div className="text-[10px] text-slate-500 font-mono">Cross-sectional rank</div>
                  </div>
                  <div className="text-xl font-black font-mono text-navy-950">
                    {selectedBond.relative_value_score.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 100</span>
                  </div>
                </div>

                {/* Observed Spread & Fair Spread */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50/80 rounded-xs border border-slate-200">
                    <div className="text-base font-bold font-mono text-graphite-900">
                      {selectedBond.credit_spread_bps.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">bp</span>
                    </div>
                    <div className="text-[10px] uppercase font-mono text-slate-500 tracking-wider mt-0.5">Observed Spread</div>
                  </div>

                  <div className="p-2.5 bg-indigoAcc-50/40 rounded-xs border border-indigoAcc-200/70">
                    <div className="text-base font-bold font-mono text-slate-900">
                      {selectedBond.fair_spread_bps.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">bp</span>
                    </div>
                    <div className="text-[10px] uppercase font-mono text-indigoAcc-800 tracking-wider mt-0.5">Fair Spread</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 px-1">
                  <div className="text-[11px] font-mono text-slate-600">
                    Duration: <span className="font-semibold text-graphite-900">{selectedBond.modified_duration.toFixed(2)}Y</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 text-right">
                    Rating: <span className="font-semibold text-graphite-900">{selectedBond.rating}</span>
                  </div>
                </div>
              </div>

              {/* Research Notes */}
              <div className="space-y-1.5 pt-2 border-t border-borderLight text-[11.5px] leading-relaxed">
                <div>
                  <span className="font-semibold text-graphite-900">Thesis Driver:</span>{' '}
                  <span className="text-slate-700">{selectedBond.main_reason}</span>
                </div>
                <div>
                  <span className="font-semibold text-graphite-900">Thesis Risk:</span>{' '}
                  <span className="text-slate-700">{selectedBond.main_risk}</span>
                </div>
              </div>

              {/* Action Button: VIEW BOND DOSSIER → */}
              <div className="pt-2">
                <button
                  onClick={() => onSelectBond(selectedBond.isin, true)}
                  className="w-full py-2.5 bg-navy-900 hover:bg-royal-800 text-white rounded-xs text-xs font-mono font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                >
                  <span>VIEW BOND DOSSIER →</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 font-mono">
              Select a security from the ranking table to view summary
            </div>
          )}

        </div>

      </div>

      {/* Clean Analytical Visualization: Observed vs Fair Spread */}
      <div className="bg-white border border-border p-4 rounded-sm shadow-xs space-y-3">
        <div className="flex flex-wrap items-baseline justify-between border-b border-borderLight pb-2">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">ANALYTICAL PARITY REGRESSION</div>
            <h3 className="text-sm font-bold text-graphite-900 uppercase tracking-tight font-sans mt-0.5">
              Observed Spread vs Econometric Fair Spread
            </h3>
            <p className="text-[11.5px] text-slate-600 mt-0.5">
              Points above the dashed parity diagonal trade at wide spreads relative to peer fundamentals (Cheap/Wide). Click any point to select.
            </p>
          </div>
          <span className="text-[10.5px] font-mono text-slate-400">
            Units: Basis Points (bp) vs US Treasury
          </span>
        </div>

        <div className="w-full h-[360px]">
          <Plot
            data={scatterPlotTraces}
            onClick={(eventData: any) => {
              if (eventData?.points?.[0]?.customdata) {
                const clickedIsin = eventData.points[0].customdata;
                onSelectBond(clickedIsin, false);
              }
            }}
            layout={{
              autosize: true,
              margin: { l: 60, r: 25, t: 15, b: 50 },
              paper_bgcolor: '#FFFFFF',
              plot_bgcolor: '#FFFFFF',
              showlegend: true,
              legend: {
                orientation: 'h',
                x: 0,
                y: 1.12,
                font: { family: 'Inter, sans-serif', size: 11, color: '#475569' }
              },
              xaxis: {
                title: { text: 'Econometric Model Fair Spread (bps)', font: { size: 11, color: '#334155' } },
                tickfont: { size: 10, color: '#64748B', family: 'JetBrains Mono' },
                gridcolor: '#F1F5F9',
                zerolinecolor: '#E2E8F0',
                linecolor: '#CBD5E1'
              },
              yaxis: {
                title: { text: 'Observed G-Spread (bps)', font: { size: 11, color: '#334155' } },
                tickfont: { size: 10, color: '#64748B', family: 'JetBrains Mono' },
                gridcolor: '#F1F5F9',
                zerolinecolor: '#E2E8F0',
                linecolor: '#CBD5E1'
              }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>

    </div>
  );
};
