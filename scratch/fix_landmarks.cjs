const fs = require('fs');

// Simple point in polygon algorithm
function pointInPolygon(point, vs) {
    let x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i][0], yi = vs[i][1];
        let xj = vs[j][0], yj = vs[j][1];
        let intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// 1. Read polygons
let raw = fs.readFileSync('resources/js/data/barangay-zone-boundery.json', 'utf8');
raw = '[' + raw.replace(/\}\s*\{/g, '},{') + ']';
const geojsonArray = JSON.parse(raw);

const polygons = [];
geojsonArray.forEach(f => {
  if (f.properties && f.properties.name && f.geometry) {
    const nameStr = f.properties.name.toLowerCase();
    const parts = nameStr.split(' ');
    let barangay = '';
    let zoneName = '';
    if (nameStr.includes('zone')) {
      const zIndex = parts.indexOf('zone');
      barangay = parts.slice(0, zIndex).join(' ');
      zoneName = parts.slice(zIndex).join(' ');
      barangay = barangay.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      zoneName = zoneName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    } else {
      barangay = nameStr.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    if (barangay.toLowerCase() === 'luyongbonbon' || barangay.toLowerCase() === 'luyong') barangay = 'Luyong Bonbon';
    if (barangay.toLowerCase() === 'pob' || barangay.toLowerCase() === 'poblacion') barangay = 'Poblacion';
    
    zoneName = zoneName.replace(/\s+/g, ' ').trim();
    
    let coords = null;
    if (f.geometry.type === 'Polygon') {
      coords = f.geometry.coordinates[0];
    } else if (f.geometry.type === 'LineString') {
      coords = f.geometry.coordinates;
    }
    if (coords) {
      polygons.push({ barangay, zone: zoneName, coords });
    }
  }
});

// 2. Read current opol-locations.ts
const code = fs.readFileSync('Responder_app/src/data/opol-locations.ts', 'utf8');

// Using regex to grab everything in OPOL_LANDMARKS and other arrays that look like LocationCoordinates
// Wait, safer to just find all objects with name, latitude, longitude
const matches = [...code.matchAll(/\{\s*name:\s*['"]([^'"]+)['"],\s*latitude:\s*([\d\.-]+),\s*longitude:\s*([\d\.-]+),\s*type:\s*['"]([^'"]+)['"](?:,\s*barangay:\s*['"]([^'"]+)['"])?(?:,\s*zone:\s*['"]([^'"]+)['"])?(?:,\s*aliases:\s*\[([^\]]+)\])?\s*\}/g)];

const uniqueLandmarks = new Map();
const resultEntries = [];

matches.forEach(m => {
  const name = m[1];
  const lat = parseFloat(m[2]);
  const lng = parseFloat(m[3]);
  const type = m[4];
  const originalBrgy = m[5];
  const originalZone = m[6];
  const aliases = m[7];

  if (['establishment', 'landmark', 'school', 'church', 'hospital', 'public_building'].includes(type)) {
    const key = name.trim().toLowerCase();
    
    const genericNames = ['shell', 'petron', 'sari sari', 'store', 'bakeshop', 'pharmacy', 'health center'];
    let finalKey = key;
    if (genericNames.some(g => key.includes(g))) {
       finalKey = key + '_' + Math.round(lat*100) + '_' + Math.round(lng*100); 
    }

    if (!uniqueLandmarks.has(finalKey)) {
      uniqueLandmarks.set(finalKey, { name, lat, lng, type, originalBrgy, originalZone, aliases });
    }
  }
});

let updatedCount = 0;
const finalLandmarks = [];

uniqueLandmarks.forEach((val, key) => {
  let foundBrgy = val.originalBrgy || 'Opol';
  let foundZone = val.originalZone;

  for (const poly of polygons) {
    if (pointInPolygon([val.lng, val.lat], poly.coords)) {
      foundBrgy = poly.barangay;
      foundZone = poly.zone;
      break;
    }
  }
  
  if (foundBrgy !== val.originalBrgy || foundZone !== val.originalZone) {
    updatedCount++;
  }

  finalLandmarks.push({
    name: val.name,
    latitude: val.lat,
    longitude: val.lng,
    type: val.type,
    barangay: foundBrgy,
    zone: foundZone,
    aliases: val.aliases
  });
});

console.log('Total unique landmarks processed:', finalLandmarks.length);
console.log('Total landmarks whose barangay/zone was fixed geometrically:', updatedCount);

let tsCode = 'export const OPOL_LANDMARKS: LocationCoordinate[] = [\n';
finalLandmarks.sort((a,b) => (a.barangay||'').localeCompare(b.barangay||'') || a.name.localeCompare(b.name)).forEach(loc => {
  let line = `  { name: '${loc.name.replace(/'/g, "\\'")}', latitude: ${loc.latitude}, longitude: ${loc.longitude}, type: '${loc.type}'`;
  if (loc.barangay) line += `, barangay: '${loc.barangay}'`;
  if (loc.zone) line += `, zone: '${loc.zone}'`;
  if (loc.aliases) line += `, aliases: [${loc.aliases}]`;
  line += ` },\n`;
  tsCode += line;
});
tsCode += '];';

fs.writeFileSync('scratch/fixed_landmarks.ts', tsCode);
console.log('Saved to scratch/fixed_landmarks.ts');
