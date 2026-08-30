import React, { useState } from 'react';
import Navbar from './components/Navbar.jsx';
import CpuScheduler from './components/CpuScheduler.jsx';
import MemoryPaging from './components/MemoryPaging.jsx';
import BankersDeadlock from './components/BankersDeadlock.jsx';
import DiskScheduler from './components/DiskScheduler.jsx';
import Benchmarks from './components/Benchmarks.jsx';
import StudentCheatsheet from './components/StudentCheatsheet.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('cpu');

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'cpu' && <CpuScheduler />}
        {activeTab === 'memory' && <MemoryPaging />}
        {activeTab === 'banker' && <BankersDeadlock />}
        {activeTab === 'disk' && <DiskScheduler />}
        {activeTab === 'benchmark' && <Benchmarks />}
        {activeTab === 'interview' && <StudentCheatsheet />}
      </main>
    </div>
  );
}
