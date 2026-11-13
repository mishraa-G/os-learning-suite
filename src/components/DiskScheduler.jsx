import React, { useState, useEffect, useRef } from 'react';
import { runDiskSimulation } from '../engine/wasmBridge.js';
import { motion } from 'framer-motion';
import { Disc, Activity } from 'lucide-react';

export default function DiskScheduler() {
  const [algo, setAlgo] = useState('SSTF');
  const [head, setHead] = useState(50);
  const [queueStr, setQueueStr] = useState('98, 183, 37, 122, 14, 124, 65, 67');
  const [direction, setDirection] = useState('high');

  const canvasRef = useRef(null);

  // Native C++ WebAssembly Simulation Engine
  const [simulation, setSimulation] = useState({
    seq: [head],
    totalSeek: 0,
    avgSeek: '0',
    logs: [],
  });
  const [engineInfo, setEngineInfo] = useState({ name: 'C++17 WebAssembly Core', execTime: null });

  useEffect(() => {
    let isCancelled = false;
    const requests = queueStr.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
    runDiskSimulation(algo, head, requests, direction).then((resp) => {
      if (!isCancelled && resp && resp.status === 'ok') {
        setSimulation(resp.data);
        setEngineInfo({ name: resp.engine, execTime: resp.data.executionTimeMs });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [algo, head, queueStr, direction]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw Grid Lines & Track Scale
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Fira Code';

    for (let track = 0; track <= 200; track += 20) {
      let x = (track / 200) * (w - 40) + 20;
      ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, h - 15); ctx.stroke();
      ctx.fillText(track, x - 6, 12);
    }

    // Trajectory Line
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;

    const stepY = (h - 45) / (simulation.seq.length - 1 || 1);
    simulation.seq.forEach((track, i) => {
      let x = (track / 200) * (w - 40) + 20;
      let y = 25 + i * stepY;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Trajectory Points
    simulation.seq.forEach((track, i) => {
      let x = (track / 200) * (w - 40) + 20;
      let y = 25 + i * stepY;
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
      ctx.fillStyle = i === 0 ? '#10b981' : '#3b82f6';
      ctx.fill();
    });
  }, [simulation]);

  return (
    <div className="space-y-6">
      {/* Concept Banner */}
      <div className="bg-gradient-to-r from-cyan-900/40 via-blue-900/30 to-slate-900/60 border border-cyan-500/30 rounded-xl p-5 shadow-lg">
        <h2 className="text-xl font-extrabold text-cyan-400 flex items-center gap-2 mb-1">
          <Disc className="w-5 h-5" /> 💽 Disk Head Seek Scheduling
        </h2>
        <p className="text-sm text-slate-300 mb-3">
          Disk algorithms optimize the order of track accesses to minimize physical read/write head movement distance (Seek Distance)!
        </p>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 px-3 py-1 rounded-full">
            Seek Distance = |Next Track - Current Track|
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel space-y-4">
            <h3 className="text-base font-bold text-slate-100 pb-2 border-b border-slate-700/60">
              1. Disk Parameters
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Algorithm:</label>
              <select
                value={algo}
                onChange={(e) => setAlgo(e.target.value)}
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-semibold focus:outline-none focus:border-brand-500"
              >
                <option value="FCFS">FCFS (First-Come First-Served)</option>
                <option value="SSTF">SSTF (Shortest Seek Time First)</option>
                <option value="SCAN">SCAN (Elevator Algorithm)</option>
                <option value="CSCAN">C-SCAN (Circular SCAN)</option>
                <option value="LOOK">LOOK</option>
                <option value="CLOOK">C-LOOK</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Initial Head Position (0-199):</label>
              <input
                type="number"
                value={head}
                onChange={(e) => setHead(Math.min(199, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Track Request Queue:</label>
              <input
                type="text"
                value={queueStr}
                onChange={(e) => setQueueStr(e.target.value)}
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Direction:</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-semibold focus:outline-none focus:border-brand-500"
              >
                <option value="high">Ascending (Towards Track 199)</option>
                <option value="low">Descending (Towards Track 0)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-panel space-y-4">
            <h3 className="text-base font-bold text-slate-100 pb-2 border-b border-slate-700/60">
              2. Head Movement Trajectory Graph
            </h3>

            <div className="p-3 bg-dark-900 rounded-lg border border-slate-800 flex justify-center overflow-x-auto">
              <canvas ref={canvasRef} width={550} height={240} className="max-w-full" />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card">
                <span className="text-xs text-slate-400 font-semibold block">Total Seek Distance</span>
                <span className="text-lg font-bold font-mono text-cyan-400">{simulation.totalSeek} tracks</span>
              </div>
              <div className="glass-card">
                <span className="text-xs text-slate-400 font-semibold block">Average Seek Distance</span>
                <span className="text-lg font-bold font-mono text-blue-400">{simulation.avgSeek} tracks</span>
              </div>
            </div>

            {/* Log */}
            <div className="bg-dark-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-slate-800/60 text-xs font-bold text-slate-300 border-b border-slate-800">
                🔍 Track-by-Track Seek Distance Log
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
