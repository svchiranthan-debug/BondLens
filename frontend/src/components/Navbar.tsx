import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  CheckCircle2, 
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { BondSummary } from '../types';

interface NavbarProps {
  activeTab: 'overview' | 'surface3d' | 'screener' | 'analyst' | 'caseStudy' | 'backtest' | 'dataQuality' | 'provenance';
  setActiveTab: (tab: 'overview' | 'surface3d' | 'screener' | 'analyst' | 'caseStudy' | 'backtest' | 'dataQuality' | 'provenance') => void;
  selectedBond: BondSummary | null;
  onOpenSettings: () => void;
  dataHealthStatus?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedBond,
  onOpenSettings,
  dataHealthStatus = 'PASSED'
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems: { id: NavbarProps['activeTab']; label: string }[] = [
    { id: 'overview', label: 'Research' },
    { id: 'screener', label: 'Relative Value' },
    { id: 'analyst', label: 'Bonds' },
    { id: 'surface3d', label: '3D Surface' },
    { id: 'backtest', label: 'Backtest' },
    { id: 'caseStudy', label: 'Case Study' },
    { id: 'provenance', label: 'Provenance' },
    { id: 'dataQuality', label: 'Data Audit' },
  ];

  return (
    <header className="border-b border-border bg-white sticky top-0 z-50">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-12">
          
          {/* Left: Platform Identity */}
          <div className="flex items-center space-x-3 pr-4 border-r border-borderLight">
            <div className="w-6 h-6 bg-navy-900 text-white flex items-center justify-center font-mono font-bold text-xs rounded-sm tracking-tighter">
              BL
            </div>
            <div>
              <div className="flex items-center space-x-1.5 leading-none">
                <span className="font-bold tracking-tight text-graphite-900 text-[13px] uppercase">
                  BondLens
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-medium">
                  v1.2
                </span>
              </div>
              <p className="text-[9.5px] text-slate-500 font-mono tracking-tight hidden lg:block leading-none mt-0.5">
                Fixed-Income Relative-Value & Mispricing Intelligence Platform
              </p>
            </div>
          </div>

          {/* Center: Restrained Navigation */}
          <nav className="flex items-center space-x-0.5 sm:space-x-1 overflow-x-auto py-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative px-3 py-1 text-xs font-medium transition-colors rounded-sm flex items-center space-x-1.5 whitespace-nowrap ${
                    isActive
                      ? 'text-navy-950 bg-royal-50/80 font-semibold shadow-xs border border-royal-200/90'
                      : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100/70'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-[-5px] left-2 right-2 h-[2px] bg-royal-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Selected Security & Canonical Status Strip */}
          <div className="flex items-center space-x-3 pl-4 border-l border-borderLight text-[11px] font-mono text-slate-500">
            
            {/* Global Selected Security Indicator */}
            {selectedBond && (
              <button
                onClick={() => setActiveTab('analyst')}
                className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-xs border border-indigo-200/80 bg-indigo-50/60 hover:bg-indigo-100/80 hover:border-indigo-300 text-left transition-all cursor-pointer shadow-xs"
                title="Click to open Bond Dossier"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-royal-600 shrink-0" />
                <span className="text-[10px] font-mono text-slate-500">Selected:</span>
                <span className="font-semibold text-graphite-900 font-sans text-xs whitespace-nowrap">
                  {selectedBond.issuer} · {selectedBond.coupon_pct.toFixed(2)}% {selectedBond.maturity_date ? selectedBond.maturity_date.slice(0, 4) : ''}
                </span>
                <ChevronRight className="w-3 h-3 text-royal-700 ml-0.5" />
              </button>
            )}

            <div className="hidden xl:flex items-center space-x-3">
              <span className="text-slate-400">As-of: <strong className="text-graphite-800 font-medium">2026-09-07</strong></span>
              <span className="text-borderDark">|</span>
              <span className="text-slate-400">Universe: <strong className="text-graphite-800 font-medium">204 USD IG/HY</strong></span>
              <span className="text-borderDark">|</span>
              <span className="flex items-center space-x-1">
                {dataHealthStatus === 'PASSED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-fin-pos" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-fin-warn" />
                )}
                <span className="text-graphite-700 font-medium">AUDITED (100%)</span>
              </span>
            </div>

            <div className="hidden sm:block h-3.5 w-px bg-border" />

            <button
              onClick={onOpenSettings}
              className="p-1 rounded-sm border border-border hover:border-slate-400 text-slate-600 hover:text-navy-900 transition-colors"
              title="Configure Econometric Model Weights"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            <span className="text-[10px] text-slate-400 tabular-nums hidden sm:inline">
              {time}
            </span>
          </div>

        </div>
      </div>
    </header>
  );
};
