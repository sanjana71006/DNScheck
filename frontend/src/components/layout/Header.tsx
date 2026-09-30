import React from 'react';
import {
  Globe,
  Activity,
  Layers,
  ShieldAlert,
  Clock,
  BookOpen,
  MapPin,
  RefreshCw,
  Server,
  Zap,
  ListFilter,
  CheckCircle2,
  Sun,
  Moon,
  Radio
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDemoMode,
  setIsDemoMode,
  theme = 'dark',
  onToggleTheme
}) => {

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'scanner', label: 'Scanner', icon: Zap },
    { id: 'map', label: 'Global Map', icon: MapPin },
    { id: 'records', label: 'Records', icon: Layers },
    { id: 'resolvers', label: 'Resolvers', icon: Server },
    { id: 'findings', label: 'Security', icon: ShieldAlert },
    { id: 'threat-intel', label: 'Threat Intel', icon: Radio },
    { id: 'monitoring', label: 'Monitoring', icon: Clock },
    { id: 'history', label: 'History', icon: ListFilter },
    { id: 'docs', label: 'Docs', icon: BookOpen }
  ];

  return (
    <header className="sticky top-0 z-[9999] bg-white dark:bg-[#090d16] border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Title */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none flex-shrink-0"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-cyan-400 text-white shadow-sm flex-shrink-0">
              <Globe className="w-4.5 h-4.5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-white dark:border-[#090d16]" />
            </div>
            <div className="flex items-center">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white font-mono leading-none">
                DNSCheck
              </span>
            </div>
          </div>

          {/* Streamlined Desktop Navigation Bar */}
          <nav className="hidden xl:flex items-center gap-0.5 bg-slate-100/90 dark:bg-slate-950/70 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`nav-item-btn flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs whitespace-nowrap select-none transition-all ${
                    isActive
                      ? 'nav-item-active bg-white text-sky-900 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40 font-bold shadow-xs'
                      : 'border border-transparent text-slate-700 hover:text-slate-950 hover:bg-white/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-900/60 font-medium'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-sky-700 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className={`leading-none ${isActive ? 'text-sky-900 dark:text-sky-300 font-bold' : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Right Status Badges & Controls */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Real DNS / Demo Mode Toggle Switch */}
            <button
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={`h-8 px-3 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 whitespace-nowrap transition-all shadow-xs flex-shrink-0 ${
                isDemoMode
                  ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200/70 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40 dark:hover:bg-amber-500/25'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40 dark:hover:bg-emerald-500/25'
              }`}
              title="Click to toggle between Real DNS queries and offline Hackathon Demo Fixtures"
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${isDemoMode ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}
              />
              <span className="font-mono text-[11px] tracking-tight leading-none">
                {isDemoMode ? 'DEMO DATA' : 'REAL DNS'}
              </span>
            </button>

            {/* Light / Dark Mode Toggle */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="w-8 h-8 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300 transition-all shadow-xs inline-flex items-center justify-center flex-shrink-0"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
                ) : (
                  <Moon className="w-4 h-4 text-sky-600 hover:-rotate-12 transition-transform" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Medium/Mobile Navigation Scroller */}
        <div className="xl:hidden flex items-center overflow-x-auto py-2 space-x-1.5 border-t border-slate-200 dark:border-slate-800/60 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item-btn flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  isActive
                    ? 'nav-item-active bg-white text-sky-900 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40 font-bold shadow-xs'
                    : 'border border-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/40 font-medium'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-sky-700 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className={`leading-none ${isActive ? 'text-sky-900 dark:text-sky-300 font-bold' : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
