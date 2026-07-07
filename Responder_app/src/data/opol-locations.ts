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
  { name: 'YANEZ STORE', latitude: 8.514834, longitude: 124.610863, type: 'establishment', barangay: 'Barra', zone: 'Zone 1' }
];
export const OPOL_STREETS: LocationCoordinate[] = [];



// Combine Zones, Puroks, Sitios
export const OPOL_ZONES_PUROKS: LocationCoordinate[] = [
  { name: 'Zone 1', latitude: 8.517158, longitude: 124.608622, type: 'zone', barangay: 'Barra' }
];

export const ALL_LOCATIONS = [
  OPOL_MUNICIPALITY,
  ...OPOL_BARANGAYS,
  ...OPOL_LANDMARKS,
  ...OPOL_STREETS,
  ...OPOL_ZONES_PUROKS
];
