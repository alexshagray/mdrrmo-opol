import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ALL_LOCATIONS } from '../data/opol-locations';

interface Coordinate {
  latitude: number;
  longitude: number;
}

const DEFAULT_MAPBOX_TOKEN = 'pk.eyJ1IjoiYWxleHNoYWdyYXkiLCJhIjoiY21xeHNlYnBrMXY1NDJ1cTJtZmRnYzd3eiJ9.KV9UNBsiTYh4bi-tuCaROg';
const CACHE_PREFIX = 'GEOCODE_CACHE_';

/**
 * Clean up strings for cache key
 */
const getCacheKey = (address: string) => `${CACHE_PREFIX}${address.trim().toLowerCase()}`;

/**
 * Safely get cached coordinates
 */
const getCachedCoordinates = async (address: string): Promise<Coordinate | null> => {
  try {
    const key = getCacheKey(address);
    if (Platform.OS === 'web') {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } else {
      const stored = await SecureStore.getItemAsync(key);
      return stored ? JSON.parse(stored) : null;
    }
  } catch (error) {
    console.warn('Geocoding Cache Read Error:', error);
    return null;
  }
};

/**
 * Safely set cached coordinates
 */
const setCachedCoordinates = async (address: string, coords: Coordinate) => {
  try {
    const key = getCacheKey(address);
    if (Platform.OS === 'web') {
      localStorage.setItem(key, JSON.stringify(coords));
    } else {
      await SecureStore.setItemAsync(key, JSON.stringify(coords));
    }
  } catch (error) {
    console.warn('Geocoding Cache Write Error:', error);
  }
};

/**
 * Build permutations of the address from most specific to least specific.
 */
const buildAddressFallbacks = (params: {
  barangay?: string;
  purok?: string;
  landmark?: string;
}): string[] => {
  const { barangay, purok, landmark } = params;
  const fallbacks: string[] = [];
  const baseCity = 'Opol, Misamis Oriental, Philippines';

  // 1. Full detailed address
  if (landmark && purok && barangay) {
    fallbacks.push(`${landmark}, ${purok}, ${barangay}, ${baseCity}`);
  }

  // 2. Purok + Barangay (e.g. Purok 5, Barra, Opol...)
  if (purok && barangay) {
    fallbacks.push(`${purok}, ${barangay}, ${baseCity}`);
  }

  // 3. Landmark + Barangay
  if (landmark && barangay) {
    fallbacks.push(`${landmark}, ${barangay}, ${baseCity}`);
  }

  // 4. Just Barangay
  if (barangay) {
    fallbacks.push(`${barangay}, ${baseCity}`);
  }
  
  // 5. Absolute fallback
  fallbacks.push(baseCity);

  // Filter out duplicates (if any properties were empty strings)
  return Array.from(new Set(fallbacks));
};

/**
 * Calls the Mapbox API to fetch coordinates for a given search query
 */
const fetchMapboxGeocode = async (searchQuery: string): Promise<Coordinate | null> => {
  const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || DEFAULT_MAPBOX_TOKEN;
  
  // Using the Mapbox Geocoding v5 API
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${token}&limit=1&country=ph`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [longitude, latitude] = data.features[0].center;
      return { latitude, longitude };
    }
    return null;
  } catch (error) {
    console.warn(`Mapbox geocoding failed for: ${searchQuery}`, error);
    return null;
  }
};

/**
 * Robust geocoding function that attempts multiple fallbacks to resolve an address to coordinates
 */
export const robustGeocode = async (
  addressString: string, 
  addressComponents?: { barangay?: string; purok?: string; landmark?: string }
): Promise<Coordinate | null> => {
  
  // 1. If it's empty, no point in geocoding
  if (!addressString && !addressComponents) return null;

  const mainQuery = addressString || '';

  // 2. Check Cache for exact match first
  if (mainQuery) {
    const cached = await getCachedCoordinates(mainQuery);
    if (cached) {
      console.log('[Geocoding] Cache hit for:', mainQuery);
      return cached;
    }
  }

  // 3. Check Local Database (opol-locations.ts)
  if (addressComponents && (addressComponents.purok || addressComponents.barangay || addressComponents.landmark)) {
    const { purok, barangay, landmark } = addressComponents;
    let match = null;

    if (landmark) {
      match = ALL_LOCATIONS.find(loc => 
        (loc.type === 'landmark' || loc.type === 'school' || loc.type === 'church' || loc.type === 'hospital' || loc.type === 'public_building' || loc.type === 'establishment') &&
        loc.name.toLowerCase() === landmark.toLowerCase()
      );
    }
    
    if (!match && purok && barangay) {
      match = ALL_LOCATIONS.find(loc => 
        (loc.type === 'zone' || loc.type === 'purok' || loc.type === 'sitio') &&
        loc.name.toLowerCase() === purok.toLowerCase() &&
        loc.barangay?.toLowerCase() === barangay.toLowerCase()
      );
    }

    if (!match && barangay && !purok) {
      match = ALL_LOCATIONS.find(loc => 
        loc.type === 'barangay' &&
        loc.name.toLowerCase() === barangay.toLowerCase()
      );
    }

    if (match) {
      console.log(`[Geocoding] Local Database Match Found: ${match.name}`);
      const coords = { latitude: match.latitude, longitude: match.longitude };
      if (mainQuery) await setCachedCoordinates(mainQuery, coords);
      return coords;
    }
  }

  // 4. Try geocoding the exact string provided
  let result = null;
  if (mainQuery) {
    result = await fetchMapboxGeocode(mainQuery);
    if (result) {
      await setCachedCoordinates(mainQuery, result);
      return result;
    }
  }

  // 5. Try fallbacks if exact string failed
  if (addressComponents) {
    const fallbacks = buildAddressFallbacks(addressComponents);
    for (const fallbackQuery of fallbacks) {
      if (fallbackQuery.trim() === mainQuery.trim()) continue; // Skip if we already tried this exact string
      
      console.log(`[Geocoding] Falling back to: ${fallbackQuery}`);
      result = await fetchMapboxGeocode(fallbackQuery);
      
      if (result) {
        // Cache the result for the original query too so we don't have to fallback next time
        if (mainQuery) await setCachedCoordinates(mainQuery, result);
        return result;
      }
    }
  } else if (mainQuery && !mainQuery.toLowerCase().includes('misamis oriental')) {
    // Basic fallback if no components are provided
    const fallbackQuery = `${mainQuery}, Opol, Misamis Oriental, Philippines`;
    console.log(`[Geocoding] Basic fallback to: ${fallbackQuery}`);
    result = await fetchMapboxGeocode(fallbackQuery);
    if (result) {
      await setCachedCoordinates(mainQuery, result);
      return result;
    }
  }

  return null;
};
