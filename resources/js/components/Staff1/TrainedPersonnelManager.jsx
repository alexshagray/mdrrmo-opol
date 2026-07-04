import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';

const OPOL_BARANGAYS = [
  "AWANG", "BAGOCBOC", "BARRA", "BONBON", "CAUYONAN", "IGPIT", "LIMONDA", 
  "LUYONG BONBON", "MALANANG", "NANGCAON", "PATAG", "POBLACION", 
  "TABOC", "TINGALAN"
];

export default function TrainedPersonnelManager() {
  const [tpPage, setTpPage] = useState(1);
  const [showPersonnelForm, setShowPersonnelForm] = useState(false);
  const [personnelFormData, setPersonnelFormData] = useState({ id: null, name: '', age: '', sex: 'MALE', zone: '', barangay: '' });
  const [selectedBarangay, setSelectedBarangay] = useState('All');

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setTpPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const queryClient = useQueryClient();

  const { data: tpData, isLoading } = useQuery({
    queryKey: ['trainedPersonnel', tpPage, selectedBarangay, debouncedSearchQuery],
    queryFn: async () => {
      let url = `/api/trained_personnels?page=${tpPage}`;
      if (selectedBarangay !== 'All') url += `&barangay=${encodeURIComponent(selectedBarangay)}`;
      if (debouncedSearchQuery) url += `&search=${encodeURIComponent(debouncedSearchQuery)}`;
      const res = await fetch(url);
      return res.json();
    },
    placeholderData: keepPreviousData
  });

  const trainedPersonnel = tpData?.data || [];

  const fetchData = () => {
    queryClient.invalidateQueries({ queryKey: ['trainedPersonnel'] });
  };

  const handleSavePersonnel = async (e) => {
    e.preventDefault();
    try {
      const method = personnelFormData.id ? 'PUT' : 'POST';
      const url = personnelFormData.id ? `/api/trained_personnels/${personnelFormData.id}` : '/api/trained_personnels';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(personnelFormData)
      });

      if (res.ok) {
        setShowPersonnelForm(false);
        setPersonnelFormData({ id: null, name: '', age: '', sex: 'MALE', zone: '', barangay: '' });
        fetchData();
      } else {
        alert('Failed to save trained personnel');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving trained personnel');
    }
  };

  const handleDeletePersonnel = async (id) => {
    if (!confirm('Are you sure you want to delete this personnel record?')) return;
    try {
      const res = await fetch(`/api/trained_personnels/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
  };

  const editPersonnel = (item) => {
    setPersonnelFormData(item);
    setShowPersonnelForm(true);
  };

  if (isLoading && trainedPersonnel.length === 0) {
    return <div className="p-8 text-center text-gray-400">Loading personnel data...</div>;
  }

  return (
    <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white m-0">Barangay Emergency Response Training 2025</h3>
        <div className="flex items-center gap-3">
          <input 
            type="text" 
            placeholder="Search name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#0c0c10] border border-[#2b2b35] px-3 py-1.5 rounded-lg text-sm text-white focus:outline-none focus:border-[#0a84ff]"
          />
          <span className="bg-[rgba(10,132,255,0.15)] text-[#0a84ff] border border-[rgba(10,132,255,0.3)] px-3 py-1.5 rounded-lg text-sm font-bold">
            {tpData?.total || 0} Personnel Trained
          </span>
          <button 
            className="bg-[#0a84ff] hover:bg-[#0066cc] text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm" 
            onClick={() => { setPersonnelFormData({ id: null, name: '', age: '', sex: 'MALE', zone: '', barangay: '' }); setShowPersonnelForm(true); }}
          >
            + Add Personnel
          </button>
        </div>
      </div>

      {showPersonnelForm && (
        <div className="bg-[#181822] border border-[#2b2b35] rounded-xl p-6 mb-6">
          <h4 className="text-white text-base font-semibold mb-5">{personnelFormData.id ? 'Edit Personnel' : 'Add New Personnel'}</h4>
          <form onSubmit={handleSavePersonnel}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
              <div className="flex flex-col gap-2 col-span-1 md:col-span-2 lg:col-span-1">
                <label className="text-gray-400 text-xs font-medium">Complete Name</label>
                <input type="text" required value={personnelFormData.name} onChange={e => setPersonnelFormData({ ...personnelFormData, name: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs font-medium">Age</label>
                <input type="number" min="0" value={personnelFormData.age || ''} onChange={e => setPersonnelFormData({ ...personnelFormData, age: e.target.value ? parseInt(e.target.value) : '' })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs font-medium">Sex</label>
                <select value={personnelFormData.sex} onChange={e => setPersonnelFormData({ ...personnelFormData, sex: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors">
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs font-medium">Zone</label>
                <input type="text" value={personnelFormData.zone || ''} onChange={e => setPersonnelFormData({ ...personnelFormData, zone: e.target.value })} placeholder="e.g. Z-2" className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs font-medium">Barangay</label>
                <input type="text" required value={personnelFormData.barangay} onChange={e => setPersonnelFormData({ ...personnelFormData, barangay: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-[#0a84ff] hover:bg-[#0066cc] text-white px-5 py-2.5 rounded-lg font-semibold transition-all text-sm">Save</button>
              <button type="button" className="bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-gray-200 px-5 py-2.5 rounded-lg font-semibold transition-all text-sm" onClick={() => setShowPersonnelForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
        <table className="w-full text-left border-collapse relative">
          <thead className="sticky top-0 bg-[#181822] shadow-[0_4px_10px_rgba(0,0,0,0.5)] z-10">
            <tr>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35] rounded-tl-lg">ID</th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Complete Name</th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Age</th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Sex</th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Zone</th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">
                <select 
                  value={selectedBarangay} 
                  onChange={e => { setSelectedBarangay(e.target.value); setTpPage(1); }}
                  className="bg-transparent text-[#0a84ff] font-bold outline-none cursor-pointer border-none p-0 focus:ring-0 text-sm"
                >
                  <option value="All" className="bg-[#181822] text-white">All Barangays</option>
                  {OPOL_BARANGAYS.map(b => (
                    <option key={b} value={b} className="bg-[#181822] text-white">{b}</option>
                  ))}
                </select>
              </th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35] rounded-tr-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trainedPersonnel.length === 0 ? (
              <tr><td colSpan="7" className="p-4 text-center text-gray-400 border-b border-[#1f1f26]">No trained personnel found for this barangay.</td></tr>
            ) : trainedPersonnel.map((person) => (
              <tr key={person.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                <td className="p-4 border-b border-[#1f1f26] text-gray-300 text-sm">{person.id}</td>
                <td className="p-4 border-b border-[#1f1f26] text-white font-medium text-sm">{person.name}</td>
                <td className="p-4 border-b border-[#1f1f26] text-gray-300 text-sm">{person.age || 'N/A'}</td>
                <td className="p-4 border-b border-[#1f1f26] text-gray-300 text-sm">{person.sex}</td>
                <td className="p-4 border-b border-[#1f1f26] text-gray-300 text-sm">{person.zone || '-'}</td>
                <td className="p-4 border-b border-[#1f1f26]">
                  <span className="bg-[#181822] border border-[#2b2b35] text-gray-400 px-2.5 py-1 rounded-md text-xs font-semibold">{person.barangay}</span>
                </td>
                <td className="p-4 border-b border-[#1f1f26]">
                  <button className="bg-transparent border-none text-base opacity-70 hover:opacity-100 hover:scale-110 transition-all cursor-pointer mr-3" onClick={() => editPersonnel(person)}>✏️</button>
                  <button className="bg-transparent border-none text-base opacity-70 hover:opacity-100 hover:scale-110 transition-all cursor-pointer" onClick={() => handleDeletePersonnel(person.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tpData?.last_page > 1 && (
        <div className="flex justify-between items-center mt-4 p-4 bg-[#181822] border border-[#2b2b35] rounded-xl">
          <span className="text-gray-400 text-xs font-medium">
            Showing page {tpData.current_page} of {tpData.last_page}
          </span>
          <div className="flex gap-2">
            <button 
              disabled={!tpData.prev_page_url}
              onClick={() => setTpPage(p => Math.max(1, p - 1))}
              className={`px-4 py-2 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-xs font-semibold ${tpData.prev_page_url ? 'hover:bg-[#1f1f26] cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
            >
              Previous
            </button>
            <button 
              disabled={!tpData.next_page_url}
              onClick={() => setTpPage(p => p + 1)}
              className={`px-4 py-2 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-xs font-semibold ${tpData.next_page_url ? 'hover:bg-[#1f1f26] cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
