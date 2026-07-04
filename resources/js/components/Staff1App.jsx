import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Staff1Sidebar from './Staff1/Staff1Sidebar';
import Staff1Header from './Staff1/Staff1Header';
import InventoryManager from './Staff1/InventoryManager';
import TrainedPersonnelManager from './Staff1/TrainedPersonnelManager';
import EventsManager from './Staff1/EventsManager';
import Pcr from './Staff1/Pcr';
import Staff1Dashboard from './Staff1/Staff1Dashboard';

const Staff1App = () => {
  const [activeSection, setActiveSection] = useState(() => {
    return localStorage.getItem('staff1ActiveSection') || 'dashboard';
  });

  React.useEffect(() => {
    localStorage.setItem('staff1ActiveSection', activeSection);
  }, [activeSection]);

  // We only need the low stock count for the sidebar badge
  const { data: invData } = useQuery({
    queryKey: ['inventory', 1],
    queryFn: async () => {
      const res = await fetch(`/api/inventory?page=1`);
      return res.json();
    }
  });
  
  const inventory = invData?.data || [];
  const lowStockItemsCount = inventory.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock').length;

  return (
    <div className="min-h-screen bg-[#08080a] text-gray-100 font-sans flex overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-[radial-gradient(circle_at_top,rgba(10,132,255,0.08),transparent_70%)] pointer-events-none z-0" />
      
      <Staff1Sidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        lowStockItemsCount={lowStockItemsCount} 
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <Staff1Header activeSection={activeSection} />

        <div className="p-8 overflow-y-auto flex-1">
          {(activeSection === 'inventory' || activeSection === 'equipment' || activeSection === 'alerts' || activeSection === 'reports') && <InventoryManager activeSection={activeSection} />}
          {activeSection === 'events' && (
            <EventsManager role="Staff1" />
          )}

          {activeSection === 'pcr' && (
            <Pcr />
          )}

          {activeSection === 'dashboard' && (
            <Staff1Dashboard setActiveSection={setActiveSection} />
          )}
          {activeSection === 'trained_personnel' && <TrainedPersonnelManager />}
        </div>
      </div>
    </div>
  );
};

export default Staff1App;
