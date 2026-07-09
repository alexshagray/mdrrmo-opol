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
  { name: 'Awang', latitude: 8.4670, longitude: 124.5010, type: 'barangay' },
  { name: 'Barra', latitude: 8.5146, longitude: 124.6223, type: 'barangay' },
  { name: 'Bagocboc', latitude: 8.4220, longitude: 124.5250, type: 'barangay' },
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
  { name: 'YANEZ STORE', latitude: 8.514834, longitude: 124.610863, type: 'establishment', barangay: 'Barra', zone: 'Zone 1' },
  { name: 'United Church of Christ in the Philippines', latitude: 8.516338, longitude: 124.611279, type: 'church', barangay: 'Barra', zone: 'Zone 1' },
  { name: 'Isla Gael', latitude: 8.519689, longitude: 124.611996, type: 'establishment', barangay: 'Barra', zone: 'Zone 1' },

  { name: 'Barra Elementary School Annex Building', latitude: 8.511671, longitude: 124.608947, type: 'school', barangay: 'Barra', zone: 'Zone 2' },
  { name: 'PhilFIDA Regional Office 10', latitude: 8.513274, longitude: 124.609443, type: 'public_building', barangay: 'Barra', zone: 'Zone 2' },
  { name: 'Our Mother of Perpetual Help Parish', latitude: 8.509533, longitude: 124.608313, type: 'church', barangay: 'Barra', zone: 'Zone 2' },
  { name: 'Graphica Studios - CDO', latitude: 8.510779, longitude: 124.607906, type: 'establishment', barangay: 'Barra', zone: 'Zone 2' },

  { name: 'Graphica Studios - CDO', latitude: 8.510779, longitude: 124.607906, type: 'establishment', barangay: 'Barra', zone: 'Zone 2' },

  
  

];
export const OPOL_STREETS: LocationCoordinate[] = [];



// Combine Zones, Puroks, Sitios
export const OPOL_ZONES_PUROKS: LocationCoordinate[] = [
  { name: 'Zone 1', latitude: 8.517301, longitude: 124.611559, type: 'zone', barangay: 'Barra' },
  { name: 'Zone 2', latitude: 8.512561, longitude: 124.607071, type: 'zone', barangay: 'Barra' },
   { name: 'Zone 3', latitude: 8.509342 , longitude: 124.605997, type: 'zone', barangay: 'Barra' },
      { name: 'Zone 4', latitude: 8.504012 , longitude: 124.604170, type: 'zone', barangay: 'Barra' },
  { name: 'Zone 5', latitude: 8.504600 , longitude: 124.599573, type: 'zone', barangay: 'Barra' },
  { name: 'Zone 6', latitude: 8.504941, longitude: 124.595629, type: 'zone', barangay: 'Barra' },
  { name: 'Zone 7', latitude: 8.511488, longitude: 124.600428, type: 'zone', barangay: 'Barra' },
  { name: 'Zone 8', latitude: 8.513060 , longitude: 124.592078, type: 'zone', barangay: 'Barra' },
  { name: 'Zone 9', latitude: 8.508487  , longitude: 124.602459, type: 'zone', barangay: 'Barra' },
  { name: 'Zone 10', latitude:8.506696 , longitude: 124.600610, type: 'zone', barangay: 'Barra' }
 
  
  
 
];

export const ALL_LOCATIONS = [
  OPOL_MUNICIPALITY,
  ...OPOL_BARANGAYS,
  ...OPOL_LANDMARKS,
  ...OPOL_STREETS,
  ...OPOL_ZONES_PUROKS
];
