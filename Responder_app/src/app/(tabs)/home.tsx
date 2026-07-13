import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, TextInput, ActivityIndicator, ScrollView, Switch, Alert, StatusBar, Platform, Modal, PermissionsAndroid } from 'react-native';
import { checkResidentDatabase } from '@/services/api';
import { initializeSocket } from '@/services/socket';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AgoraManager } from '@/services/agora-service';
import GISMapPicker from '@/components/GISMapPicker';
import { parseOpolLocation } from '@/services/location-parser';

const BARANGAYS = ['Awang', 'Barra', 'Bagocboc', 'Bonbon', 'Cauyunan', 'Igpit', 'Luyong Bonbon', 'Limunda', 'Malanang', 'Nangcaon', 'Patag', 'Poblacion', 'Tingalan', 'Taboc'];
const AGORA_APP_ID = '71b45881a425400ebfe5b8698c1ffd5b';

// Only import the native module on Android
let CallDetectorModule: any = null;
if (Platform.OS === 'android') {
  try {
    CallDetectorModule = require('expo-call-detector').CallDetectorModule;
  } catch (e) {
    console.warn('CallDetector native module not available', e);
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const [isCallDetected, setIsCallDetected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isDefaultPhoneApp, setIsDefaultPhoneApp] = useState(true);

  const [isRegistered, setIsRegistered] = useState(false);
  const [callerName, setCallerName] = useState('');
  const [callerNumber, setCallerNumber] = useState('');
  const [victimName, setVictimName] = useState('');
  const [accidentAddress, setAccidentAddress] = useState('');
  const [emergencyType, setEmergencyType] = useState('');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const [barangay, setBarangay] = useState('');
  const [purok, setPurok] = useState('');
  const [landmark, setLandmark] = useState('');
  const [showBarangayModal, setShowBarangayModal] = useState(false);

  const [isNearAccident, setIsNearAccident] = useState(true);

  const [callerLocation, setCallerLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(14);

  // Agora State
  const [inCall, setInCall] = useState(false);
  const [agoraChannel, setAgoraChannel] = useState<string | null>(null);
  const agoraEngine = React.useRef<any | null>(null);

  const emergencyTypes = [
    'Heart attack',
    'Stroke',
    'Difficulty breathing',
    'Unconscious patient',
    'Seizure',
    'Pregnancy/labor',
    'Poisoning',
    'Severe bleeding'
  ];

  // Advanced UI states
  const [showSimulator, setShowSimulator] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const dotPulse = React.useRef(new Animated.Value(1)).current;

  // Dot pulse animation for active monitoring state
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();

    setupAgoraEngine();
    checkDefaultPhoneApp();

    return () => {
      if (agoraEngine.current) {
        agoraEngine.current.release();
      }
    };
  }, []);

  const checkDefaultPhoneApp = async () => {
    if (Platform.OS === 'android' && CallDetectorModule) {
      try {
        const isDefault = CallDetectorModule.isDefaultDialer();
        setIsDefaultPhoneApp(isDefault);
      } catch (e) {
        console.warn('Failed to check default dialer role:', e);
      }
    }
  };

  const setupAgoraEngine = async () => {
    try {
      if (Platform.OS === 'android') {
        try {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
            PermissionsAndroid.PERMISSIONS.ANSWER_PHONE_CALLS,
            PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
          ]);
        } catch (err) {
          console.warn('Permissions request failed:', err);
        }
      }

      const manager = new AgoraManager();
      agoraEngine.current = manager;
      await manager.initialize(AGORA_APP_ID, {
        onJoinChannelSuccess: () => {
          console.log('Responder joined Agora channel successfully');
        },
        onUserJoined: (uid) => {
          console.log('Resident joined the voice channel', uid);
        },
        onUserOffline: (uid) => {
          console.log('Resident left the voice channel', uid);
          handleEndAgoraCall();
        }
      });
    } catch (e) {
      console.log('Agora Error:', e);
    }
  };

  const handleEndAgoraCall = () => {
    if (agoraEngine.current) {
      agoraEngine.current.leaveChannel();
      setInCall(false);
      setAgoraChannel(null);
    }
  };

  // Auto-parse location when Barangay, Purok, or Landmark changes
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      const locationParts = [purok, landmark, barangay].filter(Boolean);
      const locationText = locationParts.join(', ').trim();
      
      if (locationText) {
        try {
          const parsed = await parseOpolLocation(locationText);
          setCallerLocation({ latitude: parsed.latitude, longitude: parsed.longitude });
          setMapZoom(parsed.zoom);

        } catch (error) {
          console.error("Location parsing failed", error);
        }
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(delayDebounce);
  }, [purok, landmark, barangay]);

  useEffect(() => {
    // Listen for calls routed via WebSockets (Dispatch Server)
    const socket = initializeSocket();

    socket.on('incoming_emergency_call', (data: { phoneNumber: string }) => {
      console.log('Received emergency call via socket:', data);
      router.push({
        pathname: '/incoming-call',
        params: { phoneNumber: data.phoneNumber }
      });
    });

    socket.on('emergency_alert', (data: any) => {
      console.log('Received emergency alert from Resident app:', data);
      Alert.alert(
        "🚨 RESIDENT SOS ALERT!",
        `Location received. ${data.request_voice_call ? 'Resident requested a voice call.' : ''}`,
        [
          {
            text: data.request_voice_call ? "Accept Call & Check" : "Accept & Check",
            onPress: () => handleResidentAlert(data)
          }
        ]
      );
    });

    return () => {
      if (socket) {
        socket.off('incoming_emergency_call');
        socket.off('emergency_alert');
      }
    };
  }, []);

  // Failsafe: If we landed on Home screen but there is an active physical call, jump to the incoming-call screen
  useEffect(() => {
    if (!CallDetectorModule) return;
    try {
      if (CallDetectorModule.getCurrentCallPhoneNumber) {
        const activeNumber = CallDetectorModule.getCurrentCallPhoneNumber();
        if (activeNumber) {
          router.push({
            pathname: '/incoming-call',
            params: { phoneNumber: activeNumber }
          });
        }
      }
    } catch (e) {
      console.warn('Failed to check active calls from Home screen', e);
    }
  }, []);

  const handleResidentAlert = (data: any) => {
    setIsChecking(true);
    setIsCallDetected(true);

    // Auto-populate from Resident App data
    setCallerNumber(data.resident_info.phone || 'Resident App');
    setIsRegistered(true);
    setCallerName(data.resident_info.name || 'Resident');


    if (data.location && data.location.latitude) {
      setCallerLocation({
        latitude: data.location.latitude,
        longitude: data.location.longitude
      });
    }

    if (data.agora_channel && data.request_voice_call) {
      setAgoraChannel(data.agora_channel);
      agoraEngine.current?.joinChannel(data.agora_channel);
      setInCall(true);
    }

    setIsChecking(false);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
      ])
    ).start();
  };

  const handleSimulateCall = async (phone: string) => {
    setIsChecking(true);
    setIsCallDetected(true);

    // Simulate SIM Call receiving and checking database
    const response = await checkResidentDatabase(phone);

    setCallerNumber(phone);
    if (response.isRegistered && response.resident) {
      setIsRegistered(true);
      setCallerName(response.resident.full_name);

      if (response.resident.latitude && response.resident.longitude) {
        setCallerLocation({
          latitude: response.resident.latitude,
          longitude: response.resident.longitude
        });
      }
    } else {
      setIsRegistered(false);
      setCallerName('Visitor');

      setCallerLocation(null);
    }

    setIsChecking(false);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
      ])
    ).start();
  };

  const handleRespond = () => {
    setIsCallDetected(false);
    pulseAnim.stopAnimation();

    // Navigate to tracking tab with parameters
    router.push({
      pathname: '/(tabs)/tracking',
      params: {
        callerInfo: JSON.stringify({
          id: 'INC-' + Math.floor(1000 + Math.random() * 9000),
          name: callerName || 'Unknown',
          number: callerNumber,
          victimName: victimName || 'Unknown',
        }),
        isRegistered: isRegistered ? 'true' : 'false',
        callerType: isRegistered ? 'Resident' : 'Visitor',

        callerLocation: callerLocation ? JSON.stringify(callerLocation) : '',
        barangay: barangay,
        purok: purok,
        landmark: landmark,
        emergencyType: emergencyType || ''
      }
    });

    // Reset forms
    setVictimName('');
    setBarangay('');
    setPurok('');
    setLandmark('');
    setEmergencyType('');
    setIsNearAccident(true);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backgroundGlowTop} pointerEvents="none" />
      <View style={styles.backgroundGlowBottom} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerSubtitle}>MDRRMO MANAGEMENT SYSTEM EMERGENCY SERVICE</Text>
            <Text style={styles.headerTitle}>RESPONDER HUB</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.gpsBadge}>
              <Ionicons name="location" size={14} color="#34c759" />
              <Text style={styles.gpsBadgeText}>GPS ACTIVE</Text>
            </View>
          </View>
        </View>

        {/* Real-time Status Badge */}
        <View style={[styles.statusBadge, isCallDetected ? styles.statusBadgeActive : null]}>
          <View style={styles.statusDotWrapper}>
            <Animated.View style={[
              styles.statusDot,
              { backgroundColor: isCallDetected ? '#ff3b30' : '#34c759' },
              { transform: [{ scale: dotPulse }] }
            ]} />
          </View>
          <Text style={[styles.statusText, isCallDetected ? styles.statusTextActive : null]}>
            {isCallDetected ? 'EMERGENCY DISPATCH INCOMING' : 'ACTIVE & MONITORING'}
          </Text>
        </View>

        {/* Dashboard UI when Idle */}
        {!isCallDetected && (
          <View style={styles.dashboardContainer}>
            
            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Ionicons name="shield-checkmark" size={20} color="#34c759" />
                  <Text style={styles.statLabel}>Shift Status</Text>
                </View>
                <Text style={styles.statValue}>On Duty</Text>
                <Text style={styles.statSubText}>Monitoring WebSockets</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Ionicons name="document-text" size={20} color="#0a84ff" />
                  <Text style={styles.statLabel}>PCRs Today</Text>
                </View>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statSubText}>Drafts cleared</Text>
              </View>
            </View>

            {/* Weather / Condition */}
            <View style={styles.weatherCard}>
              <View style={styles.weatherHeader}>
                <Ionicons name="partly-sunny" size={36} color="#ffcc00" />
                <View style={{ marginLeft: 16, flex: 1 }}>
                  <Text style={styles.weatherTitle}>Opol, Misamis Oriental</Text>
                  <Text style={styles.weatherSubtitle}>Clear Skies • Optimal</Text>
                </View>
              </View>
              <View style={styles.weatherDivider} />
              <Text style={styles.weatherMessage}>Current conditions are safe for dispatch operations. No active severe weather warnings in your area.</Text>
            </View>

            {/* Quick Actions Grid */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/tracking')}>
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
                  <Ionicons name="map" size={24} color="#34c759" />
                </View>
                <Text style={styles.actionText}>View Map</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/manage')}>
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
                  <Ionicons name="folder-open" size={24} color="#0a84ff" />
                </View>
                <Text style={styles.actionText}>Manage PCRs</Text>
              </TouchableOpacity>



              <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Sync Complete', 'All offline data is synced.')}>
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(191, 90, 242, 0.15)' }]}>
                  <Ionicons name="sync" size={24} color="#bf5af2" />
                </View>
                <Text style={styles.actionText}>Sync Data</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Activity */}
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityList}>
              <View style={styles.activityItem}>
                <View style={styles.activityDot} />
                <View style={styles.activityLine} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>Shift Started</Text>
                  <Text style={styles.activityTime}>Today, 08:00 AM</Text>
                </View>
              </View>
              <View style={styles.activityItem}>
                <View style={styles.activityDotBlue} />
                <View style={styles.activityLine} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>System Sync Successful</Text>
                  <Text style={styles.activityTime}>Yesterday, 23:45 PM</Text>
                </View>
              </View>
              <View style={styles.activityItem}>
                <View style={styles.activityDotBlue} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>App Updated</Text>
                  <Text style={styles.activityTime}>Yesterday, 14:30 PM</Text>
                </View>
              </View>
            </View>

          </View>
        )}



        {/* Emergency Alert & Forms Section */}
        {isCallDetected && (
          <View style={styles.emergencyForm}>
            {isChecking ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0a84ff" />
                <Text style={styles.loadingText}>Verifying Resident Profile...</Text>
              </View>
            ) : (
              <View style={styles.callerInfoContainer}>

                {/* Red Glowing Banner */}
                <View style={[styles.alertHeader, isRegistered ? styles.alertHeaderRegistered : styles.alertHeaderUnregistered]}>
                  <Ionicons
                    name={isRegistered ? "shield-checkmark" : "alert-circle"}
                    size={22}
                    color="#fff"
                  />
                  <Text style={styles.alertHeaderText}>
                    {isRegistered ? 'REGISTERED RESIDENT DISPATCH' : 'VISITOR / UNREGISTERED ALARM'}
                  </Text>
                </View>

                {inCall && (
                  <View style={styles.activeVoiceBanner}>
                    <Ionicons name="volume-high" size={20} color="#fff" />
                    <Text style={styles.activeVoiceText}>LIVE VOICE CALL WITH RESIDENT</Text>
                    <TouchableOpacity style={styles.endVoiceButton} onPress={handleEndAgoraCall}>
                      <Text style={styles.endVoiceButtonText}>END CALL</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.infoFields}>

                  {/* Phone number */}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Caller Number</Text>
                    <View style={styles.infoValueRow}>
                      <Ionicons name="call" size={14} color="#0a84ff" style={{ marginRight: 6 }} />
                      <Text style={styles.infoValue}>{callerNumber}</Text>
                    </View>
                  </View>

                  {/* Caller Name Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Caller Name</Text>
                    {isRegistered ? (
                      <View style={styles.lockedValueContainer}>
                        <Ionicons name="person" size={16} color="#0a84ff" style={{ marginRight: 8 }} />
                        <Text style={styles.lockedValue}>{callerName}</Text>
                      </View>
                    ) : (
                      <View style={[
                        styles.inputWrapper,
                        activeField === 'callerName' ? styles.inputWrapperActive : null
                      ]}>
                        <Ionicons name="person-outline" size={16} color={activeField === 'callerName' ? '#0a84ff' : '#666'} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={callerName}
                          onChangeText={setCallerName}
                          onFocus={() => setActiveField('callerName')}
                          onBlur={() => setActiveField(null)}
                          placeholder="Enter Caller Name"
                          placeholderTextColor="#555"
                        />
                      </View>
                    )}
                  </View>

                  {/* Victim Name Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Victim Name</Text>
                    <View style={[
                      styles.inputWrapper,
                      activeField === 'victimName' ? styles.inputWrapperActive : null
                    ]}>
                      <Ionicons name="bandage-outline" size={16} color={activeField === 'victimName' ? '#0a84ff' : '#666'} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={victimName}
                        onChangeText={setVictimName}
                        onFocus={() => setActiveField('victimName')}
                        onBlur={() => setActiveField(null)}
                        placeholder="Enter Victim Name (optional)"
                        placeholderTextColor="#555"
                      />
                    </View>
                  </View>

                  {/* Emergency Type Dropdown */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Emergency Type</Text>
                    <TouchableOpacity
                      style={[
                        styles.inputWrapper,
                        activeField === 'emergencyType' ? styles.inputWrapperActive : null
                      ]}
                      onPress={() => {
                        setActiveField('emergencyType');
                        setShowEmergencyModal(true);
                      }}
                    >
                      <Ionicons name="medkit-outline" size={16} color={activeField === 'emergencyType' ? '#0a84ff' : '#666'} style={styles.inputIcon} />
                      <Text style={[styles.input, { color: emergencyType ? '#ffffff' : '#555' }]}>
                        {emergencyType || 'Select emergency type'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>



                  {/* Barangay Dropdown */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Barangay</Text>
                    <TouchableOpacity
                      style={[
                        styles.inputWrapper,
                        activeField === 'barangay' ? styles.inputWrapperActive : null
                      ]}
                      onPress={() => {
                        setActiveField('barangay');
                        setShowBarangayModal(true);
                      }}
                    >
                      <Ionicons name="map-outline" size={16} color={activeField === 'barangay' ? '#0a84ff' : '#666'} style={styles.inputIcon} />
                      <Text style={[styles.input, { color: barangay ? '#ffffff' : '#555' }]}>
                        {barangay || 'Select Barangay'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>

                  {/* Purok Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Purok</Text>
                    <View style={[
                      styles.inputWrapper,
                      activeField === 'purok' ? styles.inputWrapperActive : null
                    ]}>
                      <Ionicons name="home-outline" size={16} color={activeField === 'purok' ? '#0a84ff' : '#666'} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={purok}
                        onChangeText={setPurok}
                        onFocus={() => setActiveField('purok')}
                        onBlur={() => setActiveField(null)}
                        placeholder="Enter Purok"
                        placeholderTextColor="#555"
                      />
                    </View>
                  </View>

                  {/* Landmark Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Landmark</Text>
                    <View style={[
                      styles.inputWrapper,
                      activeField === 'landmark' ? styles.inputWrapperActive : null
                    ]}>
                      <Ionicons name="business-outline" size={16} color={activeField === 'landmark' ? '#0a84ff' : '#666'} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={landmark}
                        onChangeText={setLandmark}
                        onFocus={() => setActiveField('landmark')}
                        onBlur={() => setActiveField(null)}
                        placeholder="Enter nearby Landmark"
                        placeholderTextColor="#555"
                      />
                    </View>
                  </View>

                  {/* GIS Map Picker */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Pin Incident Location</Text>
                    <GISMapPicker
                      initialLocation={callerLocation || undefined}
                      initialZoom={mapZoom}
                      onLocationSelected={(coords) => {
                        setCallerLocation(coords);

                      }}
                    />
                  </View>

                  {/* Response Confirmation Action */}
                  <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%', marginTop: 24 }}>
                    <TouchableOpacity
                      style={[styles.primaryButton, styles.emergencyButton]}
                      onPress={handleRespond}
                    >
                      <Ionicons name="navigate-circle" size={20} color="#fff" />
                      <Text style={styles.buttonText}>START DISPATCH INTERACTION</Text>
                    </TouchableOpacity>
                  </Animated.View>

                  {/* Cancel Simulation */}
                  <TouchableOpacity
                    style={styles.cancelSimButton}
                    onPress={() => {
                      setIsCallDetected(false);
                      pulseAnim.stopAnimation();
                    }}
                  >
                    <Text style={styles.cancelSimText}>Dismiss Dispatch</Text>
                  </TouchableOpacity>

                </View>
              </View>
            )}
          </View>
        )}

        {/* Emergency Type Selection Modal */}
        <Modal
          visible={showEmergencyModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowEmergencyModal(false);
            setActiveField(null);
          }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowEmergencyModal(false);
              setActiveField(null);
            }}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Emergency Type</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowEmergencyModal(false);
                    setActiveField(null);
                  }}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList}>
                {emergencyTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.modalItem,
                      emergencyType === type ? styles.modalItemSelected : null
                    ]}
                    onPress={() => {
                      setEmergencyType(type);
                      setShowEmergencyModal(false);
                      setActiveField(null);
                    }}
                  >
                    <Ionicons
                      name={emergencyType === type ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={emergencyType === type ? "#0a84ff" : "#666"}
                    />
                    <Text style={[
                      styles.modalItemText,
                      emergencyType === type ? styles.modalItemTextSelected : null
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Barangay Selection Modal */}
        <Modal
          visible={showBarangayModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowBarangayModal(false);
            setActiveField(null);
          }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowBarangayModal(false);
              setActiveField(null);
            }}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Barangay</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowBarangayModal(false);
                    setActiveField(null);
                  }}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList}>
                {BARANGAYS.map((brgy) => (
                  <TouchableOpacity
                    key={brgy}
                    style={[
                      styles.modalItem,
                      barangay === brgy ? styles.modalItemSelected : null
                    ]}
                    onPress={() => {
                      setBarangay(brgy);
                      setShowBarangayModal(false);
                      setActiveField(null);
                    }}
                  >
                    <Ionicons
                      name={barangay === brgy ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={barangay === brgy ? "#0a84ff" : "#666"}
                    />
                    <Text style={[
                      styles.modalItemText,
                      barangay === brgy ? styles.modalItemTextSelected : null
                    ]}>
                      {brgy}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

      </ScrollView>
    </View>
  );
}

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
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    filter: 'blur(80px)',
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: -150,
    right: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(239, 69, 68, 0.04)',
    filter: 'blur(100px)',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0a84ff',
    letterSpacing: 2.0,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  headerRight: {
    justifyContent: 'center',
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  gpsBadgeText: {
    color: '#34c759',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111116',
    borderWidth: 1,
    borderColor: '#1f1f26',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 24,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  statusDotWrapper: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusTextActive: {
    color: '#ff453a',
  },
  visualizerCard: {
    backgroundColor: '#111115',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f1f26',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 6,
  },
  radarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(10, 132, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  radarIcon: {
    opacity: 0.85,
  },
  visualizerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  visualizerSubtitle: {
    fontSize: 13,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  simulatorCard: {
    backgroundColor: '#111115',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f1f26',
    overflow: 'hidden',
  },
  simulatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#181822',
  },
  simulatorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simulatorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  simulatorBody: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1f1f26',
  },
  simulatorLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 14,
    fontWeight: '500',
  },
  simButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  simButtonPrimary: {
    backgroundColor: '#0a84ff',
  },
  simButtonSecondary: {
    backgroundColor: '#5856d6',
    marginBottom: 0,
  },
  simButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emergencyForm: {
    width: '100%',
  },
  loadingContainer: {
    padding: 40,
    backgroundColor: '#111115',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1f1f26',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '600',
  },
  callerInfoContainer: {
    backgroundColor: '#111115',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    overflow: 'hidden',
    shadowColor: '#ff453a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  alertHeaderRegistered: {
    backgroundColor: '#34c759',
  },
  alertHeaderUnregistered: {
    backgroundColor: '#ff453a',
  },
  alertHeaderText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  activeVoiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52, 199, 89, 0.4)',
  },
  activeVoiceText: {
    color: '#34c759',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 10,
    flex: 1,
  },
  endVoiceButton: {
    backgroundColor: '#ff453a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  endVoiceButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoFields: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f26',
    marginBottom: 20,
  },
  infoLabel: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '700',
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8e8e93',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lockedValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181822',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2b2b36',
  },
  lockedValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 14,
    height: '100%',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 204, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 0, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  warningText: {
    color: '#ffcc00',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f26',
    borderTopWidth: 1,
    borderTopColor: '#1f1f26',
    marginBottom: 18,
  },
  toggleTextGroup: {
    flex: 1,
  },
  toggleLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  toggleSublabel: {
    color: '#8e8e93',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#0a84ff',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0a84ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emergencyButton: {
    backgroundColor: '#ff453a',
    shadowColor: '#ff453a',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cancelSimButton: {
    alignItems: 'center',
    marginTop: 18,
    padding: 8,
  },
  cancelSimText: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111115',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(10, 132, 255, 0.2)',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f26',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalList: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#181822',
    borderWidth: 1,
    borderColor: '#2b2b36',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    borderColor: '#0a84ff',
  },
  modalItemText: {
    color: '#9ba1a6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
  modalItemTextSelected: {
    color: '#ffffff',
  },
  dialerWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  dialerWarningLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dialerWarningTitle: {
    color: '#ff453a',
    fontSize: 15,
    fontWeight: '700',
  },
  dialerWarningDesc: {
    color: '#8da5c8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  dialerWarningBtn: {
    backgroundColor: '#ff453a',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 12,
  },
  dialerWarningBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  dashboardContainer: {
    width: '100%',
    paddingBottom: 40,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111115',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginLeft: 6,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statSubText: {
    color: '#666',
    fontSize: 11,
  },
  weatherCard: {
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.2)',
    marginBottom: 24,
    marginHorizontal: 4,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  weatherSubtitle: {
    color: '#0a84ff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  weatherDivider: {
    height: 1,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    marginVertical: 12,
  },
  weatherMessage: {
    color: '#8da5c8',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    marginLeft: 8,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginHorizontal: 4,
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#111115',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  activityList: {
    backgroundColor: '#111115',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 4,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 16,
    position: 'relative',
  },
  activityLine: {
    position: 'absolute',
    left: 4.5,
    top: 14,
    bottom: -20,
    width: 1,
    backgroundColor: '#2b2b36',
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34c759',
    marginTop: 4,
  },
  activityDotBlue: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0a84ff',
    marginTop: 4,
  },
  activityContent: {
    marginLeft: 16,
    flex: 1,
  },
  activityTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  activityTime: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
});

