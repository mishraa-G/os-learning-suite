import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Plus, Trash2, Zap, Clock, Activity, Server, Cpu } from 'lucide-react';
import { runCpuSimulation } from '../engine/wasmBridge.js';

const pidColors = [
  'bg-blue-600 border-blue-400',
  'bg-cyan-600 border-cyan-400',
  'bg-emerald-600 border-emerald-400',
  'bg-amber-600 border-amber-400',
  'bg-pink-600 border-pink-400',
  'bg-purple-600 border-purple-400',
  'bg-indigo-600 border-indigo-400',
];

export default function CpuScheduler() {
  const [algo, setAlgo] = useState('SRTF');
  const [quantum, setQuantum] = useState(3);
  const [aging, setAging] = useState(5);
  const [processes, setProcesses] = useState([
    { pid: 1, arrivalTime: 0, burstTime: 5, priority: 3 },
    { pid: 2, arrivalTime: 1, burstTime: 3, priority: 1 },
    { pid: 3, arrivalTime: 2, burstTime: 8, priority: 4 },
    { pid: 4, arrivalTime: 3, burstTime: 6, priority: 2 },
    { pid: 5, arrivalTime: 4, burstTime: 2, priority: 5 },
  ]);

  const updateProcess = (idx, field, val) => {
    const updated = [...processes];
    updated[idx][field] = Math.max(0, parseInt(val) || 0);
    setProcesses(updated);
  };

  const addProcess = () => {
    const nextPid = processes.length > 0 ? Math.max(...processes.map((p) => p.pid)) + 1 : 1;
    setProcesses([...processes, { pid: nextPid, arrivalTime: 0, burstTime: 4, priority: 3 }]);
  };

  const removeProcess = (idx) => {
    setProcesses(processes.filter((_, i) => i !== idx));
  };

  const loadConvoyPreset = () => {
    setAlgo('FCFS');
    setProcesses([
      { pid: 1, arrivalTime: 0, burstTime: 24, priority: 1 },
      { pid: 2, arrivalTime: 1, burstTime: 2, priority: 2 },
      { pid: 3, arrivalTime: 2, burstTime: 2, priority: 3 },
    ]);
  };

  const loadStarvationPreset = () => {
    setAlgo('Priority');
    setProcesses([
      { pid: 1, arrivalTime: 0, burstTime: 10, priority: 5 },
      { pid: 2, arrivalTime: 1, burstTime: 2, priority: 1 },
      { pid: 3, arrivalTime: 2, burstTime: 2, priority: 1 },
      { pid: 4, arrivalTime: 3, burstTime: 2, priority: 1 },
    ]);
  };

  // Native C++ WebAssembly Simulation Engine
  const [simulation, setSimulation] = useState({
    gantt: [],
    results: [],
    metrics: { avgWt: '0.00', avgTat: '0.00', avgRt: '0.00', cpuUtil: '0.0', contextSwitches: 0, totalTime: 0 },
    logs: [],
  });
  const [engineInfo, setEngineInfo] = useState({ name: 'C++17 WebAssembly Core', execTime: null });

  useEffect(() => {
    let isCancelled = false;
    runCpuSimulation(algo, processes, quantum, aging).then((resp) => {
      if (!isCancelled && resp && resp.status === 'ok') {
        setSimulation(resp.data);
        setEngineInfo({ name: resp.engine, execTime: resp.data.executionTimeMs });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [processes, algo, quantum, aging]);

  return (
    <div className="space-y-6">
      {/* Student Concept Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/60 border border-blue-500/30 rounded-xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h2 className="text-xl font-extrabold text-blue-400 flex items-center gap-2">
            <Server className="w-5 h-5" /> 🖥️ CPU Process Scheduling
          </h2>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 font-mono shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ⚡ {engineInfo.name} {engineInfo.execTime ? `(${engineInfo.execTime.toFixed(2)}ms)` : ''}
          </span>
        </div>
        <p className="text-sm text-slate-300 mb-3">
          The CPU scheduler decides which process gets execution time. Explore preemption, time slices, and queue priorities!
        </p>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="bg-blue-950/80 text-blue-300 border border-blue-700/50 px-3 py-1 rounded-full">
            Turnaround Time = Completion Time - Arrival Time
          </span>
          <span className="bg-blue-950/80 text-blue-300 border border-blue-700/50 px-3 py-1 rounded-full">
            Waiting Time = Turnaround Time - Burst Time
          </span>
          <span className="bg-blue-950/80 text-blue-300 border border-blue-700/50 px-3 py-1 rounded-full">
            Response Time = First Start Time - Arrival Time
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel space-y-4">
            <h3 className="text-base font-bold text-slate-100 pb-2 border-b border-slate-700/60">
              1. Scheduler Configuration
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Algorithm:</label>
              <select
                value={algo}
                onChange={(e) => setAlgo(e.target.value)}
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-semibold focus:outline-none focus:border-brand-500"
              >
                <option value="FCFS">First-Come First-Served (FCFS)</option>
                <option value="SJF">Shortest Job First (SJF - Non-Preemptive)</option>
                <option value="SRTF">Shortest Remaining Time First (SRTF - Preemptive)</option>
                <option value="RR">Round Robin (RR - Time Slice)</option>
                <option value="Priority">Priority Scheduling (With Aging)</option>
                <option value="MLFQ">Multilevel Feedback Queue (MLFQ)</option>
              </select>
            </div>

            {(algo === 'RR' || algo === 'MLFQ') && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Time Quantum (q):</label>
                <input
                  type="number"
                  value={quantum}
                  onChange={(e) => setQuantum(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-100"
                />
              </div>
            )}

            {algo === 'Priority' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Aging Rate (k):</label>
                <input
                  type="number"
                  value={aging}
                  onChange={(e) => setAging(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-100"
                />
              </div>
            )}

            <div>
              <span className="block text-xs font-bold text-slate-400 mb-1.5">Quick Presets:</span>
              <div className="flex gap-2">
                <button onClick={loadConvoyPreset} className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md">
                  Convoy Demo
                </button>
                <button onClick={loadStarvationPreset} className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md">
                  Starvation Demo
                </button>
              </div>
            </div>

            {/* Process Input Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-400">Processes Input</h4>
                <button onClick={addProcess} className="px-2 py-1 text-xs font-bold text-brand-500 hover:text-brand-400 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              <div className="overflow-x-auto border border-slate-700/60 rounded-lg">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-dark-900 text-slate-400 font-bold">
                    <tr>
                      <th className="p-2 border-b border-slate-700">PID</th>
                      <th className="p-2 border-b border-slate-700">Arrival</th>
                      <th className="p-2 border-b border-slate-700">Burst</th>
                      <th className="p-2 border-b border-slate-700">Priority</th>
                      <th className="p-2 border-b border-slate-700">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.map((p, idx) => (
                      <tr key={p.pid} className="border-b border-slate-800/60">
                        <td className="p-1.5 font-bold text-slate-200">P{p.pid}</td>
                        <td className="p-1.5"><input type="number" value={p.arrivalTime} onChange={(e) => updateProcess(idx, 'arrivalTime', e.target.value)} className="w-10 bg-dark-900 border border-slate-700 rounded text-center py-0.5 font-mono" /></td>
                        <td className="p-1.5"><input type="number" value={p.burstTime} onChange={(e) => updateProcess(idx, 'burstTime', e.target.value)} className="w-10 bg-dark-900 border border-slate-700 rounded text-center py-0.5 font-mono" /></td>
                        <td className="p-1.5"><input type="number" value={p.priority} onChange={(e) => updateProcess(idx, 'priority', e.target.value)} className="w-10 bg-dark-900 border border-slate-700 rounded text-center py-0.5 font-mono" /></td>
                        <td className="p-1.5"><button onClick={() => removeProcess(idx)} className="text-rose-400 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Results */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-panel space-y-4">
            <h3 className="text-base font-bold text-slate-100 pb-2 border-b border-slate-700/60 flex items-center justify-between">
              <span>2. Visual Execution Timeline (Gantt Chart)</span>
              <span className="text-xs font-mono font-medium text-slate-400">Total Duration: {simulation.metrics.totalTime || 0} units</span>
            </h3>

            {/* Gantt Chart Bar */}
            <div className="flex gap-1 overflow-x-auto custom-scrollbar p-2 bg-dark-900 rounded-lg border border-slate-800 min-h-[70px] items-center">
              <AnimatePresence>
                {simulation.gantt.map((g, idx) => {
                  const duration = g.end - g.start;
                  const colorClass = g.label === 'IDLE' ? 'bg-slate-800/80 border-slate-700 text-slate-400 border-dashed' : pidColors[(g.pid - 1) % pidColors.length];

                  return (
                    <motion.div
                      key={`${g.label}-${g.start}-${idx}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      className={`flex flex-col items-center justify-center p-2 rounded-md border font-mono font-bold text-xs min-w-[50px] shadow-sm ${colorClass}`}
                      style={{ flexGrow: duration }}
                    >
                      <span className="text-white drop-shadow-sm">{g.label}</span>
                      <span className="text-[10px] opacity-80 font-normal">{g.start} - {g.end}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass-card">
                <span className="text-xs text-slate-400 font-semibold block">Avg Waiting</span>
                <span className="text-lg font-bold font-mono text-cyan-400">{simulation.metrics.avgWt} ms</span>
              </div>
              <div className="glass-card">
                <span className="text-xs text-slate-400 font-semibold block">Avg Turnaround</span>
                <span className="text-lg font-bold font-mono text-blue-400">{simulation.metrics.avgTat} ms</span>
              </div>
              <div className="glass-card">
                <span className="text-xs text-slate-400 font-semibold block">Avg Response</span>
                <span className="text-lg font-bold font-mono text-indigo-400">{simulation.metrics.avgRt} ms</span>
              </div>
              <div className="glass-card">
                <span className="text-xs text-slate-400 font-semibold block">CPU Utilization</span>
                <span className="text-lg font-bold font-mono text-emerald-400">{simulation.metrics.cpuUtil}%</span>
              </div>
            </div>

            {/* Calculations Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 mb-2">Calculated Process Metrics Table</h4>
              <div className="overflow-x-auto border border-slate-700/60 rounded-lg">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-dark-900 text-slate-400 font-bold">
                    <tr>
                      <th className="p-2 border-b border-slate-700">PID</th>
                      <th className="p-2 border-b border-slate-700">Arrival</th>
                      <th className="p-2 border-b border-slate-700">Burst</th>
                      <th className="p-2 border-b border-slate-700">Priority</th>
                      <th className="p-2 border-b border-slate-700">Start</th>
                      <th className="p-2 border-b border-slate-700">Completion</th>
                      <th className="p-2 border-b border-slate-700">Waiting</th>
                      <th className="p-2 border-b border-slate-700">Turnaround</th>
                      <th className="p-2 border-b border-slate-700">Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulation.results.map((p) => (
                      <tr key={p.pid} className="border-b border-slate-800/60 font-mono">
                        <td className="p-2 font-bold text-slate-200">P{p.pid}</td>
                        <td className="p-2">{p.arrivalTime}</td>
                        <td className="p-2">{p.burstTime}</td>
                        <td className="p-2">{p.priority}</td>
                        <td className="p-2 text-cyan-400">{p.startTime}</td>
                        <td className="p-2 text-blue-400">{p.completionTime}</td>
                        <td className="p-2 text-emerald-400">{p.waitingTime}</td>
                        <td className="p-2 text-amber-400">{p.turnaroundTime}</td>
                        <td className="p-2 text-indigo-400">{p.responseTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Explanation Log */}
            <div className="bg-dark-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-slate-800/60 text-xs font-bold text-slate-300 border-b border-slate-800">
                🔍 Step-by-Step Reasoned Execution Trace Log
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
