import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface GISMapPickerProps {
  onLocationSelected: (location: { latitude: number; longitude: number }) => void;
  initialLocation?: { latitude: number; longitude: number };
  initialZoom?: number;
  hideSearch?: boolean;
}

export default function GISMapPicker({ onLocationSelected, initialLocation, initialZoom = 14, hideSearch = false }: GISMapPickerProps) {
  // Default to Opol, Misamis Oriental
  const defaultLat = initialLocation?.latitude || 8.5133;
  const defaultLng = initialLocation?.longitude || 124.5772;
  
  const webViewRef = useRef<WebView>(null);
  const [selectedCoords, setSelectedCoords] = useState({ latitude: defaultLat, longitude: defaultLng });

  useEffect(() => {
    if (initialLocation?.latitude && initialLocation?.longitude) {
      setSelectedCoords({ latitude: initialLocation.latitude, longitude: initialLocation.longitude });
      webViewRef.current?.injectJavaScript(`
        if (window.map && window.marker) {
          window.map.flyTo({ 
            center: [${initialLocation.longitude}, ${initialLocation.latitude}], 
            zoom: ${initialZoom},
            duration: 1500
          });
          window.marker.setLngLat([${initialLocation.longitude}, ${initialLocation.latitude}]);
        }
        true;
      `);
    }
  }, [initialLocation?.latitude, initialLocation?.longitude, initialZoom]);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet">
        <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
        <style>
          body { padding: 0; margin: 0; font-family: sans-serif; background: #111; }
          #map { height: 100vh; width: 100vw; }
          
          /* Modern Search Bar Styles */
          .search-container {
            position: absolute;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            display: flex;
            background: #1c1c1e; /* Dark theme */
            padding: 6px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            width: 90%;
            border: 1px solid rgba(255,255,255,0.1);
          }
          .search-input {
            flex: 1;
            padding: 10px 14px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: white;
            border-radius: 8px;
            font-size: 15px;
            outline: none;
          }
          .search-input::placeholder { color: #8e8e93; }
          .search-input:focus { border-color: #0a84ff; background: rgba(0,0,0,0.2); }
          .search-btn {
            background: #0a84ff;
            color: white;
            border: none;
            padding: 10px 18px;
            margin-left: 8px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
          }
          .search-btn:active { opacity: 0.7; }

          .custom-marker {
            background-color: #a855f7;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            font-size: 20px;
            width: 36px;
            height: 36px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        ${!hideSearch ? `
        <!-- Custom Search Overlay -->
        <div class="search-container">
          <input type="text" id="search-input" class="search-input" placeholder="Search address or landmark..." />
          <button id="search-btn" class="search-btn">Find</button>
        </div>
        ` : ''}
        
        <div id="map"></div>
        
        <script>
          mapboxgl.accessToken = '${process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoiYWxleHNoYWdyYXkiLCJhIjoiY21xeHNlYnBrMXY1NDJ1cTJtZmRnYzd3eiJ9.KV9UNBsiTYh4bi-tuCaROg"}';

          window.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
            center: [${selectedCoords.longitude}, ${selectedCoords.latitude}],
            zoom: 14,
            attributionControl: false
          });
          
          window.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

          const el = document.createElement('div');
          el.className = 'custom-marker';
          el.innerHTML = '📍';

          window.marker = new mapboxgl.Marker({ element: el, draggable: true })
            .setLngLat([${selectedCoords.longitude}, ${selectedCoords.latitude}])
            .addTo(window.map);

          window.map.on('click', function(e) {
            const lngLat = e.lngLat;
            window.marker.setLngLat(lngLat);
            window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lngLat.lat, lng: lngLat.lng }));
          });

          window.marker.on('dragend', function() {
            const lngLat = window.marker.getLngLat();
            window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lngLat.lat, lng: lngLat.lng }));
          });

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

          window.map.on('load', function() {
            window.map.addSource('opol-zones', {
                'type': 'geojson',
                'data': opolZonesGeoJSON
            });
            window.map.addLayer({
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
          });

          ${!hideSearch ? `
          // Geocoding Logic using Mapbox
          document.getElementById('search-btn').addEventListener('click', async () => {
            const query = document.getElementById('search-input').value.trim();
            if (!query) return;
            
            const btn = document.getElementById('search-btn');
            btn.innerText = '...';
            
            try {
              const searchUrl = \`https://api.mapbox.com/geocoding/v5/mapbox.places/\${encodeURIComponent(query)}.json?access_token=\${mapboxgl.accessToken}&country=ph&bbox=124.4,8.4,124.7,8.6&limit=1\`;
              const res = await fetch(searchUrl);
              const data = await res.json();
              
              if (data.features && data.features.length > 0) {
                const lon = data.features[0].center[0];
                const lat = data.features[0].center[1];
                
                window.map.flyTo({ center: [lon, lat], zoom: 16 });
                window.marker.setLngLat([lon, lat]);
                
                window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lng: lon }));
              } else {
                alert('Location not found. Please try a different landmark.');
              }
            } catch (err) {
              alert('Search failed. Please check your internet connection.');
            } finally {
              btn.innerText = 'Find';
            }
          });

          document.getElementById('search-input').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
              document.getElementById('search-btn').click();
            }
          });
          ` : ''}
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.map}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.lat && data.lng) {
              const coords = { latitude: data.lat, longitude: data.lng };
              setSelectedCoords(coords);
              onLocationSelected(coords);
            }
          } catch (e) {
            console.error('Map parsing error', e);
          }
        }}
        javaScriptEnabled={true}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1f1f26'
  },
  map: {
    flex: 1,
    backgroundColor: '#000'
  }
});
