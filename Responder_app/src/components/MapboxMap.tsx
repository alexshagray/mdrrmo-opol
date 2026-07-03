import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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
  onRouteUpdate,
}: MapboxMapProps) {
  const webViewRef = useRef<WebView>(null);

  // Send coordinates and state updates to Mapbox HTML inside WebView
  useEffect(() => {
    if (webViewRef.current) {
      const data = {
        responderLocation,
        callerLocation,
        incidentLocation,
        isResponding,
      };
      webViewRef.current.postMessage(JSON.stringify(data));
    }
  }, [responderLocation, callerLocation, incidentLocation, isResponding]);

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
        });

        let latestRouteCoords = [];

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
                
                if (!responderMarker) {
                    responderMarker = new mapboxgl.Marker({ element: createMarkerElement('🚑', '#34c759') })
                        .setLngLat(lngLat)
                        .addTo(map);
                } else {
                    responderMarker.setLngLat(lngLat);
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
                
                if (!incidentMarker) {
                    incidentMarker = new mapboxgl.Marker({ element: createMarkerElement('⚠️', '#ef4444') })
                        .setLngLat(lngLat)
                        .addTo(map);
                } else {
                    incidentMarker.setLngLat(lngLat);
                }
            } else if (incidentMarker) {
                if (incidentMarker) incidentMarker.remove();
                incidentMarker = null;
            }

            // Fit Bounds
            if (hasPoints && !data.isResponding) {
                map.fitBounds(bounds, { padding: 50, duration: 1000 });
            }

            // Routing
            if (data.isResponding && data.responderLocation && data.incidentLocation) {
                const start = [data.responderLocation.longitude, data.responderLocation.latitude];
                const end = [data.incidentLocation.longitude, data.incidentLocation.latitude];
                
                getRoute(start, end);
                
                // Keep camera centered on responder when routing
                map.flyTo({ center: start, zoom: 16, pitch: 45 });
            } else {
                if (map.getSource('route')) {
                    map.getSource('route').setData({
                        type: 'Feature',
                        properties: {},
                        geometry: { type: 'LineString', coordinates: [] }
                    });
                }
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
            const data = { responderLocation, callerLocation, incidentLocation, isResponding };
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
