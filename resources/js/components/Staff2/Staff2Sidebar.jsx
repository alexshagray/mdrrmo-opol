import React from 'react';

export default function Staff2Sidebar({ activeSection, setActiveSection, setSimulateOpol }) {
  return (
    <div className="w-72 bg-[#111115]/95 backdrop-blur-xl border-r border-[#1f1f26] flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-20">
      <div className="p-6 border-b border-[#1f1f26]">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-[#181822] p-2 rounded-xl border border-[#2b2b35] shadow-inner">
            <img src="/images/mdrrmo_logo.png" alt="MDRRMO Logo" className="w-8 h-8 object-contain drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-wider leading-tight">MDRRMO</h1>
            <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Management System</span>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(52,199,89,0.1)] border border-[rgba(52,199,89,0.2)]">
          <span className="w-2 h-2 rounded-full bg-[#34c759] animate-pulse"></span>
          <span className="text-xs font-bold text-[#34c759]">Staff 2 - Dispatch</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <nav className="flex flex-col gap-2">
          <div className="mt-2 mb-2 px-4">
            <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">DISPATCH & MAPS</span>
          </div>

          <button
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${activeSection === 'incidents' ? 'bg-gradient-to-r from-[rgba(10,132,255,0.15)] to-[rgba(52,199,89,0.15)] text-[#0a84ff] border border-[#0a84ff]/30 shadow-[inset_4px_0_0_#0a84ff]' : 'text-gray-400 hover:text-white hover:bg-[#181822] border border-transparent'}`}
            onClick={() => { setActiveSection('incidents'); setSimulateOpol(false); }}
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">📋</span>
              Manage Incident Reports
            </span>
          </button>

          <button
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${activeSection === 'live_monitoring' ? 'bg-gradient-to-r from-[rgba(10,132,255,0.15)] to-[rgba(52,199,89,0.15)] text-[#0a84ff] border border-[#0a84ff]/30 shadow-[inset_4px_0_0_#0a84ff]' : 'text-gray-400 hover:text-white hover:bg-[#181822] border border-transparent'}`}
            onClick={() => setActiveSection('live_monitoring')}
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">📡</span>
              Real-Time Monitoring
            </span>
          </button>
        </nav>
      </div>

      <div className="p-4 border-t border-[#1f1f26] bg-[#0c0c10]">
        <div className="text-[10px] text-center text-gray-500 font-medium">
          MDRRMO System v1.0
        </div>
      </div>
    </div>
  );
}
