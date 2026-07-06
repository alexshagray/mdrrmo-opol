import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

export default function InventoryManager({ activeSection }) {
  const [inventoryPage, setInventoryPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setInventoryPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);
  
  useEffect(() => {
    if (activeSection === 'inventory') setActiveCategory('All');
    if (activeSection === 'equipment') setActiveCategory('All');
    setSearchQuery('');
  }, [activeSection]);

  const [showForm, setShowForm] = useState(false);
  const [showStockIn, setShowStockIn] = useState(false);
  const [showDistribute, setShowDistribute] = useState(false);
  const [transactionData, setTransactionData] = useState({ id: null, quantity: 0, remarks: '', item: null });
  const [formData, setFormData] = useState({ id: null, name: '', item_condition: 'New', category: 'Medical Supplies', quantity: 0, unit: 'pcs', threshold: 10 });
  const [reportText, setReportText] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [addAnother, setAddAnother] = useState(false);
  const fileInputRef = React.useRef(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);

  const downloadCsvTemplate = () => {
    const defaultCat = activeSection === 'equipment' ? 'Equipment' : 'Medical Supplies';
    const headers = ['Name', 'Condition', 'Category', 'Quantity', 'Unit', 'Threshold'];
    const row = ['Example Item', 'New', defaultCat, '50', 'pcs', '10'];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + row.join(',');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingCsv(true);

    try {
      let csvBlob = file;

      // Automatically convert actual Excel files to CSV behind the scenes
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        let isClientFormat = false;
        let startRow = 4;
        
        // Smart detection for the client's specific DRRM equipment format
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const rowStr = JSON.stringify(jsonData[i] || []).toUpperCase();
          if (rowStr.includes('DESCRIPTION/IDENTIFICATION')) {
            isClientFormat = true;
            startRow = i + 2; // Data starts 2 rows down from this header
            break;
          }
        }

        if (isClientFormat) {
          let csvContent = 'Name,Condition,Category,Quantity,Unit,Threshold\n';
          
          for (let i = startRow; i < jsonData.length; i++) {
            const row = jsonData[i];
            // Stop if we hit empty rows or the footer
            if (!row || !row[1] || String(row[1]).includes('Prepared By:')) break;
            
            const name = String(row[1]).trim().replace(/"/g, '""');
            if (!name) continue;

            let qty = row[2];
            let unit = 'pcs';
            
            if (typeof qty === 'string') {
              const match = qty.match(/^(\d+)\s*(.*)$/);
              if (match) {
                  qty = parseInt(match[1]);
                  unit = match[2].trim() || 'pcs';
              } else {
                  qty = 0;
                  unit = 'pcs';
              }
            } else if (!qty) {
              qty = 0;
            }
            
            // Auto-categorize based on item name
            let category = 'Equipment';
            const lowerName = name.toLowerCase();
            if (lowerName.includes('vehicle') || lowerName.includes('ambulance') || lowerName.includes('motor cycle')) {
                category = 'Vehicles';
            } else if (lowerName.includes('gloves') || lowerName.includes('kit') || lowerName.includes('bandage') || lowerName.includes('splint') || lowerName.includes('oxygen')) {
                category = 'Medical Supplies';
            }

            csvContent += `"${name}",New,${category},${qty},${unit},5\n`;
          }
          csvBlob = new Blob([csvContent], { type: 'text/csv' });
        } else {
          // Fallback to standard CSV conversion for standard templates
          const csvString = XLSX.utils.sheet_to_csv(worksheet);
          csvBlob = new Blob([csvString], { type: 'text/csv' });
        }
      }

      const form = new FormData();
      form.append('csv_file', csvBlob, 'upload.csv');

      const res = await fetch('/api/inventory/bulk-upload', {
        method: 'POST',
        body: form
      });
      const result = await res.json();
      if (res.ok) {
        alert(result.message);
        fetchData();
      } else {
        const errorMsg = result.message || result.error || JSON.stringify(result.errors) || 'Failed to upload file';
        alert('Upload Error: ' + errorMsg);
      }
    } catch (err) {
      console.error(err);
      alert('Error parsing or uploading Excel file');
    }
    
    setUploadingCsv(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Consumption Report State
  const [transactionsPage, setTransactionsPage] = useState(1);
  const { data: txData, isLoading: loadingTx, refetch: refetchTransactions } = useQuery({
    queryKey: ['transactions', transactionsPage],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/transactions?type=out&page=${transactionsPage}`);
      return res.json();
    }
  });
  const transactions = txData?.data || [];
  
  const queryClient = useQueryClient();

  const { data: invData, isLoading: loadingInv, refetch: refetchInventory } = useQuery({
    queryKey: ['inventory', activeCategory, activeSection === 'equipment'],
    queryFn: async () => {
      const response = await fetch(`/api/inventory?category=${activeCategory}&is_equipment=${activeSection === 'equipment'}`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      return response.json();
    }
  });

  const inventory = invData?.data || [];
  const searchTerms = debouncedSearchQuery.toLowerCase().split(/\s+/).filter(Boolean);
  const filteredInventory = inventory.filter(item => {
    if (searchTerms.length === 0) return true;
    const itemName = item.name.toLowerCase();
    return searchTerms.every(term => itemName.includes(term));
  });
  const lowStockItems = filteredInventory.filter(i => i.status === 'Low Stock' || i.status === 'Depleted');

  useEffect(() => {
    if (activeSection === 'reports' && inventory.length > 0 && !reportText) {
      setReportText(`INVENTORY SUMMARY REPORT\nDate: ${new Date().toLocaleDateString()}\n\nTotal Items Tracked: ${inventory.length}\nItems at Low Stock: ${lowStockItems.length}\n\nRemarks/Details:\n[Enter your report details here...]`);
    }
  }, [activeSection, inventory.length, lowStockItems.length]);

  const handleSubmitReport = async () => {
    if (!reportText.trim()) return;
    setSubmittingReport(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          title: 'Inventory Report Submission',
          message: reportText,
          type: 'event_alert',
          target: 'admin'
        })
      });
      if (res.ok) {
        alert('Report submitted to Admin successfully!');
      } else {
        alert('Failed to submit report. Please try again.');
      }
    } catch (e) {
      alert('Error submitting report.');
    }
    setSubmittingReport(false);
  };

  const fetchData = () => {
    refetchInventory();
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const url = formData.id ? `/api/inventory/${formData.id}` : '/api/inventory';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        if (!addAnother) {
          setShowForm(false);
          setFormData({ id: null, name: '', item_condition: 'New', category: 'Medical Supplies', quantity: 0, unit: 'pcs', threshold: 10 });
        } else {
          setFormData({ ...formData, id: null, name: '', quantity: 0 });
        }
        fetchData();
      } else {
        alert('Failed to save item');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const editItem = (item) => {
    setFormData(item);
    setShowForm(true);
  };

  const handleStockIn = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/inventory/${transactionData.id}/stock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ quantity: parseInt(transactionData.quantity), remarks: transactionData.remarks })
      });
      if (res.ok) {
        setShowStockIn(false);
        setTransactionData({ id: null, quantity: 0, remarks: '', item: null });
        fetchData();
      } else {
        alert('Failed to add stock');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDistribute = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/inventory/${transactionData.id}/distribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ quantity: parseInt(transactionData.quantity), remarks: transactionData.remarks })
      });
      if (res.ok) {
        setShowDistribute(false);
        setTransactionData({ id: null, quantity: 0, remarks: '', item: null });
        fetchData();
        refetchTransactions();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to distribute stock');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportToCSV = () => {
    if (inventory.length === 0) return;
    const headers = ['ID', 'Item Name', 'Condition', 'Category', 'Quantity', 'Unit', 'Threshold', 'Status'];
    const rows = inventory.map(i => [i.id, `"${i.name}"`, i.item_condition, i.category, i.quantity, i.unit || 'pcs', i.threshold, i.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (inventory.length === 0) return;
    
    const element = document.createElement('div');
    element.style.padding = '40px';
    element.style.color = '#111';
    element.style.backgroundColor = '#ffffff';
    element.style.fontFamily = '"Plus Jakarta Sans", "Helvetica Neue", sans-serif';

    let tableRows = inventory.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.id}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${item.name}</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.category}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity} ${item.unit || 'pcs'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">
            <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; background-color: ${item.status === 'In Stock' ? '#d4edda' : (item.status === 'Low Stock' ? '#fef08a' : '#fecaca')}; color: ${item.status === 'In Stock' ? '#166534' : (item.status === 'Low Stock' ? '#9a3412' : '#991b1b')}; font-weight: bold;">
                ${item.status}
            </span>
        </td>
      </tr>
    `).join('');

    element.innerHTML = `
      <div style="text-align: center; border-bottom: 2px solid #0056b3; padding-bottom: 15px; margin-bottom: 25px;">
        <h2 style="margin: 0; font-size: 18px; color: #0056b3; font-weight: 800; text-transform: uppercase;">Municipal Disaster Risk Reduction & Management Office</h2>
        <h3 style="margin: 5px 0 0 0; font-size: 13px; color: #555; letter-spacing: 1px;">INVENTORY REPORT</h3>
        <p style="margin: 3px 0 0 0; font-size: 11px; color: #888;">Generated Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; color: #333;">ID</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; color: #333;">Item Name</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; color: #333;">Category</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; color: #333;">Qty</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; color: #333;">Status</th>
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
      filename: `inventory_report_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    window.html2pdf().set(opt).from(element).save();
  };

  if (loadingInv && inventory.length === 0) {
    return <div className="p-8 text-center text-gray-400">Loading inventory...</div>;
  }

  if (activeSection === 'alerts') {
    return (
      <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-2">Low Stock Alerts</h3>
        <p className="text-gray-400 text-sm mb-6">Items below minimum threshold requiring immediate restocking.</p>

        {lowStockItems.length === 0 ? (
          <div className="text-center p-10 bg-[rgba(52,199,89,0.05)] border border-dashed border-[rgba(52,199,89,0.3)] rounded-xl">
            <span className="text-4xl block mb-3">✅</span>
            <p className="text-[#34c759] font-medium m-0">All stock levels are adequate. No low stock alerts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {lowStockItems.map(item => (
              <div key={item.id} className={`border rounded-xl p-5 ${item.status === 'Depleted' ? 'bg-[rgba(255,69,58,0.05)] border-[rgba(255,69,58,0.2)]' : 'bg-[rgba(255,159,10,0.05)] border-[rgba(255,159,10,0.2)]'}`}>
                <div className="flex justify-between items-center mb-4">
                  <strong className="text-white text-base">{item.name}</strong>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${item.status === 'Depleted' ? 'bg-[rgba(255,69,58,0.15)] text-[#ff453a] border-[rgba(255,69,58,0.3)]' : 'bg-[rgba(255,159,10,0.15)] text-[#ff9f0a] border-[rgba(255,159,10,0.3)]'}`}>{item.status}</span>
                </div>
                <div className="space-y-1 mb-4">
                  <p className="text-gray-300 text-sm m-0">Current Quantity: <strong className={`text-lg ${item.status === 'Depleted' ? 'text-[#ff453a]' : 'text-[#ff9f0a]'}`}>{item.quantity}</strong></p>
                  <p className="text-gray-400 text-sm m-0">Minimum Threshold: {item.threshold}</p>
                  <p className="text-gray-400 text-sm m-0">Category: {item.category}</p>
                </div>
                <button 
                  className="w-full bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-gray-200 px-4 py-2 rounded-lg font-semibold transition-all text-sm" 
                  onClick={() => editItem(item)}
                >
                  Update Stock
                </button>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="bg-[#181822] border border-[#2b2b35] rounded-xl p-6 mt-6">
            <h4 className="text-white text-base font-semibold mb-5">Edit Item</h4>
            <form onSubmit={handleSaveItem}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="flex flex-col gap-2">
                  <label className="text-gray-400 text-xs font-medium">Item Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-400 text-xs font-medium">Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors">
                    {activeSection === 'equipment' ? (
                      <>
                        <option value="Equipment">Equipment</option>
                        <option value="Vehicles">Vehicles</option>
                      </>
                    ) : (
                      <>
                        <option value="Medical Supplies">Medical Supplies</option>
                        <option value="Office Supplies">Office Supplies</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                  </select>
                </div>
                {activeSection === 'equipment' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-gray-400 text-xs font-medium">Condition</label>
                    <select value={formData.item_condition} onChange={e => setFormData({ ...formData, item_condition: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors">
                      <option value="New">New</option>
                      <option value="Used">Used</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Expired">Expired</option>
                    </select>
                  </div>
                )}
                {!formData.id && (
                  <div className="flex flex-col gap-2">
                    <label className="text-gray-400 text-xs font-medium">Quantity</label>
                    <div className="flex gap-2">
                      <input type="number" required min="0" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })} className="w-2/3 p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" />
                      <select value={formData.unit || 'pcs'} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-1/3 p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors">
                        <option value="pcs">pcs</option>
                        <option value="boxes">boxes</option>
                        <option value="bottles">bottles</option>
                        <option value="packs">packs</option>
                        <option value="rolls">rolls</option>
                        <option value="units">units</option>
                      </select>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="text-gray-400 text-xs font-medium">Low Stock Threshold</label>
                  <input type="number" required min="0" value={formData.threshold} onChange={e => setFormData({ ...formData, threshold: parseInt(e.target.value) || 0 })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="bg-[#0a84ff] hover:bg-[#0066cc] text-white px-5 py-2.5 rounded-lg font-semibold transition-all text-sm">Save Item</button>
                <button type="button" className="bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-gray-200 px-5 py-2.5 rounded-lg font-semibold transition-all text-sm" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  if (activeSection === 'reports') {
    return (
      <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-2">Inventory Reports</h3>
        <p className="text-gray-400 text-sm mb-6">Generate and download comprehensive reports for assets and supplies.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#181822] border border-[#2b2b35] rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <span className="text-4xl mb-4">📊</span>
            <h4 className="text-white font-bold text-lg mb-2">Detailed CSV Report</h4>
            <p className="text-gray-400 text-xs mb-6">Spreadsheet format containing all inventory records, categories, and stock levels.</p>
            <button className="bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-white px-6 py-3 rounded-lg font-bold transition-all w-full max-w-[200px]" onClick={exportToCSV}>
              Download CSV
            </button>
          </div>
          <div className="bg-[#181822] border border-[#2b2b35] rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <span className="text-4xl mb-4">📄</span>
            <h4 className="text-white font-bold text-lg mb-2">Printable PDF Report</h4>
            <p className="text-gray-400 text-xs mb-6">Formatted document containing summary metrics and complete item list.</p>
            <button className="bg-[#e11d48] border border-[#be123c] hover:bg-[#be123c] text-white px-6 py-3 rounded-lg font-bold transition-all w-full max-w-[200px]" onClick={exportToPDF}>
              Download PDF
            </button>
          </div>
        </div>
        
        <div className="bg-[#181822] border border-[#2b2b35] rounded-xl p-6 mb-8">
           <h4 className="text-white font-bold text-md mb-4 border-b border-[#2b2b35] pb-2">Quick Summary</h4>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#111116] p-4 rounded-lg border border-[#1f1f26]">
                 <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Items</span>
                 <p className="text-white text-2xl font-black mt-1">{inventory.length}</p>
              </div>
              <div className="bg-[#111116] p-4 rounded-lg border border-[#1f1f26]">
                 <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Low Stock</span>
                 <p className="text-[#ff9f0a] text-2xl font-black mt-1">{lowStockItems.length}</p>
              </div>
           </div>
        </div>

        <div className="bg-[#181822] border border-[#2b2b35] rounded-xl p-6 mb-8">
          <h4 className="text-white font-bold text-md mb-4">Recent Consumption</h4>
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
                  <tr><td colSpan="4" className="p-4 text-center text-gray-400">No consumption records found.</td></tr>
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

        <div className="bg-[#181822] border border-[#2b2b35] rounded-xl p-6">
          <h4 className="text-white font-bold text-md mb-4 flex items-center justify-between">
            <span>Submit Editable Report to Admin</span>
            <span className="text-xs font-normal text-gray-500 bg-[#111116] px-2 py-1 rounded">Edit below before submitting</span>
          </h4>
          <textarea 
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            className="w-full h-48 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm p-4 mb-4 focus:border-[#0a84ff] focus:outline-none transition-colors"
            placeholder="Type your inventory report..."
          />
          <div className="flex justify-end">
            <button 
              onClick={handleSubmitReport}
              disabled={submittingReport || !reportText.trim()}
              className="bg-[#0a84ff] hover:bg-[#0066cc] disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg shadow-[#0a84ff]/20 flex items-center gap-2"
            >
              {submittingReport ? 'Submitting...' : 'Submit to Admin'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white m-0">{activeSection === 'equipment' ? 'Equipment & Vehicles' : 'Consumable Supplies'}</h3>
        <div className="flex gap-4 items-center">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#181822] border border-[#2b2b35] rounded-lg text-white text-sm py-2 pl-9 pr-4 focus:border-[#0a84ff] focus:outline-none transition-colors w-64 shadow-inner"
            />
          </div>
          <div className="flex gap-2">
            <button className="bg-[#0a84ff] hover:bg-[#0066cc] text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm shadow-lg shadow-[#0a84ff]/20 flex items-center gap-2 cursor-pointer" onClick={() => { setFormData({ id: null, name: '', item_condition: 'New', category: activeSection === 'equipment' ? 'Equipment' : 'Medical Supplies', quantity: 0, unit: 'pcs', threshold: 10 }); setShowForm(true); }}>
              ➕ Add New Item
            </button>
          </div>
        </div>
      </div>
      


      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181822] border border-[#2b2b35] rounded-xl p-8 w-full max-w-2xl shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-lg" type="button">✕</button>
            <h4 className="text-white text-xl font-bold mb-6">{formData.id ? 'Edit Item' : 'Add New Item'}</h4>
            <form onSubmit={handleSaveItem}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs font-medium">Item Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs font-medium">Category</label>
                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors">
                  {activeSection === 'equipment' ? (
                    <>
                      <option value="Equipment">Equipment</option>
                      <option value="Vehicles">Vehicles</option>
                    </>
                  ) : (
                    <>
                      <option value="Medical Supplies">Medical Supplies</option>
                      <option value="Office Supplies">Office Supplies</option>
                      <option value="Other">Other</option>
                    </>
                  )}
                </select>
              </div>
              {activeSection === 'equipment' && (
                <div className="flex flex-col gap-2">
                  <label className="text-gray-400 text-xs font-medium">Condition</label>
                  <select value={formData.item_condition} onChange={e => setFormData({ ...formData, item_condition: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors">
                    <option value="New">New</option>
                    <option value="Used">Used</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs font-medium">Quantity</label>
                <input type="number" required min="0" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value === '' ? '' : parseInt(e.target.value) })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs font-medium">Unit</label>
                <input type="text" required list="unit-options" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" placeholder="e.g. pcs, boxes, packs" />
                <datalist id="unit-options">
                  <option value="pcs" />
                  <option value="packs" />
                  <option value="boxes" />
                  <option value="bottles" />
                  <option value="rolls" />
                  <option value="units" />
                  <option value="sets" />
                  <option value="gallons" />
                  <option value="liters" />
                </datalist>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs font-medium">Low Stock Threshold</label>
                <input type="number" required min="0" value={formData.threshold} onChange={e => setFormData({ ...formData, threshold: e.target.value === '' ? '' : parseInt(e.target.value) })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" />
              </div>
            </div>
              <div className="flex justify-between items-center mt-6">
                <div className="flex gap-3">
                  {formData.id ? (
                    <button type="submit" onClick={() => setAddAnother(false)} className="bg-[#0a84ff] hover:bg-[#0066cc] text-white px-6 py-2.5 rounded-lg font-semibold transition-all text-sm shadow-lg shadow-[#0a84ff]/20 cursor-pointer">Update Item</button>
                  ) : (
                    <button type="submit" onClick={() => setAddAnother(true)} className="bg-[#34c759] hover:bg-[#28a745] text-white px-6 py-2.5 rounded-lg font-semibold transition-all text-sm shadow-lg shadow-[#34c759]/20 cursor-pointer">Save & Add Another</button>
                  )}
                  <button type="button" className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] text-gray-200 px-6 py-2.5 rounded-lg font-semibold transition-all text-sm cursor-pointer" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStockIn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181822] border border-[#2b2b35] rounded-xl p-8 w-full max-w-xl shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowStockIn(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-lg" type="button">✕</button>
            <h4 className="text-white text-xl font-bold mb-6">Add Stock: <span className="text-[#0a84ff]">{transactionData.item?.name}</span></h4>
            <form onSubmit={handleStockIn}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs font-medium">Quantity to Add</label>
                <input type="number" required min="1" value={transactionData.quantity} onChange={e => setTransactionData({ ...transactionData, quantity: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs font-medium">Remarks (Optional)</label>
                <input type="text" value={transactionData.remarks} onChange={e => setTransactionData({ ...transactionData, remarks: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" placeholder="e.g. New delivery from supplier" />
              </div>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button type="button" className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] text-gray-200 px-6 py-2.5 rounded-lg font-semibold transition-all text-sm" onClick={() => setShowStockIn(false)}>Cancel</button>
                <button type="submit" className="bg-[#34c759] hover:bg-[#28a745] text-white px-6 py-2.5 rounded-lg font-semibold transition-all text-sm shadow-lg shadow-[#34c759]/20">Add Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDistribute && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181822] border border-[#2b2b35] rounded-xl p-8 w-full max-w-xl shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowDistribute(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-lg" type="button">✕</button>
            <h4 className="text-white text-xl font-bold mb-6">{activeSection === 'equipment' ? 'Remove Unusable Item' : 'Distribute Stock'}: <span className="text-[#ff9f0a]">{transactionData.item?.name}</span></h4>
            <form onSubmit={handleDistribute}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs font-medium">{activeSection === 'equipment' ? 'Quantity to Remove' : 'Quantity to Distribute'}</label>
                <input type="number" required min="1" max={transactionData.item?.quantity} value={transactionData.quantity} onChange={e => setTransactionData({ ...transactionData, quantity: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" />
                <span className="text-[#ff9f0a] text-xs">Available: {transactionData.item?.quantity} {transactionData.item?.unit || 'pcs'}</span>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs font-medium">Remarks / Destination</label>
                <input type="text" required value={transactionData.remarks} onChange={e => setTransactionData({ ...transactionData, remarks: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" placeholder={activeSection === 'equipment' ? 'e.g. Damaged beyond repair' : 'e.g. Dispatched to Incident #123'} />
              </div>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button type="button" className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] text-gray-200 px-6 py-2.5 rounded-lg font-semibold transition-all text-sm" onClick={() => setShowDistribute(false)}>Cancel</button>
                <button type="submit" className="bg-[#ff9f0a] hover:bg-[#e08e09] text-white px-6 py-2.5 rounded-lg font-semibold transition-all text-sm shadow-lg shadow-[#ff9f0a]/20">{activeSection === 'equipment' ? 'Confirm Removal' : 'Confirm Distribution'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#181822]">
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35] rounded-tl-lg">ID</th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Item Name</th>
              {activeSection === 'equipment' && (
                <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Condition</th>
              )}
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">
                <select 
                  value={activeCategory} 
                  onChange={(e) => { setActiveCategory(e.target.value); setInventoryPage(1); }}
                  className="bg-transparent text-[#0a84ff] font-bold outline-none cursor-pointer border-none p-0 focus:ring-0"
                >
                  {['All', ...(activeSection === 'equipment' ? ['Equipment', 'Vehicles'] : ['Medical Supplies', 'Office Supplies', 'Other'])].map(cat => (
                    <option key={cat} value={cat} className="bg-[#181822] text-white">{cat === 'All' ? 'All Categories' : cat}</option>
                  ))}
                </select>
              </th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Quantity</th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Unit</th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Threshold</th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Status</th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35] rounded-tr-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.length === 0 ? (
              <tr><td colSpan={activeSection === 'equipment' ? "9" : "8"} className="p-4 text-center text-gray-400 border-b border-[#1f1f26]">No inventory items found.</td></tr>
            ) : filteredInventory.map(item => (
              <tr key={item.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                <td className="p-4 border-b border-[#1f1f26] text-gray-300 text-sm">{item.id}</td>
                <td className="p-4 border-b border-[#1f1f26] text-white font-medium text-sm">{item.name}</td>
                {activeSection === 'equipment' && (
                  <td className="p-4 border-b border-[#1f1f26]">
                    <span className="bg-[rgba(255,255,255,0.1)] text-gray-300 px-2.5 py-1 rounded-md text-xs font-semibold">{item.item_condition}</span>
                  </td>
                )}
                <td className="p-4 border-b border-[#1f1f26]">
                  <span className="bg-[#181822] border border-[#2b2b35] text-gray-400 px-2.5 py-1 rounded-md text-xs font-semibold">{item.category}</span>
                </td>
                <td className="p-4 border-b border-[#1f1f26] text-white font-bold text-base">{item.quantity}</td>
                <td className="p-4 border-b border-[#1f1f26] text-gray-300 text-sm">{item.unit || 'pcs'}</td>
                <td className="p-4 border-b border-[#1f1f26] text-gray-400 text-sm">{item.threshold}</td>
                <td className="p-4 border-b border-[#1f1f26]">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${item.status === 'Available' ? 'bg-[rgba(52,199,89,0.15)] text-[#34c759] border-[rgba(52,199,89,0.3)]' : item.status === 'Low Stock' ? 'bg-[rgba(255,159,10,0.15)] text-[#ff9f0a] border-[rgba(255,159,10,0.3)]' : 'bg-[rgba(255,69,58,0.15)] text-[#ff453a] border-[rgba(255,69,58,0.3)]'}`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-4 border-b border-[#1f1f26]">
                  <div className="flex gap-2">
                    <button className="bg-[rgba(10,132,255,0.1)] text-[#0a84ff] border border-[rgba(10,132,255,0.2)] hover:bg-[rgba(10,132,255,0.2)] px-2 py-1 rounded text-xs font-semibold transition-colors" title="Add Stock" onClick={() => { setTransactionData({ id: item.id, quantity: 1, remarks: '', item: item }); setShowStockIn(true); setShowForm(false); setShowDistribute(false); }}>+ In</button>
                    <button className="bg-[rgba(255,159,10,0.1)] text-[#ff9f0a] border border-[rgba(255,159,10,0.2)] hover:bg-[rgba(255,159,10,0.2)] px-2 py-1 rounded text-xs font-semibold transition-colors" title={activeSection === 'equipment' ? 'Remove' : 'Distribute'} onClick={() => { setTransactionData({ id: item.id, quantity: 1, remarks: '', item: item }); setShowDistribute(true); setShowForm(false); setShowStockIn(false); }} disabled={item.quantity === 0}>- Out</button>
                    <button className="bg-transparent border-none text-base opacity-70 hover:opacity-100 hover:scale-110 transition-all cursor-pointer ml-1" onClick={() => { editItem(item); setShowStockIn(false); setShowDistribute(false); }} title="Edit Details">✏️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {invData?.last_page > 1 && (
        <div className="flex justify-between items-center mt-4 p-4 bg-[#181822] border border-[#2b2b35] rounded-xl">
          <span className="text-gray-400 text-xs font-medium">
            Showing page {invData.current_page} of {invData.last_page}
          </span>
          <div className="flex gap-2">
            <button 
              disabled={!invData.prev_page_url}
              onClick={() => setInventoryPage(p => Math.max(1, p - 1))}
              className={`px-4 py-2 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-xs font-semibold ${invData.prev_page_url ? 'hover:bg-[#1f1f26] cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
            >
              Previous
            </button>
            <button 
              disabled={!invData.next_page_url}
              onClick={() => setInventoryPage(p => p + 1)}
              className={`px-4 py-2 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-xs font-semibold ${invData.next_page_url ? 'hover:bg-[#1f1f26] cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
