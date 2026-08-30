import React from 'react';
import { HelpCircle, BookOpen, Lightbulb } from 'lucide-react';

export default function StudentCheatsheet() {
  const qaList = [
    {
      q: '1. What is the Convoy Effect in CPU scheduling?',
      a: 'When a long CPU-bound process executes first in FCFS, short I/O-bound processes get stuck waiting behind it in the ready queue while I/O devices sit idle. Preemptive scheduling like Round Robin or SRTF solves this.',
    },
    {
      q: "2. What is Belady's Anomaly and which algorithms are immune to it?",
      a: "Belady's Anomaly occurs when increasing physical page frames in FIFO increases total page faults. Stack Algorithms like LRU and Optimal are immune to Belady's Anomaly because the set of pages in N frames is always a subset of N+1 frames.",
    },
    {
      q: '3. How does Multilevel Feedback Queue (MLFQ) prioritize interactive processes?',
      a: 'MLFQ uses dynamic feedback: processes that use their full time quantum without yielding are demoted to lower-priority queues with larger time slices. Interactive I/O processes yield early and remain at the top priority queues!',
    },
    {
      q: '4. What are the 4 conditions required for Deadlock?',
      a: '1. Mutual Exclusion (Non-shareable resource)\n2. Hold & Wait (Holding resource while waiting for another)\n3. No Preemption (Resource cannot be forcibly revoked)\n4. Circular Wait (P0 waits for P1, P1 waits for P2, P2 waits for P0)\nBanker\'s Algorithm breaks Circular Wait by keeping the system in a Safe State.',
    },
    {
      q: '5. Why is C-SCAN preferred over standard SCAN in disk scheduling?',
      a: 'SCAN services requests in both directions, making middle tracks get serviced twice as fast as edge tracks. C-SCAN services in one direction only and sweeps back to track 0, offering uniform wait times for all cylinders.',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-900/40 via-orange-900/30 to-slate-900/60 border border-amber-500/30 rounded-xl p-5 shadow-lg">
        <h2 className="text-xl font-extrabold text-amber-400 flex items-center gap-2 mb-1">
          <HelpCircle className="w-5 h-5" /> 💡 Operating System Student Q&A Cheatsheet
        </h2>
        <p className="text-sm text-slate-300">
          Core OS concepts, easy explanations, and key interview talking points!
        </p>
      </div>

      <div className="space-y-4">
        {qaList.map((item, idx) => (
          <div key={idx} className="glass-panel space-y-2">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
              {item.q}
            </h3>
            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans pl-6 border-l-2 border-amber-500/30">
              {item.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
