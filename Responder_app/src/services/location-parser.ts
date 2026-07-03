import { ALL_LOCATIONS, OPOL_MUNICIPALITY, LocationCoordinate, LocationType } from '../data/opol-locations';

export interface ParsedLocation {
  latitude: number;
  longitude: number;
  zoom: number;
  matchedBy: string;
  name: string;
}

// Helper to normalize strings (remove punctuation, standard spaces, handle aliases)
function normalizeText(input: string): string {
  if (!input) return '';
  let text = input.toLowerCase();
  text = text.replace(/[.,]/g, ''); // remove punctuation
  text = text.replace(/\s+/g, ' '); // normalize spaces
  
  // Handle variations
  text = text.replace(/\bbrgy\b/g, 'barangay');
  text = text.replace(/\bst\b/g, 'street');
  text = text.replace(/\bzone v\b/g, 'zone 5');
  text = text.replace(/\bzone iv\b/g, 'zone 4');
  text = text.replace(/\bzone iii\b/g, 'zone 3');
  text = text.replace(/\bzone ii\b/g, 'zone 2');
  text = text.replace(/\bzone i\b/g, 'zone 1');
  text = text.replace(/\bz-5\b/g, 'zone 5');
  text = text.replace(/\bz-4\b/g, 'zone 4');
  text = text.replace(/\bz-3\b/g, 'zone 3');
  text = text.replace(/\bz-2\b/g, 'zone 2');
  text = text.replace(/\bz-1\b/g, 'zone 1');
  
  return text.trim();
}

function getZoomLevel(type: LocationType): number {
  switch (type) {
    case 'landmark':
    case 'school':
    case 'church':
    case 'hospital':
    case 'public_building':
    case 'establishment':
      return 18;
    case 'street':
      return 17;
    case 'purok':
    case 'zone':
    case 'sitio':
      return 17;
    case 'barangay':
      return 15;
    case 'municipality':
    default:
      return 13;
  }
}

// Main parser
export const parseOpolLocation = async (locationText: string): Promise<ParsedLocation> => {
  if (!locationText || locationText.trim() === '') {
    return {
      latitude: OPOL_MUNICIPALITY.latitude,
      longitude: OPOL_MUNICIPALITY.longitude,
      zoom: 13,
      matchedBy: 'municipality',
      name: OPOL_MUNICIPALITY.name
    };
  }

  const text = normalizeText(locationText);

  // Score potential matches
  let bestMatch: LocationCoordinate | null = null;
  let highestScore = 0;

  for (const loc of ALL_LOCATIONS) {
    const locName = normalizeText(loc.name);
    let score = 0;
    
    // Check if locName or its aliases are in the text
    let matched = false;
    // Exact word match to avoid partials like 'Barra' matching inside 'Barracuda' (unlikely but safe)
    if (text.includes(locName)) matched = true;
    if (!matched && loc.aliases) {
      for (const alias of loc.aliases) {
        if (text.includes(normalizeText(alias))) {
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      // Base score depending on type (priority)
      switch (loc.type) {
        case 'landmark':
        case 'school':
        case 'church':
        case 'hospital':
        case 'public_building':
        case 'establishment':
          score += 100; // Level 1
          break;
        case 'street':
          score += 80; // Level 2
          break;
        case 'purok':
          score += 60; // Level 3 part 1
          break;
        case 'zone':
        case 'sitio':
          score += 40; // Level 4
          break;
        case 'barangay':
          score += 20; // Level 5
          break;
        case 'municipality':
          score += 10;
          break;
      }

      // Contextual boosting (Disambiguation)
      if (loc.barangay) {
        const brgyName = normalizeText(loc.barangay);
        // If the text also mentions the barangay of this location, it's highly likely to be the correct one
        if (text.includes(brgyName)) {
          score += 50; 
        } else if (loc.type === 'zone' || loc.type === 'purok' || loc.type === 'sitio') {
          // If it's a generic zone/purok but the barangay isn't mentioned, heavily penalize it to avoid false positives (e.g. Zone 1 matching everywhere)
          score -= 30; 
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = loc;
      }
    }
  }

  // If we found a good local match (score > 0 and not heavily penalized)
  if (bestMatch && highestScore > 0) {
    return {
      latitude: bestMatch.latitude,
      longitude: bestMatch.longitude,
      zoom: getZoomLevel(bestMatch.type),
      matchedBy: bestMatch.type,
      name: bestMatch.barangay ? `${bestMatch.name}, ${bestMatch.barangay}` : bestMatch.name
    };
  }

  // Geocoding Fallback
  try {
    const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiYWxleHNoYWdyYXkiLCJhIjoiY21xeHNlYnBrMXY1NDJ1cTJtZmRnYzd3eiJ9.KV9UNBsiTYh4bi-tuCaROg';
    const query = text.includes('opol') ? text : `${text} opol misamis oriental`;
    // bbox restricts the search to roughly Opol's bounding box
    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1&bbox=124.4,8.3,124.7,8.6`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        return {
          latitude: feature.center[1], 
          longitude: feature.center[0],
          zoom: 16,
          matchedBy: 'geocoding',
          name: feature.place_name
        };
      }
    }
  } catch (error) {
    console.error('Geocoding API error:', error);
  }

  // Default Fallback
  return {
    latitude: OPOL_MUNICIPALITY.latitude,
    longitude: OPOL_MUNICIPALITY.longitude,
    zoom: 13,
    matchedBy: 'fallback',
    name: OPOL_MUNICIPALITY.name
  };
};
