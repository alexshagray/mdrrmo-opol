import React from 'react';
import { useQuery } from '@tanstack/react-query';

export default function AdminDashboard({ setActiveSection }) {
  const token = localStorage.getItem('admin_token');

  // Fetch Users
  const { data: usersData } = useQuery({
    queryKey: ['dashboard_admin_users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }
  });

  // Fetch Incidents
  const { data: incidentsData } = useQuery({
    queryKey: ['dashboard_admin_incidents'],
    queryFn: async () => {
      const res = await fetch('/api/incidents');
      return res.json();
    }
  });

  // Fetch Inventory
  const { data: invData } = useQuery({
    queryKey: ['dashboard_admin_inventory'],
    queryFn: async () => {
      const res = await fetch('/api/inventory?page=1');
      return res.json();
    }
  });

  const usersList = usersData?.data || [];
  const pendingUsersCount = usersList.filter(u => u.status === 'pending').length;
  const approvedUsersCount = usersData?.total || 0;

  const totalIncidents = incidentsData?.total || 0;
  const inventoryTotal = invData?.total || 0;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white m-0 tracking-tight">System Control Overview</h2>
          <p className="text-gray-400 text-sm mt-1">High-level metrics for the entire MDRRMO system</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#111116] border border-[#1f1f26] p-6 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl leading-none">👥</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Total System Users</p>
          <h3 className="text-4xl font-black text-white m-0 relative z-10">{approvedUsersCount}</h3>
          <p className="text-[#0a84ff] text-xs font-semibold mt-2 relative z-10">Active Accounts</p>
        </div>

        <div className="bg-[#111116] border border-[#1f1f26] p-6 rounded-2xl shadow-lg relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl leading-none">⏳</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Pending Approvals</p>
          <h3 className={`text-4xl font-black m-0 relative z-10 ${pendingUsersCount > 0 ? 'text-[#ff9f0a]' : 'text-[#34c759]'}`}>
            {pendingUsersCount}
          </h3>
          <p className="text-gray-500 text-xs font-semibold mt-2 relative z-10">Awaiting Admin Action</p>
        </div>

        <div className="bg-[#111116] border border-[#1f1f26] p-6 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl leading-none">🚨</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Global Incidents</p>
          <h3 className="text-4xl font-black text-white m-0 relative z-10">{totalIncidents}</h3>
          <p className="text-[#ff453a] text-xs font-semibold mt-2 relative z-10">Logged Emergencies</p>
        </div>

        <div className="bg-[#111116] border border-[#1f1f26] p-6 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl leading-none">📦</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Global Inventory</p>
          <h3 className="text-4xl font-black text-white m-0 relative z-10">{inventoryTotal}</h3>
          <p className="text-[#34c759] text-xs font-semibold mt-2 relative z-10">Total Asset Records</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-6 shadow-xl lg:col-span-1 flex flex-col gap-4">
          <h3 className="text-lg font-bold text-white m-0 mb-2">System Shortcuts</h3>
          <button 
            onClick={() => setActiveSection('users')}
            className="w-full flex items-center justify-between p-4 bg-[#181822] hover:bg-[#20202b] border border-[#2b2b35] rounded-xl transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(10,132,255,0.1)] text-[#0a84ff] flex items-center justify-center text-lg">👥</div>
              <span className="text-gray-200 font-semibold text-sm">Manage Users</span>
            </div>
            <span className="text-gray-500 group-hover:text-white transition-colors">→</span>
          </button>
          
          <button 
            onClick={() => setActiveSection('responders')}
            className="w-full flex items-center justify-between p-4 bg-[#181822] hover:bg-[#20202b] border border-[#2b2b35] rounded-xl transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(52,199,89,0.1)] text-[#34c759] flex items-center justify-center text-lg">🚑</div>
              <span className="text-gray-200 font-semibold text-sm">Responder Accounts</span>
            </div>
            <span className="text-gray-500 group-hover:text-white transition-colors">→</span>
          </button>

          <button 
            onClick={() => setActiveSection('events')}
            className="w-full flex items-center justify-between p-4 bg-[#181822] hover:bg-[#20202b] border border-[#2b2b35] rounded-xl transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(255,159,10,0.1)] text-[#ff9f0a] flex items-center justify-center text-lg">📅</div>
              <span className="text-gray-200 font-semibold text-sm">System Events</span>
            </div>
            <span className="text-gray-500 group-hover:text-white transition-colors">→</span>
          </button>
        </div>

        {/* Recent Registrations Feed */}
        <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-0 shadow-xl lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#1f1f26] flex justify-between items-center">
            <h3 className="text-lg font-bold text-white m-0">Recent User Registrations</h3>
            <button onClick={() => setActiveSection('users')} className="text-[#0a84ff] text-xs font-bold hover:underline cursor-pointer">View All</button>
          </div>
          <div className="overflow-x-auto flex-1 p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#181822]">
                  <th className="p-4 text-gray-400 font-semibold text-xs uppercase tracking-wider border-b border-[#2b2b35]">Name</th>
                  <th className="p-4 text-gray-400 font-semibold text-xs uppercase tracking-wider border-b border-[#2b2b35]">Role</th>
                  <th className="p-4 text-gray-400 font-semibold text-xs uppercase tracking-wider border-b border-[#2b2b35]">Status</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 ? (
                  <tr><td colSpan="3" className="p-6 text-center text-gray-500 text-sm">No users found.</td></tr>
                ) : [...usersList].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map(user => (
                  <tr key={user.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors border-b border-[#1f1f26] last:border-0">
                    <td className="p-4 text-white font-medium text-sm">
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        <span className="text-xs text-gray-500">{user.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        user.role === 'admin' ? 'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20' : 
                        user.role === 'staff_1' ? 'bg-[#0a84ff]/10 text-[#0a84ff] border-[#0a84ff]/20' : 
                        'bg-[#34c759]/10 text-[#34c759] border-[#34c759]/20'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold border ${user.status === 'pending' ? 'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20' : 'bg-[#34c759]/10 text-[#34c759] border-[#34c759]/20'}`}>
                        {user.status}
                      </span>
                    </td>
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
