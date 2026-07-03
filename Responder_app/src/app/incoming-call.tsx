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
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { CallDetectorModule } from 'expo-call-detector';
import { checkResidentDatabase, reportIncident } from '@/services/api';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import GISMapPicker from '@/components/GISMapPicker';
import * as Location from 'expo-location';
import { robustGeocode } from '@/utils/geocoding';
import { ALL_LOCATIONS } from '@/data/opol-locations';

const BARANGAYS = ['Awang', 'Barra', 'Bagocboc', 'Bonbon', 'Cauyunan', 'Igpit', 'Luyong Bonbon', 'Limunda', 'Malanang', 'Nangcaon', 'Patag', 'Poblacion', 'Tingalan', 'Taboc'];

const EMERGENCY_TYPES = [
  'LANDSLIDE/ MOUNTAIN SEARCH & RESCUE',
  'Medical Emergency',
  'Vehicular Accident',
  'Fire Incident',
  'Drowning',
  'Earthquake/Collapsed Structure',
  'Flood/Water Rescue'
];

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
  const navigation = useNavigation();

  // Database checks & form state
  const [isCheckingDB, setIsCheckingDB] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [callerDetails, setCallerDetails] = useState<any>(null);
  
  // Manual entry fields for unregistered/missing details
  const [manualName, setManualName] = useState('');
  const [barangay, setBarangay] = useState('');
  const [purok, setPurok] = useState('');
  const [landmark, setLandmark] = useState('');
  const [callerLocation, setCallerLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [incidentDetails, setIncidentDetails] = useState('');
  
  const [showBrgyModal, setShowBrgyModal] = useState(false);
  const [showPurokModal, setShowPurokModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showCustomEmergencyModal, setShowCustomEmergencyModal] = useState(false);
  const [customEmergencyText, setCustomEmergencyText] = useState('');

  // Find available puroks for the selected barangay
  const availablePuroks = ALL_LOCATIONS
    .filter(loc => (loc.type === 'zone' || loc.type === 'purok' || loc.type === 'sitio') && loc.barangay === barangay)
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
        // Pre-fill manual name with the previous caller's name
        setManualName(result.resident.full_name || 'Visitor');
        
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
        setManualName('Visitor');
      }


    } catch (error) {
      console.warn('Failed to check resident database:', error);
      setIsRegistered(false);
      setManualName('Visitor');
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
    setIsNavigatingAway(true);
    // Prepare params to pass to the tracking screen
    const passName = isRegistered && callerDetails?.full_name ? callerDetails.full_name : manualName;
    const passLat = callerLocation?.latitude || callerDetails?.latitude;
    const passLng = callerLocation?.longitude || callerDetails?.longitude;
    
    // Auto-submit incident to Staff2 dashboard
    if (phoneNumber) {
      try {
        await reportIncident({
          incident_id: '',
          caller_name: passName,
          caller_number: phoneNumber,
          latitude: passLat,
          longitude: passLng,
          emergency_type: incidentDetails || 'Emergency Call',
          status: 'active',
          barangay: barangay,
          purok: purok,
          landmark: landmark
        });
      } catch (e) {
        console.warn('Failed to auto-submit incident report', e);
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
          
          <Text style={styles.label}>Caller Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Ask for caller's name"
            placeholderTextColor="#666"
            value={manualName}
            onChangeText={setManualName}
          />

              <Text style={styles.label}>Barangay</Text>
              <TouchableOpacity 
                style={[styles.input, { justifyContent: 'center' }]} 
                onPress={() => setShowBrgyModal(true)}
              >
                <Text style={{ color: barangay ? '#fff' : '#666', fontSize: 15 }}>{barangay || 'Select Barangay'}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Zone</Text>
              {availablePuroks.length > 0 ? (
                <TouchableOpacity 
                  style={[styles.input, { justifyContent: 'center' }]} 
                  onPress={() => setShowPurokModal(true)}
                >
                  <Text style={{ color: purok ? '#fff' : '#666', fontSize: 15 }}>{purok || 'Select Zone'}</Text>
                </TouchableOpacity>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Enter Zone"
                  placeholderTextColor="#666"
                  value={purok}
                  onChangeText={setPurok}
                />
              )}

              <Text style={styles.label}>Landmark</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Landmark"
                placeholderTextColor="#666"
                value={landmark}
                onChangeText={setLandmark}
              />
          <Text style={styles.label}>Nature of Emergency</Text>
          <View style={[styles.input, { paddingVertical: 6, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' }]}>
            <TouchableOpacity 
              style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, justifyContent: 'center' }} 
              onPress={() => setShowEmergencyModal(true)}
            >
              <Text style={{ color: incidentDetails ? '#fff' : '#666', fontSize: 15 }}>{incidentDetails || 'Select Emergency Type'}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{
                width: 32,
                height: 32,
                backgroundColor: '#2b2b36',
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => setShowCustomEmergencyModal(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
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
      />
      <SearchableSelectModal 
        visible={showEmergencyModal} 
        onClose={() => setShowEmergencyModal(false)} 
        data={EMERGENCY_TYPES} 
        onSelect={setIncidentDetails} 
        title="Select Nature of Emergency" 
      />
      <Modal visible={showCustomEmergencyModal} animationType="fade" transparent onRequestClose={() => setShowCustomEmergencyModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#1c1c23', padding: 20, borderRadius: 16, width: '100%', borderWidth: 1, borderColor: '#2b2b35' }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Custom Emergency</Text>
            <TextInput
              style={[styles.input, { marginBottom: 20, backgroundColor: '#111115' }]}
              placeholder="Enter Nature of Emergency"
              placeholderTextColor="#666"
              value={customEmergencyText}
              onChangeText={setCustomEmergencyText}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity 
                style={{ flex: 1, padding: 15, borderRadius: 12, backgroundColor: '#2b2b35', alignItems: 'center' }}
                onPress={() => setShowCustomEmergencyModal(false)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, padding: 15, borderRadius: 12, backgroundColor: '#0a84ff', alignItems: 'center' }}
                onPress={() => {
                  if (customEmergencyText.trim()) {
                    setIncidentDetails(customEmergencyText.trim());
                  }
                  setShowCustomEmergencyModal(false);
                  setCustomEmergencyText('');
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const SearchableSelectModal = ({ visible, onClose, data, onSelect, title }: { visible: boolean, onClose: () => void, data: string[], onSelect: (val: string) => void, title: string }) => {
  const [search, setSearch] = useState('');
  const filtered = data.filter(item => item.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#111115', height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <TextInput 
            style={{ backgroundColor: '#1f1f26', color: '#fff', padding: 14, borderRadius: 12, marginBottom: 15, fontSize: 16 }} 
            placeholder="Search..." 
            placeholderTextColor="#8e8e93"
            value={search}
            onChangeText={setSearch}
          />
          <ScrollView>
            {filtered.map(item => (
              <TouchableOpacity 
                key={item} 
                style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f26' }} 
                onPress={() => { onSelect(item); setSearch(''); onClose(); }}
              >
                <Text style={{ color: '#fff', fontSize: 16 }}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
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
});
