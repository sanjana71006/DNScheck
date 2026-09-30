import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header.js';
import { Footer } from './components/layout/Footer.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ScannerPage } from './pages/ScannerPage.js';
import { MapPage } from './pages/MapPage.js';
import { ResolversPage } from './pages/ResolversPage.js';
import { RecordsPage } from './pages/RecordsPage.js';
import { FindingsPage } from './pages/FindingsPage.js';
import { ThreatIntelPage } from './pages/ThreatIntelPage.js';
import { MonitoringPage } from './pages/MonitoringPage.js';
import { HistoryPage } from './pages/HistoryPage.js';
import { DocumentationPage } from './pages/DocumentationPage.js';
import { api } from './api/client.js';
import { ScanResult, ScanStage, DNSRecordType } from '@dnscheck/shared';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentScan, setCurrentScan] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [stages, setStages] = useState<ScanStage[]>([]);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('dnscheck_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('dnscheck_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const DEFAULT_STAGES: ScanStage[] = [
    { stage: 'VALIDATE_DOMAIN', label: 'Domain Syntax Validation', status: 'PENDING' },
    { stage: 'DISCOVER_AUTH', label: 'Authoritative NS & SOA Discovery', status: 'PENDING' },
    { stage: 'QUERY_RESOLVERS', label: 'Query 14 Global Resolver Vantages', status: 'PENDING' },
    { stage: 'CALCULATE_PROPAGATION', label: 'Response Normalization & Scoring', status: 'PENDING' },
    { stage: 'SECURITY_CHECKS', label: 'SPF, DMARC, MX & CNAME Safety Checks', status: 'PENDING' },
    { stage: 'PERSISTENCE', label: 'Persisting Telemetry to MongoDB', status: 'PENDING' }
  ];

  // Run initial scan on load for instant live demonstration
  useEffect(() => {
    handleScan('example.com', ['A', 'AAAA', 'MX', 'TXT', 'NS']);
  }, []);

  const handleScan = async (domain: string, recordTypes: DNSRecordType[]) => {
    setIsLoading(true);
    setStages(DEFAULT_STAGES);
    setCurrentStageIndex(0);

    // Simulated quick stage progression while scan executes
    const stageInterval = setInterval(() => {
      setCurrentStageIndex((prev) => {
        if (prev < DEFAULT_STAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 400);

    try {
      const result = await api.startScan(domain, recordTypes, isDemoMode);
      setCurrentScan(result);
      setCurrentStageIndex(DEFAULT_STAGES.length);
    } catch (err: any) {
      console.warn('Scan execution note:', err?.message || err);
    } finally {
      clearInterval(stageInterval);
      setIsLoading(false);
    }
  };

  const handleSelectHistoricalScan = async (scanId: string) => {
    try {
      setIsLoading(true);
      const scan = await api.getScan(scanId);
      setCurrentScan(scan);
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Failed to load scan', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDemoMode={isDemoMode}
        setIsDemoMode={setIsDemoMode}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardPage
            currentScan={currentScan}
            isLoading={isLoading}
            isDemoMode={isDemoMode}
            stages={stages}
            currentStageIndex={currentStageIndex}
            onScan={handleScan}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'scanner' && (
          <ScannerPage
            currentScan={currentScan}
            isLoading={isLoading}
            isDemoMode={isDemoMode}
            stages={stages}
            currentStageIndex={currentStageIndex}
            onScan={handleScan}
          />
        )}

        {activeTab === 'map' && <MapPage currentScan={currentScan} />}

        {activeTab === 'resolvers' && <ResolversPage currentScan={currentScan} />}

        {activeTab === 'records' && <RecordsPage currentScan={currentScan} />}

        {activeTab === 'findings' && <FindingsPage currentScan={currentScan} />}

        {activeTab === 'threat-intel' && (
          <ThreatIntelPage
            onScanDomain={(domain) => {
              handleScan(domain, ['A', 'AAAA', 'MX', 'TXT', 'NS']);
              setActiveTab('scanner');
            }}
          />
        )}

        {activeTab === 'monitoring' && (
          <MonitoringPage
            currentDomain={currentScan?.domain}
            onScanDomain={(domain, targetTab) => {
              handleScan(domain, ['A', 'AAAA', 'MX', 'TXT', 'NS']);
              if (targetTab) {
                setActiveTab(targetTab);
              }
            }}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'history' && <HistoryPage onSelectScan={handleSelectHistoricalScan} />}

        {activeTab === 'docs' && <DocumentationPage />}
      </main>

      <Footer />
    </div>
  );
};

export default App;
