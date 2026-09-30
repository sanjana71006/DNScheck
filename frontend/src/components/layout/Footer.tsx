import React from 'react';
import { Globe, Shield, Terminal, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090d16] text-slate-600 dark:text-slate-400 py-8 mt-16 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs">
            D
          </div>
          <span className="font-semibold text-slate-800 dark:text-slate-200">DNSCheck</span>
          <span>— Global DNS Propagation & Misconfiguration Verifier</span>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
            <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>14 Global Resolver Endpoints</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Passive Safety Guardrails</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
            <Terminal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Node.js Native DNS Engine</span>
          </div>
        </div>

        <div className="text-slate-500">
          Enterprise DNS Observability & Security Platform &bull; RFC 1035 Compliant
        </div>
      </div>
    </footer>
  );
};
