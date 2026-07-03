import React from 'react';

export default function Staff1Sidebar({ activeSection, setActiveSection, lowStockItemsCount }) {
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
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(10,132,255,0.1)] border border-[rgba(10,132,255,0.2)]">
          <span className="w-2 h-2 rounded-full bg-[#0a84ff] animate-pulse"></span>
          <span className="text-xs font-bold text-[#0a84ff]">Staff 1 - Inventory</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <nav className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setActiveSection('inventory')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${(activeSection === 'inventory' || activeSection === 'equipment') ? 'bg-gradient-to-r from-[rgba(10,132,255,0.15)] to-[rgba(10,132,255,0.05)] text-[#0a84ff] border border-[#0a84ff]/30 shadow-[inset_4px_0_0_#0a84ff]' : 'text-gray-400 hover:text-white hover:bg-[#181822] border border-transparent'}`}
            >
              <span className="flex items-center gap-3">
                <span className="text-lg">📋</span>
                Assets & Supplies
              </span>
              <span className={`text-[10px] transition-transform duration-300 ${(activeSection === 'inventory' || activeSection === 'equipment') ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            <div className={`flex flex-col gap-1 pl-10 overflow-hidden transition-all duration-300 ${(activeSection === 'inventory' || activeSection === 'equipment') ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
              <button
                className={`flex items-center justify-start px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${activeSection === 'inventory' ? 'text-[#0a84ff] bg-[#181822] shadow-[inset_2px_0_0_#0a84ff]' : 'text-gray-500 hover:text-gray-300 hover:bg-[#181822]'}`}
                onClick={() => setActiveSection('inventory')}
              >
                Medical Supplies
              </button>
              <button
                className={`flex items-center justify-start px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${activeSection === 'equipment' ? 'text-[#0a84ff] bg-[#181822] shadow-[inset_2px_0_0_#0a84ff]' : 'text-gray-500 hover:text-gray-300 hover:bg-[#181822]'}`}
                onClick={() => setActiveSection('equipment')}
              >
                Equipment
              </button>
            </div>
          </div>
          
          <button
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${activeSection === 'alerts' ? 'bg-gradient-to-r from-[rgba(255,159,10,0.15)] to-[rgba(255,159,10,0.05)] text-[#ff9f0a] border border-[#ff9f0a]/30 shadow-[inset_4px_0_0_#ff9f0a]' : 'text-gray-400 hover:text-white hover:bg-[#181822] border border-transparent'}`}
            onClick={() => setActiveSection('alerts')}
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              Low Stock Alerts
            </span>
            {lowStockItemsCount > 0 && <span className="bg-[#ff453a] text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-[0_0_10px_rgba(255,69,58,0.5)]">{lowStockItemsCount}</span>}
          </button>

          <button
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${activeSection === 'reports' ? 'bg-gradient-to-r from-[rgba(10,132,255,0.15)] to-[rgba(10,132,255,0.05)] text-[#0a84ff] border border-[#0a84ff]/30 shadow-[inset_4px_0_0_#0a84ff]' : 'text-gray-400 hover:text-white hover:bg-[#181822] border border-transparent'}`}
            onClick={() => setActiveSection('reports')}
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">📊</span>
              Inventory Reports
            </span>
          </button>

          <div className="mt-6 mb-2 px-4">
            <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">POST-EVENTS</span>
          </div>

          <button
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${activeSection === 'pcr' ? 'bg-gradient-to-r from-[rgba(10,132,255,0.15)] to-[rgba(10,132,255,0.05)] text-[#0a84ff] border border-[#0a84ff]/30 shadow-[inset_4px_0_0_#0a84ff]' : 'text-gray-400 hover:text-white hover:bg-[#181822] border border-transparent'}`}
            onClick={() => setActiveSection('pcr')}
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">🏥</span>
              Patient Care Records
            </span>
          </button>
          
          <button
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${activeSection === 'events' ? 'bg-gradient-to-r from-[rgba(10,132,255,0.15)] to-[rgba(10,132,255,0.05)] text-[#0a84ff] border border-[#0a84ff]/30 shadow-[inset_4px_0_0_#0a84ff]' : 'text-gray-400 hover:text-white hover:bg-[#181822] border border-transparent'}`}
            onClick={() => setActiveSection('events')}
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">📅</span>
              Manage Events
            </span>
          </button>

          <div className="mt-6 mb-2 px-4">
            <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">RESOURCE DISPATCH</span>
          </div>


          
          <button
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${activeSection === 'trained_personnel' ? 'bg-gradient-to-r from-[rgba(10,132,255,0.15)] to-[rgba(10,132,255,0.05)] text-[#0a84ff] border border-[#0a84ff]/30 shadow-[inset_4px_0_0_#0a84ff]' : 'text-gray-400 hover:text-white hover:bg-[#181822] border border-transparent'}`}
            onClick={() => setActiveSection('trained_personnel')}
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">🎓</span>
              Trained Personnel
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
