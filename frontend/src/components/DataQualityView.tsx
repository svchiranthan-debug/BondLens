import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle
} from 'lucide-react';
import { fetchDataQuality } from '../services/api';
import { DataQualityReport } from '../types';

export const DataQualityView: React.FC = () => {
  const [report, setReport] = useState<DataQualityReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('All');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchDataQuality();
      setReport(res);
    } catch (err) {
      console.error('Failed to load data quality report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !report) {
    return (
      <div className="flex items-center justify-center h-[65vh]">
        <div className="flex flex-col items-center space-y-2 text-slate-500 font-mono text-xs">
          <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
          <span>Executing automated data quality audits across all securities...</span>
        </div>
      </div>
    );
  }

  const filteredIssues = report.issue_details.filter((i) => {
    if (filterSeverity === 'All') return true;
    return i.severity === filterSeverity;
  });

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto pb-20">
      
      {/* Header Banner */}
      <div className="bg-white border border-border p-5 rounded-sm shadow-xs space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-borderLight pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-fin-pos" />
              <h1 className="text-lg font-bold tracking-tight text-graphite-900 uppercase font-sans">
                Data Quality & Market Feed Integrity Engine
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Institutional audits for stale pricing, crossed quotes, duration boundaries, and statistical spread anomalies
            </p>
          </div>

          <button
            onClick={loadData}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xs border border-border hover:bg-slate-50 text-slate-700 text-xs font-mono transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-Audit Universe</span>
          </button>
        </div>

        {/* Audit Score Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums font-mono">
          <div className="p-3 bg-white border border-borderLight rounded-xs space-y-1 accent-strip-teal shadow-card hover:shadow-card-hover transition-all">
            <span className="text-[10px] text-tealFin-700 uppercase font-semibold">Health Score</span>
            <div className="text-2xl font-bold text-tealFin-700 mt-1">{report.data_health_score.toFixed(1)}/100</div>
            <div className="text-[10px] text-tealFin-600/80">Status: {report.status}</div>
          </div>

          <div className="p-3 bg-white border border-borderLight rounded-xs space-y-1 accent-strip-navy shadow-card hover:shadow-card-hover transition-all">
            <span className="text-[10px] text-slate-500 uppercase font-medium">Securities Audited</span>
            <div className="text-2xl font-bold text-graphite-900 mt-1">{report.total_securities_audited} issues</div>
            <div className="text-[10px] text-slate-400">100% universe coverage</div>
          </div>

          <div className="p-3 bg-white border border-borderLight rounded-xs space-y-1 accent-strip-coral shadow-card hover:shadow-card-hover transition-all">
            <span className="text-[10px] text-coralFin-700 uppercase font-semibold">Critical Violations</span>
            <div className={`text-2xl font-bold mt-1 ${report.critical_issues === 0 ? 'text-tealFin-700' : 'text-coralFin-700'}`}>
              {report.critical_issues}
            </div>
            <div className="text-[10px] text-slate-400">Zero-tolerance gates</div>
          </div>

          <div className="p-3 bg-white border border-borderLight rounded-xs space-y-1 accent-strip-amber shadow-card hover:shadow-card-hover transition-all">
            <span className="text-[10px] text-amber-700 uppercase font-semibold">Warning Flags</span>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              {report.warning_issues + report.info_issues}
            </div>
            <div className="text-[10px] text-amber-600/80">Wide bid-ask / statistical tails</div>
          </div>
        </div>
      </div>

      {/* Institutional Validation Rules Checked */}
      <div className="bg-white border border-border p-4 rounded-sm shadow-card space-y-3">
        <h2 className="text-xs font-semibold text-graphite-900 uppercase tracking-wider font-mono border-b border-borderLight pb-2">
          Validation Rules Checked
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1 border-l-2 border-l-tealFin-600 transition-all hover:bg-slate-50">
            <div className="flex items-center space-x-1.5 text-graphite-900 font-semibold font-mono text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-tealFin-600 shrink-0" />
              <span>Missing & Stale Quotes</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
              Verifies dirty prices, coupon schedule continuity, settlement timestamps, and non-zero bid records.
            </p>
          </div>

          <div className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1 border-l-2 border-l-royal-600 transition-all hover:bg-slate-50">
            <div className="flex items-center space-x-1.5 text-graphite-900 font-semibold font-mono text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-royal-600 shrink-0" />
              <span>Duration Boundaries</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
              Ensures modified duration is strictly positive and vanilla convexity is non-negative.
            </p>
          </div>

          <div className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1 border-l-2 border-l-indigoAcc-600 transition-all hover:bg-slate-50">
            <div className="flex items-center space-x-1.5 text-graphite-900 font-semibold font-mono text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigoAcc-600 shrink-0" />
              <span>Crossed Quotes</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
              Validates that bid price is strictly lower than ask price on active institutional sheets.
            </p>
          </div>

          <div className="p-3 bg-surfaceSubtle border border-borderLight rounded-xs space-y-1 border-l-2 border-l-amber-500 transition-all hover:bg-slate-50">
            <div className="flex items-center space-x-1.5 text-graphite-900 font-semibold font-mono text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Statistical Outliers</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
              3.0 IQR interquartile distance filter tagging extreme pricing and credit spread outliers.
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Diagnostic Audit Log */}
      <div className="bg-white border border-border rounded-sm shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-border bg-surfaceSubtle flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <h2 className="text-xs font-semibold text-graphite-900 uppercase tracking-wider">
            Diagnostic Audit Log ({filteredIssues.length} entries)
          </h2>

          <div className="flex items-center space-x-2">
            <span className="text-slate-500">Filter Severity:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-white border border-border rounded-xs px-2 py-1 text-xs text-graphite-800 focus:outline-none focus:border-navy-900"
            >
              <option value="All">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warnings Only</option>
              <option value="INFO">Info / Outliers Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[480px]">
          <table className="research-table">
            <thead>
              <tr>
                <th className="w-24">Severity</th>
                <th>Security / ISIN</th>
                <th>Field Audited</th>
                <th>Validation Rule Triggered</th>
                <th className="text-right">Observed Value</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                    No data quality violations matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className={`px-1.5 py-0.2 text-[9.5px] font-mono font-medium rounded-xs border ${
                        issue.severity === 'CRITICAL'
                          ? 'bg-fin-negBg text-fin-neg border-fin-negBorder'
                          : issue.severity === 'WARNING'
                          ? 'bg-fin-warnBg text-fin-warn border-fin-warnBorder'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {issue.severity}
                      </span>
                    </td>
                    <td>
                      <div className="font-semibold text-graphite-900">{issue.issuer}</div>
                      <div className="text-[10px] font-mono text-slate-500">{issue.isin}</div>
                    </td>
                    <td className="font-mono text-slate-700 text-[11px]">{issue.field}</td>
                    <td className="text-slate-700 text-[11.5px] font-sans">{issue.rule}</td>
                    <td className="text-right font-mono text-graphite-900 font-medium">{String(issue.value)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
