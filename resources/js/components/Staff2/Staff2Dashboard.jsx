import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import LiveMonitoring from './LiveMonitoring';

export default function Staff2Dashboard({ responders, setNotifications }) {
  const [incidentPage, setIncidentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('incidents');

  // Fetch incidents for the incidents list
  const { data: incidentsData } = useQuery({
    queryKey: ['incidents', incidentPage],
    queryFn: async () => {
      const response = await fetch(`/api/incidents?page=${incidentPage}`);
      return response.json();
    }
  });

  const incidents = incidentsData?.data || [];
  const activeIncidents = incidents.filter(i => i.status !== 'completed');
  const dispatchedIncidents = incidents.filter(i => i.status === 'dispatched');
  const resolvedIncidents = incidents.filter(i => i.status === 'completed');




  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-5 shadow-lg flex flex-col justify-center">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Active Now</span>
          <span className="text-4xl font-bold text-[#ef4444]">{activeIncidents.length}</span>
        </div>
        <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-5 shadow-lg flex flex-col justify-center">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Dispatched</span>
          <span className="text-4xl font-bold text-[#f59e0b]">{dispatchedIncidents.length}</span>
        </div>
        <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-5 shadow-lg flex flex-col justify-center">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Resolved Today</span>
          <span className="text-4xl font-bold text-[#34c759]">{resolvedIncidents.length}</span>
        </div>
        <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-5 shadow-lg flex flex-col justify-center">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Total Today</span>
          <span className="text-4xl font-bold text-white">{incidents.length}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[700px]">
        {/* Map Column */}
        <div className="col-span-8 h-full flex flex-col gap-6">
          {/* Map */}
          <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-5 shadow-lg flex-1 flex flex-col relative overflow-hidden h-full">
            <div className="flex justify-between items-center mb-4 z-10 relative">
              <h3 className="m-0 text-sm font-bold text-gray-300 flex items-center gap-2">
                <span className="text-lg">🗺️</span> Incident map - Opol Municipality
              </h3>
              <span className="text-[10px] text-gray-500">Hover pin for details</span>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden border border-[#2b2b35] relative">
              <LiveMonitoring responders={responders} />
            </div>
          </div>
        </div>

        {/* Sidebar Tabs */}
        <div className="col-span-4 h-full flex flex-col gap-6">
          <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-5 shadow-lg h-full flex flex-col relative overflow-hidden">
            <div className="flex gap-4 mb-4 border-b border-[#1f1f26] pb-2">
              <button 
                onClick={() => setActiveTab('incidents')}
                className={`text-sm font-bold flex items-center gap-2 pb-2 -mb-2.5 transition-colors ${activeTab === 'incidents' ? 'text-gray-200 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <span className="text-lg text-red-500">⚠</span> Incidents 
                <span className="bg-[#ef4444] text-white text-[10px] px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                  {activeIncidents.length}
                </span>
              </button>
              <button 
                onClick={() => setActiveTab('responders')}
                className={`text-sm font-bold flex items-center gap-2 pb-2 -mb-2.5 transition-colors ${activeTab === 'responders' ? 'text-gray-200 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <span className="text-lg text-blue-500">🚑</span> Responders
                <span className="bg-[#0a84ff] text-white text-[10px] px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(10,132,255,0.4)]">
                  {Object.keys(responders).length}
                </span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
              {activeTab === 'incidents' ? (
                activeIncidents.length === 0 ? (
                  <div className="text-center text-xs text-gray-500 mt-10">No active incidents</div>
                ) : (
                  activeIncidents.map(inc => (
                  <div key={inc.id || inc.incident_id} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-2.5 h-2.5 rounded-full mt-1" style={{ backgroundColor: inc.emergency_type?.color_hex || '#a855f7', boxShadow: `0 0 8px ${inc.emergency_type?.color_hex || '#a855f7'}80` }}></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm" style={{ color: inc.emergency_type?.color_hex || '#e5e7eb' }}>
                            {inc.emergency_type?.emoji_icon} {inc.emergency_type?.name || 'Emergency'}
                          </strong>
                          <span className="text-[10px] text-gray-500 uppercase">{inc.incident_id}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">
                          📍 {inc.location?.location || inc.location?.barangay || 'Unknown location'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          👤 {inc.user?.first_name || inc.caller_name || 'Unknown'} - {inc.user?.phone_number || inc.caller_number || 'No contact'}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                          🕒 {new Date(inc.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className="bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                        Active
                      </span>
                      <button className="w-6 h-6 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors text-xs">
                        ↓
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
                Object.keys(responders).length === 0 ? (
                  <div className="text-center text-xs text-gray-500 mt-10">No active responders</div>
                ) : (
                  Object.values(responders).map(resp => (
                    <div key={resp.responderId} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-2.5 h-2.5 rounded-full mt-1 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-gray-200 text-sm">Responder {resp.responderId}</strong>
                            {resp.incidentId && <span className="text-[10px] text-gray-500 uppercase">To: {resp.incidentId}</span>}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            📍 Lat: {parseFloat(resp.latitude).toFixed(4)}, Lng: {parseFloat(resp.longitude).toFixed(4)}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                            🕒 Last active: {new Date(resp.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <span className="bg-[#0a84ff]/10 text-[#0a84ff] border border-[#0a84ff]/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-[0_0_8px_rgba(10,132,255,0.2)]">
                          {resp.status || 'Active'}
                        </span>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
