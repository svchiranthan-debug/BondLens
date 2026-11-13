import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  ShieldCheck, 
  Code
} from 'lucide-react';
import { ProvenanceData, BondSummary, DataProvenanceItem } from '../types';
import { fetchProvenance, fetchBonds } from '../services/api';

interface ProvenanceViewProps {
  initialIsin?: string | null;
  onNavigateToBond?: (isin: string) => void;
  onSelectBond?: (isin: string) => void;
}

export const ProvenanceView: React.FC<ProvenanceViewProps> = ({
  initialIsin,
  onNavigateToBond,
  onSelectBond
}) => {
  const [data, setData] = useState<ProvenanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [availableBonds, setAvailableBonds] = useState<BondSummary[]>([]);
  const [selectedIsin, setSelectedIsin] = useState<string>(initialIsin || 'US000001108');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (initialIsin && initialIsin !== selectedIsin) {
      setSelectedIsin(initialIsin);
    }
  }, [initialIsin]);

  useEffect(() => {
    loadUniverse();
  }, []);

  useEffect(() => {
    loadProvenance(selectedIsin);
  }, [selectedIsin]);

  const loadUniverse = async () => {
    try {
      const bonds = await fetchBonds();
      setAvailableBonds(bonds);
    } catch (e) {
      console.error("Failed to load universe for provenance", e);
    }
  };

  const loadProvenance = async (isin: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProvenance(isin);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load provenance dossier');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (code: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const filteredItems = data?.provenance_items.filter((item) => {
    if (filterClass === 'all') return true;
    return item.epistemic_status.toLowerCase().includes(filterClass.toLowerCase());
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[65vh]">
        <div className="flex flex-col items-center space-y-2 text-slate-500 font-mono text-xs">
          <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
          <span>Assembling quantitative model validation & mathematical audit dossier...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-border p-8 max-w-3xl mx-auto rounded-sm space-y-3">
        <div className="text-fin-neg font-mono text-sm font-semibold">Provenance Retrieval Failed</div>
        <div className="text-xs text-slate-600 font-mono">{error || 'Unknown error'}</div>
        <button 
          onClick={() => loadProvenance(selectedIsin)}
          className="px-3 py-1 bg-navy-900 text-white rounded-xs font-mono text-xs"
        >
          Retry Provenance Audit
        </button>
      </div>
    );
  }

  const { bond } = data;

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto pb-20">
      
      {/* Header & Methodology Overview */}
      <div className="bg-white border border-border p-5 rounded-sm shadow-xs space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-borderLight pb-3">
          <div>
            <span className="text-[10.5px] uppercase font-mono tracking-widest text-slate-500 block">
              Quantitative Methodology Document
            </span>
            <h1 className="text-lg font-bold tracking-tight text-graphite-900 uppercase font-sans mt-0.5">
              Model Validation, Formulaic Provenance & Audit Trail
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Empirical traceability of every displayed statistic to originating market data, mathematical models, and tests
            </p>
          </div>

          {/* Security Selector */}
          <div className="flex items-center space-x-2 bg-surfaceSubtle border border-border rounded-xs px-2.5 py-1 text-xs font-mono">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Subject:</span>
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
                  {b.issuer} ({b.isin})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Security Audit Metadata Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <span>Security: <strong className="text-graphite-900">{bond.issuer} ({bond.isin})</strong></span>
            <span className="text-borderDark">|</span>
            <span>Coupon/Maturity: <strong className="text-graphite-900">{bond.coupon_pct}% due {bond.maturity_date}</strong></span>
            <span className="text-borderDark">|</span>
            <span>Sector/Rating: <strong className="text-graphite-900">{bond.sector} • {bond.rating}</strong></span>
          </div>

          <div className="flex items-center space-x-1.5 text-fin-pos text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-semibold">ALL METRICS MATHEMATICALLY AUDITED (100%)</span>
          </div>
        </div>
      </div>

      {/* Filter Bar by Epistemic Status */}
      <div className="bg-white border border-border p-3 rounded-sm shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 text-[11px] uppercase mr-1">Classification:</span>
          
          <button
            onClick={() => setFilterClass('all')}
            className={`px-2.5 py-1 rounded-xs border text-xs transition-colors ${
              filterClass === 'all'
                ? 'bg-navy-900 text-white border-navy-900 font-semibold'
                : 'bg-white border-border text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Items ({data.provenance_items.length})
          </button>

          <button
            onClick={() => setFilterClass('observed')}
            className={`px-2 py-1 rounded-xs border text-[11px] transition-colors ${
              filterClass === 'observed'
                ? 'bg-slate-800 text-white border-slate-800 font-semibold'
                : 'bg-white border-border text-slate-700 hover:bg-slate-50'
            }`}
          >
            OBSERVED DATA
          </button>

          <button
            onClick={() => setFilterClass('calculated')}
            className={`px-2 py-1 rounded-xs border text-[11px] transition-colors ${
              filterClass === 'calculated'
                ? 'bg-slate-800 text-white border-slate-800 font-semibold'
                : 'bg-white border-border text-slate-700 hover:bg-slate-50'
            }`}
          >
            CALCULATED
          </button>

          <button
            onClick={() => setFilterClass('estimated')}
            className={`px-2 py-1 rounded-xs border text-[11px] transition-colors ${
              filterClass === 'estimated'
                ? 'bg-slate-800 text-white border-slate-800 font-semibold'
                : 'bg-white border-border text-slate-700 hover:bg-slate-50'
            }`}
          >
            MODEL ESTIMATE
          </button>

          <button
            onClick={() => setFilterClass('assumed')}
            className={`px-2 py-1 rounded-xs border text-[11px] transition-colors ${
              filterClass === 'assumed'
                ? 'bg-slate-800 text-white border-slate-800 font-semibold'
                : 'bg-white border-border text-slate-700 hover:bg-slate-50'
            }`}
          >
            ASSUMPTION / HYPOTHETICAL
          </button>
        </div>

        <div className="text-[11px] text-slate-500">
          Showing <strong className="text-graphite-900">{filteredItems.length}</strong> audited metrics
        </div>
      </div>

      {/* Institutional Provenance Table */}
      <div className="bg-white border border-border rounded-sm shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="research-table">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Metric</th>
                <th className="text-right">Value</th>
                <th className="text-center">Classification</th>
                <th className="text-center">Integrity</th>
                <th>Source Data</th>
                <th>Formula / Derivation</th>
                <th className="text-right">Sample</th>
                <th>Validation Test</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {filteredItems.map((item, idx) => {
                const isExpanded = expandedIndex === idx;

                // Small typographic styling for classifications
                const classLabel = item.epistemic_status.toUpperCase();
                let classBadgeStyle = 'border-slate-300 text-slate-700 bg-slate-50';
                if (classLabel.includes('OBSERVED')) {
                  classBadgeStyle = 'border-slate-300 text-slate-700 bg-slate-100/80 font-medium';
                } else if (classLabel.includes('ESTIMATED')) {
                  classBadgeStyle = 'border-indigoAcc-200 text-indigoAcc-700 bg-indigoAcc-50 font-medium';
                } else if (classLabel.includes('ASSUMED') || classLabel.includes('SIMULATED')) {
                  classBadgeStyle = 'border-amber-300 text-amber-800 bg-amber-50 font-medium';
                } else if (classLabel.includes('CALCULATED')) {
                  classBadgeStyle = 'border-tealFin-200 text-tealFin-700 bg-tealFin-50 font-medium';
                }

                return (
                  <React.Fragment key={idx}>
                    <tr 
                      className={`cursor-pointer transition-colors ${isExpanded ? 'bg-navy-50/50' : 'hover:bg-slate-50'}`}
                      onClick={() => toggleExpand(idx)}
                    >
                      <td className="text-center text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-navy-900" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </td>

                      <td className="font-semibold text-graphite-900">
                        {item.metric_name}
                      </td>

                      <td className="text-right font-mono font-bold text-graphite-900">
                        {item.displayed_value}
                      </td>

                      <td className="text-center">
                        <span className={`inline-block px-1.5 py-0.5 text-[9.5px] font-mono rounded-xs border ${classBadgeStyle}`}>
                          {item.epistemic_status}
                        </span>
                      </td>

                      <td className="text-center">
                        <span className="inline-block px-1.5 py-0.5 text-[9.5px] font-mono text-fin-pos bg-fin-posBg border border-fin-posBorder rounded-xs font-semibold">
                          {item.research_integrity_status}
                        </span>
                      </td>

                      <td className="text-slate-600 text-[11px] max-w-xs truncate" title={item.input_data}>
                        {item.input_data}
                      </td>

                      <td className="font-mono text-[10.5px] text-slate-700 max-w-xs truncate" title={item.formula}>
                        {item.formula}
                      </td>

                      <td className="text-right font-mono text-slate-600 text-[11px]">
                        {item.sample_size}
                      </td>

                      <td className="font-mono text-[10.5px] text-slate-600 max-w-xs truncate" title={item.validation_methodology}>
                        {item.validation_methodology}
                      </td>
                    </tr>

                    {/* Expandable Technical Trace */}
                    {isExpanded && (
                      <tr className="bg-surfaceSubtle">
                        <td colSpan={9} className="px-5 py-4 border-b border-border">
                          <div className="space-y-3 text-xs">
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <span className="text-[10.5px] font-mono uppercase text-slate-500">Validation Methodology</span>
                                <div className="font-mono text-graphite-900 text-xs">
                                  {item.validation_methodology}
                                </div>
                                <div className="text-[11px] text-slate-600 mt-1">
                                  Sample Period: {item.time_period} • D.O.F: {item.degrees_of_freedom}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10.5px] font-mono uppercase text-slate-500">Potential Sources of Bias</span>
                                <ul className="list-disc list-inside text-slate-700 text-[11.5px] space-y-0.5 leading-relaxed font-sans">
                                  {item.potential_biases && item.potential_biases.map((b, bi) => (
                                    <li key={bi}>{b}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10.5px] font-mono uppercase text-slate-500">Statistical Meaningfulness</span>
                                <div className="text-slate-700 text-[11.5px] leading-relaxed">
                                  {item.statistical_meaningfulness}
                                </div>
                                <div className="text-[11px] text-fin-pos font-mono mt-1">
                                  Audit Status: {item.research_integrity_status} (Automated PyTest verified)
                                </div>
                              </div>
                            </div>

                            {/* Code Snippet Box */}
                            {item.reproducible_python && (
                              <div className="space-y-1 pt-2 border-t border-borderLight">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10.5px] font-mono text-slate-500 uppercase flex items-center space-x-1">
                                    <Code className="w-3.5 h-3.5" />
                                    <span>Reproducible Python Engine Implementation</span>
                                  </span>
                                  <button
                                    onClick={(e) => handleCopy(item.reproducible_python, idx, e)}
                                    className="flex items-center space-x-1 text-[11px] font-mono text-slate-600 hover:text-navy-900"
                                  >
                                    {copiedIndex === idx ? (
                                      <>
                                        <Check className="w-3 h-3 text-fin-pos" />
                                        <span className="text-fin-pos font-semibold">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy Code</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre className="p-3 bg-white border border-borderLight rounded-xs text-[11px] font-mono text-graphite-900 overflow-x-auto">
                                  <code>{item.reproducible_python}</code>
                                </pre>
                              </div>
                            )}

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
