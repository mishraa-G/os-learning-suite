import React, { useState, useEffect } from 'react';
import { runBankerSimulation } from '../engine/wasmBridge.js';
import { motion } from 'framer-motion';
import { ShieldAlert, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

const defaultAlloc = [
  [0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]
];

const defaultMax = [
  [7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]
];

export default function BankersDeadlock() {
  const [avail, setAvail] = useState([3, 3, 2]);
  const [alloc, setAlloc] = useState(defaultAlloc);
  const [maxMat, setMaxMat] = useState(defaultMax);

  const updateVector = (idx, val) => {
    const next = [...avail];
    next[idx] = Math.max(0, parseInt(val) || 0);
    setAvail(next);
  };

  const updateMatrix = (matSetter, matrix, r, c, val) => {
    const next = matrix.map((row) => [...row]);
    next[r][c] = Math.max(0, parseInt(val) || 0);
    matSetter(next);
  };

  const loadSafePreset = () => {
    setAvail([3, 3, 2]);
    setAlloc(defaultAlloc);
    setMaxMat(defaultMax);
  };

  const loadUnsafePreset = () => {
    setAvail([0, 1, 0]);
    setAlloc(defaultAlloc);
    setMaxMat(defaultMax);
  };

  // Native C++ WebAssembly Simulation Engine
  const [simulation, setSimulation] = useState({
    isSafe: false,
    safeSeq: [],
    need: [],
    steps: [],
    logs: [],
  });
  const [engineInfo, setEngineInfo] = useState({ name: 'C++17 WebAssembly Core', execTime: null });

  useEffect(() => {
    let isCancelled = false;
    runBankerSimulation(avail, alloc, maxMat).then((resp) => {
      if (!isCancelled && resp && resp.status === 'ok') {
        setSimulation(resp.data);
        setEngineInfo({ name: resp.engine, execTime: resp.data.executionTimeMs });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [avail, alloc, maxMat]);

  return (
    <div className="space-y-6">
      {/* Concept Banner */}
      <div className="bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-slate-900/60 border border-emerald-500/30 rounded-xl p-5 shadow-lg">
        <h2 className="text-xl font-extrabold text-emerald-400 flex items-center gap-2 mb-1">
          <ShieldAlert className="w-5 h-5" /> 🔒 Banker's Algorithm: Deadlock Avoidance
        </h2>
        <p className="text-sm text-slate-300 mb-3">
          The Banker's safety algorithm checks if resource allocation will leave the system in a Safe State with a guaranteed execution pathway!
        </p>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 px-3 py-1 rounded-full">
            Need Matrix = Max Matrix - Allocation Matrix
          </span>
          <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 px-3 py-1 rounded-full">
            Safety Condition = Need[i] ≤ Work
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Matrices */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel space-y-4">
            <h3 className="text-base font-bold text-slate-100 pb-2 border-b border-slate-700/60">
              1. Resource Setup (5 Processes & 3 Resource Types A,B,C)
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Available Vector (A, B, C):</label>
              <div className="flex gap-2">
                {avail.map((val, idx) => (
                  <input
                    key={idx}
                    type="number"
                    value={val}
                    onChange={(e) => updateVector(idx, e.target.value)}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2 text-center text-sm font-mono font-bold text-slate-100"
                  />
                ))}
              </div>
            </div>

            {/* Allocation Matrix */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 mb-1">Allocation Matrix</h4>
              <div className="overflow-x-auto border border-slate-700/60 rounded-lg">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-dark-900 text-slate-400 font-bold">
                    <tr><th className="p-1.5 border-b border-slate-700">PID</th><th className="p-1.5 border-b border-slate-700">A</th><th className="p-1.5 border-b border-slate-700">B</th><th className="p-1.5 border-b border-slate-700">C</th></tr>
                  </thead>
                  <tbody>
                    {alloc.map((row, r) => (
                      <tr key={r} className="border-b border-slate-800/60 font-mono">
                        <td className="p-1 font-bold text-slate-300">P{r}</td>
                        {row.map((val, c) => (
                          <td key={c} className="p-1"><input type="number" value={val} onChange={(e) => updateMatrix(setAlloc, alloc, r, c, e.target.value)} className="w-10 bg-dark-900 border border-slate-700 rounded text-center py-0.5" /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Max Matrix */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 mb-1">Max Demand Matrix</h4>
              <div className="overflow-x-auto border border-slate-700/60 rounded-lg">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-dark-900 text-slate-400 font-bold">
                    <tr><th className="p-1.5 border-b border-slate-700">PID</th><th className="p-1.5 border-b border-slate-700">A</th><th className="p-1.5 border-b border-slate-700">B</th><th className="p-1.5 border-b border-slate-700">C</th></tr>
                  </thead>
                  <tbody>
                    {maxMat.map((row, r) => (
                      <tr key={r} className="border-b border-slate-800/60 font-mono">
                        <td className="p-1 font-bold text-slate-300">P{r}</td>
                        {row.map((val, c) => (
                          <td key={c} className="p-1"><input type="number" value={val} onChange={(e) => updateMatrix(setMaxMat, maxMat, r, c, e.target.value)} className="w-10 bg-dark-900 border border-slate-700 rounded text-center py-0.5" /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={loadSafePreset} className="w-1/2 px-3 py-1.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 rounded-lg">
                Safe State Demo
              </button>
              <button onClick={loadUnsafePreset} className="w-1/2 px-3 py-1.5 text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 rounded-lg">
                Deadlock Demo
              </button>
            </div>
          </div>
        </div>

        {/* Results & Safety Proof */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel space-y-4">
            <h3 className="text-base font-bold text-slate-100 pb-2 border-b border-slate-700/60">
              2. Computed Need Matrix (Max - Allocation) & Safety Status
            </h3>

            {/* Need Table */}
            <div className="overflow-x-auto border border-slate-700/60 rounded-lg">
              <table className="w-full text-xs text-center border-collapse">
                <thead className="bg-dark-900 text-slate-400 font-bold">
                  <tr><th className="p-2 border-b border-slate-700">PID</th><th className="p-2 border-b border-slate-700">Max</th><th className="p-2 border-b border-slate-700">Allocation</th><th className="p-2 border-b border-slate-700">Need</th></tr>
                </thead>
                <tbody>
                  {simulation.need.map((nRow, i) => (
                    <tr key={i} className="border-b border-slate-800/60 font-mono">
                      <td className="p-2 font-bold text-slate-200">P{i}</td>
                      <td className="p-2 text-slate-400">[{maxMat[i].join(', ')}]</td>
                      <td className="p-2 text-slate-400">[{alloc[i].join(', ')}]</td>
                      <td className="p-2 font-bold text-cyan-400">[{nRow.join(', ')}]</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Status Banner */}
            <motion.div
              key={simulation.isSafe ? 'safe' : 'unsafe'}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`p-4 rounded-xl border flex items-center gap-3 ${
                simulation.isSafe
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
              }`}
            >
              {simulation.isSafe ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-8 h-8 text-rose-400 flex-shrink-0" />
              )}
              <div>
                <h4 className="font-extrabold text-sm">
                  {simulation.isSafe ? 'STATUS: SAFE STATE DETECTED' : 'STATUS: UNSAFE STATE / DEADLOCK RISK'}
                </h4>
                <p className="text-xs opacity-90 mt-0.5">
                  {simulation.isSafe
                    ? 'System guarantees deadlock-free execution for all processes.'
                    : `Only ${simulation.count} of 5 processes could satisfy resource demands. Resource deadlock is possible!`}
                </p>
              </div>
            </motion.div>

            {/* Safe Sequence Pipeline */}
            {simulation.isSafe && (
              <div className="bg-dark-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-400">Computed Safe Execution Sequence:</span>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  {simulation.safeSeq.map((p, idx) => (
                    <React.Fragment key={p}>
                      <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold rounded-lg shadow-sm">
                        P{p}
                      </span>
                      {idx < simulation.safeSeq.length - 1 && <ArrowRight className="w-4 h-4 text-slate-500" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Log */}
            <div className="bg-dark-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-slate-800/60 text-xs font-bold text-slate-300 border-b border-slate-800">
                🔍 Step-by-Step Safety Algorithm Proof
              </div>
              <div className="max-h-48 overflow-y-auto custom-scrollbar p-3 space-y-1 text-xs font-mono text-slate-300">
                {simulation.logs.map((log, i) => (
                  <div key={i} className="py-0.5 border-b border-slate-800/40 last:border-none" dangerouslySetInnerHTML={{ __html: log }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
