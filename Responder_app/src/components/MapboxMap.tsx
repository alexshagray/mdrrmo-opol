import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { WebView } from 'react-native-webview';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface MapboxMapProps {
  responderLocation: Coordinate | null;
  callerLocation: Coordinate | null;
  incidentLocation: Coordinate | null;
  isResponding?: boolean;
  isOffRoute?: boolean;
  isFirstPersonView?: boolean;
  boundaryPolygon?: any;
  onRouteUpdate?: (data: {
    totalDistance: number;
    coordinates: Coordinate[];
    instructions: Array<{ text: string; distance: number; index: number }>;
  }) => void;
}

export default function MapboxMap({
  responderLocation,
  callerLocation,
  incidentLocation,
  isResponding = false,
  isOffRoute = false,
  isFirstPersonView = false,
  boundaryPolygon,
  onRouteUpdate,
}: MapboxMapProps) {
  const webViewRef = useRef<WebView>(null);

  // Resolve local image URI for the ambulance icon
  const ambulanceIconUri = Image.resolveAssetSource(require('../../assets/images/ambulance_green_screen_1783346989156-removebg-preview.png')).uri;

  // Send coordinates and state updates to Mapbox HTML inside WebView
  useEffect(() => {
    if (webViewRef.current) {
      const data = {
        responderLocation,
        callerLocation,
        incidentLocation,
        isResponding,
        isOffRoute,
        isFirstPersonView,
        boundaryPolygon,
        ambulanceIconUri,
      };
      webViewRef.current.postMessage(JSON.stringify(data));
    }
  }, [responderLocation, callerLocation, incidentLocation, isResponding, isFirstPersonView, boundaryPolygon, ambulanceIconUri]);

  const mapboxHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <title>Mapbox Map</title>
      
      <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet">
      <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>

      <style>
        body { margin: 0; padding: 0; background-color: #111; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; border-radius: 16px; }
        
        .custom-marker {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            font-size: 20px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>

      <script>
        mapboxgl.accessToken = '${process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoiYWxleHNoYWdyYXkiLCJhIjoiY21xeHNlYnBrMXY1NDJ1cTJtZmRnYzd3eiJ9.KV9UNBsiTYh4bi-tuCaROg"}';
        
        const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
            center: [124.5772, 8.5204],
            zoom: 13,
            attributionControl: false
        });

        let responderMarker = null;
        let callerMarker = null;
        let incidentMarker = null;
        let previousResponderLngLat = null;
        let currentBearing = 0;
        let latestRouteCoords = [];
        
        let markerAnimationId = null;
        let markerCurrentLngLat = null;
        let markerCurrentRot = 0;
        let markerTargetLngLat = null;
        let markerTargetRot = 0;

        function calculateBearing(start, end) {
            const startLat = start[1] * Math.PI / 180;
            const startLng = start[0] * Math.PI / 180;
            const endLat = end[1] * Math.PI / 180;
            const endLng = end[0] * Math.PI / 180;
            const y = Math.sin(endLng - startLng) * Math.cos(endLat);
            const x = Math.cos(startLat) * Math.sin(endLat) -
                      Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
            const bearing = Math.atan2(y, x) * 180 / Math.PI;
            return (bearing + 360) % 360;
        }

        const opolZonesGeoJSON = {
          "type": "FeatureCollection",
          "features": [
            { "type": "Feature", "properties": { "zone": "Zone 1", "barangay": "Barra" }, "geometry": { "type": "Point", "coordinates": [124.60913431051209, 8.512965080504214] } },
            { "type": "Feature", "properties": { "zone": "Zone 2", "barangay": "Barra" }, "geometry": { "type": "Point", "coordinates": [124.6215, 8.5155] } },
            { "type": "Feature", "properties": { "zone": "Zone 3", "barangay": "Barra" }, "geometry": { "type": "Point", "coordinates": [124.6220, 8.5140] } },
            { "type": "Feature", "properties": { "zone": "Zone 4", "barangay": "Barra" }, "geometry": { "type": "Point", "coordinates": [124.6235, 8.5130] } },
            { "type": "Feature", "properties": { "zone": "Zone 5", "barangay": "Barra" }, "geometry": { "type": "Point", "coordinates": [124.6245, 8.5125] } },
            { "type": "Feature", "properties": { "zone": "Zone 1", "barangay": "Igpit" }, "geometry": { "type": "Point", "coordinates": [124.6090, 8.5140] } },
            { "type": "Feature", "properties": { "zone": "Zone 2", "barangay": "Igpit" }, "geometry": { "type": "Point", "coordinates": [124.6080, 8.5135] } },
            { "type": "Feature", "properties": { "zone": "Zone 3", "barangay": "Igpit" }, "geometry": { "type": "Point", "coordinates": [124.6075, 8.5120] } },
            { "type": "Feature", "properties": { "zone": "Zone 1", "barangay": "Poblacion" }, "geometry": { "type": "Point", "coordinates": [124.5775, 8.5220] } },
            { "type": "Feature", "properties": { "zone": "Zone 2", "barangay": "Poblacion" }, "geometry": { "type": "Point", "coordinates": [124.5765, 8.5215] } },
            { "type": "Feature", "properties": { "zone": "Zone 3", "barangay": "Poblacion" }, "geometry": { "type": "Point", "coordinates": [124.5755, 8.5205] } }
          ]
        };
        
        function createMarkerElement(emoji, bgColor) {
            const el = document.createElement('div');
            el.className = 'custom-marker';
            el.style.backgroundColor = bgColor;
            el.style.width = '36px';
            el.style.height = '36px';
            el.innerHTML = emoji;
            return el;
        }

        function createImageMarkerElement(imageUrl) {
            const container = document.createElement('div');
            container.style.width = '0px';
            container.style.height = '0px';
            container.style.position = 'relative';

            const el = document.createElement('div');
            el.className = 'custom-marker responder-icon';
            el.style.backgroundColor = 'transparent';
            el.style.border = 'none';
            el.style.boxShadow = 'none';
            el.style.backgroundImage = 'url("' + imageUrl + '")';
            el.style.backgroundSize = 'contain';
            el.style.backgroundRepeat = 'no-repeat';
            el.style.backgroundPosition = 'center';
            el.style.position = 'absolute';
            
            // Set initial size
            const initialSize = 54;
            el.style.width = initialSize + 'px';
            el.style.height = initialSize + 'px';
            el.style.top = -(initialSize/2) + 'px';
            el.style.left = -(initialSize/2) + 'px';
            el.style.filter = 'drop-shadow(0px 8px 10px rgba(0,0,0,0.5))';
            
            container.appendChild(el);
            return container;
        }

        map.on('load', () => {
            map.addSource('opol-zones', {
                'type': 'geojson',
                'data': opolZonesGeoJSON
            });
            map.addLayer({
                'id': 'opol-zones-labels',
                'type': 'symbol',
                'source': 'opol-zones',
                'minzoom': 13,
                'layout': {
                    'text-field': ['get', 'zone'],
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-size': ['interpolate', ['linear'], ['zoom'], 13, 12, 16, 16],
                    'text-anchor': 'center'
                },
                'paint': {
                    'text-color': '#ffffff',
                    'text-halo-color': '#000000',
                    'text-halo-width': 1.5
                }
            });

            map.addSource('route', {
                'type': 'geojson',
                'data': {
                    'type': 'Feature',
                    'properties': {},
                    'geometry': {
                        'type': 'LineString',
                        'coordinates': latestRouteCoords
                    }
                }
            });

            map.addLayer({
                'id': 'route-casing',
                'type': 'line',
                'source': 'route',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': '#ffffff',
                    'line-width': 10,
                    'line-opacity': 1
                }
            });

            map.addLayer({
                'id': 'route',
                'type': 'line',
                'source': 'route',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': '#0a84ff',
                    'line-width': 6,
                    'line-opacity': 1
                }
            });

            map.addSource('incident-circle', {
                'type': 'geojson',
                'data': {
                    "type": "FeatureCollection",
                    "features": []
                }
            });

            map.addLayer({
                'id': 'incident-circle-fill',
                'type': 'fill',
                'source': 'incident-circle',
                'paint': {
                    'fill-color': '#ef4444',
                    'fill-opacity': 0.2
                }
            });

            map.addLayer({
                'id': 'incident-circle-line',
                'type': 'line',
                'source': 'incident-circle',
                'paint': {
                    'line-color': '#ef4444',
                    'line-width': 2,
                    'line-dasharray': [2, 2]
                }
            });

            const recenterBtn = document.createElement('div');
            recenterBtn.innerHTML = '🎯 Recenter';
            recenterBtn.style.position = 'absolute';
            recenterBtn.style.bottom = '20px';
            recenterBtn.style.right = '20px';
            recenterBtn.style.backgroundColor = '#181822';
            recenterBtn.style.color = '#fff';
            recenterBtn.style.padding = '8px 12px';
            recenterBtn.style.borderRadius = '16px';
            recenterBtn.style.fontFamily = 'sans-serif';
            recenterBtn.style.fontSize = '14px';
            recenterBtn.style.fontWeight = 'bold';
            recenterBtn.style.cursor = 'pointer';
            recenterBtn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
            recenterBtn.style.display = 'none';
            recenterBtn.style.zIndex = '999';
            recenterBtn.style.border = '1px solid #2b2b36';
            recenterBtn.onclick = () => {
                window.userPanned = false;
                recenterBtn.style.display = 'none';
                if (window.latestStart) {
                    map.flyTo({ center: window.latestStart, zoom: 16, pitch: 45 });
                }
            };
            document.body.appendChild(recenterBtn);

            map.on('dragstart', () => { 
                window.userPanned = true; 
                recenterBtn.style.display = 'block';
            });
            map.on('touchstart', () => {
                window.userPanned = true; 
                recenterBtn.style.display = 'block';
            });
        });

        window.userPanned = false;
        window.latestStart = null;
        window.lastIncidentLoc = null;
        window.hasRoute = false;
        window.lastClosestIndex = 0;

        async function getRoute(start, end) {
            try {
                const query = await fetch(
                    \`https://api.mapbox.com/directions/v5/mapbox/driving/\${start[0]},\${start[1]};\${end[0]},\${end[1]}?steps=true&geometries=geojson&access_token=\${mapboxgl.accessToken}\`
                );
                const json = await query.json();
                
                if (json.code === 'InvalidInput') {
                    throw new Error(json.message || 'Coordinates are too close.');
                }
                
                if (!json.routes || json.routes.length === 0) return;
                
                const data = json.routes[0];
                const route = data.geometry.coordinates;
                latestRouteCoords = route;
                window.lastClosestIndex = 0;
                
                if (map.getSource('route')) {
                    map.getSource('route').setData({
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: route
                        }
                    });
                }

            // Optional: send route instructions back to React Native
            const instructions = [];
            let coordIndex = 0;
            data.legs[0].steps.forEach((step) => {
                instructions.push({
                    text: step.maneuver.instruction,
                    distance: step.distance,
                    index: coordIndex
                });
                coordIndex += step.geometry.coordinates.length;
            });

            const payload = {
                type: 'ROUTE_UPDATE',
                totalDistance: data.distance,
                coordinates: route.map(c => ({ latitude: c[1], longitude: c[0] })),
                instructions
            };

            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify(payload));
            }
            } catch (err) {
                console.error("Mapbox Route Error:", err);
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: err.message }));
                }
            }
        }

        function updateMap(data) {
            const bounds = new mapboxgl.LngLatBounds();
            let hasPoints = false;

            // 1. Responder Marker
            if (data.responderLocation) {
                const lngLat = [data.responderLocation.longitude, data.responderLocation.latitude];
                bounds.extend(lngLat);
                hasPoints = true;
                
                if (previousResponderLngLat && (previousResponderLngLat[0] !== lngLat[0] || previousResponderLngLat[1] !== lngLat[1])) {
                    // Update bearing only if location actually changed
                    currentBearing = calculateBearing(previousResponderLngLat, lngLat);
                }
                previousResponderLngLat = lngLat;
                
                // The generated isometric image's front naturally points towards South-East (~135 degrees).
                // We subtract 135 to correct the rotation offset so it faces the actual travel direction.
                const rotationAngle = currentBearing - 135;
                
                if (!responderMarker) {
                    markerCurrentLngLat = lngLat;
                    markerCurrentRot = rotationAngle;
                    responderMarker = new mapboxgl.Marker({ 
                            element: createImageMarkerElement(data.ambulanceIconUri || ''),
                            rotationAlignment: 'map'
                        })
                        .setLngLat(lngLat)
                        .setRotation(rotationAngle)
                        .addTo(map);
                } else {
                    markerTargetLngLat = lngLat;
                    markerTargetRot = rotationAngle;
                    
                    if (markerAnimationId) cancelAnimationFrame(markerAnimationId);
                    
                    let startTimestamp = null;
                    const duration = 1000;
                    const startLngLat = [...markerCurrentLngLat];
                    const startRot = markerCurrentRot;
                    
                    // Handle shortest path rotation wrapping
                    let deltaRot = markerTargetRot - startRot;
                    if (deltaRot > 180) deltaRot -= 360;
                    if (deltaRot < -180) deltaRot += 360;
                    
                    const animateMarker = (timestamp) => {
                        if (!startTimestamp) startTimestamp = timestamp;
                        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                        
                        // Linear interpolation is better for continuous GPS updates
                        markerCurrentLngLat = [
                            startLngLat[0] + (markerTargetLngLat[0] - startLngLat[0]) * progress,
                            startLngLat[1] + (markerTargetLngLat[1] - startLngLat[1]) * progress
                        ];
                        markerCurrentRot = startRot + deltaRot * progress;
                        
                        responderMarker.setLngLat(markerCurrentLngLat);
                        responderMarker.setRotation(markerCurrentRot);
                        
                        if (progress < 1) {
                            markerAnimationId = requestAnimationFrame(animateMarker);
                        }
                    };
                    markerAnimationId = requestAnimationFrame(animateMarker);

                    if (data.ambulanceIconUri) {
                        const iconEl = responderMarker.getElement().querySelector('.responder-icon');
                        if (iconEl) {
                            iconEl.style.backgroundImage = 'url("' + data.ambulanceIconUri + '")';
                        }
                    }
                }

                // Handle camera follow (First Person vs Top Down)
                if (data.isFirstPersonView && !window.userPanned) {
                    map.flyTo({
                        center: lngLat,
                        zoom: 18,
                        pitch: 60,
                        bearing: currentBearing,
                        speed: 1.2
                    });
                } else if (window.wasFirstPersonView && !data.isFirstPersonView) {
                    // Reset to top down if they just toggled it off
                    map.flyTo({
                        pitch: 0,
                        bearing: 0,
                        zoom: 15
                    });
                }
                window.wasFirstPersonView = data.isFirstPersonView;

                // Visually trim the route behind the ambulance
                if (latestRouteCoords && latestRouteCoords.length > 0) {
                    const rLng = lngLat[0];
                    const rLat = lngLat[1];
                    let minDistance = Infinity;
                    let searchStart = window.lastClosestIndex || 0;
                    searchStart = Math.max(0, searchStart - 5); // Allow slight backwards search for drift
                    const searchEnd = Math.min(latestRouteCoords.length, searchStart + 50); // Don't search the whole route to avoid jumping on loops
                    let closestIndex = searchStart;
                    
                    for (let i = searchStart; i < searchEnd; i++) {
                        const coord = latestRouteCoords[i];
                        const dx = rLng - coord[0];
                        const dy = rLat - coord[1];
                        const dist = dx*dx + dy*dy;
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestIndex = i;
                        }
                    }
                    window.lastClosestIndex = closestIndex;
                    
                    if (closestIndex < latestRouteCoords.length) {
                        // Connect current location cleanly to the remaining route
                        const trimmedRoute = [[rLng, rLat], ...latestRouteCoords.slice(closestIndex)];
                        if (map.getSource('route')) {
                            map.getSource('route').setData({
                                type: 'Feature',
                                properties: {},
                                geometry: {
                                    type: 'LineString',
                                    coordinates: trimmedRoute
                                }
                            });
                        }
                    }
                }
            } else if (responderMarker) {
                if (responderMarker) responderMarker.remove();
                responderMarker = null;
            }

            // 2. Caller Marker
            if (data.callerLocation) {
                const lngLat = [data.callerLocation.longitude, data.callerLocation.latitude];
                bounds.extend(lngLat);
                hasPoints = true;
                
                if (!callerMarker) {
                    callerMarker = new mapboxgl.Marker({ element: createMarkerElement('📞', '#3b82f6') })
                        .setLngLat(lngLat)
                        .addTo(map);
                } else {
                    callerMarker.setLngLat(lngLat);
                }
            } else if (callerMarker) {
                if (callerMarker) callerMarker.remove();
                callerMarker = null;
            }

            // 3. Incident Marker
            if (data.incidentLocation) {
                const lngLat = [data.incidentLocation.longitude, data.incidentLocation.latitude];
                bounds.extend(lngLat);
                hasPoints = true;
                
                if (map.getSource('incident-circle')) {
                    const radiusKm = data.incidentLocation.radiusKm || 0.1; // Dynamic radius
                    const points = 64;
                    const distanceX = radiusKm / (111.320 * Math.cos(lngLat[1] * Math.PI / 180));
                    const distanceY = radiusKm / 110.574;
                    const coords = [];
                    for(let i = 0; i < points; i++) {
                        const theta = (i / points) * (2 * Math.PI);
                        coords.push([
                            lngLat[0] + distanceX * Math.cos(theta),
                            lngLat[1] + distanceY * Math.sin(theta)
                        ]);
                    }
                    coords.push(coords[0]);

                    map.getSource('incident-circle').setData({
                        "type": "FeatureCollection",
                        "features": [{
                            "type": "Feature",
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [coords]
                            }
                        }]
                    });
                }
                if (incidentMarker) {
                    incidentMarker.remove();
                    incidentMarker = null;
                }
            } else {
                if (map.getSource('incident-circle')) {
                    map.getSource('incident-circle').setData({
                        "type": "FeatureCollection",
                        "features": []
                    });
                }
                if (incidentMarker) {
                    incidentMarker.remove();
                    incidentMarker = null;
                }
            }

            // Fit Bounds
            if (hasPoints && !data.isResponding) {
                map.fitBounds(bounds, { padding: 50, duration: 1000 });
            }

            // 3. Draw Boundary Polygon (if available)
            if (data.boundaryPolygon) {
                if (!map.getSource('barangay-boundary')) {
                    map.addSource('barangay-boundary', {
                        'type': 'geojson',
                        'data': data.boundaryPolygon
                    });

                    map.addLayer({
                        'id': 'barangay-boundary-fill',
                        'type': 'fill',
                        'source': 'barangay-boundary',
                        'layout': {},
                        'paint': {
                            'fill-color': '#f87171',
                            'fill-opacity': 0.2
                        }
                    });

                    map.addLayer({
                        'id': 'barangay-boundary-line',
                        'type': 'line',
                        'source': 'barangay-boundary',
                        'layout': {},
                        'paint': {
                            'line-color': '#dc2626',
                            'line-width': 3,
                            'line-dasharray': [2, 2]
                        }
                    });

                    // Automatically fit bounds to the polygon
                    const polyBounds = new mapboxgl.LngLatBounds();
                    const coordinates = data.boundaryPolygon.type === 'Polygon' 
                        ? data.boundaryPolygon.coordinates[0]
                        : data.boundaryPolygon.coordinates[0][0]; // Simplified for MultiPolygon
                    
                    if (coordinates) {
                        coordinates.forEach(coord => {
                            polyBounds.extend(coord);
                        });
                        map.fitBounds(polyBounds, { padding: 50, duration: 1000 });
                    }
                }
            }

            // Routing
            if (data.isResponding && data.responderLocation && data.incidentLocation) {
                const start = [data.responderLocation.longitude, data.responderLocation.latitude];
                const end = [data.incidentLocation.longitude, data.incidentLocation.latitude];
                window.latestStart = start;
                
                const endStr = end.join(',');
                if (window.lastIncidentLoc !== endStr || !window.hasRoute || data.isOffRoute) {
                    window.lastIncidentLoc = endStr;
                    window.hasRoute = true;
                    getRoute(start, end);
                }
                
                // Keep camera centered on responder when routing (if not in first person view)
                if (!window.userPanned && !data.isFirstPersonView) {
                    map.flyTo({ center: start, zoom: 16, pitch: 0, bearing: 0 });
                }
            } else {
                if (map.getSource('route')) {
                    map.getSource('route').setData({
                        type: 'Feature',
                        properties: {},
                        geometry: { type: 'LineString', coordinates: [] }
                    });
                }
                window.hasRoute = false;
            }
        }

        // Listen for communication from React Native
        window.addEventListener('message', function(event) {
          try {
            var data = JSON.parse(event.data);
            updateMap(data);
          } catch (e) {}
        });
        document.addEventListener('message', function(event) {
          try {
            var data = JSON.parse(event.data);
            updateMap(data);
          } catch (e) {}
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapboxHtml }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'ROUTE_UPDATE' && onRouteUpdate) {
              onRouteUpdate(data);
            } else if (data.type === 'ERROR') {
              console.error("Mapbox Route Error from WebView:", data.message);
              alert("Mapbox Error: " + data.message);
            }
          } catch (e) {}
        }}
        onLoadEnd={() => {
          if (webViewRef.current) {
            const data = { responderLocation, callerLocation, incidentLocation, isResponding, isOffRoute, ambulanceIconUri };
            webViewRef.current.postMessage(JSON.stringify(data));
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', borderRadius: 20, backgroundColor: '#111' },
  map: { flex: 1, backgroundColor: 'transparent' },
});
