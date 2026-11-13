import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, HardDrive, ShieldAlert, Disc, BarChart3, HelpCircle, Zap } from 'lucide-react';

const tabs = [
  { id: 'cpu', label: 'CPU Scheduling', icon: Cpu },
  { id: 'memory', label: 'Memory Paging', icon: HardDrive },
  { id: 'banker', label: "Banker's Deadlock", icon: ShieldAlert },
  { id: 'disk', label: 'Disk Scheduling', icon: Disc },
  { id: 'benchmark', label: 'Compare All', icon: BarChart3 },
  { id: 'interview', label: 'Q&A Cheatsheet', icon: HelpCircle, highlight: true },
];

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <header className="sticky top-0 z-50 bg-dark-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                OS Core Simulator
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                C++17 WASM
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Interactive Learning & Animation Suite</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 overflow-x-auto custom-scrollbar w-full md:w-auto py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'text-white'
                    : tab.highlight
                    ? 'text-amber-400 hover:text-amber-300 hover:bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBackground"
                    className="absolute inset-0 bg-brand-600 rounded-lg shadow-md shadow-brand-600/30"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
