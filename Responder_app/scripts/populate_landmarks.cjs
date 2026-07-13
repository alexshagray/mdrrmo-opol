const fs = require('fs');

// We use dynamic import for node-fetch to support native fetch if available, or fetch from internet
const isInsidePolygon = (rings, pt) => {
  let inside = false;
  const exteriorRing = rings[0];
  for (let i = 0, j = exteriorRing.length - 1; i < exteriorRing.length; j = i++) {
    const xi = exteriorRing[i][0], yi = exteriorRing[i][1];
    const xj = exteriorRing[j][0], yj = exteriorRing[j][1];
    const intersect = ((yi > pt[1]) !== (yj > pt[1]))
        && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

async function run() {
  const query = `
    [out:json][timeout:60];
    area["name"="Opol"]->.searchArea;
    (
      node["amenity"](area.searchArea);
      way["amenity"](area.searchArea);
      rel["amenity"](area.searchArea);
      node["shop"](area.searchArea);
      way["shop"](area.searchArea);
      rel["shop"](area.searchArea);
      node["building"="school"](area.searchArea);
      way["building"="school"](area.searchArea);
      rel["building"="school"](area.searchArea);
      node["building"="church"](area.searchArea);
      way["building"="church"](area.searchArea);
      rel["building"="church"](area.searchArea);
      node["building"="hospital"](area.searchArea);
      way["building"="hospital"](area.searchArea);
      rel["building"="hospital"](area.searchArea);
      node["office"](area.searchArea);
      way["office"](area.searchArea);
      rel["office"](area.searchArea);
      node["tourism"](area.searchArea);
      way["tourism"](area.searchArea);
      rel["tourism"](area.searchArea);
    );
    out center;
  `;
  
  console.log('Fetching landmarks from OSM (Overpass API)...');
  
  let fetchFn = typeof fetch !== 'undefined' ? fetch : null;
  if (!fetchFn) {
      try {
        const fetchMod = await import('node-fetch');
        fetchFn = fetchMod.default;
      } catch(e) {
          console.error("No fetch available");
          return;
      }
  }

  let data;
  try {
    let res = await fetchFn("https://maps.mail.ru/osm/tools/overpass/api/interpreter", {
        method: "POST",
        body: query
    });
    if (!res.ok) {
        console.log('Fallback endpoint...');
        res = await fetchFn("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query
        });
    }
    data = await res.json();
  } catch (e) {
    console.error("Failed to fetch from Overpass:", e);
    return;
  }

  const namedElements = data.elements.filter(e => e.tags && e.tags.name);
  console.log(`Found ${namedElements.length} named landmarks in Opol.`);

  // Load barangay boundaries
  console.log('Loading barangay polygons...');
  const geojsonRaw = fs.readFileSync('../resources/js/data/barangay.json', 'utf-8');
  const geojson = JSON.parse(geojsonRaw);
  const barangayPolygons = {};
  geojson.features.forEach(f => {
      if(f.properties.name && f.geometry) {
          if (f.geometry.type === 'MultiPolygon') {
             barangayPolygons[f.properties.name] = f.geometry.coordinates[0];
          } else {
             barangayPolygons[f.properties.name] = f.geometry.coordinates;
          }
      }
  });

  console.log('Categorizing landmarks by barangay...');
  const newLandmarks = [];
  
  // Clean names to prevent duplicates
  const seenNames = new Set();

  namedElements.forEach(el => {
      let lat = el.lat;
      let lng = el.lon;
      if (!lat && el.center) {
          lat = el.center.lat;
          lng = el.center.lon;
      }
      
      if (!lat || !lng) return;
      
      const name = el.tags.name.trim();
      if (seenNames.has(name)) return; // skip exact duplicates
      
      let matchedBarangay = null;
      
      // Ray-cast against all barangays
      for (const [bName, rings] of Object.entries(barangayPolygons)) {
          if (isInsidePolygon(rings, [lng, lat])) {
              matchedBarangay = bName;
              break;
          }
      }
      
      if (matchedBarangay) {
          seenNames.add(name);
          
          let type = 'establishment';
          if (el.tags.amenity === 'school' || el.tags.building === 'school') type = 'school';
          else if (el.tags.amenity === 'place_of_worship' || el.tags.building === 'church') type = 'church';
          else if (el.tags.amenity === 'hospital' || el.tags.amenity === 'clinic') type = 'hospital';
          else if (el.tags.office === 'government' || el.tags.amenity === 'townhall') type = 'public_building';
          
          // Capitalize barangay name for consistency
          const capitalBarangay = matchedBarangay.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

          newLandmarks.push(`  { name: '${name.replace(/'/g, "\\'")}', latitude: ${lat}, longitude: ${lng}, type: '${type}', barangay: '${capitalBarangay}' },`);
      }
  });

  console.log(`Successfully categorized ${newLandmarks.length} landmarks.`);
  
  // Read existing opol-locations.ts
  const locPath = 'src/data/opol-locations.ts';
  let locContent = fs.readFileSync(locPath, 'utf-8');
  
  // Find where OPOL_LANDMARKS starts and ends
  const startRegex = /export const OPOL_LANDMARKS: LocationCoordinate\[\] = \[\s*/;
  const startMatch = locContent.match(startRegex);
  
  if (startMatch) {
      const startIndex = startMatch.index + startMatch[0].length;
      
      // Find the EXACT end of the OPOL_LANDMARKS array, avoiding OPOL_ZONES_PUROKS
      const endOfLandmarks = locContent.indexOf('];', startIndex);
      
      if (endOfLandmarks !== -1) {
          const oldLandmarksStr = locContent.substring(startIndex, endOfLandmarks);
          // Keep existing landmarks, append new ones
          const combined = oldLandmarksStr + '\n  // --- AUTO-GENERATED OSM LANDMARKS ---\n' + newLandmarks.join('\n') + '\n';
          
          const newContent = locContent.substring(0, startIndex) + combined + locContent.substring(endOfLandmarks);
          fs.writeFileSync(locPath, newContent);
          console.log('Successfully updated opol-locations.ts!');
      } else {
          console.error("Could not find end of OPOL_LANDMARKS array");
      }
  } else {
      console.error("Could not find OPOL_LANDMARKS array");
  }
}

run();
