const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('occ-initial-data.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, {header: 1});

let csvContent = 'Name,Condition,Category,Quantity,Unit,Threshold\n';

for (let i = 4; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[1] || row[1] === 'Prepared By:') break;
    
    const name = row[1].trim().replace(/"/g, '""');
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
    
    let category = 'Equipment';
    const lowerName = name.toLowerCase();
    if (lowerName.includes('vehicle') || lowerName.includes('ambulance') || lowerName.includes('motor cycle')) {
        category = 'Vehicles';
    }

    csvContent += `"${name}",New,${category},${qty},${unit},5\n`;
}

fs.writeFileSync('MDRRMO_Equipment_Import.csv', csvContent);
console.log('Successfully created MDRRMO_Equipment_Import.csv');
