import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Equipment() {
  const activeSection = 'equipment';
  const [inventoryPage, setInventoryPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeStatusFilter, setActiveStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [debouncedArchiveSearch, setDebouncedArchiveSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setInventoryPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedArchiveSearch(archiveSearchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [archiveSearchQuery]);
  
  useEffect(() => {
    setActiveCategory('All');
    setSearchQuery('');
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [showStockIn, setShowStockIn] = useState(false);
  const [showDistribute, setShowDistribute] = useState(false);
  const [transactionData, setTransactionData] = useState({ id: null, quantity: 0, remarks: '', item: null });
  const [formData, setFormData] = useState({ id: null, name: '', category: 'Equipment', quantity: 0, unit: 'pcs', restock_level: 10 });
  const [addAnother, setAddAnother] = useState(false);
  const fileInputRef = React.useRef(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, itemId: null, title: '', message: '', confirmText: '' });

  const downloadPDF = async () => {
    try {
      const res = await fetch(`/api/inventory?is_equipment=true&category=${activeCategory}&status=${activeStatusFilter}&search=${encodeURIComponent(debouncedSearchQuery)}&paginate=false`);
      const data = await res.json();
      const exportInventory = data.data || [];

      if (exportInventory.length === 0) return;
      
      const element = document.createElement('div');
      element.style.padding = '40px';
      element.style.color = '#111';
      element.style.backgroundColor = '#ffffff';
      element.style.fontFamily = '"Plus Jakarta Sans", "Helvetica Neue", sans-serif';

      const title = 'Equipment & Vehicles Report';
      const filterText = `Category: ${activeCategory === 'All' ? 'All' : activeCategory} | Status: ${activeStatusFilter === 'All' ? 'All' : activeStatusFilter}`;

    let tableRows = exportInventory.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.id}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${item.name}</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.category}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity} ${item.unit || 'pcs'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">
            <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; background-color: ${item.status === 'Available' ? '#d4edda' : (item.status === 'Low Stock' ? '#fef08a' : '#fecaca')}; color: ${item.status === 'Available' ? '#166534' : (item.status === 'Low Stock' ? '#9a3412' : '#991b1b')}; font-weight: bold;">
                ${item.status}
            </span>
        </td>
      </tr>
    `).join('');

    element.innerHTML = `
      <div style="text-align: center; border-bottom: 2px solid #0056b3; padding-bottom: 15px; margin-bottom: 25px;">
        <h2 style="margin: 0; font-size: 18px; color: #0056b3; font-weight: 800; text-transform: uppercase;">Municipal Disaster Risk Reduction & Management Office</h2>
        <h3 style="margin: 5px 0 0 0; font-size: 13px; color: #555; letter-spacing: 1px;">${title}</h3>
        <p style="margin: 3px 0 0 0; font-size: 11px; color: #888;">Filters: ${filterText}</p>
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
      filename: `inventory_filtered_${new Date().toISOString().split('T')[0]}.pdf`,
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
        formData.append('title', 'Equipment Report');
        formData.append('generated_by', generatedBy);

        await fetch('/api/reports/upload', {
          method: 'POST',
          body: formData
        });
      } catch (err) {
        console.warn('Failed to upload report to server:', err);
      }
      
      // Also save to user's computer
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

  const downloadCsvTemplate = () => {
    const defaultCat = activeSection === 'equipment' ? 'Equipment' : 'Medical Supplies';
    const headers = ['Name', 'Category', 'Quantity', 'Unit', 'Restock Level'];
    const row = ['Example Item', defaultCat, '50', 'pcs', '10'];
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
          let csvContent = 'Name,Category,Quantity,Unit,Restock Level\n';
          
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

            csvContent += `"${name}",${category},${qty},${unit},5\n`;
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

  const queryClient = useQueryClient();

  const { data: invData, isLoading: loadingInv, refetch: refetchInventory } = useQuery({
    queryKey: ['inventory', activeCategory, inventoryPage, debouncedSearchQuery, activeStatusFilter],
    queryFn: async () => {
      const response = await fetch(`/api/inventory?is_equipment=true&page=${inventoryPage}&category=${activeCategory}&status=${activeStatusFilter}&search=${encodeURIComponent(debouncedSearchQuery)}`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      return response.json();
    }
  });

  const { data: archivedItemsData, isLoading: loadingArchived } = useQuery({
    queryKey: ['archivedInventory'],
    queryFn: async () => {
      const response = await fetch('/api/inventory?archived=1');
      if (!response.ok) throw new Error('Failed to fetch archived inventory');
      return response.json();
    },
    enabled: showArchiveModal,
  });
  
  const archivedItems = archivedItemsData?.data || [];
  const filteredArchivedItems = archivedItems.filter(item => {
    if (!debouncedArchiveSearch) return true;
    const term = debouncedArchiveSearch.toLowerCase();
    return item.name.toLowerCase().includes(term) || item.category.toLowerCase().includes(term);
  });

  const inventory = invData?.data || [];

  const fetchData = () => {
    refetchInventory();
  };

  const handleArchiveItem = async (id) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      } else {
        alert('Failed to archive item.');
      }
    } catch (e) {
      console.error(e);
      alert('Error archiving item.');
    }
  };

  const handleRestoreItem = async (id) => {
    try {
      const res = await fetch(`/api/inventory/${id}/restore`, { method: 'POST' });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['archivedInventory'] });
      } else {
        alert('Failed to restore item.');
      }
    } catch (e) {
      console.error(e);
      alert('Error restoring item.');
    }
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
          setFormData({ id: null, name: '', category: 'Medical Supplies', quantity: 0, unit: 'pcs', restock_level: 10 });
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
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to distribute stock');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white m-0">
            {activeSection === 'equipment' ? 'Equipment & Vehicles' : activeSection === 'alerts' ? 'Inventory Alerts' : 'Consumable Supplies'}
          </h3>
        <div className="flex gap-4 items-center">
          <button 
            onClick={downloadPDF}
            className="px-4 py-2 rounded-lg font-semibold transition-all text-sm border flex items-center gap-2 cursor-pointer bg-transparent text-[#0a84ff] border-[#0a84ff] hover:bg-[rgba(10,132,255,0.1)] shadow-lg shadow-[#0a84ff]/10"
            title="Print currently filtered inventory"
          >
            🖨️ Print PDF
          </button>
          <button 
            onClick={() => setShowArchiveModal(true)}
            className="mr-2 px-4 py-2 rounded-lg font-semibold transition-all text-sm border flex items-center gap-2 cursor-pointer bg-transparent text-[#ff9f0a] border-[#ff9f0a] hover:bg-[rgba(255,159,10,0.1)]"
          >
            📦 Archive List
          </button>
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
            <button className="bg-[#0a84ff] hover:bg-[#0066cc] text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm shadow-lg shadow-[#0a84ff]/20 flex items-center gap-2 cursor-pointer" onClick={() => { setFormData({ id: null, name: '', category: activeSection === 'equipment' ? 'Equipment' : 'Medical Supplies', quantity: 0, unit: 'pcs', restock_level: 10 }); setShowForm(true); }}>
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
                <input type="number" required min="0" value={formData.restock_level} onChange={e => setFormData({ ...formData, restock_level: e.target.value === '' ? '' : parseInt(e.target.value) })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" />
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

      <div className="w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#181822]">
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35] rounded-tl-lg">ID</th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Item Name</th>
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
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Restock Level</th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">
                <select 
                  value={activeStatusFilter} 
                  onChange={(e) => { setActiveStatusFilter(e.target.value); setInventoryPage(1); }}
                  className="bg-transparent text-[#0a84ff] font-bold outline-none cursor-pointer border-none p-0 focus:ring-0"
                >
                  <option value="All" className="bg-[#181822] text-white">Status</option>
                  <option value="Available" className="bg-[#181822] text-[#34c759]">Available</option>
                  <option value="Low Stock" className="bg-[#181822] text-[#ff9f0a]">Low Stock</option>
                  <option value="Unavailable" className="bg-[#181822] text-[#ff453a]">Unavailable</option>
                </select>
              </th>
              <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35] rounded-tr-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingInv ? (
              <tr><td colSpan="9" className="p-4 text-center text-gray-400 border-b border-[#1f1f26]">Loading...</td></tr>
            ) : inventory.length === 0 ? (
              <tr><td colSpan="9" className="p-4 text-center text-gray-400 border-b border-[#1f1f26]">No inventory items found.</td></tr>
            ) : inventory.map(item => (
              <tr key={item.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                <td className="p-4 border-b border-[#1f1f26] text-gray-300 text-sm">{item.id}</td>
                <td className="p-4 border-b border-[#1f1f26] text-white font-medium text-sm">{item.name}</td>
                <td className="p-4 border-b border-[#1f1f26]">
                  <span className="bg-[#181822] border border-[#2b2b35] text-gray-400 px-2.5 py-1 rounded-md text-xs font-semibold">{item.category}</span>
                </td>
                <td className="p-4 border-b border-[#1f1f26] text-white font-bold text-base">{item.quantity}</td>
                <td className="p-4 border-b border-[#1f1f26] text-gray-300 text-sm">{item.unit || 'pcs'}</td>
                <td className="p-4 border-b border-[#1f1f26] text-gray-400 text-sm">{item.restock_level}</td>
                <td className="p-4 border-b border-[#1f1f26]">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${item.status === 'Available' ? 'bg-[rgba(52,199,89,0.15)] text-[#34c759] border-[rgba(52,199,89,0.3)]' : item.status === 'Low Stock' ? 'bg-[rgba(255,159,10,0.15)] text-[#ff9f0a] border-[rgba(255,159,10,0.3)]' : 'bg-[rgba(255,69,58,0.15)] text-[#ff453a] border-[rgba(255,69,58,0.3)]'}`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-4 border-b border-[#1f1f26]">
                  <div className="relative">
                    <button 
                      onClick={() => setActiveDropdown(activeDropdown === item.id ? null : item.id)}
                      className="bg-[#181822] text-gray-400 border border-[#2b2b35] hover:bg-[#1f1f26] hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      Actions <span>▼</span>
                    </button>
                    
                    {activeDropdown === item.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                        <div className="absolute right-0 mt-2 w-36 bg-[#181822] border border-[#2b2b35] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col py-1">
                          <button 
                            className="text-left px-4 py-2.5 text-xs font-semibold text-[#0a84ff] hover:bg-[rgba(10,132,255,0.1)] transition-colors w-full"
                            onClick={() => { setTransactionData({ id: item.id, quantity: 1, remarks: '', item: item }); setShowStockIn(true); setShowForm(false); setShowDistribute(false); setActiveDropdown(null); }}
                          >
                            ➕ Add Stock
                          </button>
                          <button 
                            className={`text-left px-4 py-2.5 text-xs font-semibold transition-colors w-full ${item.quantity === 0 ? 'text-gray-500 cursor-not-allowed' : 'text-[#ff9f0a] hover:bg-[rgba(255,159,10,0.1)]'}`}
                            onClick={() => { if(item.quantity > 0) { setTransactionData({ id: item.id, quantity: 1, remarks: '', item: item }); setShowDistribute(true); setShowForm(false); setShowStockIn(false); setActiveDropdown(null); } }}
                            disabled={item.quantity === 0}
                          >
                            ➖ {activeSection === 'equipment' ? 'Remove Stock' : 'Distribute'}
                          </button>
                          <button 
                            className="text-left px-4 py-2.5 text-xs font-semibold text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors w-full"
                            onClick={() => { editItem(item); setShowStockIn(false); setShowDistribute(false); setActiveDropdown(null); }}
                          >
                            ✏️ Edit Details
                          </button>
                          <div className="h-px bg-[#2b2b35] my-1 w-full"></div>
                          <button 
                            className="text-left px-4 py-2.5 text-xs font-semibold text-[#ff453a] hover:bg-[rgba(255,69,58,0.1)] transition-colors w-full"
                            onClick={() => { 
                              setConfirmModal({
                                isOpen: true,
                                action: 'archive',
                                itemId: item.id,
                                title: 'Archive Item',
                                message: 'Are you sure you want to archive this item? It will be removed from the active inventory list.',
                                confirmText: 'Yes, Archive It'
                              });
                              setActiveDropdown(null); 
                            }}
                          >
                            📦 Archive
                          </button>
                        </div>
                      </>
                    )}
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

      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111116] border border-[#2b2b35] rounded-2xl p-6 w-full max-w-4xl shadow-2xl relative flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white m-0 flex items-center gap-2">
                📦 Archived Items
              </h3>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Search archives..." 
                    value={archiveSearchQuery}
                    onChange={(e) => setArchiveSearchQuery(e.target.value)}
                    className="bg-[#181822] border border-[#2b2b35] rounded-lg text-white text-sm py-2 pl-9 pr-4 focus:border-[#0a84ff] focus:outline-none transition-colors w-64 shadow-inner"
                  />
                </div>
                <button 
                  onClick={() => setShowArchiveModal(false)}
                  className="text-gray-400 hover:text-white transition-colors bg-transparent border-none text-xl cursor-pointer"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 bg-[#181822] border border-[#2b2b35] rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#1f1f26] shadow-sm z-10">
                  <tr>
                    <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35] rounded-tl-lg">Item Name</th>
                    <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Category</th>
                    <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35]">Status</th>
                    <th className="p-4 text-gray-400 font-semibold text-sm border-b border-[#2b2b35] rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingArchived ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-400">Loading archived items...</td>
                    </tr>
                  ) : filteredArchivedItems.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-400">No archived items found matching your search.</td>
                    </tr>
                  ) : (
                    filteredArchivedItems.map(item => (
                      <tr key={item.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        <td className="p-4 border-b border-[#1f1f26] text-white font-medium text-sm">{item.name}</td>
                        <td className="p-4 border-b border-[#1f1f26]"><span className="bg-[#181822] border border-[#2b2b35] text-gray-400 px-2.5 py-1 rounded-md text-xs font-semibold">{item.category}</span></td>
                        <td className="p-4 border-b border-[#1f1f26]">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border bg-[rgba(255,69,58,0.15)] text-[#ff453a] border-[rgba(255,69,58,0.3)]`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 border-b border-[#1f1f26]">
                          <button 
                            className="bg-[rgba(52,199,89,0.15)] text-[#34c759] border border-[rgba(52,199,89,0.3)] hover:bg-[#34c759] hover:text-white px-3 py-1.5 rounded-lg font-semibold transition-all text-xs cursor-pointer flex items-center gap-1"
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                action: 'restore',
                                itemId: item.id,
                                title: 'Restore Item',
                                message: 'Are you sure you want to restore this item back to the active inventory list?',
                                confirmText: 'Yes, Restore It'
                              });
                            }}
                          >
                            ♻️ Restore
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#181822] border border-[#2b2b35] rounded-2xl p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h4 className="text-white text-2xl font-bold mb-3 flex items-center gap-3">
              <span className="text-3xl">{confirmModal.action === 'archive' ? '📦' : '♻️'}</span> 
              {confirmModal.title}
            </h4>
            <p className="text-gray-400 text-[15px] mb-8 leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end">
              <button 
                className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] text-gray-200 px-6 py-2.5 rounded-xl font-semibold transition-all text-sm cursor-pointer" 
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
              >
                Cancel
              </button>
              <button 
                className={`${confirmModal.action === 'archive' ? 'bg-[#ff453a] hover:bg-[#ff3b30] shadow-[#ff453a]/20' : 'bg-[#34c759] hover:bg-[#28a745] shadow-[#34c759]/20'} text-white px-6 py-2.5 rounded-xl font-semibold transition-all text-sm shadow-lg cursor-pointer flex items-center gap-2`}
                onClick={() => {
                  if (confirmModal.action === 'archive') {
                    handleArchiveItem(confirmModal.itemId);
                  } else {
                    handleRestoreItem(confirmModal.itemId);
                  }
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
