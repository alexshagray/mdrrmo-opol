import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Switch,
  Alert,
  Platform,
  StatusBar,
  Modal,
  Linking,
  PanResponder,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CallDetectorModule } from 'expo-call-detector';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { savePatientCareRecord, fetchUserProfile, updateIncidentStatus, deleteIncident, updateIncidentLocation } from '@/services/api';
import { getSocket, initializeSocket, setTrackingActive } from '@/services/socket';

import MapboxMap from '@/components/MapboxMap';
import { MaterialIcons } from '@expo/vector-icons';
import { robustGeocode, reverseGeocode } from '@/utils/geocoding';

function isPointInPolygon(point: { latitude: number, longitude: number }, geometry: any): boolean {
  if (!geometry || !geometry.coordinates) return false;
  
  const pt = [point.longitude, point.latitude];
  
  const isInsidePolygon = (rings: any[]) => {
    let inside = false;
    const exteriorRing = rings[0];
    for (let i = 0, j = exteriorRing.length - 1; i < exteriorRing.length; j = i++) {
      const xi = exteriorRing[i][0], yi = exteriorRing[i][1];
      const xj = exteriorRing[j][0], yj = exteriorRing[j][1];
      const intersect = ((yi > pt[1]) !== (yj > pt[1]))
          && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  if (geometry.type === 'Polygon') {
    return isInsidePolygon(geometry.coordinates);
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygonRings of geometry.coordinates) {
      if (isInsidePolygon(polygonRings)) return true;
    }
  }
  return false;
}

interface Coordinate {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

interface RouteStep {
  text: string;
  distance: number;
  index: number;
}

// Haversine formula to compute distance in meters between two geocoordinates
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

import { useFocusEffect } from '@react-navigation/native';

export default function TrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const parsedCallerInfo = params.callerInfo ? JSON.parse(params.callerInfo as string) : null;
  const callerInfo = {
    id: parsedCallerInfo?.id || '',
    name: parsedCallerInfo?.name || (params.callerName as string) || '',
    number: parsedCallerInfo?.number || (params.callerNumber as string) || '',
    victimName: parsedCallerInfo?.victimName || (params.victimName as string) || '',
    tracker: parsedCallerInfo?.tracker || '',
    description: parsedCallerInfo?.description || (params.details as string) || '',
  };

  const isRegistered = params.isRegistered !== undefined 
    ? params.isRegistered === 'true' 
    : (parsedCallerInfo ? true : false);
  const isNearAccident = params.isNearAccident === 'true' || !parsedCallerInfo;
  const passedCallerLocation = params.callerLocation ? JSON.parse(params.callerLocation as string) : null;
  const emergencyType = (params.emergencyType as string) || '';
  
  const barangay = (params.barangay as string) || '';
  const purok = (params.purok as string) || '';
  const landmark = (params.landmark as string) || '';
  const callerType = (params.callerType as string) || '';
  const dbIncidentId = (params.dbIncidentId as string) || '';
  const boundaryPolygonStr = (params.boundaryPolygon as string) || '';

  // Parse polygon data if available
  const boundaryPolygon = boundaryPolygonStr ? JSON.parse(boundaryPolygonStr) : null;
  
  const accidentAddress = barangay 
    ? `${purok ? purok + ', ' : ''}${barangay}${landmark ? ' (Near: ' + landmark + ')' : ''}` 
    : (landmark ? landmark : '');

  // Navigation and State Systems
  const [alertAccepted, setAlertAccepted] = useState(true);
  const hasActiveEmergency = !!(params.callerNumber || emergencyType || parsedCallerInfo);
  const [isActiveCall, setIsActiveCall] = useState(hasActiveEmergency);
  const [isPhoneCallActive, setIsPhoneCallActive] = useState(false);
  const [responderLocation, setResponderLocation] = useState<Coordinate | null>(null);
  const [initialDispatchLocation, setInitialDispatchLocation] = useState<Coordinate | null>(null);
  const [distanceToIncident, setDistanceToIncident] = useState<number | null>(null);
  const [isFirstPersonView, setIsFirstPersonView] = useState(false);
  const [isAdjustingPin, setIsAdjustingPin] = useState(params.isNewDispatch === 'true');
  const [callTime, setCallTime] = useState('');

  // Auto-generate timestamp when mounted
  useEffect(() => {
    setCallTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, []);
  const [callerLocation, setCallerLocation] = useState<Coordinate | null>(passedCallerLocation || null);
  const [incidentLocation, setIncidentLocation] = useState<Coordinate | null>(null);
  const [responderInfo, setResponderInfo] = useState<{ id: number; name: string } | null>(null);
  const recordedTimes = useRef({ dispatched: false, enRoute: false });


  const [isRespondingRoute, setIsRespondingRoute] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(!!accidentAddress && parsedCallerInfo !== null);

  // Voice Navigation States
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [spokenSteps, setSpokenSteps] = useState<number[]>([]);
  const [spokenMilestones, setSpokenMilestones] = useState({ m500: false, m200: false, arrived: false });
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [lastSpeechTime, setLastSpeechTime] = useState(0);

  // Simulation parameters for testing in Expo
  const [simulationIndex, setSimulationIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  // Response Status
  const [incidentStatus, setIncidentStatus] = useState('Assigned');

  // Custom Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    isDestructive: boolean;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: 'Cancel',
    isDestructive: false,
    onConfirm: () => {},
  });

  const { height: screenHeight } = Dimensions.get('window');
  const mapHeightValue = useRef(screenHeight * 0.45);
  const mapHeight = useRef(new Animated.Value(mapHeightValue.current)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        let newHeight = mapHeightValue.current + gestureState.dy;
        if (newHeight < 150) newHeight = 150;
        if (newHeight > screenHeight - 200) newHeight = screenHeight - 200;
        mapHeight.setValue(newHeight);
      },
      onPanResponderRelease: (evt, gestureState) => {
        let newHeight = mapHeightValue.current + gestureState.dy;
        if (newHeight < 150) newHeight = 150;
        if (newHeight > screenHeight - 200) newHeight = screenHeight - 200;
        mapHeightValue.current = newHeight;
      }
    })
  ).current;

  // Incident tagging removed as location is now auto-geocoded

  // Initialize socket client and fetch profile
  useEffect(() => {
    const stateSubscription = CallDetectorModule.addListener('onCallStateChanged', ({ state }: { state: number }) => {
      // 1=Ringing, 2=Dialing, 3=Active, 5=Disconnected
      if (state === 1 || state === 2 || state === 3) {
        setIsPhoneCallActive(true);
      } else if (state === 5) {
        setIsPhoneCallActive(false);
      }
    });

    const removedSubscription = CallDetectorModule.addListener('onCallRemoved', () => {
      setIsPhoneCallActive(false);
    });

    return () => {
      stateSubscription.remove();
      removedSubscription.remove();
    };
  }, []);

  useEffect(() => {
    initializeSocket();
    (async () => {
      try {
        const profile = await fetchUserProfile();
        if (profile) {
          setResponderInfo({ id: profile.id, name: profile.name });
        }
      } catch (err) {
        console.warn('[Tracking] Failed to fetch user profile:', err);
      }
    })();
  }, []);

  // Listen for live location updates from the caller via Socket.IO
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleIncidentUpdate = (data: any) => {
        console.log('[Socket] Incident update event received in tracking:', data);
        
        // Match either data.incidentId or data.id (handles varying socket event payloads)
        const updatedId = data.incidentId || data.id;
        const currentId = callerInfo.id;
        
        if (updatedId && String(updatedId) === String(currentId)) {
          const lat = parseFloat(data.latitude);
          const lng = parseFloat(data.longitude);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            setCallerLocation({ latitude: lat, longitude: lng });
            setIncidentLocation({ latitude: lat, longitude: lng });
            
            // Speak guidance notification
            Speech.speak("The caller has updated their GPS location", {
              language: 'en',
              pitch: 1.0,
              rate: 1.0
            });
            
            Alert.alert(
              "Caller Location Updated",
              "The caller has shared their live GPS location. The navigation route has been updated."
            );
          }
        }
      };

      socket.on('incidentUpdate', handleIncidentUpdate);
      return () => {
        socket.off('incidentUpdate', handleIncidentUpdate);
      };
    }
  }, [callerInfo.id]);

  // Stream responder location updates via Socket.IO ONLY when this specific screen is focused
  useFocusEffect(
    useCallback(() => {
      setTrackingActive(true);

      if (!responderLocation || !responderInfo?.id) return;
      
      // Broadcast immediately when location changes
      const emitLocation = () => {
        const socket = getSocket();
        if (socket) {
          const payload = {
            responderId: responderInfo.id,
            responderName: responderInfo?.name || 'Emergency Responder',
            incidentId: isActiveCall ? (callerInfo?.id || null) : null,
            latitude: responderLocation.latitude,
            longitude: responderLocation.longitude,
            destLatitude: isActiveCall ? (incidentLocation?.latitude || null) : null,
            destLongitude: isActiveCall ? (incidentLocation?.longitude || null) : null,
            status: isSimulating ? 'simulating' : incidentStatus
          };
          console.log('[Socket] Emitting responderLocationUpdate:', payload);
          socket.emit('responderLocationUpdate', payload);
        }
      };

      emitLocation();

      // Also strictly broadcast every 5 seconds to prevent server timeouts
      // and handle stationary responders
      const interval = setInterval(() => {
        emitLocation();
      }, 5000);

      // Cleanup when the screen loses focus (e.g., navigated away or pushed to background stack)
      return () => {
        setTrackingActive(false);
        clearInterval(interval);
      };
    }, [responderLocation, responderInfo, callerInfo?.id, isSimulating, incidentStatus, isActiveCall, incidentLocation])
  );

  const emitIncidentUpdate = (incident: any) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('incidentUpdate', incident);
    } else {
      console.warn('Socket not initialized - cannot stream dispatch update');
    }
  };

  const [bearing, setBearing] = useState(0);

  // Watch position and manage coordinates
  useEffect(() => {
    let locationSubscription: any = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let initialLoc: any;
      try {
        // Use getLastKnownPositionAsync first because getCurrentPositionAsync often hangs indefinitely on Android Emulators
        initialLoc = await Location.getLastKnownPositionAsync();
        
        if (!initialLoc) {
          // If no last known position, try getCurrentPosition with a short 5-second timeout
          initialLoc = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Location timeout')), 5000))
          ]);
        }
      } catch (error) {
        console.warn('Could not get current position, using fallback:', error);
        // Fallback to Cagayan de Oro default coordinates so the app doesn't hang!
        initialLoc = {
          coords: {
            latitude: 8.477217,
            longitude: 124.645920
          }
        };
      }
      
      const currentLoc = {
        latitude: initialLoc.coords.latitude,
        longitude: initialLoc.coords.longitude,
      };
      setResponderLocation(currentLoc);
      setInitialDispatchLocation(currentLoc);

      let finalCallerLoc = passedCallerLocation || null;
      if (finalCallerLoc) {
        setCallerLocation(finalCallerLoc);
      }

      if (isNearAccident && finalCallerLoc) {
        setIncidentLocation(finalCallerLoc);
      } else if (accidentAddress) {
        try {
          const geocoded = await robustGeocode(accidentAddress, {
            barangay: barangay,
            purok: purok,
            landmark: landmark
          });
          if (geocoded) {
            const shouldBeLarge = (!landmark || landmark.trim() === '' || landmark === 'undefined') && (barangay || purok);
            setIncidentLocation({
              latitude: geocoded.latitude,
              longitude: geocoded.longitude,
              radiusKm: shouldBeLarge ? 100 : 0.1,
            });
          } else {
            setIncidentLocation({
              latitude: currentLoc.latitude + 0.008,
              longitude: currentLoc.longitude + 0.002,
              radiusKm: 100, // Fallback is also a large uncertain area
            });
          }
        } catch (e) {
          setIncidentLocation({
            latitude: currentLoc.latitude + 0.008,
            longitude: currentLoc.longitude + 0.002,
            radiusKm: 100,
          });
        }
      }
      setIsGeocoding(false);

      let lastLocation = currentLoc;

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (newLoc) => {
          // Reject inaccurate GPS readings (>15 meters)
          if (newLoc.coords.accuracy && newLoc.coords.accuracy > 15) {
            console.warn(`[GPS] Rejected inaccurate location update (Accuracy: ${newLoc.coords.accuracy.toFixed(1)}m)`);
            return;
          }
          if (!isSimulating) {
            const lat1 = lastLocation.latitude * (Math.PI / 180);
            const lon1 = lastLocation.longitude * (Math.PI / 180);
            const lat2 = newLoc.coords.latitude * (Math.PI / 180);
            const lon2 = newLoc.coords.longitude * (Math.PI / 180);

            const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
            let calcBearing = Math.atan2(y, x) * (180 / Math.PI);
            calcBearing = (calcBearing + 360) % 360;

            if (getDistance(lastLocation.latitude, lastLocation.longitude, newLoc.coords.latitude, newLoc.coords.longitude) > 0.002) {
                setBearing(calcBearing);
            }

            const updatedLoc = {
              latitude: newLoc.coords.latitude,
              longitude: newLoc.coords.longitude,
            };
            setResponderLocation(updatedLoc);
            lastLocation = updatedLoc;
          }
        }
      );
    })();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      Speech.stop();
    };
  }, [isSimulating, incidentStatus, isActiveCall, responderInfo, callerInfo?.id]);

  // Auto status update monitor
  useEffect(() => {
    if (!responderLocation || !initialDispatchLocation || !incidentLocation) return;
    
    const distFromStart = getDistance(
      initialDispatchLocation.latitude,
      initialDispatchLocation.longitude,
      responderLocation.latitude,
      responderLocation.longitude
    );

    let distToTarget = getDistance(
      responderLocation.latitude,
      responderLocation.longitude,
      incidentLocation.latitude,
      incidentLocation.longitude
    );

    // If we have a boundary polygon (meaning no specific zone/purok), check if responder is inside it
    if (boundaryPolygon && isPointInPolygon(responderLocation, boundaryPolygon)) {
      distToTarget = 0; // Force distance to 0 to enable "Arrived"
    }

    setDistanceToIncident(distToTarget);

    if (distFromStart >= 50 && !recordedTimes.current.dispatched) {
      recordedTimes.current.dispatched = true;
      if (incidentStatus === 'Assigned') setIncidentStatus('Dispatched');
      FileSystem.writeAsStringAsync(FileSystem.documentDirectory + 'dispatchTime.txt', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })).catch(() => {});
    }

    if (distFromStart >= 150 && !recordedTimes.current.enRoute) {
      recordedTimes.current.enRoute = true;
      setIncidentStatus('En Route');
      FileSystem.writeAsStringAsync(FileSystem.documentDirectory + 'enRouteTime.txt', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })).catch(() => {});
    }
  }, [responderLocation, initialDispatchLocation, incidentLocation]);

  // Voice TTS rules monitor
  useEffect(() => {
    if (!isRespondingRoute || !responderLocation || !incidentLocation || routeCoordinates.length === 0) return;

    const distToTarget = getDistance(
      responderLocation.latitude,
      responderLocation.longitude,
      incidentLocation.latitude,
      incidentLocation.longitude
    );

    if (distToTarget <= 20 && !spokenMilestones.arrived) {
      speakGuidance('You have arrived at the destination');
      setSpokenMilestones((prev) => ({ ...prev, arrived: true }));
      setIsSimulating(false);
      return;
    }

    if (distToTarget <= 200 && distToTarget > 20 && !spokenMilestones.m200) {
      speakGuidance('200 meters remaining');
      setSpokenMilestones((prev) => ({ ...prev, m200: true }));
    }

    if (distToTarget <= 500 && distToTarget > 200 && !spokenMilestones.m500) {
      speakGuidance('500 meters remaining');
      setSpokenMilestones((prev) => ({ ...prev, m500: true }));
    }

    // Removed flawed vertex-based off-route detection. 
    // Mapbox route geometries are sparse, so distance to nearest vertex is often > 50m even when on the road.

    routeSteps.forEach((step) => {
      if (spokenSteps.includes(step.index)) return;

      const stepCoord = routeCoordinates[step.index];
      if (stepCoord) {
        const distToStep = getDistance(
          responderLocation.latitude,
          responderLocation.longitude,
          stepCoord.latitude,
          stepCoord.longitude
        );

        if (distToStep < 25) {
          let speakText = step.text;
          if (speakText.toLowerCase().includes('left')) speakText = 'Turn left';
          else if (speakText.toLowerCase().includes('right')) speakText = 'Turn right';
          else if (speakText.toLowerCase().includes('straight')) speakText = 'Go straight ahead';
          else if (speakText.toLowerCase().includes('continue')) speakText = 'Go straight ahead';

          speakGuidance(speakText);
          setSpokenSteps((prev) => [...prev, step.index]);
        }
      }
    });
  }, [responderLocation, routeCoordinates, routeSteps, isRespondingRoute]);

  const speakGuidance = (text: string) => {
    const now = Date.now();
    if (now - lastSpeechTime > 3000) {
      Speech.speak(text, {
        language: 'en',
        pitch: 1.0,
        rate: 1.0,
      });
      setLastSpeechTime(now);
    }
  };

  const handleRouteUpdate = (data: any) => {
    setRouteCoordinates(data.coordinates);
    setRouteSteps(data.instructions);
    if (isSimulating) {
      setSimulationIndex(0);
    }
  };

  const startResponding = () => {
    if (!responderLocation || !incidentLocation) return;
    setIsRespondingRoute(true);
    setIncidentStatus('Assigned');
    speakGuidance('Navigation started. Go straight ahead.');
    Alert.alert('Response Started', 'Telemetry tracking active. Voice guidance enabled.');
  };

  // Ride simulator timer
  useEffect(() => {
    let simTimer: any;
    if (isSimulating && routeCoordinates.length > 0) {
      simTimer = setInterval(() => {
        setSimulationIndex((prevIndex) => {
          const nextIndex = prevIndex + Math.ceil(routeCoordinates.length / 15);
          if (nextIndex >= routeCoordinates.length - 1) {
            setResponderLocation(routeCoordinates[routeCoordinates.length - 1]);
            clearInterval(simTimer);
            return routeCoordinates.length - 1;
          }
          setResponderLocation(routeCoordinates[nextIndex]);
          return nextIndex;
        });
      }, 3000);
    }
    return () => clearInterval(simTimer);
  }, [isSimulating, routeCoordinates]);

  const startSimulation = () => {
    if (routeCoordinates.length === 0) {
      if (responderLocation && incidentLocation) {
        // Fallback: generate a straight line to simulate
        const fallbackRoute = [];
        const steps = 15;
        const latDiff = incidentLocation.latitude - responderLocation.latitude;
        const lngDiff = incidentLocation.longitude - responderLocation.longitude;
        for (let i = 0; i <= steps; i++) {
          fallbackRoute.push({
            latitude: responderLocation.latitude + (latDiff * (i / steps)),
            longitude: responderLocation.longitude + (lngDiff * (i / steps))
          });
        }
        setRouteCoordinates(fallbackRoute);
        setRouteSteps([{ index: steps, distance: 0, text: 'Arrived' }]);
      } else {
        Alert.alert('No Locations', 'Responder or Incident locations are not initialized.');
        return;
      }
    }
    setIsSimulating(true);
    setSimulationIndex(0);
  };

  const simulateOffRoute = () => {
    if (!responderLocation) return;
    setResponderLocation({
      latitude: responderLocation.latitude + 0.001,
      longitude: responderLocation.longitude + 0.001,
    });
  };

  // Tag Location functions removed

  if (!isActiveCall) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.backgroundGlowTop} />
        <View style={styles.backgroundGlowBottom} />
        <Ionicons name="checkmark-done-circle" size={80} color="#34c759" />
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 16 }}>Awaiting Dispatch</Text>
        <Text style={{ color: '#8e8e93', fontSize: 16, marginTop: 8 }}>You have no active emergency call.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      {/* PHASE 2: Map Navigation Screen (No Top Segmented Tabs Header) */}
        <View style={{ flex: 1 }}>
          


          {/* Map Container */}
          <Animated.View style={[styles.mapContainer, { marginTop: 0, position: 'relative', flex: undefined, height: mapHeight }]}>
            {/* Grabber Area */}
            <View {...panResponder.panHandlers} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, justifyContent: 'center', alignItems: 'center', zIndex: 1000, backgroundColor: 'transparent' }}>
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)', marginBottom: 8 }} />
            </View>
            {isGeocoding ? (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="large" color="#0a84ff" />
                <Text style={styles.mapLoadingText}>Geocoding address...</Text>
              </View>
            ) : (
              <View style={{ flex: 1, position: 'relative' }}>
                <MapboxMap
                  responderLocation={responderLocation}
                  callerLocation={callerLocation}
                  incidentLocation={incidentLocation}
                  isResponding={isRespondingRoute}
                  isOffRoute={isOffRoute}
                  boundaryPolygon={boundaryPolygon}
                  isFirstPersonView={isFirstPersonView}
                  bearing={bearing}
                  isWithinRadius={distanceToIncident !== null && distanceToIncident <= 100}
                  onRouteUpdate={handleRouteUpdate}
                  onCallerLocationAdjust={isAdjustingPin ? (coord) => {
                    setCallerLocation(coord);
                    setIncidentLocation(coord);
                  } : undefined}
                />

                {/* Pin Adjustment Banner */}
                

                {/* Floating OSRM Simulator Buttons inside top-right of Map */}
                <View style={styles.simPanel}>
                  <TouchableOpacity 
                    style={[styles.simBtn, { backgroundColor: isFirstPersonView ? '#0a84ff' : 'rgba(15, 23, 42, 0.9)' }]} 
                    onPress={() => setIsFirstPersonView(!isFirstPersonView)}
                  >
                    <Ionicons name="compass" size={12} color={isFirstPersonView ? '#fff' : '#0a84ff'} style={{ marginRight: 4 }} />
                    <Text style={[styles.simText, { color: isFirstPersonView ? '#fff' : '#0a84ff' }]}>3D View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Bottom Info Card matching Image 1 exactly */}
          <View style={[styles.bottomCard, { paddingVertical: 12, paddingHorizontal: 16 }]}>
            <ScrollView style={{ maxHeight: 200, marginBottom: 5 }} showsVerticalScrollIndicator={false}>
              <View style={[styles.detailsCard, { padding: 0, borderWidth: 0, backgroundColor: 'transparent', marginBottom: 0 }]}>
                <View style={styles.detailItem}>
                  <View style={styles.detailItemLeft}>
                    <Ionicons name="medical" size={16} color="#ef4544" style={styles.detailIcon} />
                    <Text style={styles.detailLabel}>Type</Text>
                  </View>
                  <Text style={styles.detailValue}>{emergencyType || 'Medical Emergency'}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <View style={styles.detailItemLeft}>
                    <Ionicons name="location" size={16} color="#ef4544" style={styles.detailIcon} />
                    <Text style={styles.detailLabel}>Location</Text>
                  </View>
                  <Text style={styles.detailValue}>{accidentAddress}</Text>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailItemLeft}>
                    <Ionicons name="person" size={16} color="#0a84ff" style={styles.detailIcon} />
                    <Text style={styles.detailLabel}>Caller</Text>
                  </View>
                  <Text style={styles.detailValue}>{callerInfo.name}</Text>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailItemLeft}>
                    <Ionicons name="car" size={16} color="#0a84ff" style={styles.detailIcon} />
                    <Text style={styles.detailLabel}>Tracker</Text>
                  </View>
                  <Text style={styles.detailValue}>{callerInfo.tracker || 'Tracker-01'}</Text>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailItemLeft}>
                    <Ionicons name="call" size={16} color="#34c759" style={styles.detailIcon} />
                    <Text style={styles.detailLabel}>Phone</Text>
                  </View>
                  <Text style={[styles.detailValue, { color: '#34c759', fontWeight: '800' }]}>{callerInfo.number}</Text>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailItemLeft}>
                    <Ionicons name="time" size={16} color="#0a84ff" style={styles.detailIcon} />
                    <Text style={styles.detailLabel}>Time</Text>
                  </View>
                  <Text style={styles.detailValue}>Today • {callTime}</Text>
                </View>


              </View>
            </ScrollView>
            


            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              {isPhoneCallActive ? (
                <TouchableOpacity 
                  style={[
                    styles.submitButton, 
                    { flex: 1, backgroundColor: '#ff3b30', shadowColor: '#ff3b30' }
                  ]}
                  onPress={() => {
                    CallDetectorModule.disconnectCall();
                  }}
                >
                  <Ionicons name="call" size={18} color="#fff" style={{ transform: [{ rotate: '135deg' }], marginRight: 6 }} />
                  <Text style={styles.submitButtonText}>Hang Up</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.submitButton, 
                    { flex: 1, backgroundColor: '#34c759', shadowColor: '#34c759' }
                  ]}
                  onPress={() => {
                    const rawNumber = callerInfo.number || '';
                    const cleanNumber = rawNumber.replace(/[^\d+]/g, '');
                    
                    if (cleanNumber.length < 7) {
                      Alert.alert('Invalid Number', `This emergency does not have a valid phone number (Current value: "${rawNumber}"). It must be at least 7 digits.`);
                      return;
                    }
                    
                    // Tell the root layout to ignore any detected calls for the next 15 seconds (since it's our own outgoing call)
                    (global as any).ignoreCallsUntil = Date.now() + 15000;
                    
                    const phoneNumber = `tel:${cleanNumber}`;
                    
                    Linking.openURL(phoneNumber).catch((err) => {
                      Alert.alert('Error', 'Could not open the phone dialer.');
                      console.error('An error occurred', err);
                    });
                  }}
                >
                  <Ionicons name="call" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.submitButtonText}>Call</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.submitButton, { flex: 1, backgroundColor: '#8e8e93', shadowColor: '#8e8e93' }]}
                onPress={() => {
                  setConfirmModalConfig({
                    visible: true,
                    title: 'Reject Dispatch',
                    message: 'Are you sure you want to reject this dispatch and remove it from your screen?',
                    confirmText: 'Reject',
                    cancelText: 'Cancel',
                    isDestructive: true,
                    onConfirm: async () => {
                      const idToUpdate = dbIncidentId || callerInfo.id;
                      if (idToUpdate) {
                        try {
                          await deleteIncident(Number(idToUpdate));
                          emitIncidentUpdate({ id: idToUpdate, status: 'deleted' });
                        } catch (e) {
                          console.warn('Failed to delete on server:', e);
                        }
                      }
                      
                      // Also hang up the phone call automatically if it's still active
                      try {
                        CallDetectorModule.disconnectCall();
                      } catch(err) {}

                      setIsActiveCall(false);
                      setIsSimulating(false);
                      setIncidentStatus('Stand By');
                    }
                  });
                }}
              >
                <Ionicons name="close-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.submitButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>

            {!isRespondingRoute ? (
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => {
                  startResponding();
                  
                  if (incidentLocation) {
                    const latLng = `${incidentLocation.latitude},${incidentLocation.longitude}`;
                    const label = encodeURIComponent(callerInfo.name || 'Emergency Incident');
                    const url = Platform.select({
                      ios: `maps:0,0?q=${label}@${latLng}`,
                      android: `geo:0,0?q=${latLng}(${label})`
                    });
                    if (url) {
                      Linking.openURL(url).catch(() => {
                        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latLng}`);
                      });
                    }
                  }
                }}
                disabled={!responderLocation || !incidentLocation}
              >
                <Text style={styles.submitButtonText}>Respond & Navigate (Maps)</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  { 
                    backgroundColor: distanceToIncident !== null && distanceToIncident <= (incidentLocation?.radiusKm ? incidentLocation.radiusKm * 1000 : 100) ? '#ff453a' : '#555', 
                    shadowColor: distanceToIncident !== null && distanceToIncident <= (incidentLocation?.radiusKm ? incidentLocation.radiusKm * 1000 : 100) ? '#ff453a' : 'transparent' 
                  }
                ]}
                disabled={distanceToIncident === null || distanceToIncident > (incidentLocation?.radiusKm ? incidentLocation.radiusKm * 1000 : 100)}
                onPress={() => {
                  setConfirmModalConfig({
                    visible: true,
                    title: 'Confirm Arrival',
                    message: 'Are you sure you have arrived at the incident location?',
                    confirmText: 'Yes, Arrived',
                    cancelText: 'Cancel',
                    isDestructive: false,
                    onConfirm: async () => {
                      setIncidentStatus('On Scene');
                      FileSystem.writeAsStringAsync(FileSystem.documentDirectory + 'onSceneTime.txt', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })).catch(() => {});
                      setIsRespondingRoute(false);
                      setRouteCoordinates([]);
                      setRouteSteps([]);
                      speakGuidance('You have successfully arrived at the scene.');
                      Speech.stop();
                      setIsActiveCall(false);

                      // Mark incident as completed in the backend
                      const idToUpdate = dbIncidentId || callerInfo.id;
                      if (idToUpdate) {
                        try {
                          await updateIncidentStatus(Number(idToUpdate), 'completed');
                          
                          // Update location to where the responder arrived
                          if (responderLocation) {
                            await updateIncidentLocation(Number(idToUpdate), responderLocation.latitude, responderLocation.longitude);
                            // Also emit the updated incident with the new coordinates
                            emitIncidentUpdate({ 
                              id: idToUpdate, 
                              status: 'completed', 
                              latitude: responderLocation.latitude, 
                              longitude: responderLocation.longitude 
                            });
                          } else {
                            emitIncidentUpdate({ id: idToUpdate, status: 'completed' });
                          }
                          
                        } catch (e) {
                          console.warn('Failed to mark incident as completed:', e);
                        }
                      }

                      let actualLocationName = '';
                      if (responderLocation) {
                        const name = await reverseGeocode(responderLocation.latitude, responderLocation.longitude);
                        if (name) actualLocationName = name;
                      }

                      router.push({
                        pathname: '/(tabs)/pcr',
                        params: {
                          callerInfo: JSON.stringify(callerInfo),
                          accidentAddress: accidentAddress,
                          actualIncidentAddress: actualLocationName,
                          actualArrivalLat: responderLocation?.latitude?.toString() || '',
                          actualArrivalLng: responderLocation?.longitude?.toString() || '',
                          emergencyType: emergencyType,
                          barangay: barangay,
                          purok: purok,
                          landmark: landmark,
                          callerType: callerType,
                          isRegistered: isRegistered ? 'true' : 'false',
                          callerLocation: passedCallerLocation ? JSON.stringify(passedCallerLocation) : '',
                        },
                      });
                    }
                  });
                }}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.submitButtonText}>Arrived on Scene - OK</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tag Incident Location Button removed */}
        </View>

      {/* Incident Area Selection Modal removed */}
      {/* Custom Confirmation Modal */}
      <ConfirmModal
        visible={confirmModalConfig.visible}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmText={confirmModalConfig.confirmText}
        cancelText={confirmModalConfig.cancelText}
        isDestructive={confirmModalConfig.isDestructive}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() => setConfirmModalConfig(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const ConfirmModal = ({ 
  visible, 
  title, 
  message, 
  confirmText, 
  cancelText, 
  isDestructive, 
  onConfirm, 
  onCancel 
}: { 
  visible: boolean, 
  title: string, 
  message: string, 
  confirmText: string, 
  cancelText: string, 
  isDestructive: boolean, 
  onConfirm: () => void, 
  onCancel: () => void 
}) => {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ backgroundColor: '#111116', width: '100%', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: '#1f1f26', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 }}>
          
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: isDestructive ? 'rgba(239, 69, 68, 0.15)' : 'rgba(52, 199, 89, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            <Ionicons name={isDestructive ? "warning" : "checkmark-circle"} size={28} color={isDestructive ? "#ef4544" : "#34c759"} />
          </View>
          
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 12 }}>{title}</Text>
          <Text style={{ color: '#8e8e93', fontSize: 16, fontWeight: '500', lineHeight: 24, marginBottom: 32 }}>{message}</Text>
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              style={{ flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#1f1f26', alignItems: 'center' }} 
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: isDestructive ? '#ef4544' : '#34c759', alignItems: 'center' }} 
              onPress={() => { onConfirm(); onCancel(); }}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{confirmText}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050507',
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    filter: 'blur(80px)',
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: -150,
    right: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
    filter: 'blur(100px)',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111116',
    borderWidth: 1,
    borderColor: '#1f1f26',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  sosPill: {
    backgroundColor: '#ef4544',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: '#ef4544',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  sosPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  alertCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    shadowColor: '#ef4544',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  alertCardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 4,
    backgroundColor: '#ef4544',
  },
  alertHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  bellCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ef4544',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCardTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ef4544',
    letterSpacing: 1.5,
  },
  priorityBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    color: '#ef4544',
    fontSize: 9,
    fontWeight: '800',
  },
  alertCardSubtitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  alertCardDesc: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '500',
    marginTop: 2,
  },
  alertCardTimestamp: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1f1f26',
    paddingTop: 10,
  },
  locationTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8e8e93',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34c759',
    marginRight: 6,
  },
  liveText: {
    color: '#34c759',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  leafletCardContainer: {
    height: 250,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1f1f26',
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#111115',
  },
  mapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  mapLoadingText: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '600',
  },
  mapCompass: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111116',
    borderWidth: 1,
    borderColor: '#2b2b36',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  detailsCard: {
    backgroundColor: '#111115',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1f1f26',
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f26',
  },
  detailItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.35,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '700',
  },
  detailValue: {
    flex: 0.65,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  respondRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  actionButtonMain: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rejectButton: {
    backgroundColor: '#ef4544',
    shadowColor: '#ef4544',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptButton: {
    backgroundColor: '#34c759',
    shadowColor: '#34c759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonMainText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111115',
    borderWidth: 1,
    borderColor: '#1f1f26',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  quickActionSubtitle: {
    fontSize: 10,
    color: '#8e8e93',
    fontWeight: '600',
    marginTop: 2,
  },

  /* PHASE 2 Segmented layouts styles */
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: '#111116',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1f1f26',
    marginTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  headerTabActive: {
    backgroundColor: '#0a84ff',
  },
  headerTabText: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '700',
  },
  headerTabTextActive: {
    color: '#ffffff',
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1f1f26',
    backgroundColor: '#111115',
  },
  simPanel: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'column',
    zIndex: 1000,
    gap: 8,
  },
  simBtn: {
    backgroundColor: 'rgba(17, 17, 22, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderColor: 'rgba(10, 132, 255, 0.3)',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  simText: {
    color: '#0a84ff',
    fontWeight: '800',
    fontSize: 11,
  },
  bottomCard: {
    backgroundColor: '#111115',
    borderRadius: 24,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: '#1f1f26',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f26',
  },
  label: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '700',
  },
  value: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  submitButton: {
    backgroundColor: '#0a84ff',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    shadowColor: '#0a84ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    flexDirection: 'row',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  /* PCR Form tab styles */
  patientContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  subTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabButtonActive: {
    borderBottomColor: '#0a84ff',
  },
  subTabButtonText: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '700',
  },
  subTabButtonTextActive: {
    color: '#0a84ff',
  },
  subTabContent: {
    flex: 1,
    backgroundColor: '#111115',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f1f26',
    marginBottom: 20,
  },
  formSection: {
    paddingBottom: 24,
  },
  sectionLabel: {
    color: '#0a84ff',
    fontSize: 12,
    fontWeight: '800',
    marginVertical: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181822',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2b2b36',
    marginBottom: 12,
  },
  inputWrapperActive: {
    borderColor: '#0a84ff',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    height: '100%',
  },
  checkboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#181822',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2b2b36',
  },
  checkboxLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#34c759',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#34c759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    flexDirection: 'row',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  tagLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.4)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  tagLocationIcon: {
    marginRight: 12,
  },
  tagLocationText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#111115',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderWidth: 1,
    borderColor: '#1f1f26',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1f1f26',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a84ff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  gpsButtonText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 12,
  },
  areaSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8e8e93',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  areaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181822',
    borderWidth: 1,
    borderColor: '#2b2b36',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  areaButtonSelected: {
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderColor: '#0a84ff',
  },
  areaButtonText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  areaButtonCoordinates: {
    fontSize: 11,
    color: '#8e8e93',
    marginTop: 2,
  },
  statusSelectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#181822',
    borderWidth: 1,
    borderColor: '#2b2b36',
  },
  statusSelectBtnActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
    borderColor: '#0a84ff',
  },
  statusSelectText: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '700',
  },
  statusSelectTextActive: {
    color: '#0a84ff',
  },
  activeCallBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  activeCallText: {
    color: '#34c759',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  hangUpButton: {
    backgroundColor: '#ff3b30',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  hangUpText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  adjustPinBanner: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0a84ff',
    shadowColor: '#0a84ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 1000,
  },
  adjustPinTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  adjustPinSubtitle: { color: '#8e8e93', fontSize: 12, marginTop: 4 },
  confirmPinBtn: { backgroundColor: '#0a84ff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  confirmPinText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
});

