export type LocationType = 'landmark' | 'school' | 'church' | 'hospital' | 'public_building' | 'street' | 'sitio' | 'purok' | 'zone' | 'barangay' | 'municipality' | 'establishment';

export interface LocationCoordinate {
  name: string;
  latitude: number;
  longitude: number;
  type: LocationType;
  barangay?: string;
  zone?: string;
  aliases?: string[];
}

export const OPOL_MUNICIPALITY: LocationCoordinate = {
  name: 'Opol, Misamis Oriental',
  latitude: 8.5204,
  longitude: 124.5772,
  type: 'municipality',
  aliases: ['opol']
};

export const OPOL_BARANGAYS: LocationCoordinate[] = [
  { name: 'Awang', latitude: 8.4400, longitude: 124.5000, type: 'barangay' },
  { name: 'Barra', latitude: 8.5146, longitude: 124.6223, type: 'barangay' },
  { name: 'Bagocboc', latitude: 8.4100, longitude: 124.4800, type: 'barangay' },
  { name: 'Bonbon', latitude: 8.5250, longitude: 124.5700, type: 'barangay' },
  { name: 'Cauyunan', latitude: 8.3500, longitude: 124.4500, type: 'barangay' },
  { name: 'Igpit', latitude: 8.5132, longitude: 124.6083, type: 'barangay' },
  { name: 'Luyong Bonbon', latitude: 8.5300, longitude: 124.5500, type: 'barangay' },
  { name: 'Limunda', latitude: 8.3200, longitude: 124.4200, type: 'barangay' },
  { name: 'Malanang', latitude: 8.4900, longitude: 124.5900, type: 'barangay' },
  { name: 'Nangcaon', latitude: 8.4000, longitude: 124.4700, type: 'barangay' },
  { name: 'Patag', latitude: 8.4800, longitude: 124.5300, type: 'barangay' },
  { name: 'Poblacion', latitude: 8.5215, longitude: 124.5768, type: 'barangay' },
  { name: 'Tingalan', latitude: 8.3700, longitude: 124.4300, type: 'barangay' },
  { name: 'Taboc', latitude: 8.5150, longitude: 124.5850, type: 'barangay' },
];

export const OPOL_LANDMARKS: LocationCoordinate[] = [
  // Public Buildings
  { name: 'Opol Municipal Hall', latitude: 8.5204, longitude: 124.5772, type: 'public_building', barangay: 'Poblacion', zone: 'Zone 1', aliases: ['city hall', 'town hall'] },
  { name: 'Opol Public Market', latitude: 8.5210, longitude: 124.5780, type: 'public_building', barangay: 'Poblacion', zone: 'Zone 2', aliases: ['market', 'palengke'] },
  { name: 'Barangay Hall', latitude: 8.5146, longitude: 124.6223, type: 'public_building', barangay: 'Barra', zone: 'Zone 3', aliases: ['brgy hall barra'] },
  { name: 'Barangay Hall', latitude: 8.5132, longitude: 124.6083, type: 'public_building', barangay: 'Igpit', zone: 'Zone 2', aliases: ['brgy hall igpit'] },
  { name: 'Barangay Hall', latitude: 8.5215, longitude: 124.5768, type: 'public_building', barangay: 'Poblacion', zone: 'Zone 1', aliases: ['brgy hall poblacion'] },

  // Establishments / Landmarks
  { name: 'Apple Tree Resort', latitude: 8.5255, longitude: 124.5680, type: 'landmark', barangay: 'Taboc', zone: 'Zone 1' },
  { name: 'Seven Seas Waterpark', latitude: 8.5120, longitude: 124.6210, type: 'landmark', barangay: 'Barra', zone: 'Zone 3', aliases: ['seven seas'] },
  { name: 'Jollibee Opol', latitude: 8.5210, longitude: 124.5765, type: 'establishment', barangay: 'Poblacion', zone: 'Zone 2', aliases: ['jollibee'] },

  // Churches
  { name: 'San Isidro Labrador Parish Church', latitude: 8.5200, longitude: 124.5770, type: 'church', barangay: 'Poblacion', zone: 'Zone 1', aliases: ['opol church', 'parish church'] },

  // Schools
  { name: 'Opol National Secondary Technical School', latitude: 8.5230, longitude: 124.5760, type: 'school', barangay: 'Poblacion', zone: 'Zone 2', aliases: ['onsts', 'opol national high school'] },
  { name: 'Igpit Elementary School', latitude: 8.5130, longitude: 124.6080, type: 'school', barangay: 'Igpit', zone: 'Zone 1' },
  { name: 'Barra Elementary School', latitude: 8.5150, longitude: 124.6220, type: 'school', barangay: 'Barra', zone: 'Zone 3' },
];

export const OPOL_STREETS: LocationCoordinate[] = [
  { name: 'National Highway', latitude: 8.5150, longitude: 124.6000, type: 'street', aliases: ['highway', 'natl highway'] },
  { name: 'Opol-Bulua Road', latitude: 8.5100, longitude: 124.6200, type: 'street', barangay: 'Barra' },
];

// Combine Zones, Puroks, Sitios
export const OPOL_ZONES_PUROKS: LocationCoordinate[] = [
  // Barra


  { name: 'Zone 3', latitude: 8.5140, longitude: 124.6220, type: 'zone', barangay: 'Barra' },
  { name: 'Zone 4', latitude: 8.503627, longitude: 124.603314, type: 'zone', barangay: 'Barra' },


  // Igpit
  { name: 'Zone 1', latitude: 8.5140, longitude: 124.6090, type: 'zone', barangay: 'Igpit' },
  { name: 'Zone 2', latitude: 8.5135, longitude: 124.6080, type: 'zone', barangay: 'Igpit' },
  { name: 'Zone 3', latitude: 8.5120, longitude: 124.6075, type: 'zone', barangay: 'Igpit' },
  { name: 'Zone 4', latitude: 8.522378, longitude: 124.581593, type: 'zone', barangay: 'Igpit' },
  { name: 'Zone 5', latitude: 8.507448, longitude: 124.584329, type: 'zone', barangay: 'Igpit' },
  { name: 'Zone 8', latitude: 8.517626, longitude: 124.591050, type: 'zone', barangay: 'Igpit' },

  // Poblacion
  { name: 'Zone 1', latitude: 8.5220, longitude: 124.5775, type: 'zone', barangay: 'Poblacion' },
  { name: 'Zone 2', latitude: 8.5215, longitude: 124.5765, type: 'zone', barangay: 'Poblacion' },
  { name: 'Zone 3', latitude: 8.5205, longitude: 124.5755, type: 'zone', barangay: 'Poblacion' },

  // Malanang
  { name: 'Zone 1', latitude: 8.500555, longitude: 124.573500, type: 'zone', barangay: 'Malanang' },

  // Luyong Bonbon
  { name: 'Zone 1', latitude: 8.524138, longitude: 124.571027, type: 'zone', barangay: 'Luyong Bonbon' },
  { name: 'Zone 3', latitude: 8.525110, longitude: 124.570984, type: 'zone', barangay: 'Luyong Bonbon' },
  { name: 'Zone 4', latitude: 8.519198, longitude: 124.570575, type: 'zone', barangay: 'Luyong Bonbon' },
  { name: 'Zone 7', latitude: 8.528963, longitude: 124.567652, type: 'zone', barangay: 'Luyong Bonbon' },

  // Bonbon
  { name: 'Zone 1', latitude: 8.524308, longitude: 124.571893, type: 'zone', barangay: 'Bonbon' },
  { name: 'Zone 5', latitude: 8.522744, longitude: 124.573004, type: 'zone', barangay: 'Bonbon' },
  { name: 'Zone 6', latitude: 8.525560, longitude: 124.571712, type: 'zone', barangay: 'Bonbon' },

  // Patag
  { name: 'Zone 2', latitude: 8.506709, longitude: 124.563861, type: 'zone', barangay: 'Patag' },
  { name: 'Zone 3', latitude: 8.498516, longitude: 124.557033, type: 'zone', barangay: 'Patag' },

  // Taboc
  { name: 'Zone 1', latitude: 8.517682619389182, longitude: 124.57876691879324, type: 'zone', barangay: 'Taboc' },
  { name: 'Zone 6', latitude: 8.521123, longitude: 124.573619, type: 'zone', barangay: 'Taboc' },

  // Sitios
  { name: 'Sitio Riverside', latitude: 8.3210, longitude: 124.4210, type: 'sitio', barangay: 'Limonda' },
];

export const ALL_LOCATIONS = [
  OPOL_MUNICIPALITY,
  ...OPOL_BARANGAYS,
  ...OPOL_LANDMARKS,
  ...OPOL_STREETS,
  ...OPOL_ZONES_PUROKS
];
