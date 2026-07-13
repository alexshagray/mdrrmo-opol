import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Dimensions,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  BackHandler,
  Modal,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { CallDetectorModule } from 'expo-call-detector';
import { checkResidentDatabase, reportIncident, getEmergencyTypes, fetchBarangays, addEmergencyType } from '@/services/api';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import GISMapPicker from '@/components/GISMapPicker';
import * as Location from 'expo-location';
import { robustGeocode } from '@/utils/geocoding';
import { ALL_LOCATIONS } from '@/data/opol-locations';
import MapboxGL from '@rnmapbox/maps';

const BARANGAYS = ['Awang', 'Barra', 'Bagocboc', 'Bonbon', 'Cauyunan', 'Igpit', 'Luyong Bonbon', 'Limunda', 'Malanang', 'Nangcaon', 'Patag', 'Poblacion', 'Tingalan', 'Taboc'];

// EMERGENCY_TYPES are now fetched dynamically from the database via API.

const { width } = Dimensions.get('window');

const CALL_STATES: Record<number, string> = {
  1: 'Ringing',
  2: 'Dialing',
  3: 'Active',
  4: 'Holding',
  5: 'Disconnected',
  6: 'Select Phone Account',
  7: 'Connecting',
  8: 'Pulling Call',
};

export default function IncomingCallScreen() {
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const router = useRouter();
  const [callState, setCallState] = useState('Ringing');
  const [callActive, setCallActive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);
  const [emergencyTypes, setEmergencyTypes] = useState<string[]>([]);
  const [barangaysList, setBarangaysList] = useState<any[]>([]);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const types = await getEmergencyTypes();
        setEmergencyTypes(types.map((t: any) => t.name));
      } catch (error) {
        console.warn('Failed to load emergency types, using fallback', error);
        setEmergencyTypes([
          'LANDSLIDE/ MOUNTAIN SEARCH & RESCUE',
          'Medical Emergency',
          'Vehicular Accident',
          'Fire Incident',
          'Drowning',
          'Earthquake/Collapsed Structure',
          'Flood/Water Rescue'
        ]);
      }

      try {
        const bList = await fetchBarangays();
        setBarangaysList(bList);
      } catch (error) {
        console.warn('Failed to load barangays list', error);
      }
    };
    fetchData();
  }, []);

  // Database checks & form state
  const [isCheckingDB, setIsCheckingDB] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [callerDetails, setCallerDetails] = useState<any>(null);
  
  // Manual entry fields for unregistered/missing details
  const [manualName, setManualName] = useState(''); // First Name
  const [manualLastName, setManualLastName] = useState(''); // Last Name
  const [barangay, setBarangay] = useState('');
  const [purok, setPurok] = useState('');
  const [landmark, setLandmark] = useState('');
  const [callerLocation, setCallerLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [incidentDetails, setIncidentDetails] = useState('');
  
  const [isSavingEmergencyType, setIsSavingEmergencyType] = useState(false);
  const [showBrgyModal, setShowBrgyModal] = useState(false);
  const [showPurokModal, setShowPurokModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showLandmarkModal, setShowLandmarkModal] = useState(false);
  const [formErrors, setFormErrors] = useState<{barangay?: boolean, purok?: boolean, incidentDetails?: boolean}>({});

  // Find available puroks for the selected barangay
  const availablePuroks = ALL_LOCATIONS
    .filter(loc => (loc.type === 'zone' || loc.type === 'purok' || loc.type === 'sitio') && loc.barangay === barangay)
    .map(loc => loc.name);

  // Find available landmarks for the selected barangay and purok
  const availableLandmarks = ALL_LOCATIONS
    .filter(loc => {
      const isLandmark = ['landmark', 'school', 'church', 'hospital', 'public_building', 'establishment'].includes(loc.type);
      if (!isLandmark || !loc.barangay || loc.barangay.toLowerCase() !== barangay?.toLowerCase()) return false;
      
      // If a purok is selected and the landmark HAS a zone assigned, filter it.
      // But if the landmark has NO zone assigned, don't hide it (allow it to show).
      if (purok && loc.zone) {
        if (loc.zone !== purok) return false;
      }
      return true;
    })
    .map(loc => loc.name);

  // Pulse animation for the avatar ring (Incoming Call State)
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-geocode effect when address fields change
  useEffect(() => {
    const timeout = setTimeout(async () => {
      // Only geocode if we have at least a barangay
      if (barangay || purok || landmark) {
        try {
          const addressString = `${purok ? purok + ', ' : ''}Barangay ${barangay}, ${landmark ? landmark + ', ' : ''}Opol, Misamis Oriental, Philippines`;
          const geocoded = await robustGeocode(addressString, {
            barangay: barangay,
            purok: purok,
            landmark: landmark
          });
          if (geocoded) {
            setCallerLocation({
              latitude: geocoded.latitude,
              longitude: geocoded.longitude,
            });
          }
        } catch (e) {
          console.log('Auto-geocode failed silently', e);
        }
      }
    }, 1500); // 1.5 seconds delay after typing stops

    return () => clearTimeout(timeout);
  }, [barangay, purok, landmark]);  useEffect(() => {
    // Vibrate pattern for incoming call
    Vibration.vibrate([500, 1000, 500, 1000], true);


    // Pulse animation loop
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // Listen for state changes from the native layer
    const stateSubscription = CallDetectorModule.addListener('onCallStateChanged', ({ state }: { state: number, phoneNumber: string }) => {
      const label = CALL_STATES[state] ?? `State ${state}`;
      setCallState(label);
      // State 3 = Active (call was answered)
      if (state === 3) {
        setCallActive(true);
        Vibration.cancel();
        pulse.stop();
        // Start call duration timer
        if (!timerRef.current) {
          timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        }
      }
      // State 5 = Disconnected
      if (state === 5) {
        handleCallEnded();
      }
    });

    // Listen for call removal
    const removedSubscription = CallDetectorModule.addListener('onCallRemoved', () => {
      handleCallEnded();
    });

    return () => {
      stateSubscription.remove();
      removedSubscription.remove();
      Vibration.cancel();
      pulse.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Strictly prevent ALL navigation (swipe, header back, hardware back) unless explicitly allowed
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isNavigatingAway) {
        return; // Allow navigation
      }

      // Prevent navigation without showing an alert popup
      e.preventDefault();
    });

    return unsubscribe;
  }, [navigation, isNavigatingAway]);

  function handleCallEnded() {
    setIsNavigatingAway(true);
    Vibration.cancel();
    if (timerRef.current) clearInterval(timerRef.current);
    router.canGoBack() ? router.back() : router.replace('/(tabs)/home');
  }

  function formatDuration(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  async function onAnswer() {
    // Optimistically update the UI instantly
    setCallActive(true);
    setCallState('Connecting...');
    Vibration.cancel();
    CallDetectorModule.answerCall();

    // Check backend for caller details
    setIsCheckingDB(true);
    try {
      // Pass the raw phone number string to check if it's registered
      const result = await checkResidentDatabase(phoneNumber ?? '');
      setIsRegistered(result.isRegistered);
      if (result.resident) {
        setCallerDetails(result.resident);
        // Pre-fill name — filter out all known placeholder values
        const PLACEHOLDER_NAMES = ['unknown caller', 'unknown', 'visitor', ''];
        let dbFirstName = (result.resident.first_name || '').trim();
        let dbLastName = (result.resident.last_name || '').trim();
        let fullDbName = (result.resident.full_name || '').trim();
        
        if (PLACEHOLDER_NAMES.includes(fullDbName.toLowerCase())) {
          dbFirstName = '';
          dbLastName = '';
        }
        setManualName(dbFirstName);
        setManualLastName(dbLastName);

        
        // Only try to geocode if they have an address string but no GPS coords
        if (result.resident.address) {
          // Fallback: If DB only has text location without GPS coords, try to geocode it
          if (!result.resident.latitude || !result.resident.longitude) {
            try {
              const geocoded = await Location.geocodeAsync(result.resident.address + ', Misamis Oriental, Philippines');
              if (geocoded.length > 0) {
                setCallerLocation({
                  latitude: geocoded[0].latitude,
                  longitude: geocoded[0].longitude,
                });
              }
            } catch (e) {
              console.warn('Geocoding fallback failed:', e);
            }
          }
        }
        
        if (result.resident.latitude && result.resident.longitude) {
          setCallerLocation({ 
            latitude: parseFloat(result.resident.latitude), 
            longitude: parseFloat(result.resident.longitude) 
          });
        }
      } else {
        setManualName('');
      }


    } catch (error) {
      console.warn('Failed to check resident database:', error);
      setIsRegistered(false);
      setManualName('');
    } finally {
      setIsCheckingDB(false);
    }
  }

  function onReject() {
    setIsNavigatingAway(true);
    CallDetectorModule.rejectCall();
    handleCallEnded();
  }

  function onHangUp() {
    setIsNavigatingAway(true);
    CallDetectorModule.disconnectCall();
  }

  async function handleDispatch() {
    const errors = {
      barangay: !barangay,
      purok: false, // Made optional so barangays without zones can still be dispatched
      incidentDetails: !incidentDetails
    };

    if (errors.barangay || errors.incidentDetails) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsNavigatingAway(true);
    // Prepare params to pass to the tracking screen
    // Always use what the responder actually typed in the input box!
    let passName = 'Unknown Caller';
    if (isRegistered && manualName) {
      // If it's a registered user, they might just have manualName displaying their full name (from the earlier full_name logic).
      // Or they might have first and last separated. If it's verified, manualName + manualLastName are prepopulated.
      passName = `${manualName} ${manualLastName}`.trim();
    } else {
      passName = `${manualName} ${manualLastName}`.trim();
    }
    if (!passName) passName = 'Unknown Caller';

    let passLat = callerLocation?.latitude || callerDetails?.latitude;
    let passLng = callerLocation?.longitude || callerDetails?.longitude;
    
    // Auto-geocode if missing coordinates before dispatch
    if (!passLat || !passLng) {
      try {
        const addressStr = barangay ? `${purok ? purok + ', ' : ''}${barangay}${landmark ? ' (Near: ' + landmark + ')' : ''}` : (landmark || '');
        if (addressStr) {
          const geocoded = await robustGeocode(addressStr, {
            barangay: barangay,
            purok: purok,
            landmark: landmark
          });
          if (geocoded) {
            passLat = geocoded.latitude;
            passLng = geocoded.longitude;
          }
        }
      } catch (e) {
        console.warn('Geocoding before dispatch failed', e);
      }
    }

    // Auto-submit incident to Staff2 dashboard and capture the DB numeric id
    let dbIncidentId = '';
    if (phoneNumber) {
      try {
        const result = await reportIncident({
          incident_id: '',
          caller_name: passName,
          caller_number: phoneNumber,
          latitude: passLat || 8.5204, // Fallback to Opol center if totally unknown
          longitude: passLng || 124.5772,
          emergency_type: incidentDetails || 'Emergency Call',
          status: 'active',
          barangay: barangay,
          purok: purok,
          landmark: landmark
        });
        // Capture the real DB id (numeric) returned by the backend
        if (result?.incident_id) {
          dbIncidentId = String(result.incident_id);
        }
      } catch (e) {
        console.warn('Failed to auto-submit incident report', e);
      }
    }

    // Calculate boundary polygon if no purok is selected
    let boundaryPolygon = '';
    if (!purok && barangaysList.length > 0) {
      const selectedBarangayData = barangaysList.find(b => b.barangay_name.toLowerCase() === barangay.toLowerCase());
      if (selectedBarangayData && selectedBarangayData.boundary_polygon) {
        boundaryPolygon = typeof selectedBarangayData.boundary_polygon === 'string' 
          ? selectedBarangayData.boundary_polygon 
          : JSON.stringify(selectedBarangayData.boundary_polygon);
      }
    }

    router.replace({ 
      pathname: '/(tabs)/tracking', 
      params: { 
        callerNumber: phoneNumber,
        callerName: passName,
        details: incidentDetails,
        emergencyType: incidentDetails,
        barangay: barangay,
        purok: purok,
        landmark: landmark,
        callerType: isRegistered ? 'Resident' : 'Visitor',
        callerLocation: passLat ? JSON.stringify({latitude: passLat, longitude: passLng}) : '',
        isRegistered: isRegistered ? 'true' : 'false',
        gpsEnabled: passLat ? 'true' : 'false',
        dbIncidentId: dbIncidentId,
        isNewDispatch: 'true',
      } 
    });
  }


  const getMapHTML = (lat: number, lng: number) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet">
      <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
      <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #0d0d14; }
        #map { width: 100%; height: 100%; border-radius: 16px; }
        .pulsing-marker {
          background-color: #22c55e;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 15px #22c55e;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        mapboxgl.accessToken = '${process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoiYWxleHNoYWdyYXkiLCJhIjoiY21xeHNlYnBrMXY1NDJ1cTJtZmRnYzd3eiJ9.KV9UNBsiTYh4bi-tuCaROg"}';
        var map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: [${lng}, ${lat}],
          zoom: 16,
          attributionControl: false,
          interactive: false
        });
        
        var el = document.createElement('div');
        el.className = 'pulsing-marker';

        var marker = new mapboxgl.Marker(el)
          .setLngLat([${lng}, ${lat}])
          .addTo(map);

        var popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML("<b style='color:#0d0d14'>Verified Location</b><br>GPS Active");
        
        marker.setPopup(popup).togglePopup();
      </script>
    </body>
    </html>
  `;

  const initials = phoneNumber ? phoneNumber.slice(-2) : '??';

  if (!callActive) {
    // INCOMING CALL UI (Ringing)
    return (
      <View style={styles.container}>
        <View style={styles.bgTop} />
        <View style={styles.bgBottom} />

        <View style={styles.callerSection}>
          <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.phoneNumber}>{phoneNumber ?? 'Unknown Caller'}</Text>
          <Text style={styles.callStatus}>{callState}</Text>
        </View>

        <View style={styles.actionsSection}>
          <View style={styles.incomingActions}>
            <View style={styles.callBtnWrapper}>
              <TouchableOpacity style={[styles.callBtn, styles.rejectBtn]} onPress={onReject} activeOpacity={0.8}>
                <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
              <Text style={styles.callBtnLabel}>Decline</Text>
            </View>
            <View style={styles.callBtnWrapper}>
              <TouchableOpacity style={[styles.callBtn, styles.acceptBtn]} onPress={onAnswer} activeOpacity={0.8}>
                <Ionicons name="call" size={32} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.callBtnLabel}>Accept</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ACTIVE CALL UI (Data Collection & Map)
  return (
    <KeyboardAvoidingView 
      style={styles.activeContainer} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Emergency Call</Text>
          <Text style={styles.headerPhone}>{phoneNumber}</Text>
        </View>
        <View style={styles.timerBadge}>
          <View style={styles.recordingDot} />
          <Text style={styles.timerText}>{formatDuration(duration)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Status Section */}
        {isCheckingDB ? (
          <View style={styles.statusCard}>
            <ActivityIndicator color="#0a84ff" />
            <Text style={styles.statusText}>Locating caller in database...</Text>
          </View>
        ) : isRegistered && callerDetails ? (
          <View style={[styles.statusCard, styles.registeredCard]}>
            <Ionicons name="shield-checkmark" size={24} color="#22c55e" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.registeredTitle}>Verified Resident</Text>
              <Text style={styles.registeredSubtitle}>{callerDetails.full_name}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.statusCard, styles.unregisteredCard]}>
            <Ionicons name="warning" size={24} color="#f59e0b" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.unregisteredTitle}>Visitor (Unregistered)</Text>
              <Text style={styles.unregisteredSubtitle}>Categorized as Visitor. Manual details required.</Text>
            </View>
          </View>
        )}

        {/* Use Saved Address Shortcut if GPS/Address available */}
        {isRegistered && callerDetails?.address && (
          <TouchableOpacity 
            style={[styles.statusCard, { backgroundColor: '#1a4bbd', marginTop: 10 }]} 
            onPress={() => {
              const lowerAddr = callerDetails.address.toLowerCase();
              
              // 1. Extract Barangay
              let foundBrgy = '';
              for (const b of BARANGAYS) {
                if (lowerAddr.includes(b.toLowerCase())) {
                  foundBrgy = b;
                  break;
                }
              }
              setBarangay(foundBrgy);

              // 2. Extract Purok (e.g., "Purok 3" or "Purok III")
              const purokMatch = lowerAddr.match(/purok\s+([a-z0-9]+)/i);
              if (purokMatch) {
                setPurok('Purok ' + purokMatch[1].toUpperCase());
              }

              // 3. Clear Landmark so they can type a specific one if needed
              setLandmark('');

              // 4. Auto Track GPS
              if (callerDetails.latitude && callerDetails.longitude) {
                setCallerLocation({
                  latitude: parseFloat(callerDetails.latitude),
                  longitude: parseFloat(callerDetails.longitude)
                });
              }
              Alert.alert('Address Applied', 'Barangay, Zone, and GPS location have been auto-filled.');
            }}
          >
            <Ionicons name="location" size={24} color="#fff" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Use Saved Home Address</Text>
              <Text style={{ color: '#b3d4ff', fontSize: 13, marginTop: 4 }}>{callerDetails.address}</Text>
            </View>
          </TouchableOpacity>
        )}



        {/* Data Collection Form */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Incident Details</Text>
          
          {isRegistered && (manualName || manualLastName) ? (
            /* Registered resident — name is already known, show read-only */
            <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0d2e0d', borderColor: '#22c55e' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="shield-checkmark" size={16} color="#22c55e" style={{ marginRight: 8 }} />
                <Text style={{ color: '#22c55e', fontSize: 15, fontWeight: '600', flex: 1 }}>{`${manualName} ${manualLastName}`.trim()}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  /* Allow override if needed */
                  Alert.alert(
                    'Edit Name',
                    'The name is auto-filled from the resident database. Do you want to change it?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Edit', onPress: () => setIsRegistered(false) },
                    ]
                  );
                }}
                style={{ padding: 4 }}
              >
                <Ionicons name="pencil" size={14} color="#22c55e" />
              </TouchableOpacity>
            </View>
          ) : (
            /* Visitor / unknown caller — responder needs to ask and type the name */
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="First Name"
                placeholderTextColor="#666"
                value={manualName}
                onChangeText={setManualName}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Last Name"
                placeholderTextColor="#666"
                value={manualLastName}
                onChangeText={setManualLastName}
              />
            </View>
          )}

              <Text style={styles.label}>Barangay <Text style={styles.requiredAsterisk}>*</Text></Text>
              <TouchableOpacity 
                style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, formErrors.barangay && styles.inputError]} 
                onPress={() => { setShowBrgyModal(true); setFormErrors(prev => ({...prev, barangay: false})); }}
              >
                <Text style={{ color: barangay ? '#fff' : '#666', fontSize: 15, flex: 1 }}>{barangay || 'Select Barangay'}</Text>
                {barangay ? (
                  <TouchableOpacity onPress={() => { setBarangay(''); setPurok(''); setLandmark(''); }} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={18} color="#8e8e93" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-down" size={18} color="#666" />
                )}
              </TouchableOpacity>
              {formErrors.barangay && <Text style={styles.errorText}>Barangay is required.</Text>}

              <Text style={styles.label}>Zone <Text style={styles.requiredAsterisk}>*</Text></Text>
              {availablePuroks.length > 0 ? (
                <TouchableOpacity 
                  style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, formErrors.purok && styles.inputError]} 
                  onPress={() => { setShowPurokModal(true); setFormErrors(prev => ({...prev, purok: false})); }}
                >
                  <Text style={{ color: purok ? '#fff' : '#666', fontSize: 15, flex: 1 }}>{purok || 'Select Zone'}</Text>
                  {purok ? (
                    <TouchableOpacity onPress={() => { setPurok(''); setLandmark(''); }} style={{ padding: 4 }}>
                      <Ionicons name="close-circle" size={18} color="#8e8e93" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-down" size={18} color="#666" />
                  )}
                </TouchableOpacity>
              ) : (
                <TextInput
                  style={[styles.input, formErrors.purok && styles.inputError]}
                  placeholder="Enter Zone"
                  placeholderTextColor="#666"
                  value={purok}
                  onChangeText={(val) => { setPurok(val); setFormErrors(prev => ({...prev, purok: false})); }}
                />
              )}
              {formErrors.purok && <Text style={styles.errorText}>Zone is required.</Text>}

              <Text style={styles.label}>Landmark</Text>
              {availableLandmarks.length > 0 ? (
                <View style={[styles.input, { paddingVertical: 6, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' }]}>
                  <TouchableOpacity 
                    style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} 
                    onPress={() => setShowLandmarkModal(true)}
                  >
                    <Text style={{ color: landmark ? '#fff' : '#666', fontSize: 15, flex: 1 }}>{landmark || 'Select Landmark'}</Text>
                    {landmark ? (
                      <TouchableOpacity onPress={() => setLandmark('')} style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={18} color="#8e8e93" />
                      </TouchableOpacity>
                    ) : (
                      <Ionicons name="chevron-down" size={18} color="#666" />
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Enter Landmark"
                  placeholderTextColor="#666"
                  value={landmark}
                  onChangeText={setLandmark}
                />
              )}
          <Text style={styles.label}>Nature of Emergency <Text style={styles.requiredAsterisk}>*</Text></Text>
          <View style={[styles.input, { paddingVertical: 6, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' }, formErrors.incidentDetails && styles.inputError]}>
            <TouchableOpacity 
              style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} 
              onPress={() => { setShowEmergencyModal(true); setFormErrors(prev => ({...prev, incidentDetails: false})); }}
            >
              <Text style={{ color: incidentDetails ? '#fff' : '#666', fontSize: 15, flex: 1 }}>{incidentDetails || 'Select Emergency Type'}</Text>
              {incidentDetails ? (
                <TouchableOpacity onPress={() => setIncidentDetails('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color="#8e8e93" />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-down" size={18} color="#666" />
              )}
            </TouchableOpacity>
          </View>
          {formErrors.incidentDetails && <Text style={styles.errorText}>Nature of Emergency is required.</Text>}
        </View>

      </ScrollView>

      {/* Persistent Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.dispatchBtn} onPress={handleDispatch} activeOpacity={0.8}>
          <Ionicons name="document-text" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.dispatchBtnText}>Create Dispatch Report</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.hangUpBtn} onPress={onHangUp} activeOpacity={0.8}>
          <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
      {/* Modals */}
      <SearchableSelectModal 
        visible={showBrgyModal} 
        onClose={() => setShowBrgyModal(false)} 
        data={BARANGAYS} 
        onSelect={(b) => {
          if (b !== barangay) {
            setBarangay(b);
            setPurok(''); // Reset purok when barangay changes
            setLandmark(''); // Reset landmark when barangay changes
          }
        }} 
        title="Select Barangay" 
      />
      <SearchableSelectModal 
        visible={showPurokModal} 
        onClose={() => setShowPurokModal(false)} 
        data={availablePuroks} 
        onSelect={setPurok} 
        title={`Select Zone in ${barangay}`} 
        allowCustomAdd={true}
      />
      <SearchableSelectModal 
        visible={showEmergencyModal} 
        onClose={() => setShowEmergencyModal(false)} 
        data={emergencyTypes} 
        onSelect={async (val: string) => {
          setIncidentDetails(val);
          // If this type is NOT already in the list, save it to DB immediately
          if (!emergencyTypes.some(t => t.toLowerCase() === val.toLowerCase())) {
            setIsSavingEmergencyType(true);
            await addEmergencyType(val);
            // Optimistically add to local list so it appears in future dropdowns this session
            setEmergencyTypes(prev => Array.from(new Set([...prev, val])).sort());
            setIsSavingEmergencyType(false);
          }
        }} 
        title="Select Nature of Emergency" 
        allowCustomAdd={true}
        isSaving={isSavingEmergencyType}
      />
      <SearchableSelectModal 
        visible={showLandmarkModal} 
        onClose={() => setShowLandmarkModal(false)} 
        data={availableLandmarks} 
        onSelect={setLandmark} 
        title={`Select Landmark in ${barangay}`} 
        allowCustomAdd={true}
      />
    </KeyboardAvoidingView>
  );
}

const SearchableSelectModal = ({ visible, onClose, data, onSelect, title, allowCustomAdd, isSaving }: { visible: boolean, onClose: () => void, data: string[], onSelect: (val: string) => void, title: string, allowCustomAdd?: boolean, isSaving?: boolean }) => {
  const [search, setSearch] = useState('');
  // Deduplicate data and sort alphabetically
  const uniqueData = Array.from(new Set(data)).filter(Boolean).sort();
  const filtered = uniqueData.filter(item => item.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#111116', height: '65%', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24, borderWidth: 1, borderColor: '#1f1f26', shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.5, shadowRadius: 20 }}>
          
          {/* Drag Handle */}
          <View style={{ width: 44, height: 5, backgroundColor: '#2b2b36', borderRadius: 3, alignSelf: 'center', marginBottom: 20 }} />
          
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 }}>{title}</Text>
              {isSaving && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <ActivityIndicator size="small" color="#0a84ff" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#0a84ff', fontSize: 13, fontWeight: '700' }}>Saving to system...</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#1f1f26', padding: 8, borderRadius: 16 }} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#8e8e93" />
            </TouchableOpacity>
          </View>
          
          {/* Search Bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#16161b', borderWidth: 1, borderColor: '#2b2b36', borderRadius: 16, paddingHorizontal: 16, marginBottom: 20, height: 54 }}>
            <Ionicons name="search" size={20} color="#8e8e93" style={{ marginRight: 10 }} />
            <TextInput 
              style={{ flex: 1, color: '#fff', fontSize: 16, fontWeight: '500' }} 
              placeholder="Search or type to add..." 
              placeholderTextColor="#666"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={18} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {/* List Content */}
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20, gap: 10 }}>
            {allowCustomAdd && search.trim().length > 0 && !uniqueData.some(d => d.toLowerCase() === search.trim().toLowerCase()) && (
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10, 132, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.3)', borderStyle: 'dashed', padding: 16, borderRadius: 16 }} 
                onPress={() => { onSelect(search.trim()); setSearch(''); onClose(); }}
                activeOpacity={0.7}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(10, 132, 255, 0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Ionicons name="add" size={20} color="#0a84ff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#0a84ff', fontSize: 15, fontWeight: '800' }}>Add new entry</Text>
                  <Text style={{ color: 'rgba(10, 132, 255, 0.7)', fontSize: 13, fontWeight: '600', marginTop: 2 }}>"{search.trim()}"</Text>
                </View>
              </TouchableOpacity>
            )}
            
            {filtered.length === 0 && search.trim().length > 0 && !allowCustomAdd && (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                <Ionicons name="search-outline" size={40} color="#2b2b36" style={{ marginBottom: 12 }} />
                <Text style={{ color: '#8e8e93', fontSize: 15, fontWeight: '600' }}>No matches found</Text>
              </View>
            )}

            {filtered.map((item, index) => (
              <TouchableOpacity 
                key={`${item}-${index}`} 
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#16161b', borderWidth: 1, borderColor: '#1f1f26', padding: 16, borderRadius: 16 }} 
                onPress={() => { onSelect(item); setSearch(''); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>{item}</Text>
                <Ionicons name="chevron-forward" size={20} color="#3b3b46" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d14',
    alignItems: 'center',
  },
  activeContainer: {
    flex: 1,
    backgroundColor: '#050507',
  },
  bgTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '55%',
    backgroundColor: '#0a1628',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  bgBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '50%',
    backgroundColor: '#0d0d14',
  },
  callerSection: {
    marginTop: 100,
    alignItems: 'center',
  },
  avatarRing: {
    position: 'absolute',
    width: 140, height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(39, 134, 255, 0.35)',
  },
  avatar: {
    width: 110, height: 110,
    borderRadius: 55,
    backgroundColor: '#1a4bbd',
    borderWidth: 3,
    borderColor: '#2786ff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },
  avatarText: {
    color: '#fff', fontSize: 36, fontWeight: '700',
  },
  phoneNumber: {
    marginTop: 28, color: '#ffffff', fontSize: 30, fontWeight: '700',
  },
  callStatus: {
    marginTop: 10, color: '#8da5c8', fontSize: 16,
  },
  actionsSection: {
    position: 'absolute',
    bottom: 80, left: 0, right: 0,
    alignItems: 'center',
  },
  incomingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: width * 0.75,
  },
  callBtnWrapper: {
    alignItems: 'center', gap: 10,
  },
  callBtn: {
    width: 78, height: 78,
    borderRadius: 39,
    justifyContent: 'center', alignItems: 'center',
    elevation: 8,
  },
  rejectBtn: { backgroundColor: '#e53e3e' },
  acceptBtn: { backgroundColor: '#22c55e' },
  callBtnLabel: { color: '#8da5c8', fontSize: 13 },

  // Active Call Styles
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#111115',
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f26',
  },
  headerTitle: { color: '#8e8e93', fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  headerPhone: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2 },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', marginRight: 6 },
  timerText: { color: '#ef4444', fontWeight: '700', fontSize: 14, fontVariant: ['tabular-nums'] },
  callerMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  
  scrollContent: {
    padding: 20,
    paddingBottom: 120, // space for bottom actions
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181822',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1, borderColor: '#2b2b36',
    marginBottom: 20,
  },
  statusText: { color: '#8da5c8', marginLeft: 12, fontSize: 15, fontWeight: '500' },
  registeredCard: { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' },
  registeredTitle: { color: '#22c55e', fontWeight: '800', fontSize: 16 },
  registeredSubtitle: { color: '#fff', fontSize: 14, marginTop: 2 },
  unregisteredCard: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' },
  unregisteredTitle: { color: '#f59e0b', fontWeight: '800', fontSize: 16 },
  unregisteredSubtitle: { color: '#d1d5db', fontSize: 13, marginTop: 2 },

  mapContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2b2b36',
    position: 'relative',
  },
  webview: { flex: 1, backgroundColor: '#111115' },
  mapOverlay: {
    position: 'absolute',
    top: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  mapOverlayText: { color: '#22c55e', fontSize: 11, fontWeight: '700' },

  formContainer: {
    backgroundColor: '#111115',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1, borderColor: '#1f1f26',
  },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 20 },
  label: { color: '#8e8e93', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#181822',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1, borderColor: '#2b2b36',
    marginBottom: 20,
  },
  textArea: { height: 100 },
  readonlyInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)',
    marginBottom: 20,
  },
  readonlyText: { color: '#22c55e', fontSize: 14, fontWeight: '600' },

  bottomActions: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: 'rgba(5,5,7,0.9)',
    borderTopWidth: 1, borderTopColor: '#1f1f26',
    gap: 12,
  },
  dispatchBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#0a84ff',
    borderRadius: 16,
    height: 60,
  },
  dispatchBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hangUpBtn: {
    width: 60, height: 60,
    borderRadius: 30,
    backgroundColor: '#e53e3e',
    justifyContent: 'center', alignItems: 'center',
  },
  actionCard: {
    backgroundColor: '#181822',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1, borderColor: '#2b2b36',
    marginBottom: 20,
  },
  actionCardTitle: { color: '#ef4444', fontWeight: '800', fontSize: 16 },
  actionCardDesc: { color: '#8da5c8', fontSize: 13, marginTop: 4, marginBottom: 12, lineHeight: 18 },
  smsBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#0a84ff',
    paddingVertical: 12, borderRadius: 12,
  },
  smsBtnSent: { backgroundColor: '#22c55e' },
  smsBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  brgyPill: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#1f1f26', borderRadius: 20,
    marginRight: 8, borderWidth: 1, borderColor: '#2b2b36',
  },
  brgyPillActive: { backgroundColor: 'rgba(10, 132, 255, 0.2)', borderColor: '#0a84ff' },
  brgyPillText: { color: '#8e8e93', fontSize: 14, fontWeight: '600' },
  brgyPillTextActive: { color: '#0a84ff' },
  inputError: { borderColor: '#ef4444', borderWidth: 1, backgroundColor: 'rgba(239, 68, 68, 0.05)' },
  errorText: { color: '#ef4444', fontSize: 13, marginTop: -8, marginBottom: 12, marginLeft: 4, fontWeight: '500' },
  requiredAsterisk: { color: '#ef4444' },
});
