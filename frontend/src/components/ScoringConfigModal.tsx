import React, { useState } from 'react';
import { X, Sliders, CheckCircle2, RotateCcw } from 'lucide-react';
import { updateScoringWeights } from '../services/api';

interface ScoringConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWeightsUpdated: () => void;
}

export const ScoringConfigModal: React.FC<ScoringConfigModalProps> = ({
  isOpen,
  onClose,
  onWeightsUpdated
}) => {
  const [valWeight, setValWeight] = useState<number>(0.40);
  const [liqWeight, setLiqWeight] = useState<number>(0.20);
  const [credWeight, setCredWeight] = useState<number>(0.20);
  const [confWeight, setConfWeight] = useState<number>(0.20);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const total = valWeight + liqWeight + credWeight + confWeight;

  const handleReset = () => {
    setValWeight(0.40);
    setLiqWeight(0.20);
    setCredWeight(0.20);
    setConfWeight(0.20);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateScoringWeights({
        valuation_gap: valWeight,
        liquidity: liqWeight,
        credit_quality: credWeight,
        model_confidence: confWeight
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onWeightsUpdated();
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to update scoring weights:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-border w-full max-w-lg p-6 space-y-4 relative shadow-lg rounded-sm">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-navy-900" />
            <h2 className="text-sm font-bold text-graphite-900 font-mono uppercase tracking-wider">
              Relative Value Scoring Weightings
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-navy-900 p-1 rounded-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-sans">
          Specify empirical weights for valuation dislocation, trading liquidity penalty, rating cushion, and peer cohort dispersion. Scores are transparently normalized across the security master.
        </p>

        {/* Sliders */}
        <div className="space-y-3.5 text-xs font-mono">
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-graphite-900 font-medium">Valuation Gap Weight (z-score)</span>
              <span className="text-navy-900 font-bold">{(valWeight * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.70"
              step="0.05"
              value={valWeight}
              onChange={(e) => setValWeight(Number(e.target.value))}
              className="w-full accent-navy-900 cursor-pointer"
            />
            <div className="text-[10.5px] text-slate-500 font-sans">
              Rewards spread dislocation vs Huber econometric fair value.
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-graphite-900 font-medium">Liquidity Adjustment Weight</span>
              <span className="text-navy-900 font-bold">{(liqWeight * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={liqWeight}
              onChange={(e) => setLiqWeight(Number(e.target.value))}
              className="w-full accent-navy-900 cursor-pointer"
            />
            <div className="text-[10.5px] text-slate-500 font-sans">
              Penalizes wide bid-ask crossing spreads and low turnover.
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-graphite-900 font-medium">Credit Quality & Seniority Weight</span>
              <span className="text-navy-900 font-bold">{(credWeight * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={credWeight}
              onChange={(e) => setCredWeight(Number(e.target.value))}
              className="w-full accent-navy-900 cursor-pointer"
            />
            <div className="text-[10.5px] text-slate-500 font-sans">
              Rewards high investment-grade ratings and senior debt covenants.
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-graphite-900 font-medium">Model Confidence & Low Dispersion</span>
              <span className="text-navy-900 font-bold">{(confWeight * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={confWeight}
              onChange={(e) => setConfWeight(Number(e.target.value))}
              className="w-full accent-navy-900 cursor-pointer"
            />
            <div className="text-[10.5px] text-slate-500 font-sans">
              Penalizes wide peer cohort standard error and regression dispersion.
            </div>
          </div>

        </div>

        {/* Weights Sum */}
        <div className="p-2.5 rounded-xs bg-surfaceSubtle border border-border flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500">Total Sum:</span>
          <span className="font-bold text-graphite-900">{(total * 100).toFixed(0)}% (Normalized)</span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-borderLight">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1 text-slate-500 hover:text-navy-900 text-xs font-mono"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Standard Defaults</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xs border border-border text-slate-700 hover:bg-slate-50 text-xs font-mono"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-1 px-4 py-1.5 rounded-xs bg-navy-900 text-white font-semibold hover:bg-navy-800 text-xs font-mono transition-colors"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Applied</span>
                </>
              ) : (
                <span>{saving ? 'Recalculating...' : 'Apply Weights'}</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
