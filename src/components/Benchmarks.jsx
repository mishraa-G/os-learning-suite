import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CheckCircle2 } from 'lucide-react';

export default function Benchmarks() {
  const [activeBench, setActiveBench] = useState('cpu');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-slate-900/60 border border-blue-500/30 rounded-xl p-5 shadow-lg">
        <h2 className="text-xl font-extrabold text-blue-400 flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5" /> 📊 Side-by-Side Algorithm Comparison Benchmarks
        </h2>
        <p className="text-sm text-slate-300">
          Compare all CPU schedulers and Disk schedulers side-by-side on identical workloads to analyze trade-offs!
        </p>
      </div>

      <div className="glass-panel space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveBench('cpu')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeBench === 'cpu' ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Compare All CPU Schedulers
          </button>
          <button
            onClick={() => setActiveBench('disk')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeBench === 'disk' ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Compare All Disk Schedulers
          </button>
        </div>

        {activeBench === 'cpu' ? (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200">CPU Scheduling Algorithms Benchmark (Workload: 5 Processes)</h3>
            <div className="overflow-x-auto border border-slate-700/60 rounded-lg">
              <table className="w-full text-xs text-center border-collapse">
                <thead className="bg-dark-900 text-slate-400 font-bold">
                  <tr>
                    <th className="p-2 border-b border-slate-700">Algorithm</th>
                    <th className="p-2 border-b border-slate-700">Avg Waiting Time</th>
                    <th className="p-2 border-b border-slate-700">Avg Turnaround Time</th>
                    <th className="p-2 border-b border-slate-700">Context Switches</th>
                    <th className="p-2 border-b border-slate-700">Preemptive</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr className="border-b border-slate-800/60"><td className="p-2 font-bold text-slate-200">FCFS</td><td className="p-2 text-cyan-400">8.20 ms</td><td className="p-2">13.00 ms</td><td className="p-2">4</td><td className="p-2 text-slate-400">No</td></tr>
                  <tr className="border-b border-slate-800/60"><td className="p-2 font-bold text-slate-200">SJF Non-Preemptive</td><td className="p-2 text-cyan-400">5.60 ms</td><td className="p-2">10.40 ms</td><td className="p-2">4</td><td className="p-2 text-slate-400">No</td></tr>
                  <tr className="border-b border-slate-800/60 bg-emerald-950/40 text-emerald-300"><td className="p-2 font-bold">SRTF (Preemptive SJF) ⭐</td><td className="p-2 font-bold">5.20 ms (Best)</td><td className="p-2">10.00 ms</td><td className="p-2">5</td><td className="p-2 font-bold text-emerald-400">Yes</td></tr>
                  <tr className="border-b border-slate-800/60"><td className="p-2 font-bold text-slate-200">Round Robin (q=3)</td><td className="p-2 text-cyan-400">9.60 ms</td><td className="p-2">14.40 ms</td><td className="p-2 text-rose-400">8</td><td className="p-2 text-slate-400">Yes</td></tr>
                  <tr className="border-b border-slate-800/60"><td className="p-2 font-bold text-slate-200">Priority with Aging</td><td className="p-2 text-cyan-400">7.80 ms</td><td className="p-2">12.60 ms</td><td className="p-2">4</td><td className="p-2 text-slate-400">No</td></tr>
                  <tr><td className="p-2 font-bold text-slate-200">MLFQ</td><td className="p-2 text-cyan-400">9.80 ms</td><td className="p-2">14.60 ms</td><td className="p-2 text-rose-400">9</td><td className="p-2 text-slate-400">Yes</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Disk Scheduling Algorithms Benchmark (Workload: 8 Requests)</h3>
            <div className="overflow-x-auto border border-slate-700/60 rounded-lg">
              <table className="w-full text-xs text-center border-collapse">
                <thead className="bg-dark-900 text-slate-400 font-bold">
                  <tr>
                    <th className="p-2 border-b border-slate-700">Disk Algorithm</th>
                    <th className="p-2 border-b border-slate-700">Total Head Movement</th>
                    <th className="p-2 border-b border-slate-700">Avg Seek Distance</th>
                    <th className="p-2 border-b border-slate-700">Uniform Wait Service</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr className="border-b border-slate-800/60"><td className="p-2 font-bold text-slate-200">FCFS</td><td className="p-2 text-rose-400">643 tracks</td><td className="p-2">80.38 tracks</td><td className="p-2 text-slate-400">No</td></tr>
                  <tr className="border-b border-slate-800/60"><td className="p-2 font-bold text-slate-200">SSTF</td><td className="p-2 text-cyan-400">205 tracks</td><td className="p-2">25.62 tracks</td><td className="p-2 text-rose-400">No (Starvation Risk)</td></tr>
                  <tr className="border-b border-slate-800/60"><td className="p-2 font-bold text-slate-200">SCAN (Elevator)</td><td className="p-2 text-cyan-400">334 tracks</td><td className="p-2">41.75 tracks</td><td className="p-2">Moderate</td></tr>
                  <tr className="bg-emerald-950/40 text-emerald-300"><td className="p-2 font-bold">C-SCAN (Circular SCAN) ⭐</td><td className="p-2 font-bold">186 tracks (Best)</td><td className="p-2">23.25 tracks</td><td className="p-2 font-bold text-emerald-400">High (Uniform Service)</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
