import React, { useState, useEffect } from 'react';
import { runMemorySimulation } from '../engine/wasmBridge.js';
import { motion, AnimatePresence } from 'framer-motion';
import { HardDrive, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export default function MemoryPaging() {
  const [algo, setAlgo] = useState('FIFO');
  const [frameCount, setFrameCount] = useState(3);
  const [refString, setRefString] = useState('1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5');

  const loadBeladyPreset = () => {
    setAlgo('FIFO');
    setFrameCount(4);
    setRefString('1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5');
  };

  // Native C++ WebAssembly Simulation Engine
  const [simulation, setSimulation] = useState({
    history: [],
    faults: 0,
    hits: 0,
    total: 0,
    ratio: '0',
    logs: [],
  });
  const [engineInfo, setEngineInfo] = useState({ name: 'C++17 WebAssembly Core', execTime: null });

  useEffect(() => {
    let isCancelled = false;
    const pages = refString.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
    runMemorySimulation(algo, frameCount, pages).then((resp) => {
      if (!isCancelled && resp && resp.status === 'ok') {
        setSimulation(resp.data);
        setEngineInfo({ name: resp.engine, execTime: resp.data.executionTimeMs });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [algo, frameCount, refString]);

  return (
    <div className="space-y-6">
      {/* Concept Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900/60 border border-purple-500/30 rounded-xl p-5 shadow-lg">
        <h2 className="text-xl font-extrabold text-purple-400 flex items-center gap-2 mb-1">
          <HardDrive className="w-5 h-5" /> 🧠 Virtual Memory Page Replacement
        </h2>
        <p className="text-sm text-slate-300 mb-3">
          When physical RAM is full, page replacement policies decide which page to evict to disk to make space for incoming pages!
        </p>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="bg-purple-950/80 text-purple-300 border border-purple-700/50 px-3 py-1 rounded-full">
            Page Hit = Requested page is present in RAM
          </span>
          <span className="bg-purple-950/80 text-purple-300 border border-purple-700/50 px-3 py-1 rounded-full">
            Page Fault = Requested page missing (Must evict a page)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel space-y-4">
            <h3 className="text-base font-bold text-slate-100 pb-2 border-b border-slate-700/60">
              1. Memory Configuration
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Eviction Policy:</label>
              <select
                value={algo}
                onChange={(e) => setAlgo(e.target.value)}
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-semibold focus:outline-none focus:border-brand-500"
              >
                <option value="FIFO">FIFO (First-In, First-Out)</option>
                <option value="LRU">LRU (Least Recently Used)</option>
                <option value="OPT">Optimal (Evict Farthest in Future)</option>
                <option value="CLOCK">Clock (Second Chance)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Physical RAM Frames (1-6):</label>
              <input
                type="number"
                value={frameCount}
                onChange={(e) => setFrameCount(Math.min(6, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Page Reference String:</label>
              <input
                type="text"
                value={refString}
                onChange={(e) => setRefString(e.target.value)}
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100"
              />
            </div>

            <button
              onClick={loadBeladyPreset}
              className="w-full px-3 py-2 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 rounded-lg flex items-center justify-center gap-1.5"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Belady's Anomaly Preset (3 vs 4 Frames)
            </button>
          </div>
        </div>

        {/* Visual Results */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-panel space-y-4">
            {simulation.isBeladyTriggered && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-950/60 border border-amber-500/50 p-4 rounded-xl text-amber-200 text-xs space-y-1"
              >
                <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Belady's Anomaly Triggered!
                </div>
                <p>
                  Increasing memory frames from 3 to 4 with FIFO page replacement <strong>increased total page faults from 9 to 10</strong> on this reference stream!
                </p>
              </motion.div>
            )}

            <h3 className="text-base font-bold text-slate-100 pb-2 border-b border-slate-700/60">
              2. Frame-by-Frame Memory Access Animation
            </h3>

            {/* RAM Frame Matrix */}
            <div className="flex gap-2 overflow-x-auto custom-scrollbar p-3 bg-dark-900 rounded-lg border border-slate-800">
              <AnimatePresence>
                {simulation.history.map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    className="flex flex-col items-center gap-1 font-mono text-xs"
                  >
                    <span className="font-bold px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">
                      P{step.page}
                    </span>
                    {step.framesState.map((val, fIdx) => (
                      <div
                        key={fIdx}
                        className={`w-9 h-8 border rounded flex items-center justify-center font-bold ${
                          val === step.page
                            ? step.hit
                              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                              : 'bg-rose-950/80 border-rose-500 text-rose-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {val === -1 ? '-' : val}
                      </div>
                    ))}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        step.hit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {step.hit ? 'HIT' : 'FAULT'}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass-card">
                <span className="text-xs text-slate-400 font-semibold block">Total References</span>
                <span className="text-lg font-bold font-mono text-slate-200">{simulation.total}</span>
              </div>
              <div className="glass-card">
                <span className="text-xs text-slate-400 font-semibold block">Page Faults</span>
                <span className="text-lg font-bold font-mono text-rose-400">{simulation.faults}</span>
              </div>
              <div className="glass-card">
                <span className="text-xs text-slate-400 font-semibold block">Page Hits</span>
                <span className="text-lg font-bold font-mono text-emerald-400">{simulation.hits}</span>
              </div>
              <div className="glass-card">
                <span className="text-xs text-slate-400 font-semibold block">Hit Ratio</span>
                <span className="text-lg font-bold font-mono text-purple-400">{simulation.ratio}%</span>
              </div>
            </div>

            {/* Log */}
            <div className="bg-dark-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-slate-800/60 text-xs font-bold text-slate-300 border-b border-slate-800">
                🔍 Step-by-Step Page Eviction Decision Trace
              </div>
              <div className="max-h-48 overflow-y-auto custom-scrollbar p-3 space-y-1 text-xs font-mono text-slate-300">
                {simulation.logs.map((log, i) => (
                  <div key={i} className="py-0.5 border-b border-slate-800/40 last:border-none">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
