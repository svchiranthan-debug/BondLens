import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardOverview } from './components/DashboardOverview';
import { Surface3DView } from './components/Surface3DView';
import { ScreenerView } from './components/ScreenerView';
import { AnalystDeepDiveView } from './components/AnalystDeepDiveView';
import { AnalystCaseStudyView } from './components/AnalystCaseStudyView';
import { BacktestingView } from './components/BacktestingView';
import { DataQualityView } from './components/DataQualityView';
import { ProvenanceView } from './components/ProvenanceView';
import { ScoringConfigModal } from './components/ScoringConfigModal';
import { fetchOverview, fetchBonds } from './services/api';
import { OverviewData, BondSummary } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'surface3d' | 'screener' | 'analyst' | 'caseStudy' | 'backtest' | 'dataQuality' | 'provenance'>('overview');
  const [selectedBondIsin, setSelectedBondIsin] = useState<string>('US000001108');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Global cached data
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [bonds, setBonds] = useState<BondSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ov, bList] = await Promise.all([
        fetchOverview(),
        fetchBonds()
      ]);
      setOverview(ov);
      setBonds(bList);
      if (bList.length > 0) {
        // Ensure selected bond exists in universe or fallback
        const exists = bList.some(b => b.isin === selectedBondIsin);
        if (!exists) {
          const defaultBond = bList.find(b => b.isin === 'US000001108') || bList[0];
          setSelectedBondIsin(defaultBond.isin);
        }
      }
    } catch (err) {
      console.error('Failed to load initial platform data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Global selected bond summary object
  const selectedBond = bonds.find(b => b.isin === selectedBondIsin) || null;

  const handleSelectBond = (isin: string, openDossier: boolean = true) => {
    setSelectedBondIsin(isin);
    if (openDossier) {
      setActiveTab('analyst');
    }
  };

  return (
    <div className="min-h-screen bg-paper text-graphite-900 flex flex-col selection:bg-navy-900 selection:text-white font-sans">
      
      {/* Institutional Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedBond={selectedBond}
        onOpenSettings={() => setIsSettingsOpen(true)}
        dataHealthStatus={overview?.data_health.status}
      />

      {/* Main Workstation Viewport */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto p-3 sm:p-5 lg:p-6">
        
        {activeTab === 'overview' && (
          <DashboardOverview
            data={overview}
            bonds={bonds}
            loading={loading}
            selectedBondIsin={selectedBondIsin}
            onSelectBond={(isin) => handleSelectBond(isin, true)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'surface3d' && (
          <Surface3DView
            selectedBondIsin={selectedBondIsin}
            onSelectBond={handleSelectBond}
          />
        )}

        {activeTab === 'screener' && (
          <ScreenerView
            bonds={bonds}
            loading={loading}
            selectedBondIsin={selectedBondIsin}
            onSelectBond={handleSelectBond}
          />
        )}

        {activeTab === 'analyst' && selectedBondIsin && (
          <AnalystDeepDiveView
            isin={selectedBondIsin}
            onBack={() => setActiveTab('screener')}
            onSelectPeer={(peerIsin) => setSelectedBondIsin(peerIsin)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'caseStudy' && (
          <AnalystCaseStudyView
            initialIsin={selectedBondIsin}
            onSelectBond={(isin) => setSelectedBondIsin(isin)}
            onNavigateToBond={(isin) => {
              setSelectedBondIsin(isin);
              setActiveTab('analyst');
            }}
          />
        )}

        {activeTab === 'backtest' && (
          <BacktestingView />
        )}

        {activeTab === 'dataQuality' && (
          <DataQualityView />
        )}

        {activeTab === 'provenance' && (
          <ProvenanceView
            initialIsin={selectedBondIsin}
            onSelectBond={(isin) => setSelectedBondIsin(isin)}
            onNavigateToBond={(isin) => {
              setSelectedBondIsin(isin);
              setActiveTab('analyst');
            }}
          />
        )}
      </main>

      {/* Relative Value Scoring Config Modal */}
      <ScoringConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onWeightsUpdated={loadData}
      />

      {/* Institutional Footer */}
      <footer className="border-t border-border bg-white py-2.5 px-6 text-[11px] font-mono text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-fin-pos" />
          <span className="text-graphite-800 font-semibold">BondLens • Fixed-Income Relative-Value & Mispricing Intelligence Platform • v1.2</span>
          <span className="text-borderDark">|</span>
          <span>US Corporate Credit Universe ({bonds.length || 204} Securities)</span>
        </div>
        <div className="text-slate-500 text-[10.5px]">
          Econometric Fair Spread via Nelson-Siegel Base & Robust Huber Regression • Fully Audited Traceability
        </div>
      </footer>

    </div>
  );
}

export default App;
