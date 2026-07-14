import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function RespondersManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedTerm, setDebouncedTerm] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: responders = [], isLoading } = useQuery({
    queryKey: ['responders', debouncedTerm],
    queryFn: async () => {
      const url = debouncedTerm ? `/api/responders?search=${encodeURIComponent(debouncedTerm)}` : '/api/responders';
      const res = await fetch(url);
      return res.json();
    }
  });

  const fetchData = () => {
    queryClient.invalidateQueries({ queryKey: ['responders'] });
  };

  if (isLoading) {
    return <div className="loading-state">Loading responders...</div>;
  }

  return (
    <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white m-0">Personnel Availability</h3>
        <div className="flex gap-3">
          <input 
            type="text" 
            placeholder="Search by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#181822] border border-[#2b2b35] text-white px-4 py-2 rounded-lg focus:outline-none focus:border-[#0a84ff] transition-colors text-sm w-64"
          />
          <button 
            className="bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-gray-200 px-4 py-2 rounded-lg font-semibold transition-all text-sm" 
            onClick={fetchData}
          >
            🔄 Refresh List
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#181822]">
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35] rounded-tl-lg">ID</th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Responder Name</th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Contact Number</th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35] rounded-tr-lg">Current Duty Status</th>
            </tr>
          </thead>
          <tbody>
            {responders.length === 0 ? (
              <tr><td colSpan="4" className="p-4 text-center text-gray-400 border-b border-[#1f1f26]">No responders found.</td></tr>
            ) : responders.map(res => (
              <tr key={res.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                <td className="p-4 border-b border-[#1f1f26] text-gray-300 text-sm">{res.id}</td>
                <td className="p-4 border-b border-[#1f1f26] text-white font-medium text-sm">{res.name}</td>
                <td className="p-4 border-b border-[#1f1f26] text-gray-300 text-sm">{res.phone || 'N/A'}</td>
                <td className="p-4 border-b border-[#1f1f26]">
                  {(() => {
                    const statusLower = (res.duty_status || 'offline').toLowerCase();
                    let displayStatus = 'Offline';
                    let colorClass = 'bg-[rgba(255,159,10,0.15)] text-[#ff9f0a] border-[rgba(255,159,10,0.3)]';

                    if (statusLower === 'available' || statusLower === 'online') {
                      displayStatus = 'Online / Available';
                      colorClass = 'bg-[rgba(52,199,89,0.15)] text-[#34c759] border-[rgba(52,199,89,0.3)]';
                    } else if (statusLower === 'on duty' || statusLower === 'responding') {
                      displayStatus = 'On Duty';
                      colorClass = 'bg-[rgba(10,132,255,0.15)] text-[#0a84ff] border-[rgba(10,132,255,0.3)]';
                    } else if (statusLower === 'offline') {
                      displayStatus = 'Offline';
                      colorClass = 'bg-gray-500/15 text-gray-400 border-gray-500/30';
                    }

                    return (
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${colorClass}`}>
                        {displayStatus}
                      </span>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
