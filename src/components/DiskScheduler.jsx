import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Disc, Activity } from 'lucide-react';

export default function DiskScheduler() {
  const [algo, setAlgo] = useState('SSTF');
  const [head, setHead] = useState(50);
  const [queueStr, setQueueStr] = useState('98, 183, 37, 122, 14, 124, 65, 67');
  const [direction, setDirection] = useState('high');

  const canvasRef = useRef(null);

  const simulation = useMemo(() => {
    const requests = queueStr.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
    if (requests.length === 0) return { seq: [head], totalSeek: 0, avgSeek: '0', logs: [] };

    let seq = [head];
    let logs = [];
    let totalSeek = 0;
    let curr = head;

    if (algo === 'FCFS') {
      requests.forEach((r, idx) => {
        let dist = Math.abs(r - curr);
        totalSeek += dist;
        logs.push(`Step ${idx + 1}: Head moved from Track ${curr} to Track ${r}. Seek = |${r} - ${curr}| = ${dist} tracks.`);
        curr = r; seq.push(curr);
      });
    } else if (algo === 'SSTF') {
      let reqs = [...requests];
      let visited = Array(reqs.length).fill(false);
      for (let i = 0; i < reqs.length; i++) {
        let idx = -1, minDist = 999999;
        for (let j = 0; j < reqs.length; j++) {
          if (!visited[j]) {
            let d = Math.abs(reqs[j] - curr);
            if (d < minDist) { minDist = d; idx = j; }
          }
        }
        if (idx !== -1) {
          visited[idx] = true;
          totalSeek += minDist;
          logs.push(`Step ${i + 1}: SSTF selected nearest Track ${reqs[idx]} from ${curr}. Seek = ${minDist} tracks.`);
          curr = reqs[idx]; seq.push(curr);
        }
      }
    } else if (algo === 'SCAN' || algo === 'CSCAN') {
      let left = [], right = [];
      if (direction === 'high') right.push(199); else left.push(0);
      requests.forEach((r) => { if (r < head) left.push(r); else right.push(r); });
      left.sort((a, b) => a - b);
      right.sort((a, b) => a - b);

      if (algo === 'SCAN') {
        let run = 2, currentDir = direction;
        while (run--) {
          if (currentDir === 'high') {
            right.forEach((r) => {
              let dist = Math.abs(r - curr); totalSeek += dist;
              logs.push(`SCAN (Ascending): Move to Track ${r}. Seek = ${dist} tracks.`);
              curr = r; seq.push(curr);
            });
            currentDir = 'low';
          } else {
            for (let i = left.length - 1; i >= 0; i--) {
              let dist = Math.abs(left[i] - curr); totalSeek += dist;
              logs.push(`SCAN (Descending): Move to Track ${left[i]}. Seek = ${dist} tracks.`);
              curr = left[i]; seq.push(curr);
            }
            currentDir = 'high';
          }
        }
      } else {
        right.forEach((r) => {
          let dist = Math.abs(r - curr); totalSeek += dist;
          logs.push(`C-SCAN (Ascending): Move to Track ${r}. Seek = ${dist} tracks.`);
          curr = r; seq.push(curr);
        });
        logs.push(`C-SCAN: Reset head to Track 0.`);
        curr = 0; seq.push(curr);
        left.forEach((r) => {
          let dist = Math.abs(r - curr); totalSeek += dist;
          logs.push(`C-SCAN (Ascending from 0): Move to Track ${r}. Seek = ${dist} tracks.`);
          curr = r; seq.push(curr);
        });
      }
    } else { // LOOK / C-LOOK
      let left = requests.filter((r) => r < head).sort((a, b) => a - b);
      let right = requests.filter((r) => r >= head).sort((a, b) => a - b);
      if (direction === 'high') {
        right.forEach((r) => { let d = Math.abs(r - curr); totalSeek += d; logs.push(`LOOK (Ascending): Move to Track ${r}. Seek = ${d}.`); curr = r; seq.push(curr); });
        for (let i = left.length - 1; i >= 0; i--) { let d = Math.abs(left[i] - curr); totalSeek += d; logs.push(`LOOK (Reverse): Move to Track ${left[i]}. Seek = ${d}.`); curr = left[i]; seq.push(curr); }
      } else {
        for (let i = left.length - 1; i >= 0; i--) { let d = Math.abs(left[i] - curr); totalSeek += d; logs.push(`LOOK (Descending): Move to Track ${left[i]}. Seek = ${d}.`); curr = left[i]; seq.push(curr); }
        right.forEach((r) => { let d = Math.abs(r - curr); totalSeek += d; logs.push(`LOOK (Reverse): Move to Track ${r}. Seek = ${d}.`); curr = r; seq.push(curr); });
      }
    }

    return { seq, totalSeek, avgSeek: (totalSeek / requests.length).toFixed(2), logs };
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
