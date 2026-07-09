import React from 'react';
import MedicalSupplies from './MedicalSupplies';
import Equipment from './Equipment';
import ConsumptionReport from './ConsumptionReport';

export default function InventoryManager({ activeSection, setActiveSection }) {
  if (activeSection === 'inventory') {
    return <MedicalSupplies />;
  }
  
  if (activeSection === 'equipment') {
    return <Equipment />;
  }
  
  if (activeSection?.startsWith('consumption')) {
    return <ConsumptionReport activeSection={activeSection} />;
  }

  // Fallback
  return <div className="text-white p-6">Section not found.</div>;
}
