import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function Incidents({ setNotifications }) {
  const [incidentPage, setIncidentPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: incidentsData, isLoading } = useQuery({
    queryKey: ['incidents', 'completed', incidentPage],
    queryFn: async () => {
      const response = await fetch(`/api/incidents?page=${incidentPage}&status=completed`);
      return response.json();
    },
    keepPreviousData: true
  });

  const incidents = incidentsData?.data || [];

  const deleteIncidentMutation = useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`/api/incident_details/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to delete incident');
      return { id, message: result.message };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['mapIncidents'] });
      setNotifications(prev => [{
        id: Date.now(),
        title: 'Incident Deleted',
        message: `Incident Report #${data.id} has been permanently removed.`,
        type: 'system',
        created_at: new Date().toISOString()
      }, ...prev]);
    },
    onError: (err) => alert(err.message)
  });

  const handleDeleteIncident = async (id) => {
    if (window.confirm('Are you sure you want to delete this incident report? This action cannot be undone.')) {
      deleteIncidentMutation.mutate(id);
    }
  };

  const editCallerMutation = useMutation({
    mutationFn: async ({ id, callerName }) => {
      const response = await fetch(`/api/incident_details/${id}/caller`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ caller_name: callerName })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to update caller name');
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setNotifications(prev => [{
        id: Date.now(),
        title: 'Caller Name Updated',
        message: data.message,
        type: 'system',
        created_at: new Date().toISOString()
      }, ...prev]);
    },
    onError: (err) => alert(err.message)
  });

  const handleEditCaller = (incident) => {
    if (!incident.user) {
      alert("This incident was not created by a registered user phone number, so the name cannot be saved to a profile.");
      return;
    }
    const currentName = incident.user.first_name !== 'Unknown' ? `${incident.user.first_name} ${incident.user.last_name}`.trim() : '';
    const newName = window.prompt("Enter the real name of the caller for future reference:", currentName);
    
    if (newName && newName.trim() !== '') {
      editCallerMutation.mutate({ 
        id: incident.id || incident.incident_id, 
        callerName: newName.trim() 
      });
    }
  };

  const deleteAllIncidentsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/incident_details', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to delete incidents');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['mapIncidents'] });
      setNotifications(prev => [{
        id: Date.now(),
        title: 'All Incidents Deleted',
        message: `All incident reports have been cleared from the database.`,
        type: 'system',
        created_at: new Date().toISOString()
      }, ...prev]);
    },
    onError: (err) => alert(err.message)
  });

  const handleDeleteAllIncidents = async () => {
    if (window.confirm('WARNING: Are you sure you want to delete ALL incident reports? This action cannot be undone.')) {
      deleteAllIncidentsMutation.mutate();
    }
  };

  if (isLoading && incidents.length === 0) {
    return <div className="p-8 text-center text-gray-400">Loading incidents...</div>;
  }

  return (
    <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white m-0">Manage Incident Reports</h2>
        {incidents.length > 0 && (
          <button 
            onClick={handleDeleteAllIncidents}
            className="bg-[rgba(239,68,68,0.15)] hover:bg-[rgba(239,68,68,0.25)] border border-[#ef4444] text-[#ef4444] px-4 py-2 rounded-lg font-bold text-sm transition-all"
          >
            🗑️ Delete All Items
          </button>
        )}
      </div>
      {incidents.length === 0 ? (
        <div className="p-8 text-center bg-[#181822] border border-[#2b2b35] rounded-xl text-gray-400">
          No incident reports found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#181822]">
                <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35] rounded-tl-lg">Name of Caller</th>
                <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Emergency Type</th>
                <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Phone Number</th>
                <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Location</th>
                <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Date/Time Reported</th>
                <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35] rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident.id || incident.incident_id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="p-4 border-b border-[#1f1f26] text-white font-medium text-sm">
                    {incident.user ? `${incident.user.first_name || ''} ${incident.user.last_name || ''}`.trim() : (incident.caller_name || 'Unknown')}
                  </td>
                  <td className="p-4 border-b border-[#1f1f26]">
                    <span className="bg-[#181822] border border-[#2b2b35] text-gray-300 px-2.5 py-1 rounded-md text-xs font-semibold" style={{ color: incident.emergency_type?.color_hex || '#d1d5db' }}>
                      {incident.emergency_type?.emoji_icon} {incident.emergency_type?.name || (typeof incident.emergency_type === 'string' ? incident.emergency_type : 'Not specified')}
                    </span>
                  </td>
                  <td className="p-4 border-b border-[#1f1f26] text-gray-300 text-sm">{incident.user?.phone_number || incident.caller_number || 'Unknown'}</td>
                  <td className="p-4 border-b border-[#1f1f26] text-gray-300 text-sm">
                    {typeof incident.location === 'object' && incident.location !== null
                      ? incident.location.location || [incident.location.landmark, incident.location.purok, incident.location.barangay].filter(Boolean).join(', ') || 'Not specified'
                      : incident.location || incident.incident_address || 'Not specified'}
                  </td>
                  <td className="p-4 border-b border-[#1f1f26] text-gray-400 text-xs">
                    {typeof incident.created_at === 'string' ? new Date(incident.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (incident.created_at || new Date().toLocaleString())}
                  </td>
                  <td className="p-4 border-b border-[#1f1f26]">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditCaller(incident)}
                        className="bg-[rgba(10,132,255,0.1)] hover:bg-[rgba(10,132,255,0.2)] border border-[#0a84ff] text-[#0a84ff] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        title="Save Caller Name"
                      >
                        ✏️ Edit Caller
                      </button>
                      <button 
                        onClick={() => handleDeleteIncident(incident.id || incident.incident_id)}
                        className="bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.2)] border border-[#ef4444] text-[#ef4444] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {incidentsData?.last_page > 1 && (
        <div className="flex justify-between items-center mt-4 p-4 bg-[#181822] border border-[#2b2b35] rounded-xl">
          <span className="text-gray-400 text-xs font-medium">
            Showing page {incidentsData.current_page} of {incidentsData.last_page}
          </span>
          <div className="flex gap-2">
            <button 
              disabled={!incidentsData.prev_page_url}
              onClick={() => setIncidentPage(p => Math.max(1, p - 1))}
              className={`px-4 py-2 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-xs font-semibold ${incidentsData.prev_page_url ? 'hover:bg-[#1f1f26] cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
            >
              Previous
            </button>
            <button 
              disabled={!incidentsData.next_page_url}
              onClick={() => setIncidentPage(p => p + 1)}
              className={`px-4 py-2 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-xs font-semibold ${incidentsData.next_page_url ? 'hover:bg-[#1f1f26] cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
