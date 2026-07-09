import React from 'react';
import { useQuery } from '@tanstack/react-query';

export default function Staff1Dashboard({ setActiveSection }) {
  // Fetch Inventory Data
  const { data: invData } = useQuery({
    queryKey: ['dashboard_inventory'],
    queryFn: async () => {
      const res = await fetch('/api/inventory?page=1');
      return res.json();
    }
  });

  // Fetch Trained Personnel Data
  const { data: tpData } = useQuery({
    queryKey: ['dashboard_trainedPersonnel'],
    queryFn: async () => {
      const res = await fetch('/api/trained_personnels?page=1');
      return res.json();
    }
  });

  // Fetch Events Data
  const { data: eventsData } = useQuery({
    queryKey: ['dashboard_events'],
    queryFn: async () => {
      const res = await fetch('/api/post_events');
      return res.json();
    }
  });

  const inventoryTotal = invData?.total || 0;
  const inventoryItems = invData?.data || [];
  const lowStockCount = inventoryItems.filter(i => i.status === 'Low Stock' || i.status === 'Unavailable').length;

  const personnelTotal = tpData?.total || 0;
  const personnelList = tpData?.data || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEventsCount = (eventsData || []).filter(e => e.event_date >= todayStr && e.status !== 'Completed').length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white m-0 tracking-tight">Overview Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">Summary of inventory, personnel, and events</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#111116] border border-[#1f1f26] p-6 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl leading-none">📦</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Total Assets</p>
          <h3 className="text-4xl font-black text-white m-0 relative z-10">{inventoryTotal}</h3>
          <p className="text-[#0a84ff] text-xs font-semibold mt-2 relative z-10">Tracked Items</p>
        </div>

        <div className="bg-[#111116] border border-[#1f1f26] p-6 rounded-2xl shadow-lg relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl leading-none">⚠️</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Low Stock Alerts</p>
          <h3 className={`text-4xl font-black m-0 relative z-10 ${lowStockCount > 0 ? 'text-[#ff453a]' : 'text-[#34c759]'}`}>
            {lowStockCount}
          </h3>
          <p className="text-gray-500 text-xs font-semibold mt-2 relative z-10">Requires Attention</p>
        </div>

        <div className="bg-[#111116] border border-[#1f1f26] p-6 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl leading-none">👥</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Trained Personnel</p>
          <h3 className="text-4xl font-black text-white m-0 relative z-10">{personnelTotal}</h3>
          <p className="text-[#0a84ff] text-xs font-semibold mt-2 relative z-10">Active Members</p>
        </div>

        <div className="bg-[#111116] border border-[#1f1f26] p-6 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl leading-none">📅</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Upcoming Events</p>
          <h3 className="text-4xl font-black text-white m-0 relative z-10">{upcomingEventsCount}</h3>
          <p className="text-[#0a84ff] text-xs font-semibold mt-2 relative z-10">Scheduled</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-6 shadow-xl lg:col-span-1 flex flex-col gap-4">
          <h3 className="text-lg font-bold text-white m-0 mb-2">Quick Actions</h3>
          <button 
            onClick={() => setActiveSection('inventory')}
            className="w-full flex items-center justify-between p-4 bg-[#181822] hover:bg-[#20202b] border border-[#2b2b35] rounded-xl transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(10,132,255,0.1)] text-[#0a84ff] flex items-center justify-center text-lg">📦</div>
              <span className="text-gray-200 font-semibold text-sm">Manage Inventory</span>
            </div>
            <span className="text-gray-500 group-hover:text-white transition-colors">→</span>
          </button>
          
          <button 
            onClick={() => setActiveSection('trained_personnel')}
            className="w-full flex items-center justify-between p-4 bg-[#181822] hover:bg-[#20202b] border border-[#2b2b35] rounded-xl transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(52,199,89,0.1)] text-[#34c759] flex items-center justify-center text-lg">👥</div>
              <span className="text-gray-200 font-semibold text-sm">Manage Personnel</span>
            </div>
            <span className="text-gray-500 group-hover:text-white transition-colors">→</span>
          </button>

          <button 
            onClick={() => setActiveSection('events')}
            className="w-full flex items-center justify-between p-4 bg-[#181822] hover:bg-[#20202b] border border-[#2b2b35] rounded-xl transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(255,159,10,0.1)] text-[#ff9f0a] flex items-center justify-center text-lg">📅</div>
              <span className="text-gray-200 font-semibold text-sm">Schedule Event</span>
            </div>
            <span className="text-gray-500 group-hover:text-white transition-colors">→</span>
          </button>

          <button 
            onClick={() => setActiveSection('pcr')}
            className="w-full flex items-center justify-between p-4 bg-[#181822] hover:bg-[#20202b] border border-[#2b2b35] rounded-xl transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(191,90,242,0.1)] text-[#bf5af2] flex items-center justify-center text-lg">🏥</div>
              <span className="text-gray-200 font-semibold text-sm">Patient Records</span>
            </div>
            <span className="text-gray-500 group-hover:text-white transition-colors">→</span>
          </button>
        </div>

        {/* Recent Personnel Overview */}
        <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-0 shadow-xl lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#1f1f26] flex justify-between items-center">
            <h3 className="text-lg font-bold text-white m-0">Recently Added Personnel</h3>
            <button onClick={() => setActiveSection('trained_personnel')} className="text-[#0a84ff] text-xs font-bold hover:underline cursor-pointer">View All</button>
          </div>
          <div className="overflow-x-auto flex-1 p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#181822]">
                  <th className="p-4 text-gray-400 font-semibold text-xs uppercase tracking-wider border-b border-[#2b2b35]">Name</th>
                  <th className="p-4 text-gray-400 font-semibold text-xs uppercase tracking-wider border-b border-[#2b2b35]">Barangay</th>
                  <th className="p-4 text-gray-400 font-semibold text-xs uppercase tracking-wider border-b border-[#2b2b35]">Sex</th>
                </tr>
              </thead>
              <tbody>
                {personnelList.length === 0 ? (
                  <tr><td colSpan="3" className="p-6 text-center text-gray-500 text-sm">No personnel found.</td></tr>
                ) : personnelList.slice(0, 5).map(person => (
                  <tr key={person.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors border-b border-[#1f1f26] last:border-0">
                    <td className="p-4 text-white font-medium text-sm">{person.name}</td>
                    <td className="p-4"><span className="bg-[#181822] border border-[#2b2b35] text-gray-300 px-2 py-1 rounded-md text-xs font-semibold">{person.barangay}</span></td>
                    <td className="p-4 text-gray-400 text-sm">{person.sex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
