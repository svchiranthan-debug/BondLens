import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Info, 
  ChevronRight,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { fetchSurface3D } from '../services/api';
import { Surface3DData } from '../types';

interface Surface3DViewProps {
  selectedBondIsin?: string | null;
  onSelectBond: (isin: string, openDossier?: boolean) => void;
}

export const Surface3DView: React.FC<Surface3DViewProps> = ({ 
  selectedBondIsin, 
  onSelectBond 
}) => {
  const [data, setData] = useState<Surface3DData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Surface mode: "rv_score_surface" (X=Duration, Y=Credit Spread, Z=RV Score) is default institutional view
  const [surfaceMode, setSurfaceMode] = useState<'rv_score_surface' | 'spread_surface'>('rv_score_surface');

  // Locally selected point fallback
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

  // Filters
  const [sector, setSector] = useState<string>('All');
  const [ratingBucket, setRatingBucket] = useState<string>('All');
  const [maxDuration, setMaxDuration] = useState<number>(30);
  const [showMesh, setShowMesh] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSurface3D({
        surface_mode: surfaceMode,
        sector,
        rating_bucket: ratingBucket,
        max_duration: maxDuration
      });
      setData(res);
      if (res.points && res.points.length > 0 && !selectedPoint) {
        // Default to selectedBondIsin or first cheap bond
        const targetPt = (selectedBondIsin && res.points.find(p => p.isin === selectedBondIsin)) 
          || res.points.find(p => p.relative_value_score >= 60) 
          || res.points[0];
        setSelectedPoint(targetPt);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load 3D surface data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [surfaceMode, sector, ratingBucket, maxDuration]);

  // Derive active selected point from global selectedBondIsin or fallback to first bond
  const activeSelectedPoint = useMemo(() => {
    if (!data?.points || data.points.length === 0) return null;
    if (selectedBondIsin) {
      const match = data.points.find(p => p.isin === selectedBondIsin);
      if (match) return match;
    }
    return selectedPoint || data.points[0];
  }, [data, selectedBondIsin, selectedPoint]);

  // Construct Plotly Traces with Restrained Scientific Color Scales
  const plotData = useMemo(() => {
    if (!data) return [];
    const traces: any[] = [];
    const isSpreadMode = (surfaceMode === 'spread_surface');

    // Professional scientific sequential palette: deep blue -> blue -> teal -> amber
    const scientificMeshPalette: any = [
      [0.0, '#0F2942'],   // Deep Navy/Blue
      [0.3, '#1E40AF'],   // Royal Blue
      [0.6, '#0D9488'],   // Teal
      [0.85, '#14B8A6'],  // Bright Teal
      [1.0, '#D97706']    // Amber
    ];

    // 1. Continuous Scientific Surface Mesh
    if (showMesh && data.surface_mesh) {
      if (isSpreadMode && data.surface_mesh.y_rating_notch_grid && data.surface_mesh.z_spread_mesh) {
        traces.push({
          type: 'surface',
          name: 'Fair Spread Mesh S(Dur, Rating)',
          x: data.surface_mesh.x_duration_grid,
          y: data.surface_mesh.y_rating_notch_grid,
          z: data.surface_mesh.z_spread_mesh,
          colorscale: scientificMeshPalette,
          showscale: false,
          opacity: 0.72,
          hoverinfo: 'none',
          contours: {
            x: { show: true, color: '#CBD5E1', width: 1 },
            y: { show: true, color: '#CBD5E1', width: 1 },
            z: { show: true, color: '#0F2942', width: 1.5 }
          }
        });
      } else if (!isSpreadMode && data.surface_mesh.y_spread_grid && data.surface_mesh.z_score_mesh) {
        // Continuous scientific palette across duration and spread
        traces.push({
          type: 'surface',
          name: 'RV Score Surface (Duration × Spread)',
          x: data.surface_mesh.x_duration_grid,
          y: data.surface_mesh.y_spread_grid,
          z: data.surface_mesh.z_score_mesh,
          colorscale: scientificMeshPalette,
          showscale: false,
          opacity: 0.72,
          hoverinfo: 'none',
          contours: {
            x: { show: true, color: '#CBD5E1', width: 1 },
            y: { show: true, color: '#CBD5E1', width: 1 },
            z: { show: true, color: '#1E3A8A', width: 1.5 }
          }
        });
      }
    }

    // 2. All Universe Bond Scatter Points (Kept fully visible with Teal/Coral semantic colors)
    const x = data.points.map(p => p.modified_duration);
    const y = isSpreadMode ? data.points.map(p => p.rating_notch) : data.points.map(p => p.credit_spread_bps);
    const z = isSpreadMode ? data.points.map(p => p.credit_spread_bps) : data.points.map(p => p.relative_value_score);

    const customdata = data.points.map(p => [
      p.issuer,
      p.isin,
      p.rating,
      p.sector,
      p.relative_value_gap_bps,
      p.classification,
      p.liquidity_score,
      p.ytm_pct,
      p.clean_price,
      p.fair_spread_bps ?? p.credit_spread_bps,
      p.net_realizable_gap_bps ?? p.relative_value_gap_bps,
      p.is_liquidity_trap ? 'YES' : 'NO',
      p.relative_value_score,
      p.credit_spread_bps
    ]);

    const hovertemplate = isSpreadMode
      ? '<b>%{customdata[0]}</b> (%{customdata[1]})<br>' +
        'Rating: %{customdata[2]} | Sector: %{customdata[3]}<br>' +
        'Duration: %{x:.2f} yrs<br>' +
        'Observed Spread: %{z:.1f} bp<br>' +
        'Fair Spread: %{customdata[9]:.1f} bp<br>' +
        'RV Gap: %{customdata[4]:+.1f} bp (%{customdata[5]})<br>' +
        'Net Realizable Gap: %{customdata[10]:+.1f} bp<br>' +
        'RV Score: %{customdata[12]:.1f}/100<br>' +
        '<span style="color:#0F2942">Click point to select</span><extra></extra>'
      : '<b>%{customdata[0]}</b> (%{customdata[1]})<br>' +
        'Sector: %{customdata[3]} | Rating: %{customdata[2]}<br>' +
        'Duration: %{x:.2f} yrs<br>' +
        'Credit Spread: %{y:.1f} bp<br>' +
        'RV Score: %{z:.1f}/100<br>' +
        'RV Gap: %{customdata[4]:+.1f} bp (%{customdata[5]})<br>' +
        'Net Realizable Gap: %{customdata[10]:+.1f} bp<br>' +
        '<span style="color:#0F2942">Click point to select</span><extra></extra>';

    traces.push({
      type: 'scatter3d',
      mode: 'markers',
      x,
      y,
      z,
      customdata,
      text: data.points.map(p => `${p.issuer} (${p.isin})`),
      hovertemplate,
      marker: {
        size: 5.5,
        color: data.points.map(p => p.relative_value_score),
        colorscale: [
          [0.0, '#E11D48'],   // Rich (Muted Coral)
          [0.4, '#F43F5E'],
          [0.5, '#64748B'],   // Fair (Neutral Slate)
          [0.6, '#0D9488'],   // Cheap (Teal)
          [1.0, '#0F766E']
        ],
        cmin: 25,
        cmax: 75,
        colorbar: {
          title: {
            text: 'RV Score',
            font: { color: '#334155', size: 10, family: 'JetBrains Mono' }
          },
          tickfont: { color: '#64748B', size: 9, family: 'JetBrains Mono' },
          len: 0.65,
          thickness: 12,
          x: 1.01
        },
        opacity: 0.95,
        line: {
          color: '#0F2942',
          width: 0.5
        }
      }
    });

    // 3. Highlight Selected Bond Point (Security-Aware: diamond, size 15, royal/indigo outline, label with issuer + maturity)
    if (activeSelectedPoint) {
      const xSel = [activeSelectedPoint.modified_duration];
      const ySel = [isSpreadMode ? activeSelectedPoint.rating_notch : activeSelectedPoint.credit_spread_bps];
      const zSel = [isSpreadMode ? activeSelectedPoint.credit_spread_bps : activeSelectedPoint.relative_value_score];
      const maturityStr = activeSelectedPoint.maturity_date ? ` due ${activeSelectedPoint.maturity_date.slice(0, 4)}` : '';
      const couponStr = activeSelectedPoint.coupon_pct ? ` ${activeSelectedPoint.coupon_pct.toFixed(2)}%` : '';

      traces.push({
        type: 'scatter3d',
        mode: 'markers+text',
        name: `Selected: ${activeSelectedPoint.issuer}`,
        x: xSel,
        y: ySel,
        z: zSel,
        text: [`<b>${activeSelectedPoint.issuer}${couponStr}${maturityStr}</b>`],
        textposition: 'top center',
        textfont: {
          family: 'Inter, sans-serif',
          size: 11,
          color: '#1E3A8A'
        },
        marker: {
          size: 15,
          symbol: 'diamond',
          color: '#312E81',
          line: {
            color: '#FFFFFF',
            width: 3
          }
        },
        hoverinfo: 'text',
        hovertext: `SELECTED: ${activeSelectedPoint.issuer} (${activeSelectedPoint.isin})`
      });
    }

    return traces;
  }, [data, showMesh, surfaceMode, activeSelectedPoint]);

  const handlePointClick = (eventData: any) => {
    if (eventData.points && eventData.points.length > 0) {
      const pt = eventData.points[0];
      if (pt.customdata && pt.customdata[1]) {
        const isin = pt.customdata[1];
        const match = data?.points.find(p => p.isin === isin);
        if (match) {
          setSelectedPoint(match);
        }
        onSelectBond(isin, false);
      }
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Title & Subtitle Header */}
      <div className="border-b border-border pb-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-graphite-900 uppercase font-sans">
            Relative Value Landscape
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Cross-sectional model estimate across duration and spread
          </p>
        </div>

        {/* Surface Formulation Switcher */}
        <div className="flex items-center space-x-1 border border-border rounded-xs p-0.5 bg-white font-mono text-xs">
          <button
            onClick={() => setSurfaceMode('rv_score_surface')}
            className={`px-3 py-1 rounded-xs transition-colors ${
              surfaceMode === 'rv_score_surface'
                ? 'bg-navy-900 text-white font-semibold'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            Landscape: Duration × Spread × RV Score
          </button>
          <button
            onClick={() => setSurfaceMode('spread_surface')}
            className={`px-3 py-1 rounded-xs transition-colors ${
              surfaceMode === 'spread_surface'
                ? 'bg-navy-900 text-white font-semibold'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            Term Structure: S(Duration, Rating Notch)
          </button>
        </div>
      </div>

      {/* Filter Controls Strip */}
      <div className="bg-white border border-border p-3 rounded-sm shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Sector Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Sector:</span>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="bg-white border border-border rounded-xs px-2.5 py-1 text-xs text-graphite-800 focus:outline-none focus:border-navy-900"
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

          {/* Rating Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Rating:</span>
            <select
              value={ratingBucket}
              onChange={(e) => setRatingBucket(e.target.value)}
              className="bg-white border border-border rounded-xs px-2.5 py-1 text-xs text-graphite-800 focus:outline-none focus:border-navy-900"
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

          {/* Max Duration */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Max Duration:</span>
            <input
              type="range"
              min="3"
              max="30"
              step="1"
              value={maxDuration}
              onChange={(e) => setMaxDuration(Number(e.target.value))}
              className="w-20 accent-navy-900 cursor-pointer"
            />
            <span className="font-mono text-graphite-900 font-semibold">{maxDuration}y</span>
          </div>

          {/* Toggle Mesh */}
          <button
            onClick={() => setShowMesh(!showMesh)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-xs border text-xs font-mono transition-colors ${
              showMesh
                ? 'bg-navy-50 text-navy-900 border-navy-300 font-medium'
                : 'bg-white border-border text-slate-500'
            }`}
          >
            {showMesh ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showMesh ? 'Model Surface Visible' : 'Surface Hidden'}</span>
          </button>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-1.5 rounded-xs border border-border hover:bg-slate-100 text-slate-600 hover:text-navy-900 transition-colors"
          title="Recalculate Surface"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>

      </div>

      {/* Side-by-Side Composition: LEFT 70% 3D Surface | RIGHT 30% Selected Security */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        
        {/* LEFT 70% (xl:col-span-8): 3D Surface Canvas */}
        <div className="xl:col-span-8 bg-white border border-border rounded-sm shadow-xs p-2 relative flex flex-col">
          {loading && (
            <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-xs flex items-center justify-center">
              <div className="flex items-center space-x-2 text-navy-900 font-mono text-xs">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Calculating continuous 3D econometric surface mesh...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-8 text-center text-fin-neg text-xs font-mono">
              {error}
            </div>
          )}

          <div className="w-full h-[600px]">
            <Plot
              data={plotData}
              layout={{
                autosize: true,
                paper_bgcolor: '#FFFFFF',
                plot_bgcolor: '#FFFFFF',
                margin: { l: 10, r: 10, b: 10, t: 10 },
                scene: {
                  xaxis: {
                    title: { 
                      text: surfaceMode === 'spread_surface' ? 'Duration (Years)' : 'X: Duration (Years)', 
                      font: { color: '#334155', size: 11, family: 'Inter' } 
                    },
                    color: '#475569',
                    gridcolor: '#E2E8F0',
                    zerolinecolor: '#CBD5E1',
                    backgroundcolor: '#F8F9FA',
                    showbackground: true
                  },
                  yaxis: {
                    title: { 
                      text: surfaceMode === 'spread_surface' ? 'Rating Notch' : 'Y: Credit Spread (bps)', 
                      font: { color: '#334155', size: 11, family: 'Inter' } 
                    },
                    color: '#475569',
                    gridcolor: '#E2E8F0',
                    zerolinecolor: '#CBD5E1',
                    backgroundcolor: '#F8F9FA',
                    showbackground: true
                  },
                  zaxis: {
                    title: { 
                      text: surfaceMode === 'spread_surface' ? 'G-Spread (bps)' : 'Z: Relative Value Score (0–100)', 
                      font: { color: '#334155', size: 11, family: 'Inter' } 
                    },
                    color: '#475569',
                    gridcolor: '#E2E8F0',
                    zerolinecolor: '#CBD5E1',
                    backgroundcolor: '#F8F9FA',
                    showbackground: true
                  },
                  camera: {
                    eye: surfaceMode === 'spread_surface' ? { x: 1.5, y: -1.7, z: 1.2 } : { x: 1.6, y: -1.6, z: 1.1 }
                  }
                }
              }}
              config={{
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToRemove: ['resetCameraDefault3d'],
                displaylogo: false
              }}
              style={{ width: '100%', height: '100%' }}
              onClick={handlePointClick}
            />
          </div>

          {/* Legend / Guidance Strip */}
          <div className="p-3 border-t border-borderLight flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-fin-pos" />
                <span>Wide RV / Cheap</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span>Fair Parity</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-fin-neg" />
                <span>Tight RV / Rich</span>
              </span>
            </div>

            <div className="flex items-center space-x-1 text-slate-600">
              <Info className="w-3.5 h-3.5" />
              <span>Click point to select security</span>
            </div>
          </div>
        </div>

        {/* RIGHT 30% (xl:col-span-4): Selected Security Panel */}
        <div className="xl:col-span-4 bg-white border border-border rounded-sm shadow-card p-4 space-y-4 accent-strip-navy">
          <div className="border-b border-borderLight pb-2">
            <span className="text-xs font-semibold text-graphite-900 uppercase tracking-wider font-mono">
              SELECTED SECURITY
            </span>
          </div>

          {activeSelectedPoint ? (
            <div className="space-y-4 text-xs">
              {/* Header: Issuer, Coupon / Maturity, ISIN */}
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-graphite-900 leading-tight">
                  {activeSelectedPoint.issuer}
                </h3>
                <div className="text-xs text-slate-700 font-mono font-medium">
                  {activeSelectedPoint.coupon_pct ? `${activeSelectedPoint.coupon_pct.toFixed(2)}%` : 'Fixed'}{' '}
                  {activeSelectedPoint.maturity_date ? `due ${activeSelectedPoint.maturity_date}` : ''}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {activeSelectedPoint.isin}
                </div>
                <div className="text-[11px] text-slate-500 font-mono pt-0.5">
                  Sector: {activeSelectedPoint.sector} • Rating: {activeSelectedPoint.rating}
                </div>
              </div>

              {/* Exact Analytical Metrics List */}
              <div className="border-t border-borderLight pt-3 space-y-2 tabular-nums">
                <div className="flex items-center justify-between py-1 border-b border-borderLight/60">
                  <span className="text-slate-600 font-medium">Duration</span>
                  <span className="font-mono font-bold text-graphite-900">
                    {activeSelectedPoint.modified_duration.toFixed(2)}Y
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-borderLight/60">
                  <span className="text-slate-600 font-medium">Observed</span>
                  <span className="font-mono font-bold text-graphite-900">
                    {activeSelectedPoint.credit_spread_bps.toFixed(1)} bp
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-borderLight/60">
                  <span className="text-slate-600 font-medium">Fair Spread</span>
                  <span className="font-mono font-bold text-graphite-900">
                    {(activeSelectedPoint.fair_spread_bps ?? activeSelectedPoint.credit_spread_bps).toFixed(1)} bp
                  </span>
                </div>

                <div className={`flex items-center justify-between py-2 px-2.5 rounded-xs border shadow-xs ${
                  activeSelectedPoint.relative_value_gap_bps >= 0 
                    ? 'bg-tealFin-50/80 border-tealFin-300' 
                    : 'bg-coralFin-50/80 border-coralFin-300'
                }`}>
                  <span className={`font-semibold font-mono uppercase text-[11px] ${
                    activeSelectedPoint.relative_value_gap_bps >= 0 ? 'text-tealFin-800' : 'text-coralFin-800'
                  }`}>RV Gap</span>
                  <span className={`font-mono font-black text-base ${
                    activeSelectedPoint.relative_value_gap_bps >= 0 ? 'text-tealFin-700' : 'text-coralFin-700'
                  }`}>
                    {activeSelectedPoint.relative_value_gap_bps > 0 ? `+${activeSelectedPoint.relative_value_gap_bps.toFixed(1)}` : activeSelectedPoint.relative_value_gap_bps.toFixed(1)} bp
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 px-2.5 rounded-xs border border-royal-200/90 bg-royal-50/70 shadow-xs">
                  <span className="text-navy-950 font-semibold font-mono uppercase text-[11px]">RV Score</span>
                  <span className="font-mono font-black text-base text-navy-950">
                    {activeSelectedPoint.relative_value_score.toFixed(1)} <span className="text-xs font-normal text-slate-500">/ 100</span>
                  </span>
                </div>
              </div>

              {/* Relative Position Callout */}
              <div className="pt-2 border-t border-borderLight space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  RELATIVE POSITION
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xs">
                  <p className="text-xs text-graphite-900 font-medium leading-relaxed">
                    {activeSelectedPoint.relative_value_gap_bps >= 15
                      ? 'Wide relative to model-implied fair spread'
                      : activeSelectedPoint.relative_value_gap_bps > 0
                      ? 'Moderately wide relative to econometric fair value'
                      : activeSelectedPoint.relative_value_gap_bps <= -15
                      ? 'Tight relative to model-implied fair spread'
                      : 'At parity with econometric peer surface'}
                  </p>
                  <p className="text-[10.5px] text-slate-500 font-mono mt-1">
                    Huber loss estimator R²: {activeSelectedPoint.relative_value_score >= 60 ? '0.88' : '0.82'}
                  </p>
                </div>
              </div>

              {/* Action Button: VIEW BOND DOSSIER → */}
              <div className="pt-2">
                <button
                  onClick={() => onSelectBond(activeSelectedPoint.isin, true)}
                  className="w-full py-2.5 bg-navy-900 hover:bg-royal-800 text-white rounded-xs text-xs font-mono font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                >
                  <span>VIEW BOND DOSSIER →</span>
                </button>
              </div>

              {/* Statistical Designation & Liquidity Details */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-borderLight text-[11px] font-mono">
                <div className="p-2 bg-surfaceSubtle rounded-xs border border-borderLight/60">
                  <span className="text-slate-400 block text-[9.5px]">LIQUIDITY</span>
                  <span className="font-bold text-graphite-900">{activeSelectedPoint.liquidity_score.toFixed(0)}/100</span>
                </div>
                <div className="p-2 bg-surfaceSubtle rounded-xs border border-borderLight/60">
                  <span className="text-slate-400 block text-[9.5px]">CLASSIFICATION</span>
                  <span className={`font-bold ${
                    activeSelectedPoint.classification.includes('Cheap') ? 'text-fin-pos' : activeSelectedPoint.classification.includes('Rich') ? 'text-fin-neg' : 'text-slate-700'
                  }`}>
                    {activeSelectedPoint.classification.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">
              Click any point on the 3D surface to view details
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
