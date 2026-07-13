import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

// Set the access token
MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoiYWxleHNoYWdyYXkiLCJhIjoiY21xeHNlYnBrMXY1NDJ1cTJtZmRnYzd3eiJ9.KV9UNBsiTYh4bi-tuCaROg");

interface Coordinate {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

interface MapboxMapProps {
  responderLocation: Coordinate | null;
  callerLocation: Coordinate | null;
  incidentLocation: Coordinate | null;
  isResponding?: boolean;
  isOffRoute?: boolean;
  isFirstPersonView?: boolean;
  isWithinRadius?: boolean;
  boundaryPolygon?: any;
  onRouteUpdate?: (data: {
    totalDistance: number;
    coordinates: Coordinate[];
    instructions: Array<{ text: string; distance: number; index: number }>;
  }) => void;
  onCallerLocationAdjust?: (coordinate: Coordinate) => void;
  bearing?: number;
}

export default function MapboxMap({
  responderLocation,
  callerLocation,
  incidentLocation,
  isResponding = false,
  isOffRoute = false,
  isFirstPersonView = false,
  isWithinRadius = false,
  boundaryPolygon,
  onRouteUpdate,
  onCallerLocationAdjust,
  bearing = 0,
}: MapboxMapProps) {
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const [routeData, setRouteData] = useState<any>(null);

  // Pre-defined OPOL Zones from WebView implementation
  const opolZonesGeoJSON = {
    type: "FeatureCollection",
    features: []
  };

  useEffect(() => {
    if (isResponding && incidentLocation && responderLocation) {
      // Only calculate route ONCE when incidentLocation or isResponding changes
      getRoute();
    } else if (!isResponding) {
      setRouteData(null);
    }
    // DO NOT depend on responderLocation here, otherwise the route recalculates every second during simulation!
  }, [incidentLocation, isResponding]);

  const decodePolyline = (encoded: string) => {
    let points: [number, number][] = [];
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

  const getRoute = async () => {
    if (!responderLocation || !incidentLocation) return;
    try {
      const start = [responderLocation.longitude, responderLocation.latitude];
      const end = [incidentLocation.longitude, incidentLocation.latitude];
      const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

      if (GOOGLE_API_KEY) {
        try {
          // 1. Google Maps Directions API (Highly Accurate)
          const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${start[1]},${start[0]}&destination=${end[1]},${end[0]}&key=${GOOGLE_API_KEY}`);
          const json = await response.json();
          if (json.routes && json.routes.length > 0) {
            const route = json.routes[0];

            // Concatenate high-resolution step polylines for precise road snapping
            let highResCoords: [number, number][] = [];
            route.legs[0].steps.forEach((step: any) => {
              const stepCoords = decodePolyline(step.polyline.points);
              highResCoords = highResCoords.concat(stepCoords);
            });

            // Add the exact destination pin so the route line connects to it cleanly
            highResCoords.push([end[0], end[1]]);

            // We use highResCoords to render the line so it follows the road perfectly.
            const googleRouteData = {
              distance: route.legs[0].distance.value,
              geometry: { type: 'LineString', coordinates: highResCoords },
              legs: [{
                steps: route.legs[0].steps.map((step: any) => ({
                  distance: step.distance.value,
                  maneuver: { instruction: step.html_instructions.replace(/<[^>]*>?/gm, '') }, // Strip HTML from instructions
                  geometry: { coordinates: decodePolyline(step.polyline.points) }
                }))
              }]
            };

            setRouteData(googleRouteData);
            if (onRouteUpdate) {
              const instructions: any[] = [];
              let coordIndex = 0;
              googleRouteData.legs[0].steps.forEach((step: any) => {
                instructions.push({ text: step.maneuver.instruction, distance: step.distance, index: coordIndex });
                coordIndex += step.geometry.coordinates.length;
              });
              onRouteUpdate({
                totalDistance: googleRouteData.distance,
                coordinates: highResCoords.map((c: any[]) => ({ latitude: c[1], longitude: c[0] })),
                instructions
              });
            }
            return; // Exit if Google succeeds
          }
        } catch (err) {
          console.warn("Google Directions API Error:", err);
        }
      }

      try {
        // 2. Mapbox Directions API (Fallback)
        const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoiYWxleHNoYWdyYXkiLCJhIjoiY21xeHNlYnBrMXY1NDJ1cTJtZmRnYzd3eiJ9.KV9UNBsiTYh4bi-tuCaROg";
        const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${token}`);
        const json = await response.json();
        if (json.routes && json.routes.length > 0) {
          setRouteData(json.routes[0]);
          if (onRouteUpdate) {
            const data = json.routes[0];

            // The route will follow the roads perfectly.
            // We append the exact destination coordinate so it cleanly connects to the pin!
            const coordinates = [...data.geometry.coordinates, [end[0], end[1]]];
            
            const mapboxRouteData = { 
              ...data, 
              geometry: { ...data.geometry, coordinates }
            };
            setRouteData(mapboxRouteData);

            if (onRouteUpdate) {
              const instructions: any[] = [];
              let coordIndex = 0;
              data.legs[0].steps.forEach((step: any) => {
                instructions.push({ text: step.maneuver.instruction, distance: step.distance, index: coordIndex });
                coordIndex += step.geometry.coordinates.length;
              });
              onRouteUpdate({
                totalDistance: data.distance,
                coordinates: data.geometry.coordinates.map((c: any[]) => ({ latitude: c[1], longitude: c[0] })),
                instructions
              });
            }
          }
        }
      } catch (err) {
        console.warn("Mapbox Directions API Error:", err);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const generateCirclePolygon = (center: [number, number], radiusKm: number = 0.1) => {
    const points = 64;
    const coords = [];
    const distanceX = radiusKm / (111.320 * Math.cos(center[1] * Math.PI / 180));
    const distanceY = radiusKm / 110.574;
    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      coords.push([
        center[0] + distanceX * Math.cos(theta),
        center[1] + distanceY * Math.sin(theta)
      ]);
    }
    coords.push(coords[0]);
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        }
      }]
    };
  };

  const hasInitiallyCentered = useRef(false);

  useEffect(() => {
    if (isFirstPersonView && responderLocation && cameraRef.current) {
      // Constantly lock to responder in 3D view
      cameraRef.current.setCamera({
        centerCoordinate: [responderLocation.longitude, responderLocation.latitude],
        zoomLevel: 18,
        pitch: 60,
        heading: bearing,
        animationDuration: 1000
      });
    } else if (responderLocation && cameraRef.current && !hasInitiallyCentered.current) {
      // Center on responder only ONCE on initial load
      hasInitiallyCentered.current = true;
      cameraRef.current.setCamera({
        centerCoordinate: [responderLocation.longitude, responderLocation.latitude],
        zoomLevel: 15,
        pitch: 0,
        heading: 0,
        animationDuration: 1000
      });
    }
  }, [responderLocation, isFirstPersonView, bearing]);

  // Reset pitch and heading when toggling OUT of First Person View
  useEffect(() => {
    if (!isFirstPersonView && responderLocation && cameraRef.current && hasInitiallyCentered.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [responderLocation.longitude, responderLocation.latitude],
        zoomLevel: 15,
        pitch: 0,
        heading: 0,
        animationDuration: 1000
      });
    }
  }, [isFirstPersonView]);

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/satellite-streets-v12"
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [124.5772, 8.5204],
            zoomLevel: 13,
          }}
        />

        {/* 3D Terrain */}
        <MapboxGL.RasterDemSource id="terrain-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1">
          <MapboxGL.Terrain style={{ exaggeration: 1.5 }} />
        </MapboxGL.RasterDemSource>

        {/* OPOL Zones */}
        <MapboxGL.ShapeSource id="opol-zones" shape={opolZonesGeoJSON as any}>
          <MapboxGL.SymbolLayer
            id="opol-zones-labels"
            style={{
              textField: ['get', 'zone'],
              textSize: 14,
              textColor: '#ffffff',
              textHaloColor: '#000000',
              textHaloWidth: 1.5,
            }}
          />
        </MapboxGL.ShapeSource>

        {/* Boundary Polygon */}
        {boundaryPolygon && (
          <MapboxGL.ShapeSource id="boundary" shape={boundaryPolygon}>
            <MapboxGL.FillLayer id="boundary-fill" style={{ fillColor: '#f87171', fillOpacity: 0.2 }} />
            <MapboxGL.LineLayer id="boundary-line" style={{ lineColor: '#dc2626', lineWidth: 3, lineDasharray: [2, 2] }} />
          </MapboxGL.ShapeSource>
        )}

        {/* Incident Circle */}
        {!isWithinRadius && incidentLocation && (
          <MapboxGL.ShapeSource id="incident-circle" shape={generateCirclePolygon([incidentLocation.longitude, incidentLocation.latitude], incidentLocation.radiusKm) as any}>
            <MapboxGL.FillLayer id="incident-fill" style={{ fillColor: '#ef4444', fillOpacity: 0.2 }} />
            <MapboxGL.LineLayer id="incident-line" style={{ lineColor: '#ef4444', lineWidth: 2, lineDasharray: [2, 2] }} />
          </MapboxGL.ShapeSource>
        )}

        {/* Route Line */}
        {!isWithinRadius && routeData && routeData.geometry && (
          <MapboxGL.ShapeSource id="route-source" shape={{
            type: 'Feature',
            properties: {},
            geometry: routeData.geometry
          }}>
            <MapboxGL.LineLayer id="route-casing" style={{ lineColor: '#0047AB', lineWidth: 10, lineCap: 'round', lineJoin: 'round' }} />
            <MapboxGL.LineLayer id="route-line" style={{ lineColor: '#3B82F6', lineWidth: 6, lineCap: 'round', lineJoin: 'round' }} />
          </MapboxGL.ShapeSource>
        )}

        {/* Caller Marker */}
        {!isWithinRadius && callerLocation && (
          <MapboxGL.PointAnnotation
            id="caller"
            coordinate={[callerLocation.longitude, callerLocation.latitude]}
            draggable={!!onCallerLocationAdjust}
            onDragEnd={(e) => {
              if (onCallerLocationAdjust) {
                onCallerLocationAdjust({
                  latitude: e.geometry.coordinates[1],
                  longitude: e.geometry.coordinates[0],
                });
              }
            }}
          >
            <View style={styles.callerMarker}><Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3247/3247310.png' }} style={{ width: 20, height: 20 }} /></View>
          </MapboxGL.PointAnnotation>
        )}

        {/* Responder Marker */}
        {responderLocation && (
          <MapboxGL.PointAnnotation id="responder" coordinate={[responderLocation.longitude, responderLocation.latitude]}>
            <View style={{ width: 54, height: 54 }}>
              <Image
                source={require('../../assets/images/ambulance_green_screen_1783346989156-removebg-preview.png')}
                style={{
                  width: '100%',
                  height: '100%',
                  resizeMode: 'contain',
                  transform: [{ rotate: `${bearing}deg` }]
                }}
              />
            </View>
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', borderRadius: 20, backgroundColor: '#111' },
  map: { flex: 1 },
  callerMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' }
});
