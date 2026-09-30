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
    { id: 'map', label: 'Map', icon: MapPin },
    { id: 'records', label: 'Records', icon: Layers },
    { id: 'resolvers', label: 'Resolvers', icon: Server },
    { id: 'findings', label: 'Security', icon: ShieldAlert },
    { id: 'threat-intel', label: 'Threat Intel', icon: Radio },
    { id: 'monitoring', label: 'Monitoring', icon: Clock },
    { id: 'history', label: 'History', icon: ListFilter },
    { id: 'docs', label: 'Docs', icon: BookOpen }
  ];

  return (
    <header className="sticky top-0 z-[9999] bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
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

          {/* Clean Borderless Enterprise Navigation */}
          <nav className="hidden xl:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs whitespace-nowrap select-none transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50 font-medium'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="leading-none">
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
              className={`h-8 px-3 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 whitespace-nowrap transition-colors flex-shrink-0 ${
                isDemoMode
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40 dark:hover:bg-amber-900/40'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40 dark:hover:bg-emerald-900/40'
              }`}
              title="Click to toggle between Real DNS queries and offline Demo Fixtures"
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${isDemoMode ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}
              />
              <span className="font-mono text-[11px] tracking-tight leading-none">
                {isDemoMode ? 'DEMO DATA' : 'REAL DNS'}
              </span>
            </button>

            {/* Light / Dark Mode Toggle (Ghost Button) */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 transition-colors inline-flex items-center justify-center flex-shrink-0"
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
        <div className="xl:hidden flex items-center overflow-x-auto py-2 space-x-1 border-t border-slate-200/80 dark:border-slate-800/80 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50 font-medium'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span className="leading-none">
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
