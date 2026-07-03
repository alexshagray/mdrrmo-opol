import React, { useState, useMemo, useEffect, useRef } from 'react';
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useQuery } from '@tanstack/react-query';
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

const ResponderMapRoute = ({ responderId, startCoords, endCoords }) => {
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const lastFetchedStartCoords = useRef(null);

  useEffect(() => {
    if (!startCoords || !endCoords) return;

    let shouldFetch = false;
    if (!lastFetchedStartCoords.current) {
      shouldFetch = true;
    } else {
      const dx = Math.abs(startCoords[0] - lastFetchedStartCoords.current[0]);
      const dy = Math.abs(startCoords[1] - lastFetchedStartCoords.current[1]);
      // ~50m change threshold before re-fetching route to save API calls
      if (dx > 0.0005 || dy > 0.0005) {
         shouldFetch = true;
      }
    }

    if (!shouldFetch) return;
    lastFetchedStartCoords.current = startCoords;

    const fetchRoute = async () => {
      try {
        const query = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );
        const json = await query.json();
        if (json.routes && json.routes.length > 0) {
          setRouteGeoJSON({
            type: 'Feature',
            properties: {},
            geometry: json.routes[0].geometry
          });
        }
      } catch (err) {
        console.error("Mapbox Route Error:", err);
      }
    };
    
    fetchRoute();
  }, [startCoords[0], startCoords[1], endCoords[0], endCoords[1]]);

  if (!routeGeoJSON) {
    return (
      <Source 
        id={`resp-route-src-${responderId}`}
        type="geojson" 
        data={{
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [startCoords, endCoords] }
        }}
      >
        <Layer 
          id={`resp-route-layer-${responderId}`}
          type="line"
          paint={{
            'line-color': '#0a84ff',
            'line-width': 4,
            'line-dasharray': [2, 2]
          }}
        />
      </Source>
    );
  }

  return (
    <Source 
      id={`resp-route-src-${responderId}`}
      type="geojson" 
      data={routeGeoJSON}
    >
      <Layer 
        id={`resp-route-casing-${responderId}`}
        type="line"
        paint={{
          'line-color': '#ffffff',
          'line-width': 8,
          'line-opacity': 1
        }}
      />
      <Layer 
        id={`resp-route-layer-${responderId}`}
        type="line"
        paint={{
          'line-color': '#0a84ff',
          'line-width': 4,
          'line-opacity': 1
        }}
      />
    </Source>
  );
};


export default function LiveMonitoring({ responders }) {
  const [selectedMapIncident, setSelectedMapIncident] = useState(null);
  const [selectedResponder, setSelectedResponder] = useState(null);
  const [selectedDispatch, setSelectedDispatch] = useState(null);

  const [activeFilter, setActiveFilter] = useState('All');
  const [activeSeverity, setActiveSeverity] = useState('All');

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
    }
  });



  const { data: incidentsData } = useQuery({
    queryKey: ['incidents', 1],
    queryFn: async () => {
      const response = await fetch(`/api/incidents?page=1`);
      return response.json();
    }
  });

  const { data: dispatchReportsData } = useQuery({
    queryKey: ['dispatchReports'],
    queryFn: async () => {
      const response = await fetch('/api/dispatch_reports');
      return response.json();
    }
  });

  const mapIncidents = mapIncidentsData || [];
  const incidents = incidentsData?.data || [];

  const dispatchReports = dispatchReportsData || [];

  const emergencyTypes = emergencyTypesData || [];

  const filteredMapIncidents = useMemo(() => {
    return mapIncidents.filter(inc => {
      if (activeFilter !== 'All' && inc.emergency_type?.name !== activeFilter) return false;
      if (activeSeverity !== 'All' && inc.emergency_type?.severity_level !== activeSeverity) return false;
      return true;
    });
  }, [mapIncidents, activeFilter, activeSeverity]);

  const clusteredIncidents = useMemo(() => {
    const clusters = {};
    filteredMapIncidents.forEach(inc => {
      const lat = parseFloat(inc.latitude);
      const lng = parseFloat(inc.longitude);
      
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
            barangay: inc.location || "Unknown",
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



  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Dynamic Map Filters */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-[95%] pointer-events-none">
        
        {/* Type Filters */}
        <div className="flex gap-2 p-1.5 bg-[#111116]/80 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-x-auto pointer-events-auto custom-scrollbar max-w-full">
          <button 
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${activeFilter === 'All' ? 'bg-white text-black' : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}
            onClick={() => setActiveFilter('All')}
          >
            All Types
          </button>
          {emergencyTypes.map(type => (
            <button
              key={type.id}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeFilter === type.name ? 'text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              style={activeFilter === type.name ? { backgroundColor: type.color_hex } : {}}
              onClick={() => setActiveFilter(type.name)}
            >
              <span>{type.emoji_icon}</span> {type.name}
            </button>
          ))}
        </div>

        {/* Severity Filters */}
        <div className="flex gap-2 p-1.5 bg-[#111116]/80 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-auto">
          <button 
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider ${activeSeverity === 'All' ? 'bg-[#3b82f6] text-white' : 'bg-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
            onClick={() => setActiveSeverity('All')}
          >
            Any Severity
          </button>
          {['Low', 'Medium', 'High', 'Critical'].map(sev => (
            <button
              key={sev}
              className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider ${activeSeverity === sev ? 'bg-white text-black shadow-lg' : 'bg-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
              onClick={() => setActiveSeverity(sev)}
            >
              {sev}
            </button>
          ))}
        </div>

      </div>

      <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 cursor-grab relative">
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
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

          {/* Render Dispatch Reports */}
          {dispatchReports.map((report) => {
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
                    <span className="text-[#0a84ff] ml-1.5">• {report.status_note || 'Assigned'}</span>
                  </div>
                </div>
              </Marker>
            );
          })}



          {/* Render Automatic Incident Clusters */}
          {clusteredIncidents.map((cluster) => {
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
            const isRecent = new Date() - new Date(resp.updatedAt) < 120000;
            if (!isRecent) return null;

            const respLat = parseFloat(resp.latitude);
            const respLng = parseFloat(resp.longitude);
            if (isNaN(respLat) || isNaN(respLng)) return null;

            let polylineComponent = null;
            let destLat = null;
            let destLng = null;

            // First check if there's a specific dispatch report for this responder
            const matchingDispatch = dispatchReports.find(
              (r) => r.responder_id?.toString() === resp.responderId?.toString()
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

            if (destLat !== null && destLng !== null && destLat !== 0 && destLng !== 0) {
              polylineComponent = (
                <ResponderMapRoute 
                  responderId={resp.responderId} 
                  startCoords={[respLng, respLat]} 
                  endCoords={[destLng, destLat]} 
                />
              );
            }

            return (
              <React.Fragment key={`resp-${resp.responderId}`}>
                <Marker
                  longitude={respLng}
                  latitude={respLat}
                  anchor="bottom"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedResponder(resp);
                  }}
                >
                  <div className="flex flex-col items-center cursor-pointer hover:-translate-y-1 transition-transform">
                    <div style={markerStyle('#34c759')}>🚑</div>
                    <div className="bg-[#111116]/90 backdrop-blur-sm border border-[#34c759] text-white text-[10px] font-bold px-2 py-1 rounded mt-1 shadow-[0_4px_12px_rgba(52,199,89,0.4)] whitespace-nowrap z-50">
                      ID {resp.responderId} 
                      <span className="text-[#34c759] ml-1.5">• {resp.status || 'Active'}</span>
                    </div>
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
                  <p className="m-0 text-[#0a84ff] font-semibold mt-1">Status: {selectedDispatch.status_note || 'En route'}</p>
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
                <span className="block text-2xl font-bold mb-1" style={{color: selectedMapIncident.color}}>{selectedMapIncident.emoji}</span>
                <span className="text-[10px] text-[#8e8e93] uppercase tracking-wider font-bold">Primary Hazard Type</span>
              </div>
            </div>

            <h4 className="text-white text-sm font-bold mb-3">Report Log</h4>
            <div className="flex flex-col gap-3">
              {selectedMapIncident.incidentsList.map((inc, i) => (
                <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <strong className="text-white text-sm" style={{color: inc.emergency_type?.color_hex}}>{inc.emergency_type?.name || 'Emergency'}</strong>
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
      
    </div>
  );
}
