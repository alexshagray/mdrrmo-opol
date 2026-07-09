import React from 'react';
import { useQuery } from '@tanstack/react-query';

export default function Staff2Overview({ setActiveSection, responders }) {
  // Fetch Incidents Data
  const { data: incidentsData } = useQuery({
    queryKey: ['dashboard_incidents'],
    queryFn: async () => {
      const res = await fetch('/api/incidents');
      return res.json();
    }
  });

  // Fetch PCR Data
  const { data: pcrData } = useQuery({
    queryKey: ['dashboard_pcr'],
    queryFn: async () => {
      const res = await fetch('/api/patient_care_records');
      return res.json();
    }
  });

  const rawIncidentsList = incidentsData?.data || [];
  const incidentsList = rawIncidentsList.filter(i => !['cancelled', 'rejected', 'declined'].includes((i.status || '').toLowerCase()));
  
  const activeIncidents = incidentsList.filter(i => i.status === 'Active' || i.status === 'Dispatched').length;
  const totalIncidents = incidentsList.length || 0;

  const pcrList = pcrData?.data || [];
  const totalPcr = pcrData?.total || 0;

  const activeRespondersCount = Object.keys(responders || {}).length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white m-0 tracking-tight">Dispatch Overview</h2>
          <p className="text-gray-400 text-sm mt-1">Real-time status of incidents, responders, and reports</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#111116] border border-[#1f1f26] p-6 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl leading-none">🚨</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Active Emergencies</p>
          <h3 className={`text-4xl font-black m-0 relative z-10 ${activeIncidents > 0 ? 'text-[#ff453a]' : 'text-[#34c759]'}`}>
            {activeIncidents}
          </h3>
          <p className="text-[#ff453a] text-xs font-semibold mt-2 relative z-10">Needs Attention</p>
        </div>

        <div className="bg-[#111116] border border-[#1f1f26] p-6 rounded-2xl shadow-lg relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl leading-none">📡</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Active Responders</p>
          <h3 className="text-4xl font-black text-white m-0 relative z-10">
            {activeRespondersCount}
          </h3>
          <p className="text-[#34c759] text-xs font-semibold mt-2 relative z-10">On Duty / Live Tracking</p>
        </div>

        <div className="bg-[#111116] border border-[#1f1f26] p-6 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl leading-none">📋</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Total Incidents</p>
          <h3 className="text-4xl font-black text-white m-0 relative z-10">{totalIncidents}</h3>
          <p className="text-[#0a84ff] text-xs font-semibold mt-2 relative z-10">Logged Reports</p>
        </div>

        <div className="bg-[#111116] border border-[#1f1f26] p-6 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl leading-none">🏥</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Total PCR</p>
          <h3 className="text-4xl font-black text-white m-0 relative z-10">{totalPcr}</h3>
          <p className="text-[#bf5af2] text-xs font-semibold mt-2 relative z-10">Patient Care Records</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-6 shadow-xl lg:col-span-1 flex flex-col gap-4">
          <h3 className="text-lg font-bold text-white m-0 mb-2">Quick Actions</h3>
          <button 
            onClick={() => setActiveSection('incidents')}
            className="w-full flex items-center justify-between p-4 bg-[#181822] hover:bg-[#20202b] border border-[#2b2b35] rounded-xl transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(10,132,255,0.1)] text-[#0a84ff] flex items-center justify-center text-lg">📋</div>
              <span className="text-gray-200 font-semibold text-sm">Manage Incidents</span>
            </div>
            <span className="text-gray-500 group-hover:text-white transition-colors">→</span>
          </button>
          
          <button 
            onClick={() => setActiveSection('live_monitoring')}
            className="w-full flex items-center justify-between p-4 bg-[#181822] hover:bg-[#20202b] border border-[#2b2b35] rounded-xl transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(52,199,89,0.1)] text-[#34c759] flex items-center justify-center text-lg">📡</div>
              <span className="text-gray-200 font-semibold text-sm">Live Monitoring</span>
            </div>
            <span className="text-gray-500 group-hover:text-white transition-colors">→</span>
          </button>
        </div>

        {/* Active Incident Feed */}
        <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-0 shadow-xl lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#1f1f26] flex justify-between items-center">
            <h3 className="text-lg font-bold text-white m-0">Recent Incident Reports</h3>
            <button onClick={() => setActiveSection('incidents')} className="text-[#0a84ff] text-xs font-bold hover:underline cursor-pointer">View All</button>
          </div>
          <div className="overflow-x-auto flex-1 p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#181822]">
                  <th className="p-4 text-gray-400 font-semibold text-xs uppercase tracking-wider border-b border-[#2b2b35]">Type</th>
                  <th className="p-4 text-gray-400 font-semibold text-xs uppercase tracking-wider border-b border-[#2b2b35]">Location</th>
                  <th className="p-4 text-gray-400 font-semibold text-xs uppercase tracking-wider border-b border-[#2b2b35]">Status</th>
                </tr>
              </thead>
              <tbody>
                {incidentsList.length === 0 ? (
                  <tr><td colSpan="3" className="p-6 text-center text-gray-500 text-sm">No recent incidents.</td></tr>
                ) : [...incidentsList].reverse().slice(0, 5).map(incident => (
                  <tr key={incident.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors border-b border-[#1f1f26] last:border-0">
                    <td className="p-4 text-white font-medium text-sm flex items-center gap-2">
                      <span className="text-lg">🚨</span> {incident.type}
                    </td>
                    <td className="p-4"><span className="text-gray-300 text-xs font-semibold">{incident.location?.barangay || incident.location?.location || 'Unknown'}</span></td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold border ${incident.status === 'Active' ? 'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20' : 'bg-[#34c759]/10 text-[#34c759] border-[#34c759]/20'}`}>
                        {incident.status}
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
