import React, { useState, useMemo, useEffect, useRef } from 'react';
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiYWxleHNoYWdyYXkiLCJhIjoiY21xeHNlYnBrMXY1NDJ1cTJtZmRnYzd3eiJ9.KV9UNBsiTYh4bi-tuCaROg';



// Mapbox marker styles
const markerStyle = (typeColor, isHistorical = false) => ({
  background: isHistorical ? '#ef4444' : typeColor,
  border: '2px solid #ffffff',
  borderRadius: '50%',
  width: isHistorical ? '16px' : '36px',
  height: isHistorical ? '16px' : '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: isHistorical ? '0px' : '20px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  animation: isHistorical ? 'none' : 'pulse-marker 2s infinite',
  cursor: 'pointer'
});

// Calculate bearing between two coordinates
const calculateBearing = (start, end) => {
  const startLat = start[1] * Math.PI / 180;
  const startLng = start[0] * Math.PI / 180;
  const endLat = end[1] * Math.PI / 180;
  const endLng = end[0] * Math.PI / 180;
  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
};

const ResponderMapRoute = ({ responderId, startCoords, endCoords }) => {
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [jumpGeoJSON, setJumpGeoJSON] = useState(null);
  const fullRouteCoords = useRef([]);
  const lastClosestIndex = useRef(0);
  const lastFetchedEndCoords = useRef(null);

  // 1. Fetch route when destination changes
  useEffect(() => {
    if (!startCoords || !endCoords) return;

    let shouldFetch = false;
    if (!lastFetchedEndCoords.current) {
      shouldFetch = true;
    } else {
      const dx = Math.abs(endCoords[0] - lastFetchedEndCoords.current[0]);
      const dy = Math.abs(endCoords[1] - lastFetchedEndCoords.current[1]);
      // Refetch if destination changes significantly
      if (dx > 0.0001 || dy > 0.0001) {
        shouldFetch = true;
      }
    }

    if (!shouldFetch) return;
    lastFetchedEndCoords.current = endCoords;

    const decodePolyline = (encoded) => {
      let points = [];
      let index = 0, lat = 0, lng = 0;
      while (index < encoded.length) {
        let b, shift = 0, result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1)); lat += dlat;
        shift = 0; result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1)); lng += dlng;
        points.push([lng / 1e5, lat / 1e5]); // [longitude, latitude] for Mapbox
      }
      return points;
    };

    const fetchRoute = async () => {
      try {
        // Web Browser CORS blocks Google Directions REST API.
        // We use Mapbox Directions API exclusively for the web app.
        const query = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );
        const json = await query.json();
        if (json.routes && json.routes.length > 0) {
          const coords = json.routes[0].geometry.coordinates;
          
          fullRouteCoords.current = coords;
          lastClosestIndex.current = 0;
          
          setRouteGeoJSON({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: coords }
          });
          
          setJumpGeoJSON(null);
        }
      } catch (err) {
        console.error("Mapbox Route Error:", err);
      }
    };

    fetchRoute();
  }, [endCoords[0], endCoords[1]]);

  // 2. Trim route when startCoords (responder location) changes
  useEffect(() => {
    if (!fullRouteCoords.current || fullRouteCoords.current.length === 0 || !startCoords) return;

    const rLng = startCoords[0];
    const rLat = startCoords[1];
    let minDistance = Infinity;

    let searchStart = lastClosestIndex.current || 0;
    searchStart = Math.max(0, searchStart - 5);
    const searchEnd = Math.min(fullRouteCoords.current.length, searchStart + 50);
    let closestIndex = searchStart;

    for (let i = searchStart; i < searchEnd; i++) {
      const coord = fullRouteCoords.current[i];
      const dx = rLng - coord[0];
      const dy = rLat - coord[1];
      const dist = dx * dx + dy * dy;
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    lastClosestIndex.current = closestIndex;

    if (closestIndex < fullRouteCoords.current.length) {
      const trimmedCoords = [[rLng, rLat], ...fullRouteCoords.current.slice(closestIndex)];
      setRouteGeoJSON({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: trimmedCoords }
      });
    }
  }, [startCoords[0], startCoords[1]]);

  if (!routeGeoJSON) {
    return (
      <Source
        key={`fallback-src-${responderId}`}
        id={`resp-route-src-fallback-${responderId}`}
        type="geojson"
        data={{
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [startCoords, endCoords] }
        }}
      >
        <Layer
          id={`resp-route-layer-fallback-${responderId}`}
          type="line"
          paint={{
            'line-color': '#0000FF',
            'line-width': 8,
            'line-dasharray': [2, 2]
          }}
        />
      </Source>
    );
  }

  return (
    <>
      <Source
        key={`real-src-${responderId}`}
        id={`resp-route-src-${responderId}`}
        type="geojson"
        data={routeGeoJSON}
      >
        <Layer
          id={`resp-route-casing-${responderId}`}
          type="line"
          paint={{
            'line-color': '#0047AB',
            'line-width': 14,
            'line-opacity': 1
          }}
        />
        <Layer
          id={`resp-route-layer-${responderId}`}
          type="line"
          paint={{
            'line-color': '#3B82F6',
            'line-width': 8,
            'line-opacity': 1
          }}
        />
      </Source>
      
      {jumpGeoJSON && (
        <Source
          id={`resp-jump-src-${responderId}`}
          type="geojson"
          data={jumpGeoJSON}
        >
          <Layer
            id={`resp-jump-layer-${responderId}`}
            type="line"
            paint={{
              'line-color': '#0000FF',
              'line-width': 6,
              'line-opacity': 1,
              'line-dasharray': [2, 2]
            }}
          />
        </Source>
      )}
    </>
  );
};


export default function LiveMonitoring({ responders, selectedIncidentForMap }) {
  const mapRef = useRef(null);
  const [selectedMapIncident, setSelectedMapIncident] = useState(null);
  const [selectedResponder, setSelectedResponder] = useState(null);
  const [selectedDispatch, setSelectedDispatch] = useState(null);

  const responderBearings = useRef({});

  const [activeFilters, setActiveFilters] = useState([]);
  const [typeSearch, setTypeSearch] = useState('');

  const [activeLocationFilters, setActiveLocationFilters] = useState([]);
  const [locationSearch, setLocationSearch] = useState('');

  const [activeZoneFilters, setActiveZoneFilters] = useState([]);
  const [zoneSearch, setZoneSearch] = useState('');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(true);
  const [showMapMarkers, setShowMapMarkers] = useState(() => {
    const saved = localStorage.getItem('mdrrmo_show_map_markers');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('mdrrmo_show_map_markers', JSON.stringify(showMapMarkers));
  }, [showMapMarkers]);
  const { data: emergencyTypesData } = useQuery({
    queryKey: ['emergencyTypes'],
    queryFn: async () => {
      const response = await fetch('/api/emergency_types');
      return response.json();
    }
  });


  const { data: mapIncidentsData } = useQuery({
    queryKey: ['mapIncidents'],
    queryFn: async () => {
      const response = await fetch('/api/map/incidents');
      return response.json();
    },
    refetchInterval: 3000
  });



  const { data: incidentsData } = useQuery({
    queryKey: ['incidents', 1],
    queryFn: async () => {
      const response = await fetch(`/api/incidents?page=1`);
      return response.json();
    },
    refetchInterval: 3000
  });

  const { data: responderLogsData } = useQuery({
    queryKey: ['responderLogs'],
    queryFn: async () => {
      const response = await fetch('/api/responder_logs');
      return response.json();
    },
    refetchInterval: 3000
  });

  const { data: barangaysData } = useQuery({
    queryKey: ['barangays'],
    queryFn: async () => {
      const response = await fetch('/api/barangays');
      return response.json();
    }
  });

  const mapIncidents = mapIncidentsData || [];
  const incidents = incidentsData?.data || [];

  const responderLogs = responderLogsData || [];
  const emergencyTypes = emergencyTypesData || [];
  const barangays = barangaysData || [];

  const barangayBoundariesGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: barangays.filter(b => b.boundary_polygon).map(b => ({
        type: 'Feature',
        properties: { name: b.barangay_name },
        geometry: typeof b.boundary_polygon === 'string' ? JSON.parse(b.boundary_polygon) : b.boundary_polygon
      }))
    };
  }, [barangays]);

  const getLocationName = (locObj) => {
    if (!locObj) return "Unknown";
    if (typeof locObj === 'string') return locObj;
    return locObj.barangay || locObj.location || locObj.name || "Unknown";
  };

  const getZoneName = (inc) => {
    if (inc.purok) return String(inc.purok);
    if (inc.zone) return String(inc.zone);
    if (inc.location && typeof inc.location === 'object') {
      return inc.location.purok || inc.location.zone || "Unknown";
    }
    return "Unknown";
  };

  const uniqueLocations = useMemo(() => {
    const locs = mapIncidents.map(inc => getLocationName(inc.location)).filter(loc => loc !== "Unknown");
    return [...new Set(locs)].sort();
  }, [mapIncidents]);

  const uniqueZones = useMemo(() => {
    const zones = mapIncidents.map(inc => getZoneName(inc)).filter(z => z !== "Unknown");
    return [...new Set(zones)].sort();
  }, [mapIncidents]);

  const filteredLocations = useMemo(() => {
    return uniqueLocations.filter(loc =>
      String(loc).toLowerCase().includes(locationSearch.toLowerCase())
    );
  }, [uniqueLocations, locationSearch]);

  const filteredZones = useMemo(() => {
    return uniqueZones.filter(z =>
      String(z).toLowerCase().includes(zoneSearch.toLowerCase())
    );
  }, [uniqueZones, zoneSearch]);

  const filteredEmergencyTypes = useMemo(() => {
    return emergencyTypes.filter(type =>
      type.name.toLowerCase().includes(typeSearch.toLowerCase())
    );
  }, [emergencyTypes, typeSearch]);

  const filteredMapIncidents = useMemo(() => {
    return mapIncidents.filter(inc => {
      // Exclude cancelled and rejected incidents
      const status = (inc.status || '').toLowerCase();
      if (['cancelled', 'rejected', 'declined'].includes(status)) return false;

      if (activeFilters.length > 0 && !activeFilters.includes(inc.emergency_type?.name)) return false;
      if (activeLocationFilters.length > 0 && !activeLocationFilters.includes(getLocationName(inc.location))) return false;
      if (activeZoneFilters.length > 0 && !activeZoneFilters.includes(getZoneName(inc))) return false;
      return true;
    });
  }, [mapIncidents, activeFilters, activeLocationFilters, activeZoneFilters]);

  const clusteredIncidents = useMemo(() => {
    const clusters = {};
    filteredMapIncidents.forEach(inc => {
      let lat = parseFloat(inc.latitude);
      let lng = parseFloat(inc.longitude);

      // Fallback: check nested location relation if direct coords are missing
      if ((isNaN(lat) || lat === 0) && inc.location) {
        lat = parseFloat(inc.location.latitude);
        lng = parseFloat(inc.location.longitude);
      }

      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        if (!clusters[key]) {
          clusters[key] = {
            id: inc.id || inc.incident_id,
            coords: [lat, lng],
            incidentsList: [inc],
            count: 1,
            title: inc.emergency_type?.name || "Emergency Incident",
            emoji: inc.emergency_type?.emoji_icon || '⚠️',
            color: inc.emergency_type?.color_hex || '#ef4444',
            barangay: getLocationName(inc.location),
            status: inc.status || "active",
            reportedAt: inc.created_at || "Recently",
            latestIncident: inc
          };
        } else {
          clusters[key].incidentsList.push(inc);
          clusters[key].count += 1;
          if (inc.status !== 'completed') {
            clusters[key].status = inc.status;
          }
        }
      }
    });
    return Object.values(clusters);
  }, [filteredMapIncidents]);

  useEffect(() => {
    if (selectedIncidentForMap && mapRef.current) {
      console.log('Selected Incident for Map:', selectedIncidentForMap);

      let lat = parseFloat(selectedIncidentForMap.latitude);
      let lng = parseFloat(selectedIncidentForMap.longitude);

      // Fallback if coordinates are nested
      if (isNaN(lat) && selectedIncidentForMap.location) {
        lat = parseFloat(selectedIncidentForMap.location.latitude);
        lng = parseFloat(selectedIncidentForMap.location.longitude);
      }

      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        try {
          if (mapRef.current.flyTo) {
            mapRef.current.flyTo({ center: [lng, lat], zoom: 16, duration: 1500 });
          } else if (mapRef.current.getMap) {
            mapRef.current.getMap().flyTo({ center: [lng, lat], zoom: 16, duration: 1500 });
          }
        } catch (e) {
          console.warn('Map flyTo failed:', e);
        }

        // Find the corresponding cluster and open its popup
        const targetCluster = clusteredIncidents.find(cluster =>
          cluster.incidentsList.some(inc => (inc.id === selectedIncidentForMap.id || inc.incident_id === selectedIncidentForMap.incident_id))
        );

        if (targetCluster) {
          setSelectedMapIncident(targetCluster);
        }
      } else {
        console.warn('No valid coordinates found for incident:', selectedIncidentForMap.incident_id);
      }
    }
  }, [selectedIncidentForMap, clusteredIncidents]);

  const toggleFilter = (typeName) => {
    if (activeFilters.includes(typeName)) {
      setActiveFilters(activeFilters.filter(name => name !== typeName));
    } else {
      setActiveFilters([...activeFilters, typeName]);
    }
  };

  const toggleLocationFilter = (locName) => {
    if (activeLocationFilters.includes(locName)) {
      setActiveLocationFilters(activeLocationFilters.filter(name => name !== locName));
    } else {
      setActiveLocationFilters([...activeLocationFilters, locName]);
    }
  };

  const toggleZoneFilter = (zoneName) => {
    if (activeZoneFilters.includes(zoneName)) {
      setActiveZoneFilters(activeZoneFilters.filter(name => name !== zoneName));
    } else {
      setActiveZoneFilters([...activeZoneFilters, zoneName]);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col relative">
      {/* Filters Toolbar - Floating Over the Map */}
      <div className={`absolute top-4 left-4 z-[105] flex gap-2 items-center bg-[#111116]/90 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all overflow-hidden ${isToolbarExpanded ? 'p-2' : 'p-1.5'}`}>
        {isToolbarExpanded ? (
          <>
            <button
              onClick={() => setIsToolbarExpanded(false)}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Minimize Toolbar"
            >
              <span className="text-[10px]">◀</span>
            </button>

            {/* Toggle Map Markers */}
            <button
              onClick={() => setShowMapMarkers(!showMapMarkers)}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-full text-xs font-bold transition-all ${showMapMarkers ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-[#ef4444]/20 border border-[#ef4444]/50 hover:bg-[#ef4444]/30 text-[#ef4444]'}`}
              title={showMapMarkers ? 'Hide Incident Markers' : 'Show Incident Markers'}
            >
              <span className="text-sm">{showMapMarkers ? '👁️' : '🚫'}</span>
              <span className="hidden md:inline">{showMapMarkers ? 'Hide Incidents' : 'Show Incidents'}</span>
            </button>

            {/* Main Filters Button */}
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 bg-[#3b82f6] rounded-full text-white text-xs font-bold transition-all hover:bg-[#2563eb]"
            >
              <span className="text-sm">⚙️</span>
              Filters
              {activeFilters.length + activeLocationFilters.length + activeZoneFilters.length > 0 &&
                <span className="ml-1 px-1.5 py-0.5 bg-white text-[#3b82f6] rounded-full text-[10px] font-black">
                  {activeFilters.length + activeLocationFilters.length + activeZoneFilters.length}
                </span>
              }
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsToolbarExpanded(true)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Expand Toolbar"
          >
            <span className="text-sm">⚙️</span>
          </button>
        )}
      </div>

      <div className="flex-1 w-full rounded-2xl overflow-hidden border border-white/10 cursor-grab relative">
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, width: '100%', height: '100%' }}
          initialViewState={{
            longitude: 124.5772,
            latitude: 8.5204,
            zoom: 13,
            pitch: 60,
            bearing: -20
          }}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          cursor="grab"
          terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
        >
          <Source
            id="mapbox-dem"
            type="raster-dem"
            url="mapbox://mapbox.mapbox-terrain-dem-v1"
            tileSize={512}
            maxzoom={14}
          />
          <Layer
            id="sky"
            type="sky"
            paint={{
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [0.0, 0.0],
              'sky-atmosphere-sun-intensity': 15
            }}
          />



          {/* Opol Zones GeoJSON Overlay */}
          <Source id="opol-zones-source" type="geojson" data="/data/opol_zones.geojson">
            <Layer
              id="opol-zones-labels"
              type="symbol"
              minzoom={13}
              layout={{
                'text-field': ['get', 'zone'],
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 13, 12, 16, 16],
                'text-anchor': 'center'
              }}
              paint={{
                'text-color': '#ffffff',
                'text-halo-color': '#000000',
                'text-halo-width': 1.5
              }}
            />
          </Source>

          {/* Dynamic Barangay Boundaries */}
          <Source id="barangay-boundaries" type="geojson" data={barangayBoundariesGeoJSON}>
            <Layer
              id="barangay-boundaries-line"
              type="line"
              paint={{
                'line-color': '#0a84ff',
                'line-width': ['case',
                  ['in', ['get', 'name'], ['literal', activeLocationFilters.length > 0 ? activeLocationFilters : ['none']]], 4,
                  1
                ],
                'line-opacity': ['case',
                  ['in', ['get', 'name'], ['literal', activeLocationFilters.length > 0 ? activeLocationFilters : ['none']]], 1,
                  0.15
                ]
              }}
            />
            <Layer
              id="barangay-boundaries-fill"
              type="fill"
              paint={{
                'fill-color': '#0a84ff',
                'fill-opacity': ['case',
                  ['in', ['get', 'name'], ['literal', activeLocationFilters.length > 0 ? activeLocationFilters : ['none']]], 0.15,
                  0
                ]
              }}
            />
          </Source>

          {/* Render Responder Logs */}
          {responderLogs.map((report) => {
            // Do not show rejected reports on the map
            if (report.status && report.status.toLowerCase() === 'rejected') return null;

            // Check if responder is currently active and actively responding
            const activeResp = Object.values(responders).find(
              (r) => r.responderId?.toString() === report.responder_id?.toString()
            );

            const currentStatus = activeResp ? (activeResp.status || '').toLowerCase() : '';
            const isResponding = activeResp && !['rejected', 'available', 'offline'].includes(currentStatus);

            // Hide static dispatch marker if responder is actively responding (we will draw a destination marker for them)
            if (isResponding) return null;

            const lat = parseFloat(report.latitude);
            const lng = parseFloat(report.longitude);
            if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

            return (
              <Marker
                key={`dispatch-${report.id}`}
                longitude={lng}
                latitude={lat}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedDispatch(report);
                }}
              >
                <div className="flex flex-col items-center cursor-pointer hover:-translate-y-1 transition-transform">
                  <div style={markerStyle('#0a84ff')}>🎯</div>
                  <div className="bg-[#111116]/90 backdrop-blur-sm border border-[#0a84ff] text-white text-[10px] font-bold px-2 py-1 rounded mt-1 shadow-[0_4px_12px_rgba(10,132,255,0.4)] whitespace-nowrap z-50">
                    Dispatch Loc: {report.responder?.first_name || `Resp ${report.responder_id}`}
                    <span className="text-[#0a84ff] ml-1.5">• {report.status || 'Assigned'}</span>
                  </div>
                </div>
              </Marker>
            );
          })}



          {/* Render Automatic Incident Clusters */}
          {showMapMarkers && clusteredIncidents.map((cluster) => {
            const [lat, lng] = cluster.coords;
            const isCompleted = cluster.status === 'completed';
            return (
              <Marker
                key={`inc-${cluster.id}`}
                longitude={lng}
                latitude={lat}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedMapIncident(cluster);
                }}
              >
                <div style={markerStyle(cluster.color, isCompleted)}>
                  {!isCompleted && cluster.emoji}
                </div>
              </Marker>
            );
          })}

          {/* Render Active Responders */}
          {Object.values(responders).map((resp) => {
            const isRecent = new Date() - new Date(resp.updatedAt) < 120000; // 2 minutes (120000ms)
            if (!isRecent) return null;

            if ((resp.status || '').toLowerCase() === 'offline') return null;

            const respLat = parseFloat(resp.latitude);
            const respLng = parseFloat(resp.longitude);
            if (isNaN(respLat) || isNaN(respLng)) return null;

            let polylineComponent = null;
            let destLat = null;
            let destLng = null;

            // First try to use the exact destination coordinates provided by the mobile app
            if (resp.destLatitude && resp.destLongitude) {
              destLat = parseFloat(resp.destLatitude);
              destLng = parseFloat(resp.destLongitude);
            }

            // Fallback to checking responder logs
            if (destLat === null || destLng === null || destLat === 0 || destLng === 0) {
              const matchingDispatch = responderLogs.find(
                (r) => r.responder_id?.toString() === resp.responderId?.toString() &&
                  (!r.status || r.status.toLowerCase() !== 'rejected')
              );

              if (matchingDispatch && !isNaN(parseFloat(matchingDispatch.latitude))) {
                destLat = parseFloat(matchingDispatch.latitude);
                destLng = parseFloat(matchingDispatch.longitude);
              } else if (resp.incidentId) {
                // Otherwise fallback to the incident location if they have one assigned
                const matchingIncident = incidents.find(
                  (inc) => (inc.id || inc.incident_id)?.toString() === resp.incidentId?.toString()
                );

                if (matchingIncident) {
                  destLat = parseFloat(matchingIncident.latitude);
                  destLng = parseFloat(matchingIncident.longitude);
                }
              }
            }

            const currentStatus = (resp.status || '').toLowerCase();
            const isResponding = !['rejected', 'available', 'offline', 'stand by', 'standby'].includes(currentStatus);

            if (isResponding && destLat !== null && destLng !== null && destLat !== 0 && destLng !== 0) {
              polylineComponent = (
                <React.Fragment>
                  <ResponderMapRoute
                    responderId={resp.responderId}
                    startCoords={[respLng, respLat]}
                    endCoords={[destLng, destLat]}
                  />
                  {/* Render the destination marker */}
                  <Marker longitude={destLng} latitude={destLat} anchor="bottom">
                    <div className="flex flex-col items-center cursor-pointer hover:-translate-y-1 transition-transform">
                      <div style={markerStyle('#ef4444')}>🚨</div>
                      <div className="bg-[#111116]/90 backdrop-blur-sm border border-[#ef4444] text-white text-[10px] font-bold px-2 py-1 rounded mt-1 shadow-[0_4px_12px_rgba(239,68,68,0.4)] whitespace-nowrap z-50">
                        Incident Location
                      </div>
                    </div>
                  </Marker>
                </React.Fragment>
              );
            }

            // Calculate bearing for responder icon
            let bearing = responderBearings.current[resp.responderId]?.bearing || 0;
            const prevLoc = responderBearings.current[resp.responderId]?.loc;
            if (prevLoc && (prevLoc[0] !== respLng || prevLoc[1] !== respLat)) {
              bearing = calculateBearing(prevLoc, [respLng, respLat]);
            }
            responderBearings.current[resp.responderId] = {
              loc: [respLng, respLat],
              bearing: bearing
            };
            const rotationAngle = bearing - 135; // Correcting for 3D isometric front-facing angle

            return (
              <React.Fragment key={`resp-${resp.responderId}`}>
                <Marker
                  longitude={respLng}
                  latitude={respLat}
                  anchor="center"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedResponder(resp);
                  }}
                  style={{ zIndex: 100 }}
                >
                  <div className="flex flex-col items-center cursor-pointer hover:-translate-y-1 transition-transform">
                    {currentStatus === 'offline' ? (
                      <div className="w-8 h-8 bg-gray-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg relative">
                        <span className="text-xs relative z-10">💤</span>
                      </div>
                    ) : !isResponding ? (
                      <div className="w-8 h-8 bg-[#0a84ff] rounded-full border-2 border-white flex items-center justify-center shadow-[0_0_15px_rgba(10,132,255,0.6)] relative">
                        <div className="absolute inset-0 bg-[#0a84ff] rounded-full animate-ping opacity-50"></div>
                        <span className="text-xs relative z-10 text-white">📍</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          width: '54px',
                          height: '54px',
                          backgroundImage: 'url("/images/ambulance_green_screen_1783346989156-removebg-preview.png")',
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          filter: 'drop-shadow(0px 8px 10px rgba(0,0,0,0.5))',
                          transform: `rotate(${rotationAngle}deg)`,
                          transition: 'transform 0.5s ease-out'
                        }}
                      />
                    )}
                    {(() => {
                      const statusColor = currentStatus === 'offline' ? '#8e8e93' : !isResponding ? '#0a84ff' : '#34c759';
                      return (
                        <div
                          className="bg-[#111116]/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded mt-1 whitespace-nowrap z-50 transition-all"
                          style={{
                            border: `1px solid ${statusColor}`,
                            boxShadow: `0 4px 12px ${statusColor}66`,
                            transform: isResponding ? 'translateY(-10px)' : 'translateY(4px)'
                          }}
                        >
                          ID {resp.responderId}
                          <span style={{ color: statusColor, marginLeft: '6px' }}>• {resp.status || 'Active'}</span>
                        </div>
                      );
                    })()}
                  </div>
                </Marker>
                {polylineComponent}
              </React.Fragment>
            );
          })}

          {selectedResponder && (
            <Popup
              longitude={parseFloat(selectedResponder.longitude)}
              latitude={parseFloat(selectedResponder.latitude)}
              anchor="bottom"
              offset={[0, -36]}
              closeOnClick={false}
              onClose={() => setSelectedResponder(null)}
              className="z-[1001] custom-popup"
            >
              <div className="bg-[#111116] p-3 rounded-lg text-white min-w-[200px]">
                <h4 className="m-0 mb-2 pb-2 border-b border-white/10 font-bold text-[#34c759] flex items-center gap-2">
                  <span>🚑</span> Responder Status
                </h4>
                <div className="flex flex-col gap-1.5 text-xs text-gray-300">
                  <p className="m-0"><strong>ID:</strong> {selectedResponder.responderId}</p>
                  <p className="m-0"><strong>Incident:</strong> {selectedResponder.incidentId || 'None'}</p>
                  <p className="m-0"><strong>Last Update:</strong> {new Date(selectedResponder.updatedAt).toLocaleTimeString()}</p>
                </div>
              </div>
            </Popup>
          )}

          {selectedDispatch && (
            <Popup
              longitude={parseFloat(selectedDispatch.longitude)}
              latitude={parseFloat(selectedDispatch.latitude)}
              anchor="bottom"
              offset={[0, -36]}
              closeOnClick={false}
              onClose={() => setSelectedDispatch(null)}
              className="z-[1001] custom-popup"
            >
              <div className="bg-[#111116] p-3 rounded-lg text-white min-w-[200px]">
                <h4 className="m-0 mb-2 pb-2 border-b border-white/10 font-bold text-[#0a84ff] flex items-center gap-2">
                  <span>🚓</span> Dispatch Info
                </h4>
                <div className="flex flex-col gap-1.5 text-xs text-gray-300">
                  <p className="m-0"><strong>Responder:</strong> {selectedDispatch.responder?.first_name || 'ID ' + selectedDispatch.responder_id}</p>
                  <p className="m-0"><strong>Incident:</strong> {selectedDispatch.incident_id || 'N/A'}</p>
                  <p className="m-0 text-[#0a84ff] font-semibold mt-1">Status: {selectedDispatch.status || 'En route'}</p>
                  <p className="m-0 text-[10px] text-gray-500 mt-1">{new Date(selectedDispatch.report_date).toLocaleString()}</p>
                </div>
              </div>
            </Popup>
          )}
        </Map>
      </div>



      {selectedMapIncident && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-[600px] bg-[#111116]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden z-[1001] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]">
          <div className="px-5 py-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
            <h3 className="m-0 text-white text-base font-bold">Incident Details & History</h3>
            <button className="bg-transparent border-none text-[#8e8e93] text-xl cursor-pointer p-1 leading-none rounded-full transition-colors hover:bg-white/10 hover:text-white" onClick={() => setSelectedMapIncident(null)}>✕</button>
          </div>
          <div className="p-5 max-h-[50vh] overflow-y-auto custom-scrollbar">
            <div className="flex gap-3 mb-5">
              <div className="flex-1 bg-white/5 border border-white/5 p-4 rounded-xl text-center">
                <span className="block text-2xl font-bold text-white mb-1">{selectedMapIncident.count}</span>
                <span className="text-[10px] text-[#8e8e93] uppercase tracking-wider font-bold">Total Accidents at Location</span>
              </div>
              <div className="flex-1 bg-white/5 border border-white/5 p-4 rounded-xl text-center">
                <span className="block text-2xl font-bold mb-1" style={{ color: selectedMapIncident.color }}>{selectedMapIncident.emoji}</span>
                <span className="text-[10px] text-[#8e8e93] uppercase tracking-wider font-bold">Primary Hazard Type</span>
              </div>
            </div>

            <h4 className="text-white text-sm font-bold mb-3">Report Log</h4>
            <div className="flex flex-col gap-3">
              {selectedMapIncident.incidentsList.map((inc, i) => (
                <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <strong className="text-white text-sm" style={{ color: inc.emergency_type?.color_hex }}>{inc.emergency_type?.name || 'Emergency'}</strong>
                    <span className="text-xs text-[#8e8e93] font-medium">{inc.created_at ? new Date(inc.created_at).toLocaleString() : 'Recently'}</span>
                  </div>
                  <p className="m-0 mb-1 text-[13px] text-gray-300"><strong>Caller:</strong> {inc.user ? inc.user.first_name : 'Unknown'}</p>
                  <p className="m-0 mb-1 text-[13px] text-gray-300"><strong>Contact:</strong> {inc.user ? inc.user.phone_number : 'Unknown'}</p>
                  <p className="m-0 mb-2 text-[13px] text-gray-300 flex items-center gap-2">
                    <strong>Status:</strong>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${inc.status === 'completed' ? 'bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/30' : 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30'}`}>{inc.status || 'pending'}</span>
                  </p>
                  {inc.incident_data?.description && (
                    <p className="mt-2 mb-0 italic text-gray-400 text-[13px] border-l-2 border-white/10 pl-3 leading-relaxed">"{inc.incident_data.description}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-5xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[85vh]">

            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-white/5">
              <h3 className="m-0 text-white text-lg font-bold flex items-center gap-2">
                <span className="text-xl">⚙️</span> Filters
              </h3>
              <div className="flex gap-4 items-center">
                <button
                  onClick={() => {
                    setActiveFilters([]);
                    setActiveLocationFilters([]);
                    setActiveZoneFilters([]);
                  }}
                  className="text-[#8e8e93] hover:text-white text-sm font-bold transition-colors underline"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="text-gray-400 hover:text-white text-2xl leading-none transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body - 2 Columns */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar flex-1">

              {/* Column 1: Emergency Types */}
              <div className="flex flex-col gap-3">
                <h4 className="text-white text-sm font-bold flex items-center gap-2 m-0">
                  <span>🌍</span> Emergency Types
                </h4>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                  <input
                    type="text"
                    placeholder="Search type..."
                    value={typeSearch}
                    onChange={(e) => setTypeSearch(e.target.value)}
                    className="w-full bg-[#1a1a2e] border border-white/10 text-white text-sm rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:border-[#3b82f6] transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[40vh] custom-scrollbar pr-2">
                  <button
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${activeFilters.length === 0 ? 'bg-[#3b82f6] text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                    onClick={() => setActiveFilters([])}
                  >
                    <span className="text-lg">🌍</span> All Types
                    {activeFilters.length === 0 && <span className="ml-auto">✔️</span>}
                  </button>
                  {filteredEmergencyTypes.map(type => (
                    <button
                      key={type.id}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${activeFilters.includes(type.name) ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/30 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                      onClick={() => toggleFilter(type.name)}
                    >
                      <span className="text-lg">{type.emoji_icon}</span> {type.name}
                      {activeFilters.includes(type.name) && <span className="ml-auto text-[#3b82f6]">✔️</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column 2: Locations (Barangay) */}
              <div className="flex flex-col gap-3">
                <h4 className="text-white text-sm font-bold flex items-center gap-2 m-0">
                  <span>📍</span> Locations
                </h4>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                  <input
                    type="text"
                    placeholder="Search location..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="w-full bg-[#1a1a2e] border border-white/10 text-white text-sm rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:border-[#3b82f6] transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[40vh] custom-scrollbar pr-2">
                  <button
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${activeLocationFilters.length === 0 ? 'bg-[#3b82f6] text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                    onClick={() => setActiveLocationFilters([])}
                  >
                    <span className="text-lg">📍</span> All Locations
                    {activeLocationFilters.length === 0 && <span className="ml-auto">✔️</span>}
                  </button>
                  {filteredLocations.map(loc => (
                    <button
                      key={loc}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${activeLocationFilters.includes(loc) ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/30 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                      onClick={() => toggleLocationFilter(loc)}
                    >
                      <span className="text-lg">📌</span> {loc}
                      {activeLocationFilters.includes(loc) && <span className="ml-auto text-[#3b82f6]">✔️</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="px-6 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl font-bold transition-colors"
              >
                Apply Filters
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
