import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { 
  History, 
  ShieldCheck, 
  RefreshCw
} from 'lucide-react';
import { fetchBacktest, fetchModelBenchmarks } from '../services/api';
import { BacktestResult, ModelBenchmarkItem, FeatureImportanceItem } from '../types';

export const BacktestingView: React.FC = () => {
  const [backtestData, setBacktestData] = useState<BacktestResult | null>(null);
  const [modelData, setModelData] = useState<{
    models: ModelBenchmarkItem[];
    feature_importances: FeatureImportanceItem[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [holdingDays, setHoldingDays] = useState<number>(60);
  const [minRvGap, setMinRvGap] = useState<number>(15);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [bt, md] = await Promise.all([
        fetchBacktest(holdingDays, minRvGap),
        fetchModelBenchmarks()
      ]);
      setBacktestData(bt);
      setModelData(md);
    } catch (err) {
      console.error('Failed to load backtest/model data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [holdingDays, minRvGap]);

  if (loading || !backtestData || !modelData) {
    return (
      <div className="flex items-center justify-center h-[65vh]">
        <div className="flex flex-col items-center space-y-2 text-slate-500 font-mono text-xs">
          <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
          <span>Running out-of-sample walk-forward historical simulation...</span>
        </div>
      </div>
    );
  }

  const { performance_metrics, period_breakdown, portfolio_series, recent_trades_sample } = backtestData;

  // Cumulative Return Plot
  const cumReturnPlotData = [
    {
      name: 'Systematic RV Strategy',
      type: 'scatter',
      mode: 'lines',
      x: portfolio_series.map(p => p.date),
      y: portfolio_series.map(p => p.strategy_cumulative_return_pct),
      line: { color: '#0D9488', width: 2.2 }
    },
    {
      name: 'Credit Market Benchmark',
      type: 'scatter',
      mode: 'lines',
      x: portfolio_series.map(p => p.date),
      y: portfolio_series.map(p => p.benchmark_cumulative_return_pct),
      line: { color: '#64748B', width: 1.5, dash: 'dot' }
    },
    {
      name: 'Excess Return vs Benchmark',
      type: 'scatter',
      mode: 'lines',
      x: portfolio_series.map(p => p.date),
      y: portfolio_series.map(p => p.excess_cumulative_return_pct),
      line: { color: '#1E3A8A', width: 1.8 }
    }
  ];

  // Feature Importance Horizontal Bar Plot
  const featPlotData = [
    {
      type: 'bar',
      orientation: 'h',
      x: modelData.feature_importances.map(f => f.importance_pct).reverse(),
      y: modelData.feature_importances.map(f => f.display_name).reverse(),
      marker: {
        color: '#1E3A8A'
      }
    }
  ];

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto pb-20">
      
      {/* 1. Prominent Top Banner: HYPOTHETICAL PARAMETRIC SIMULATION / NOT REALIZED TRADING PERFORMANCE */}
      <div className="bg-amber-50/50 border border-amber-300 p-4 rounded-sm shadow-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
          <div>
            <h1 className="text-sm font-bold font-mono text-amber-900 uppercase tracking-wide">
              HYPOTHETICAL PARAMETRIC SIMULATION
            </h1>
            <div className="text-xs font-mono font-semibold text-amber-800 tracking-normal mt-0.5">
              NOT REALIZED TRADING PERFORMANCE
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xs font-bold uppercase tracking-wider">
              SIMULATED RESEARCH MODEL
            </span>
            <span className="text-[11px] font-mono text-slate-600">
              Strict Calibration / Validation / Test Partitioning
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed font-sans">
          This backtest is a parameterized walk-forward simulation (Ornstein-Uhlenbeck drift process with 58% mean-reversion speed and bid-ask slippage deductions). 
          Offline research datasets do not contain intraday institutional TRACE tick feeds. These outputs illustrate the quantitative evaluation methodology and model sensitivity, not a live audited track record.
        </p>
      </div>

      {/* 2. Simulation Controls & Horizon Strip */}
      <div className="bg-white border border-border p-3 rounded-sm shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">Holding Horizon:</span>
            <select
              value={holdingDays}
              onChange={(e) => setHoldingDays(Number(e.target.value))}
              className="bg-white border border-border rounded-xs px-2.5 py-1 text-xs text-graphite-800 focus:outline-none focus:border-navy-900"
            >
              <option value={30}>30 Days (Short Horizon)</option>
              <option value={60}>60 Days (Base Horizon)</option>
              <option value={90}>90 Days (Quarterly Horizon)</option>
              <option value={120}>120 Days (Full Cycle)</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">Min RV Gap Trigger:</span>
            <select
              value={minRvGap}
              onChange={(e) => setMinRvGap(Number(e.target.value))}
              className="bg-white border border-border rounded-xs px-2.5 py-1 text-xs text-graphite-800 focus:outline-none focus:border-navy-900"
            >
              <option value={10}>≥ 10 bps (Wide Universe)</option>
              <option value={15}>≥ 15 bps (Standard Gate)</option>
              <option value={20}>≥ 20 bps (Conservative Gate)</option>
              <option value={30}>≥ 30 bps (High Dislocation Only)</option>
            </select>
          </div>
        </div>

        <button
          onClick={loadAll}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-xs border border-border hover:bg-slate-50 text-slate-700 text-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-Simulate</span>
        </button>
      </div>

      {/* 3. SIDE-BY-SIDE: Methodology & Protocol (Col 5) vs Simulated Results (Col 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT: Methodology & Validation Protocol (col-span-5) */}
        <div className="lg:col-span-5 bg-white border border-border p-5 rounded-sm shadow-card space-y-3">
          <div className="border-b border-borderLight pb-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-royal-600 font-semibold">EVALUATION PROTOCOL</div>
            <h2 className="text-sm font-bold text-graphite-900 uppercase font-mono mt-0.5">
              Quantitative Methodology & Partitioning
            </h2>
          </div>

          <div className="space-y-3 text-xs text-slate-700 leading-relaxed font-sans">
            <div className="p-3 bg-surfaceSubtle rounded-xs border border-borderLight border-l-2 border-l-royal-600 transition-all hover:bg-slate-50">
              <strong className="text-graphite-900 font-mono text-[11px] block">01 Walk-Forward Partitioning:</strong>
              <span className="text-slate-600">
                Data is segmented strictly into Calibration ({period_breakdown.training_periods} periods), Validation ({period_breakdown.validation_periods} periods), and Out-of-Sample Test ({period_breakdown.out_of_sample_test_periods} periods) to prevent look-ahead bias and cross-sectional data leakage.
              </span>
            </div>

            <div className="p-3 bg-surfaceSubtle rounded-xs border border-borderLight border-l-2 border-l-indigoAcc-600 transition-all hover:bg-slate-50">
              <strong className="text-graphite-900 font-mono text-[11px] block">02 Mean-Reverting Drift Mechanics:</strong>
              <span className="text-slate-600">
                Residual spreads follow an Ornstein-Uhlenbeck continuous drift process with calibrated historical reversion speed (half-life tau = 45 days).
              </span>
            </div>

            <div className="p-3 bg-surfaceSubtle rounded-xs border border-borderLight border-l-2 border-l-tealFin-600 transition-all hover:bg-slate-50">
              <strong className="text-graphite-900 font-mono text-[11px] block">03 Friction & Slippage Deductions:</strong>
              <span className="text-slate-600">
                Every hypothetical trade incurs full bid-ask spread frictions plus liquidity score haircuts before net return computation.
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: Simulated Statistical Results (col-span-7) */}
        <div className="lg:col-span-7 bg-white border border-border p-5 rounded-sm shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-borderLight pb-2">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">PARAMETRIC OUTPUTS</div>
              <h2 className="text-sm font-bold text-graphite-900 uppercase font-mono mt-0.5">
                Simulated Performance Metrics (Hypothetical)
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-xs font-semibold">
              SIMULATION ONLY
            </span>
          </div>

          {/* Metric Cells with subtle accent strips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
            <div className="p-3 bg-white border border-borderLight rounded-xs space-y-0.5 accent-strip-navy shadow-card hover:shadow-card-hover transition-all">
              <span className="text-[10px] uppercase font-mono text-slate-500 font-medium">Sim. Sharpe</span>
              <div className="text-2xl font-bold font-mono text-graphite-900 mt-1">
                {performance_metrics.annualized_sharpe_ratio.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400 font-mono block">Hypothetical model</span>
            </div>

            <div className="p-3 bg-white border border-borderLight rounded-xs space-y-0.5 accent-strip-teal shadow-card hover:shadow-card-hover transition-all">
              <span className="text-[10px] uppercase font-mono text-tealFin-700 font-medium">Sim. Hit Rate</span>
              <div className="text-2xl font-bold font-mono text-tealFin-700 mt-1">
                {performance_metrics.out_of_sample_hit_rate_pct.toFixed(1)}%
              </div>
              <span className="text-[10px] text-tealFin-600/80 font-mono block">Out-of-sample</span>
            </div>

            <div className="p-3 bg-white border border-borderLight rounded-xs space-y-0.5 accent-strip-coral shadow-card hover:shadow-card-hover transition-all">
              <span className="text-[10px] uppercase font-mono text-coralFin-700 font-medium">Sim. Max DD</span>
              <div className="text-2xl font-bold font-mono text-coralFin-700 mt-1">
                {performance_metrics.maximum_drawdown_pct.toFixed(2)}%
              </div>
              <span className="text-[10px] text-slate-400 font-mono block">Peak to trough</span>
            </div>

            <div className="p-3 bg-white border border-borderLight rounded-xs space-y-0.5 accent-strip-teal shadow-card hover:shadow-card-hover transition-all">
              <span className="text-[10px] uppercase font-mono text-tealFin-700 font-medium">Sim. Excess</span>
              <div className="text-2xl font-bold font-mono text-tealFin-700 mt-1">
                +{performance_metrics.cumulative_excess_return_pct.toFixed(2)}%
              </div>
              <span className="text-[10px] text-tealFin-600/80 font-mono block">Cumulative model</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums text-slate-600 pt-1 border-t border-borderLight">
            <div>
              <span className="text-slate-400 text-[10.5px]">Avg Compression:</span>{' '}
              <strong className="text-graphite-900">{performance_metrics.avg_spread_compression_bps.toFixed(1)} bp</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10.5px]">Monthly Turnover:</span>{' '}
              <strong className="text-graphite-900">{performance_metrics.turnover_monthly_pct.toFixed(1)}%</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10.5px]">Total Analyzed:</span>{' '}
              <strong className="text-graphite-900">{period_breakdown.total_trades_analyzed} trades</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10.5px]">OOF Test Trades:</span>{' '}
              <strong className="text-graphite-900">{period_breakdown.test_period_trades} trades</strong>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Cumulative Return Chart & Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Cumulative Return Chart */}
        <div className="lg:col-span-8 bg-white border border-border p-4 rounded-sm shadow-xs space-y-2">
          <div className="flex justify-between items-baseline border-b border-borderLight pb-1.5">
            <h3 className="text-xs font-semibold text-graphite-900 uppercase font-mono">
              Simulated Cumulative Excess Return
            </h3>
            <span className="text-[10.5px] font-mono text-slate-400">Unit: Cumulative Return (%)</span>
          </div>

          <div className="w-full h-[320px]">
            <Plot
              data={cumReturnPlotData}
              layout={{
                autosize: true,
                margin: { l: 50, r: 25, t: 15, b: 50 },
                paper_bgcolor: '#FFFFFF',
                plot_bgcolor: '#FFFFFF',
                showlegend: true,
                legend: {
                  orientation: 'h',
                  x: 0,
                  y: 1.12,
                  font: { family: 'Inter', size: 11, color: '#475569' }
                },
                xaxis: {
                  tickfont: { size: 10, color: '#64748B', family: 'JetBrains Mono' },
                  gridcolor: '#F1F5F9',
                  linecolor: '#CBD5E1'
                },
                yaxis: {
                  title: { text: 'Return (%)', font: { size: 11, color: '#334155' } },
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

        {/* Feature Importance */}
        <div className="lg:col-span-4 bg-white border border-border p-4 rounded-sm shadow-xs space-y-2">
          <div className="flex justify-between items-baseline border-b border-borderLight pb-1.5">
            <h3 className="text-xs font-semibold text-graphite-900 uppercase font-mono">
              Model Feature Importance
            </h3>
            <span className="text-[10.5px] font-mono text-slate-400">OOF Weight (%)</span>
          </div>

          <div className="w-full h-[320px]">
            <Plot
              data={featPlotData}
              layout={{
                autosize: true,
                margin: { l: 120, r: 25, t: 15, b: 40 },
                paper_bgcolor: '#FFFFFF',
                plot_bgcolor: '#FFFFFF',
                xaxis: {
                  title: { text: 'Weight (%)', font: { size: 10, color: '#475569' } },
                  tickfont: { size: 9, color: '#64748B', family: 'JetBrains Mono' },
                  gridcolor: '#F1F5F9',
                  linecolor: '#CBD5E1'
                },
                yaxis: {
                  tickfont: { size: 10, color: '#334155', family: 'Inter' }
                }
              }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>

      </div>

      {/* 5. Recent Simulated Trade Execution Sample Table */}
      <div className="bg-white border border-border p-4 rounded-sm shadow-xs space-y-2.5">
        <div className="flex justify-between items-baseline border-b border-borderLight pb-1.5">
          <h3 className="text-xs font-semibold text-graphite-900 uppercase font-mono">
            Simulated Out-of-Sample Trade Execution Sample
          </h3>
          <span className="text-[10.5px] font-mono text-slate-400">Walk-Forward Evaluation Sample</span>
        </div>

        <div className="overflow-x-auto">
          <table className="research-table">
            <thead>
              <tr>
                <th>Execution Date</th>
                <th>Partition</th>
                <th className="text-right">Initial RV Gap</th>
                <th className="text-right">Subsequent Spread Change</th>
                <th className="text-right">Holding Horizon</th>
                <th className="text-right">Gross Return</th>
                <th className="text-right">Net Return (Post-Slippage)</th>
                <th className="text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {recent_trades_sample.map((t, idx) => (
                <tr key={idx}>
                  <td className="font-mono text-graphite-900 font-medium">{t.date}</td>
                  <td>
                    <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-xs border border-slate-200 bg-slate-50 text-slate-700">
                      {t.period_type}
                    </span>
                  </td>
                  <td className="text-right font-mono text-graphite-900">
                    +{t.initial_rv_gap_bps.toFixed(1)} bps
                  </td>
                  <td className="text-right font-mono text-slate-700">
                    {t.subsequent_spread_change_bps > 0 ? `+${t.subsequent_spread_change_bps.toFixed(1)}` : t.subsequent_spread_change_bps.toFixed(1)} bps
                  </td>
                  <td className="text-right text-slate-600">{t.holding_period_days} days</td>
                  <td className="text-right font-mono text-slate-700">
                    {t.gross_return_pct > 0 ? `+${t.gross_return_pct.toFixed(2)}` : t.gross_return_pct.toFixed(2)}%
                  </td>
                  <td className="text-right font-mono font-semibold">
                    <span className={t.net_return_pct >= 0 ? 'text-fin-pos' : 'text-fin-neg'}>
                      {t.net_return_pct > 0 ? `+${t.net_return_pct.toFixed(2)}` : t.net_return_pct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded-xs border ${
                      t.is_profitable_compression 
                        ? 'bg-fin-posBg text-fin-pos border-fin-posBorder' 
                        : 'bg-fin-negBg text-fin-neg border-fin-negBorder'
                    }`}>
                      {t.is_profitable_compression ? 'COMPRESSED' : 'EXPANDED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
