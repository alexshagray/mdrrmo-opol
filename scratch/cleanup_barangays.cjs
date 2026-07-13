const fs = require('fs');
let code = fs.readFileSync('Responder_app/src/data/opol-locations.ts', 'utf8');

// Find OPOL_BARANGAYS
const bMatch = code.match(/export const OPOL_BARANGAYS: LocationCoordinate\[\] = \[([\s\S]*?)\];/);
if (bMatch) {
  const content = bMatch[1];
  const newContent = content.split('\n').filter(line => !line.includes('establishment') && !line.includes('hospital') && !line.includes('school') && !line.includes('church') && !line.includes('public_building')).join('\n');
  code = code.replace(bMatch[0], `export const OPOL_BARANGAYS: LocationCoordinate[] = [${newContent}];`);
}

fs.writeFileSync('Responder_app/src/data/opol-locations.ts', code);
console.log("Cleanup done.");
