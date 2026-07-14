import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import LiveMonitoring from './LiveMonitoring';

function IncidentCard({ inc, onClick }) {
  const status = (inc.status || 'active').toLowerCase();
  let statusColor = 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30';
  if (status === 'dispatched') statusColor = 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30';
  if (status === 'completed') statusColor = 'text-[#34c759] bg-[#34c759]/10 border-[#34c759]/30';
  if (status === 'on scene') statusColor = 'text-[#0a84ff] bg-[#0a84ff]/10 border-[#0a84ff]/30';

  const barangayName = inc.location?.barangay || inc.barangay || null;

  return (
    <div
      onClick={onClick}
      className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
          style={{ backgroundColor: inc.emergency_type?.color_hex || '#a855f7', boxShadow: `0 0 8px ${inc.emergency_type?.color_hex || '#a855f7'}80` }}
        />
        <div>
          <div className="flex flex-col items-start mb-1">
            <strong className="text-sm leading-tight" style={{ color: inc.emergency_type?.color_hex || '#e5e7eb' }}>
              {inc.emergency_type?.emoji_icon} {inc.emergency_type?.name || 'Emergency'}
            </strong>
            <span className="text-[10px] text-gray-500 uppercase font-bold mt-0.5">{inc.incident_id}</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            📍 {barangayName || 'Unknown location'}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            👤 {inc.user?.first_name || 'Unknown'} - {inc.user?.phone_number || 'No contact'}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            🕒 {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
        <span className={`border px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusColor}`}>
          {inc.status || 'Active'}
        </span>
      </div>
    </div>
  );
}

export default function Staff2Dashboard({ responders, setNotifications }) {
  const [incidentPage, setIncidentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedIncidentForMap, setSelectedIncidentForMap] = useState(null);

  const { data: incidentsData, isFetching } = useQuery({
    queryKey: ['incidents', incidentPage],
    queryFn: async () => {
      const response = await fetch(`/api/incidents?page=${incidentPage}`);
      return response.json();
    },
    keepPreviousData: true,
    refetchInterval: 3000
  });

  // Dedicated Completed Incidents State
  const [completedIncidentsPage, setCompletedIncidentsPage] = useState(1);
  const [completedSearch, setCompletedSearch] = useState('');
  const [debouncedCompletedSearch, setDebouncedCompletedSearch] = useState('');
  const [completedDateFilter, setCompletedDateFilter] = useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCompletedSearch(completedSearch);
      setCompletedIncidentsPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [completedSearch]);

  React.useEffect(() => {
    setCompletedIncidentsPage(1);
  }, [completedDateFilter]);

  const { data: completedIncidentsData, isLoading: isLoadingCompleted, isFetching: isFetchingCompleted } = useQuery({
    queryKey: ['completedIncidentsTab', completedIncidentsPage, debouncedCompletedSearch, completedDateFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'completed', page: completedIncidentsPage, search: debouncedCompletedSearch, limit: 10 });
      if (completedDateFilter) params.append('date_filter', completedDateFilter);
      const response = await fetch(`/api/incidents?${params.toString()}`);
      return response.json();
    },
    keepPreviousData: true,
    refetchInterval: 5000
  });

  const dedicatedCompletedIncidents = completedIncidentsData?.data || [];
  const onlineRespondersCount = Object.values(responders).filter(r => (r.status || '').toLowerCase() !== 'offline').length;

  const allIncidents = incidentsData?.data || [];
  // Exclude rejected/cancelled
  const validIncidents = allIncidents.filter(
    i => !['cancelled', 'rejected', 'declined'].includes((i.status || '').toLowerCase())
  );

  const currentIncidentPage = incidentsData?.current_page || 1;
  const lastIncidentPage = incidentsData?.last_page || 1;

  // Active = everything that is NOT completed
  const activeIncidents = validIncidents.filter(
    i => (i.status || '').toLowerCase() !== 'completed'
  );
  // Completed = only completed
  const completedIncidents = validIncidents.filter(
    i => (i.status || '').toLowerCase() === 'completed'
  );

  const handleIncidentClick = (inc) => {
    // Try to get coordinates from the incident's location relation or direct fields
    let lat = parseFloat(inc.location?.latitude || inc.latitude);
    let lng = parseFloat(inc.location?.longitude || inc.longitude);

    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
      alert('Cannot focus map: This incident has no valid GPS coordinates.');
    } else {
      setSelectedIncidentForMap({ ...inc, latitude: lat, longitude: lng });
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-5 shadow-lg flex flex-col justify-center">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Active Now</span>
          <span className="text-4xl font-bold text-[#ef4444]">{activeIncidents.length}</span>
        </div>
        <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-5 shadow-lg flex flex-col justify-center">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Completed</span>
          <span className="text-4xl font-bold text-[#34c759]">{completedIncidents.length}</span>
        </div>
        <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-5 shadow-lg flex flex-col justify-center">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Responders Online</span>
          <span className="text-4xl font-bold text-[#0a84ff]">{onlineRespondersCount}</span>
        </div>
        <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-5 shadow-lg flex flex-col justify-center">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Total Today</span>
          <span className="text-4xl font-bold text-white">{validIncidents.length}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[700px]">
        {/* Map Column */}
        <div className="col-span-12 lg:col-span-8 h-full flex flex-col gap-6 min-h-0 order-2">
          <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-5 shadow-lg flex-1 flex flex-col relative overflow-hidden min-h-0">
            <div className="flex justify-between items-center mb-4 z-10 relative">
              <h3 className="m-0 text-sm font-bold text-gray-300 flex items-center gap-2">
                <span className="text-lg">🗺️</span> Incident map - Opol Municipality
              </h3>
              <span className="text-[10px] text-gray-500">Click incident to focus map</span>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden border border-[#2b2b35] relative">
              <LiveMonitoring responders={responders} selectedIncidentForMap={selectedIncidentForMap} />
            </div>
          </div>
        </div>

        {/* Sidebar Tabs */}
        <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-6 min-h-0 order-1">
          <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-5 shadow-lg flex-1 flex flex-col relative overflow-hidden min-h-0">
            {/* Tabs */}
            <div className="flex gap-3 mb-4 border-b border-[#1f1f26] pb-2 flex-wrap">
              <button
                onClick={() => setActiveTab('active')}
                className={`text-sm font-bold flex items-center gap-2 pb-2 -mb-2.5 transition-colors ${activeTab === 'active' ? 'text-gray-200 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <span className="text-base text-red-500">⚠</span> Active
                <span className="bg-[#ef4444] text-white text-[10px] px-2 py-0.5 rounded-full">
                  {activeIncidents.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`text-sm font-bold flex items-center gap-2 pb-2 -mb-2.5 transition-colors ${activeTab === 'completed' ? 'text-gray-200 border-b-2 border-green-500' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <span className="text-base text-green-500">✅</span> Completed
                <span className="bg-[#34c759] text-white text-[10px] px-2 py-0.5 rounded-full">
                  {completedIncidentsData?.total || completedIncidents.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('responders')}
                className={`text-sm font-bold flex items-center gap-2 pb-2 -mb-2.5 transition-colors ${activeTab === 'responders' ? 'text-gray-200 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <span className="text-base text-blue-500">🚑</span> Responders
                <span className="bg-[#0a84ff] text-white text-[10px] px-2 py-0.5 rounded-full">
                  {onlineRespondersCount}
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-1">
              {/* Active Incidents Tab */}
              {activeTab === 'active' && (
                <div className="flex flex-col h-full gap-3">
                  <div className="flex flex-col gap-3 flex-1">
                    {activeIncidents.length === 0 ? (
                      <div className="text-center text-xs text-gray-500 mt-10">
                        <div className="text-3xl mb-2">🟢</div>
                        No active incidents
                      </div>
                    ) : (
                      activeIncidents.map(inc => (
                        <IncidentCard
                          key={inc.id || inc.incident_id}
                          inc={inc}
                          onClick={() => handleIncidentClick(inc)}
                        />
                      ))
                    )}
                  </div>
                  {lastIncidentPage > 1 && (
                    <div className="flex items-center justify-between mt-auto pt-2 pb-2 shrink-0 border-t border-[#1f1f26]">
                      <button
                        onClick={() => setIncidentPage(p => Math.max(1, p - 1))}
                        disabled={currentIncidentPage === 1 || isFetching}
                        className="px-3 py-1.5 bg-[#1a1a2e] border border-white/10 text-white text-[11px] font-bold rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                        {isFetching ? 'Loading...' : `Page ${currentIncidentPage} of ${lastIncidentPage}`}
                      </span>
                      <button
                        onClick={() => setIncidentPage(p => Math.min(lastIncidentPage, p + 1))}
                        disabled={currentIncidentPage === lastIncidentPage || isFetching}
                        className="px-3 py-1.5 bg-[#1a1a2e] border border-white/10 text-white text-[11px] font-bold rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Completed Incidents Tab */}
              {activeTab === 'completed' && (
                <div className="flex flex-col h-full gap-3">
                  <div className="flex flex-col gap-2 shrink-0 border-b border-[#1f1f26] pb-3 mb-1">
                    <input 
                      type="text"
                      placeholder="e.g. enter incident id..."
                      value={completedSearch}
                      onChange={(e) => setCompletedSearch(e.target.value)}
                      className="w-full bg-[#181822] border border-[#2b2b35] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[#0a84ff] transition-colors"
                    />
                    <div className="relative">
                      <input
                        type="date"
                        value={completedDateFilter}
                        onChange={(e) => { setCompletedDateFilter(e.target.value); setCompletedIncidentsPage(1); }}
                        className="w-full bg-[#181822] border border-[#2b2b35] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[#0a84ff] transition-colors [color-scheme:dark]"
                        title="Filter by specific date"
                      />
                      {completedDateFilter && (
                        <button
                          onClick={() => setCompletedDateFilter('')}
                          className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs px-1"
                          title="Clear date filter"
                        >✕</button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 flex-1 overflow-y-auto relative min-h-[100px]">
                    {isFetchingCompleted && !isLoadingCompleted && (
                      <div className="absolute top-2 right-2 w-4 h-4 border-2 border-[#0a84ff]/30 border-t-[#0a84ff] rounded-full animate-spin"></div>
                    )}
                    {isLoadingCompleted ? (
                      <div className="text-center text-xs text-gray-500 mt-10">Loading...</div>
                    ) : dedicatedCompletedIncidents.length === 0 ? (
                      <div className="text-center text-xs text-gray-500 mt-10">
                        <div className="text-3xl mb-2">📋</div>
                        No completed incidents found
                      </div>
                    ) : (
                      dedicatedCompletedIncidents.map(inc => (
                        <IncidentCard
                          key={inc.id || inc.incident_id}
                          inc={inc}
                          onClick={() => handleIncidentClick(inc)}
                        />
                      ))
                    )}
                  </div>
                  
                  {completedIncidentsData?.last_page > 1 && (
                    <div className="flex items-center justify-between mt-auto pt-2 pb-2 shrink-0 border-t border-[#1f1f26]">
                      <button
                        onClick={() => setCompletedIncidentsPage(p => Math.max(1, p - 1))}
                        disabled={!completedIncidentsData.prev_page_url || isFetchingCompleted}
                        className="px-3 py-1.5 bg-[#1a1a2e] border border-white/10 text-white text-[11px] font-bold rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                        Page {completedIncidentsData.current_page} of {completedIncidentsData.last_page}
                      </span>
                      <button
                        onClick={() => setCompletedIncidentsPage(p => p + 1)}
                        disabled={!completedIncidentsData.next_page_url || isFetchingCompleted}
                        className="px-3 py-1.5 bg-[#1a1a2e] border border-white/10 text-white text-[11px] font-bold rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Responders Tab */}
              {activeTab === 'responders' && (
                onlineRespondersCount === 0 ? (
                  <div className="text-center text-xs text-gray-500 mt-10">
                    <div className="text-3xl mb-2">📡</div>
                    No active responders
                  </div>
                ) : (
                  Object.values(responders).filter(r => (r.status || '').toLowerCase() !== 'offline').map(resp => (
                    <div 
                      key={resp.responderId} 
                      onClick={() => {
                        let lat = parseFloat(resp.latitude);
                        let lng = parseFloat(resp.longitude);
                        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                          setSelectedIncidentForMap({ id: `resp-${resp.responderId}`, latitude: lat, longitude: lng, isResponderFocus: true });
                        }
                      }}
                      className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-2.5 h-2.5 rounded-full mt-1 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-gray-200 text-sm">{resp.responderName || `Responder ${resp.responderId}`}</strong>
                            {resp.incidentId && <span className="text-[10px] text-gray-500 uppercase">To: {resp.incidentId}</span>}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            📍 Lat: {parseFloat(resp.latitude).toFixed(4)}, Lng: {parseFloat(resp.longitude).toFixed(4)}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">
                            🕒 Last active: {new Date(resp.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <span className="bg-[#0a84ff]/10 text-[#0a84ff] border border-[#0a84ff]/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {resp.status || 'Active'}
                      </span>
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
