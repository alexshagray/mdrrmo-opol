import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function ConsumptionReport({ activeSection }) {
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [consumptionStartDate, setConsumptionStartDate] = useState('');
  const [consumptionEndDate, setConsumptionEndDate] = useState('');
  const [consumptionSearch, setConsumptionSearch] = useState('');
  
  const [showConsumptionFilters, setShowConsumptionFilters] = useState(false);
  const [remarkSuggestions, setRemarkSuggestions] = useState([]);
  const [showRemarkSuggestions, setShowRemarkSuggestions] = useState(false);

  // Fetch unique remarks for suggestions
  const { data: suggestionData } = useQuery({
    queryKey: ['remarkSuggestions'],
    queryFn: async () => {
      const res = await fetch('/api/inventory/transactions?type=out&paginate=false');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 60000
  });

  useEffect(() => {
    if (suggestionData && consumptionSearch.length > 0) {
      const uniqueRemarks = [...new Set(suggestionData.map(t => t.remarks).filter(Boolean))];
      const matches = uniqueRemarks.filter(r => r.toLowerCase().includes(consumptionSearch.toLowerCase()));
      setRemarkSuggestions(matches.slice(0, 5));
    } else {
      setRemarkSuggestions([]);
    }
  }, [suggestionData, consumptionSearch]);

  const { data: txData, isLoading: loadingTx, refetch: refetchTransactions } = useQuery({
    queryKey: ['transactions', transactionsPage, consumptionStartDate, consumptionEndDate, consumptionSearch, activeSection],
    queryFn: async () => {
      let url = `/api/inventory/transactions?type=out&page=${transactionsPage}`;
      if (consumptionStartDate) url += `&start_date=${consumptionStartDate}`;
      if (consumptionEndDate) url += `&end_date=${consumptionEndDate}`;
      if (consumptionSearch) url += `&remarks=${encodeURIComponent(consumptionSearch)}`;
      if (activeSection === 'consumption_equipment') url += `&category=Equipment`;
      else if (activeSection === 'consumption_supplies') url += `&category=Medical Supplies`;
      const res = await fetch(url);
      return res.json();
    }
  });
  const transactions = txData?.data || [];

  const exportConsumptionToPDF = async () => {
    try {
      let url = '/api/inventory/transactions?type=out&paginate=false';
      if (consumptionStartDate) url += `&start_date=${consumptionStartDate}`;
      if (consumptionEndDate) url += `&end_date=${consumptionEndDate}`;
      if (consumptionSearch) url += `&remarks=${encodeURIComponent(consumptionSearch)}`;
      if (activeSection === 'consumption_equipment') url += `&category=Equipment`;
      else if (activeSection === 'consumption_supplies') url += `&category=Medical Supplies`;
      const res = await fetch(url);
      const data = await res.json();
      const allTx = data.data || [];

      if (allTx.length === 0) {
        alert('No consumption records to export for this filter.');
        return;
      }

      const element = document.createElement('div');
      element.style.padding = '40px';
      element.style.color = '#111';
      element.style.backgroundColor = '#ffffff';
      element.style.fontFamily = '"Plus Jakarta Sans", "Helvetica Neue", sans-serif';

      let tableRows = allTx.map(tx => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(tx.created_at).toLocaleDateString()}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${tx.item?.name || 'Unknown Item'}</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${tx.quantity} ${tx.item?.unit || 'pcs'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${tx.remarks || 'N/A'}</td>
        </tr>
      `).join('');

      element.innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid #0056b3; padding-bottom: 15px; margin-bottom: 25px;">
          <h2 style="margin: 0; font-size: 18px; color: #0056b3; font-weight: 800; text-transform: uppercase;">Municipal Disaster Risk Reduction & Management Office</h2>
          <h3 style="margin: 5px 0 0 0; font-size: 13px; color: #555; letter-spacing: 1px;">CONSUMPTION REPORT</h3>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #888;">Generated Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; color: #333;">Date</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; color: #333;">Item Name</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; color: #333;">Consumed Qty</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; color: #333;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div style="margin-top: 50px; display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 20px;">
          <div style="text-align: center; width: 200px;">
            <div style="border-bottom: 1px solid #333; margin-bottom: 5px; height: 30px;"></div>
            <p style="margin: 0; font-size: 11px; color: #555; font-weight: bold;">Prepared By</p>
            <p style="margin: 0; font-size: 10px; color: #888;">Staff 1 - Inventory Management</p>
          </div>
          <div style="text-align: center; width: 200px;">
            <div style="border-bottom: 1px solid #333; margin-bottom: 5px; height: 30px;"></div>
            <p style="margin: 0; font-size: 11px; color: #555; font-weight: bold;">Noted By</p>
            <p style="margin: 0; font-size: 10px; color: #888;">Head of Operations</p>
          </div>
        </div>
      `;

      const opt = {
        margin: 0.5,
        filename: `consumption_report_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      window.html2pdf().set(opt).from(element).outputPdf('blob').then(async function(pdfBlob) {
        try {
          let generatedBy = "Staff (Inventory)";
          const token = localStorage.getItem('staff1_token') || localStorage.getItem('admin_token');
          if (token) {
            const res = await fetch('/api/user', { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
            const userData = await res.json();
            if (userData && userData.first_name) {
              generatedBy = `${userData.first_name} ${userData.last_name}`.trim();
            }
          }
          
          const formData = new FormData();
          formData.append('file', pdfBlob, opt.filename);
          formData.append('type', 'inventory');
          formData.append('title', 'Consumption Report');
          formData.append('generated_by', generatedBy);

          await fetch('/api/reports/upload', {
            method: 'POST',
            body: formData
          });
        } catch (err) {
          console.warn('Failed to upload report to server:', err);
        }
        
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = opt.filename;
        a.click();
      });

    } catch (err) {
      console.error(err);
      alert('Error generating PDF');
    }
  };

  return (
    <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-6 shadow-xl flex flex-col h-full min-h-[500px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">{activeSection === 'consumption_equipment' ? 'Equipment ' : 'Supplies '}Consumption Report</h3>
          <p className="text-gray-400 text-sm">Track distributed and consumed inventory assets.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-[#181822] border border-[#2b2b35] hover:bg-[#2b2b35] text-white px-5 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg" onClick={() => setShowConsumptionFilters(true)}>
            <span>⚙️</span> Filters
            {(consumptionStartDate || consumptionEndDate || consumptionSearch) && (
              <span className="bg-[#0a84ff] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1 font-bold shadow-[0_0_10px_rgba(10,132,255,0.5)]">!</span>
            )}
          </button>
          <button className="bg-[#e11d48] border border-[#be123c] hover:bg-[#be123c] text-white px-6 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#e11d48]/20" onClick={exportConsumptionToPDF}>
            <span>📄</span> Generate PDF
          </button>
        </div>
      </div>

      {showConsumptionFilters && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181822] border border-[#2b2b35] rounded-xl p-8 w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowConsumptionFilters(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-lg" type="button">✕</button>
            <div className="flex items-center gap-3 mb-6 border-b border-[#2b2b35] pb-4">
              <span className="text-2xl">⚙️</span>
              <h4 className="text-white text-xl font-bold">Filter Records</h4>
            </div>
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Start Date</label>
                  <input type="date" value={consumptionStartDate} onChange={e => setConsumptionStartDate(e.target.value)} onClick={(e) => { try { e.target.showPicker() } catch (err) {} }} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-all shadow-inner [color-scheme:dark] cursor-pointer" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">End Date</label>
                  <input type="date" value={consumptionEndDate} onChange={e => setConsumptionEndDate(e.target.value)} onClick={(e) => { try { e.target.showPicker() } catch (err) {} }} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-all shadow-inner [color-scheme:dark] cursor-pointer" />
                </div>
              </div>
              <div className="flex flex-col gap-2 relative">
                <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Search Remarks</label>
                <input type="text" placeholder="e.g. Incident #123" value={consumptionSearch} onChange={e => { setConsumptionSearch(e.target.value); setShowRemarkSuggestions(true); }} onFocus={() => { if(remarkSuggestions.length > 0) setShowRemarkSuggestions(true); }} onBlur={() => setTimeout(() => setShowRemarkSuggestions(false), 200)} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-all shadow-inner" autoComplete="off" />
                
                {showRemarkSuggestions && remarkSuggestions.length > 0 && (
                  <ul className="absolute top-[100%] mt-1 left-0 right-0 bg-[#181822] border border-[#2b2b35] rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                    {remarkSuggestions.map((suggestion, idx) => (
                      <li key={idx} className="px-4 py-3 text-sm text-gray-300 hover:bg-[#2b2b35] hover:text-white cursor-pointer transition-colors" onClick={() => { setConsumptionSearch(suggestion); setShowRemarkSuggestions(false); }}>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[#2b2b35]">
              <button type="button" onClick={() => { setConsumptionStartDate(''); setConsumptionEndDate(''); setConsumptionSearch(''); }} className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] text-gray-300 px-5 py-2.5 rounded-lg font-bold transition-all text-sm">Clear Filters</button>
              <button type="button" onClick={() => setShowConsumptionFilters(false)} className="bg-[#0a84ff] hover:bg-[#0066cc] text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-[#0a84ff]/20 text-sm">Apply & Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#181822] border border-[#2b2b35] rounded-xl p-6 flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#111116]">
                <th className="p-3 text-gray-400 font-semibold text-xs border-b border-[#2b2b35] rounded-tl-lg">Date</th>
                <th className="p-3 text-gray-400 font-semibold text-xs border-b border-[#2b2b35]">Item</th>
                <th className="p-3 text-gray-400 font-semibold text-xs border-b border-[#2b2b35]">Consumed</th>
                <th className="p-3 text-gray-400 font-semibold text-xs border-b border-[#2b2b35] rounded-tr-lg">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loadingTx ? (
                <tr><td colSpan="4" className="p-4 text-center text-gray-400">Loading consumption records...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan="4" className="p-4 text-center text-gray-400">No consumption records found matching criteria.</td></tr>
              ) : transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="p-3 border-b border-[#1f1f26] text-gray-300 text-sm">{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td className="p-3 border-b border-[#1f1f26] text-white font-medium text-sm">{tx.item?.name || 'Unknown Item'}</td>
                  <td className="p-3 border-b border-[#1f1f26] text-[#ff453a] font-bold text-sm">-{tx.quantity} {tx.item?.unit || 'pcs'}</td>
                  <td className="p-3 border-b border-[#1f1f26] text-gray-400 text-xs">{tx.remarks || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {txData?.last_page > 1 && (
          <div className="flex justify-between items-center mt-4">
            <span className="text-gray-400 text-xs">Page {txData.current_page} of {txData.last_page}</span>
            <div className="flex gap-2">
              <button disabled={!txData.prev_page_url} onClick={() => setTransactionsPage(p => Math.max(1, p - 1))} className={`px-3 py-1 bg-[#0c0c10] border border-[#2b2b35] rounded text-white text-xs ${txData.prev_page_url ? 'hover:bg-[#1f1f26]' : 'opacity-50'}`}>Prev</button>
              <button disabled={!txData.next_page_url} onClick={() => setTransactionsPage(p => p + 1)} className={`px-3 py-1 bg-[#0c0c10] border border-[#2b2b35] rounded text-white text-xs ${txData.next_page_url ? 'hover:bg-[#1f1f26]' : 'opacity-50'}`}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
