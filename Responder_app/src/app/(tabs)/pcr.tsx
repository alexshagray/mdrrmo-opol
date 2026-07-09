import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Modal
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { searchResidents, savePatientCareRecord, fetchUserProfile } from '@/services/api';

export default function PCRScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Navigation Params
  const callerInfo = params.callerInfo ? JSON.parse(params.callerInfo as string) : null;
  const emergencyTypeParam = params.emergencyType as string || '';
  const accidentAddress = params.accidentAddress as string || '';
  const actualIncidentAddress = params.actualIncidentAddress as string || '';
  
  // Tracking Times (assuming passed from tracking map)
  const dispatchTimeParam = params.dispatchTime as string || '';
  const enRouteTimeParam = params.enRouteTime as string || '';
  const onSceneTimeParam = params.onSceneTime as string || '';

  const [step, setStep] = useState(1);
  const totalSteps = 7;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STEP 1: Patient Info ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientDate, setPatientDate] = useState(new Date().toLocaleDateString());
  const [patientGender, setPatientGender] = useState('');
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const genderOptions = ['Male', 'Female'];

  const [patientContact, setPatientContact] = useState('');
  const [callerNumber, setCallerNumber] = useState(callerInfo?.number || '');
  const [patientCivilStatus, setPatientCivilStatus] = useState('');
  const [showCivilStatusDropdown, setShowCivilStatusDropdown] = useState(false);
  const civilStatusOptions = ['Single', 'Married', 'Widowed', 'Child', 'Separated'];

  const [patientAddress, setPatientAddress] = useState(accidentAddress);
  const [placeOfIncident, setPlaceOfIncident] = useState(actualIncidentAddress || accidentAddress);
  const [chiefComplaint, setChiefComplaint] = useState(emergencyTypeParam || '');
  const [natureOfCall, setNatureOfCall] = useState('');
  const [showNatureOfCallDropdown, setShowNatureOfCallDropdown] = useState(false);
  const natureOfCallOptions = ['Emergency', 'Transport', 'Standby', 'Non-Emergency', 'Medical Assistance'];

  // --- STEP 2: Time Log ---
  const [dispatchTime, setDispatchTime] = useState(dispatchTimeParam);
  const [enRouteTime, setEnRouteTime] = useState(enRouteTimeParam);
  const [onSceneTime, setOnSceneTime] = useState(onSceneTimeParam);
  const [transportTime, setTransportTime] = useState('');
  const [arrivedHF, setArrivedHF] = useState('');
  const [departedHF, setDepartedHF] = useState('');

  // --- STEP 3: Assessment ---
  const injuryOptions = [
    'Abrasion', 'Amputation', 'Avulsion', 'Burns', 
    'Contusion', 'Fractured', 'Hematoma', 'Incision', 
    'Laceration', 'Punctured', 'Swelling', 'Tenderness'
  ];
  const [selectedInjuries, setSelectedInjuries] = useState<string[]>([]);
  const [injuryDetails, setInjuryDetails] = useState('');

  // --- STEP 4: Vitals ---
  const [vitals, setVitals] = useState([
    { take: '1ST', time: '', o2: '', pr: '', rr: '', bp: '', temp: '' },
    { take: '2ND', time: '', o2: '', pr: '', rr: '', bp: '', temp: '' },
    { take: '3RD', time: '', o2: '', pr: '', rr: '', bp: '', temp: '' }
  ]);

  // --- STEP 5: GCS ---
  const [gcsEye, setGcsEye] = useState<number>(0);
  const [gcsVerbal, setGcsVerbal] = useState<number>(0);
  const [gcsMotor, setGcsMotor] = useState<number>(0);

  // --- STEP 6: Disposition & Details ---
  const dispositionOptions = [
    'Treated, Recovered', 'Treated, Transported to Hospital', 'Treated, Transferred Care to RHU',
    'Treated, Transported by Private Veh.', 'Treated, Refused Transport', 'No Treatment, Transport Required',
    'False Call', 'Cancelled', 'No Patient Found', 'Dead at Scene', 'Patient Refused Care', 'No Treatment Required'
  ];
  const [selectedDispositions, setSelectedDispositions] = useState<string[]>([]);
  const [showDispositionDropdown, setShowDispositionDropdown] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [responders, setResponders] = useState('');
  const [transportedTo, setTransportedTo] = useState('');
  const [receivedBy, setReceivedBy] = useState('');

  // --- STEP 7: Waiver & Signatures ---
  const [waiverName, setWaiverName] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [isSigned, setIsSigned] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  // Load Draft ONCE on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draftStr = await FileSystem.readAsStringAsync(FileSystem.documentDirectory + 'pcr_draft_data.txt');
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          if (draft.step) setStep(draft.step);
          if (draft.patientName) setPatientName(draft.patientName);
          if (draft.patientAge) setPatientAge(draft.patientAge);
          if (draft.patientGender) setPatientGender(draft.patientGender);
          if (draft.patientContact) setPatientContact(draft.patientContact);
          if (draft.patientCivilStatus) setPatientCivilStatus(draft.patientCivilStatus);
          if (draft.patientAddress) setPatientAddress(draft.patientAddress);
          if (draft.placeOfIncident) setPlaceOfIncident(draft.placeOfIncident);
          if (draft.chiefComplaint) setChiefComplaint(draft.chiefComplaint);
          if (draft.natureOfCall) setNatureOfCall(draft.natureOfCall);
          
          if (draft.dispatchTime) setDispatchTime(draft.dispatchTime);
          if (draft.enRouteTime) setEnRouteTime(draft.enRouteTime);
          if (draft.onSceneTime) setOnSceneTime(draft.onSceneTime);
          if (draft.transportTime) setTransportTime(draft.transportTime);
          if (draft.arrivedHF) setArrivedHF(draft.arrivedHF);
          if (draft.departedHF) setDepartedHF(draft.departedHF);
          
          if (draft.selectedInjuries) setSelectedInjuries(draft.selectedInjuries);
          if (draft.injuryDetails) setInjuryDetails(draft.injuryDetails);
          if (draft.vitals) setVitals(draft.vitals);
          
          if (draft.gcsEye !== undefined) setGcsEye(draft.gcsEye);
          if (draft.gcsVerbal !== undefined) setGcsVerbal(draft.gcsVerbal);
          if (draft.gcsMotor !== undefined) setGcsMotor(draft.gcsMotor);
          
          if (draft.selectedDispositions) setSelectedDispositions(draft.selectedDispositions);
          if (draft.specialInstructions) setSpecialInstructions(draft.specialInstructions);
          if (draft.responders) setResponders(draft.responders);
          if (draft.transportedTo) setTransportedTo(draft.transportedTo);
          if (draft.receivedBy) setReceivedBy(draft.receivedBy);
          if (draft.waiverName) setWaiverName(draft.waiverName);
          if (draft.witnessName) setWitnessName(draft.witnessName);
          if (draft.isSigned !== undefined) setIsSigned(draft.isSigned);

          const hasActualData = Boolean(
            draft.patientName || 
            draft.chiefComplaint || 
            draft.placeOfIncident || 
            draft.injuryDetails || 
            (draft.step && draft.step > 1)
          );
          if (hasActualData) {
            setShowForm(true);
          }
        }
      } catch (e) {
        console.warn('Failed to load draft:', e);
      } finally {
        setIsDraftLoaded(true);
      }
    };
    loadDraft();
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (!isDraftLoaded) return;

    if (!showForm) {
      FileSystem.deleteAsync(FileSystem.documentDirectory + 'pcr_draft_data.txt', { idempotent: true }).catch(() => {});
      return;
    }
    const draft = {
      step, patientName, patientAge, patientGender, patientContact, patientCivilStatus, patientAddress, placeOfIncident,
      chiefComplaint, natureOfCall, dispatchTime, enRouteTime, onSceneTime, transportTime, arrivedHF, departedHF,
      selectedInjuries, injuryDetails, vitals, gcsEye, gcsVerbal, gcsMotor,
      selectedDispositions, specialInstructions, responders, transportedTo, receivedBy,
      waiverName, witnessName, isSigned
    };
    FileSystem.writeAsStringAsync(FileSystem.documentDirectory + 'pcr_draft_data.txt', JSON.stringify(draft)).catch(() => {});
  }, [
    isDraftLoaded, showForm, step, patientName, patientAge, patientGender, patientContact, patientCivilStatus, patientAddress, placeOfIncident,
    chiefComplaint, natureOfCall, dispatchTime, enRouteTime, onSceneTime, transportTime, arrivedHF, departedHF,
    selectedInjuries, injuryDetails, vitals, gcsEye, gcsVerbal, gcsMotor,
    selectedDispositions, specialInstructions, responders, transportedTo, receivedBy,
    waiverName, witnessName, isSigned
  ]);

  const handleClearDraft = () => {
    Alert.alert('Discard Draft', 'Are you sure you want to clear the entire form?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: async () => {
          await FileSystem.deleteAsync(FileSystem.documentDirectory + 'pcr_draft_data.txt', { idempotent: true });
          setStep(1);
          setShowForm(false);
          setPatientName(''); setPatientAge(''); setPatientGender(''); setPatientContact('');
          setPatientCivilStatus(''); setPatientAddress(''); setChiefComplaint(''); setNatureOfCall('');
          setDispatchTime(''); setEnRouteTime(''); setOnSceneTime(''); setTransportTime('');
          setArrivedHF(''); setDepartedHF(''); setSelectedInjuries([]); setInjuryDetails('');
          setVitals([{ take: '1ST', time: '', o2: '', pr: '', rr: '', bp: '', temp: '' }, { take: '2ND', time: '', o2: '', pr: '', rr: '', bp: '', temp: '' }, { take: '3RD', time: '', o2: '', pr: '', rr: '', bp: '', temp: '' }]);
          setGcsEye(0); setGcsVerbal(0); setGcsMotor(0);
          setSelectedDispositions([]); setSpecialInstructions(''); setTransportedTo(''); setReceivedBy('');
          setWaiverName(''); setWitnessName(''); setIsSigned(false);
      }}
    ]);
  };

  // Initialize Responder Name
  useEffect(() => {
    fetchUserProfile().then(user => {
      if (user && user.name) {
        setResponders(user.name.trim());
      }
    });
  }, []);

  // Update Waiver Name when Patient Name changes
  useEffect(() => {
    setWaiverName(patientName);
  }, [patientName]);

  // Auto-fill complaint based on emergency type
  useEffect(() => {
    if (emergencyTypeParam && !chiefComplaint) {
      setChiefComplaint(emergencyTypeParam);
    }
  }, [emergencyTypeParam]);

  // Auto-start form if navigated from Tracking
  useEffect(() => {
    if (callerInfo || emergencyTypeParam || accidentAddress) {
      setShowForm(true);
    }
  }, [callerInfo, emergencyTypeParam, accidentAddress]);

  // Fetch Tracking Times from AsyncStorage every time this tab is focused
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchTrackingTimes = async () => {
        try {
          const getVal = async (key: string) => {
            try { return await FileSystem.readAsStringAsync(FileSystem.documentDirectory + key + '.txt'); }
            catch (e) { return null; }
          };
          const dTime = await getVal('dispatchTime');
          const eTime = await getVal('enRouteTime');
          const oTime = await getVal('onSceneTime');
          if (isActive) {
            setDispatchTime(prev => prev || dTime || '');
            setEnRouteTime(prev => prev || eTime || '');
            setOnSceneTime(prev => prev || oTime || '');
          }
        } catch (err) {
          console.warn('Failed to load tracking times', err);
        }
      };
      fetchTrackingTimes();
      return () => { isActive = false; };
    }, [])
  );

  // Real-time Resident Search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        searchResidents(searchQuery).then(results => {
          setSearchResults(results);
          setIsSearching(false);
        });
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const selectResident = (user: any) => {
    setPatientName(`${user.first_name} ${user.last_name}`);
    setSearchQuery('');
    setSearchResults([]);
    setPatientContact(user.phone_number || '');
    setPatientAddress(user.address || '');
    setPatientCivilStatus(user.civil_status || '');
    setPatientGender(user.gender || '');
    setPatientAge(user.age ? user.age.toString() : '');
    // Auto-fill complaint based on emergency type
    setChiefComplaint(emergencyTypeParam);
  };

  const toggleInjury = (injury: string) => {
    if (selectedInjuries.includes(injury)) {
      setSelectedInjuries(selectedInjuries.filter(i => i !== injury));
    } else {
      setSelectedInjuries([...selectedInjuries, injury]);
    }
  };

  const toggleDisposition = (disp: string) => {
    if (selectedDispositions.includes(disp)) {
      setSelectedDispositions(selectedDispositions.filter(d => d !== disp));
    } else {
      setSelectedDispositions([...selectedDispositions, disp]);
    }
  };

  const handleUpdateVital = (index: number, field: string, value: string) => {
    const newVitals = [...vitals];
    (newVitals[index] as any)[field] = value;
    setVitals(newVitals);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!patientName || !patientAge || !patientGender || !patientCivilStatus || !patientAddress || !placeOfIncident || !natureOfCall || !chiefComplaint || !patientContact) {
        setShowErrors(true);
        return;
      }
    }
    setShowErrors(false);
    setStep(step + 1);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        full_name: patientName || 'Unknown Patient',
        contact_number: patientContact || callerNumber,
        address: patientAddress,
        incident_id: `${Date.now()}`,
        caller_number: callerNumber,
        emergency_type: emergencyTypeParam || chiefComplaint || natureOfCall || 'Manual PCR',
        status: 'completed',
        pcr_data: {
          step1: { patientName, patientAge, patientDate, patientGender, patientContact, callerNumber, patientCivilStatus, patientAddress, placeOfIncident, chiefComplaint, natureOfCall },
          step2: { dispatchTime, enRouteTime, onSceneTime, transportTime, arrivedHF, departedHF },
          step3: { selectedInjuries, injuryDetails },
          step4: { vitals },
          step5: { gcsEye, gcsVerbal, gcsMotor, gcsTotal: gcsEye + gcsVerbal + gcsMotor },
          step6: { selectedDispositions, specialInstructions, responders, transportedTo, receivedBy },
          step7: { waiverName, witnessName, isSigned }
        }
      };
      await savePatientCareRecord(payload);
      await FileSystem.deleteAsync(FileSystem.documentDirectory + 'pcr_draft_data.txt', { idempotent: true });
      Alert.alert('Success', 'Patient Care Report saved successfully.', [
        { text: 'OK', onPress: () => router.push('/(tabs)/manage') }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <ScrollView style={styles.stepContainer}>
            <Text style={styles.stepTitle}>1. Patient Information</Text>
            
            <Text style={styles.label}>Patient Name Search</Text>
            <View style={{ zIndex: 2 }}>
              <TextInput 
                style={[styles.input, showErrors && !patientName && styles.inputError]} 
                placeholder="Search Resident or Type Name..." 
                value={searchQuery || patientName} 
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setPatientName(text);
                }} 
              />
              {showErrors && !patientName && <Text style={styles.errorText}>Patient Name is required</Text>}
              {isSearching && <ActivityIndicator style={{ position: 'absolute', right: 10, top: 15 }} />}
              {searchResults.length > 0 && (
                <View style={styles.dropdownResults}>
                  {searchResults.map((res, i) => (
                    <TouchableOpacity key={i} style={styles.dropdownItem} onPress={() => selectResident(res)}>
                      <Text style={{fontWeight: 'bold'}}>{res.first_name} {res.last_name}</Text>
                      <Text style={{fontSize: 12, color: '#666'}}>{res.phone_number}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 5}}>
                <Text style={styles.label}>Age</Text>
                <TextInput style={[styles.input, showErrors && !patientAge && styles.inputError]} value={patientAge} onChangeText={setPatientAge} keyboardType="numeric" />
                {showErrors && !patientAge && <Text style={styles.errorText}>Required</Text>}
              </View>
              <View style={{flex: 1, marginLeft: 5, zIndex: 1}}>
                <Text style={styles.label}>Gender</Text>
                <TouchableOpacity style={[styles.multiSelectHeader, showErrors && !patientGender && styles.inputError]} onPress={() => setShowGenderDropdown(true)}>
                  <Text style={styles.multiSelectText}>{patientGender || 'Select...'}</Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
                {showErrors && !patientGender && <Text style={styles.errorText}>Required</Text>}
                <Modal visible={showGenderDropdown} transparent={true} animationType="fade" onRequestClose={() => setShowGenderDropdown(false)}>
                  <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowGenderDropdown(false)}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>Select Gender</Text>
                      {genderOptions.map(opt => (
                        <TouchableOpacity key={opt} style={styles.dispOption} onPress={() => { setPatientGender(opt); setShowGenderDropdown(false); }}>
                          <Ionicons name={patientGender === opt ? "radio-button-on" : "radio-button-off"} size={22} color={patientGender === opt ? "#0d6efd" : "#666"} />
                          <Text style={styles.dispText}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </TouchableOpacity>
                </Modal>
              </View>
            </View>

            <Text style={styles.label}>Contact #</Text>
            <TextInput style={[styles.input, showErrors && !patientContact && styles.inputError]} value={patientContact} onChangeText={setPatientContact} keyboardType="phone-pad" />
            {showErrors && !patientContact && <Text style={styles.errorText}>Contact # is required</Text>}
            
            <Text style={styles.label}>Caller # (Auto-filled)</Text>
            <TextInput style={[styles.input, styles.readOnly]} value={callerNumber} editable={false} />

            <View style={{ zIndex: 0 }}>
              <Text style={styles.label}>Civil Status</Text>
              <TouchableOpacity style={[styles.multiSelectHeader, showErrors && !patientCivilStatus && styles.inputError]} onPress={() => setShowCivilStatusDropdown(true)}>
                <Text style={styles.multiSelectText}>{patientCivilStatus || 'Select...'}</Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {showErrors && !patientCivilStatus && <Text style={styles.errorText}>Civil Status is required</Text>}
              <Modal visible={showCivilStatusDropdown} transparent={true} animationType="fade" onRequestClose={() => setShowCivilStatusDropdown(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCivilStatusDropdown(false)}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Civil Status</Text>
                    <ScrollView>
                      {civilStatusOptions.map(opt => (
                        <TouchableOpacity key={opt} style={styles.dispOption} onPress={() => { setPatientCivilStatus(opt); setShowCivilStatusDropdown(false); }}>
                          <Ionicons name={patientCivilStatus === opt ? "radio-button-on" : "radio-button-off"} size={22} color={patientCivilStatus === opt ? "#0d6efd" : "#666"} />
                          <Text style={styles.dispText}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>

            <Text style={styles.label}>Address</Text>
            <TextInput style={[styles.input, showErrors && !patientAddress && styles.inputError]} value={patientAddress} onChangeText={setPatientAddress} />
            {showErrors && !patientAddress && <Text style={styles.errorText}>Address is required</Text>}

            <View style={{ zIndex: 0 }}>
              <Text style={styles.label}>Place of Incident</Text>
              <TextInput style={[styles.input, showErrors && !placeOfIncident && styles.inputError]} value={placeOfIncident} onChangeText={setPlaceOfIncident} />
              {showErrors && !placeOfIncident && <Text style={styles.errorText}>Place of Incident is required</Text>}
            </View>

            <View style={{ zIndex: 1 }}>
              <Text style={styles.label}>Nature of Call</Text>
              <TouchableOpacity style={[styles.multiSelectHeader, showErrors && !natureOfCall && styles.inputError]} onPress={() => setShowNatureOfCallDropdown(true)}>
                <Text style={styles.multiSelectText}>{natureOfCall || 'Select...'}</Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {showErrors && !natureOfCall && <Text style={styles.errorText}>Nature of Call is required</Text>}
              <Modal visible={showNatureOfCallDropdown} transparent={true} animationType="fade" onRequestClose={() => setShowNatureOfCallDropdown(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowNatureOfCallDropdown(false)}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Nature of Call</Text>
                    <ScrollView>
                      {natureOfCallOptions.map(opt => (
                        <TouchableOpacity key={opt} style={styles.dispOption} onPress={() => { setNatureOfCall(opt); setShowNatureOfCallDropdown(false); }}>
                          <Ionicons name={natureOfCall === opt ? "radio-button-on" : "radio-button-off"} size={22} color={natureOfCall === opt ? "#0d6efd" : "#666"} />
                          <Text style={styles.dispText}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>

            <View style={{ zIndex: 0 }}>
              <Text style={styles.label}>Chief Complaint</Text>
              <TextInput style={[styles.input, showErrors && !chiefComplaint && styles.inputError]} value={chiefComplaint} onChangeText={setChiefComplaint} />
              {showErrors && !chiefComplaint && <Text style={styles.errorText}>Chief Complaint is required</Text>}
            </View>
          </ScrollView>
        );
      case 2:
        return (
          <ScrollView style={styles.stepContainer}>
            <Text style={styles.stepTitle}>2. Time Log</Text>
            <View style={styles.alertBox}>
              <Ionicons name="information-circle" size={20} color="#0c5460" />
              <Text style={styles.alertText}>Top 3 times auto-fill from map tracking. Bottom 3 are optional if not transported.</Text>
            </View>
            
            <Text style={styles.label}>Dispatch Time</Text>
            <TextInput style={styles.input} value={dispatchTime} onChangeText={setDispatchTime} placeholder="e.g. 3:53 PM" />
            <Text style={styles.label}>En Route Time</Text>
            <TextInput style={styles.input} value={enRouteTime} onChangeText={setEnRouteTime} placeholder="e.g. 3:54 PM" />
            <Text style={styles.label}>On Scene Time</Text>
            <TextInput style={styles.input} value={onSceneTime} onChangeText={setOnSceneTime} placeholder="e.g. 3:55 PM" />

            <Text style={[styles.label, {marginTop: 20}]}>Transport Time (Optional)</Text>
            <TextInput style={styles.input} value={transportTime} onChangeText={setTransportTime} placeholder="e.g. 4:10 PM" />
            <Text style={styles.label}>Arrived Health Facility (Optional)</Text>
            <TextInput style={styles.input} value={arrivedHF} onChangeText={setArrivedHF} placeholder="e.g. 4:25 PM" />
            <Text style={styles.label}>Departed Health Facility (Optional)</Text>
            <TextInput style={styles.input} value={departedHF} onChangeText={setDepartedHF} placeholder="e.g. 4:40 PM" />
          </ScrollView>
        );
      case 3:
        return (
          <ScrollView style={styles.stepContainer}>
            <Text style={styles.stepTitle}>3. Assessment</Text>
            <Text style={styles.label}>Select Injuries:</Text>
            <View style={styles.checkboxGrid}>
              {injuryOptions.map(inj => (
                <TouchableOpacity 
                  key={inj} 
                  style={[styles.checkboxOption, selectedInjuries.includes(inj) && styles.checkboxSelected]}
                  onPress={() => toggleInjury(inj)}
                >
                  <Ionicons name={selectedInjuries.includes(inj) ? "checkbox" : "square-outline"} size={20} color={selectedInjuries.includes(inj) ? "#fff" : "#666"} />
                  <Text style={[styles.checkboxText, selectedInjuries.includes(inj) && {color: '#fff'}]}>{inj}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, {marginTop: 20}]}>Specific Location Details (Optional)</Text>
            <TextInput 
              style={[styles.input, {height: 80, textAlignVertical: 'top'}]} 
              multiline 
              placeholder="e.g. Forearm, near the wrist"
              value={injuryDetails}
              onChangeText={setInjuryDetails}
            />
          </ScrollView>
        );
      case 4:
        return (
          <ScrollView style={styles.stepContainer}>
            <Text style={styles.stepTitle}>4. Vital Signs</Text>
            {vitals.map((v, index) => (
              <View key={index} style={styles.vitalCard}>
                <Text style={styles.vitalTakeLabel}>{v.take} TAKE</Text>
                <View style={styles.row}>
                  <View style={styles.vitalCol}><Text style={styles.vLabel}>Time</Text><TextInput style={styles.vInput} value={v.time} onChangeText={(t)=>handleUpdateVital(index, 'time', t)}/></View>
                  <View style={styles.vitalCol}><Text style={styles.vLabel}>O2 SAT</Text><TextInput style={styles.vInput} value={v.o2} onChangeText={(t)=>handleUpdateVital(index, 'o2', t)}/></View>
                  <View style={styles.vitalCol}><Text style={styles.vLabel}>PR/HR</Text><TextInput style={styles.vInput} value={v.pr} onChangeText={(t)=>handleUpdateVital(index, 'pr', t)}/></View>
                </View>
                <View style={styles.row}>
                  <View style={styles.vitalCol}><Text style={styles.vLabel}>RR</Text><TextInput style={styles.vInput} value={v.rr} onChangeText={(t)=>handleUpdateVital(index, 'rr', t)}/></View>
                  <View style={styles.vitalCol}><Text style={styles.vLabel}>BP</Text><TextInput style={styles.vInput} value={v.bp} onChangeText={(t)=>handleUpdateVital(index, 'bp', t)}/></View>
                  <View style={styles.vitalCol}><Text style={styles.vLabel}>TEMP</Text><TextInput style={styles.vInput} value={v.temp} onChangeText={(t)=>handleUpdateVital(index, 'temp', t)}/></View>
                </View>
              </View>
            ))}
          </ScrollView>
        );
      case 5:
        return (
          <ScrollView style={styles.stepContainer}>
            <Text style={styles.stepTitle}>5. Glasgow Coma Scale</Text>
            <View style={styles.gcsTotalBox}>
              <Text style={styles.gcsTotalText}>TOTAL SCORE: {gcsEye + gcsVerbal + gcsMotor}</Text>
            </View>

            <Text style={styles.gcsSectionTitle}>Best Eye Response (E)</Text>
            {[
              {v: 4, t: 'Spontaneous - open with blinking'},
              {v: 3, t: 'Opens to verbal command/speech'},
              {v: 2, t: 'Opens to pain, not applied to face'},
              {v: 1, t: 'None'}
            ].map(opt => (
              <TouchableOpacity key={opt.v} style={[styles.gcsBtn, gcsEye === opt.v && styles.gcsBtnActive]} onPress={() => setGcsEye(opt.v)}>
                <Text style={[styles.gcsBtnText, gcsEye === opt.v && styles.gcsBtnTextActive]}>[{opt.v}] {opt.t}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.gcsSectionTitle}>Best Verbal Response (V)</Text>
            {[
              {v: 5, t: 'Oriented'},
              {v: 4, t: 'Confused conversation'},
              {v: 3, t: 'Inappropriate responses'},
              {v: 2, t: 'Incomprehensible speech'},
              {v: 1, t: 'None'}
            ].map(opt => (
              <TouchableOpacity key={opt.v} style={[styles.gcsBtn, gcsVerbal === opt.v && styles.gcsBtnActive]} onPress={() => setGcsVerbal(opt.v)}>
                <Text style={[styles.gcsBtnText, gcsVerbal === opt.v && styles.gcsBtnTextActive]}>[{opt.v}] {opt.t}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.gcsSectionTitle}>Best Motor Response (M)</Text>
            {[
              {v: 6, t: 'Obeys commands for movement'},
              {v: 5, t: 'Purposeful movement to pain'},
              {v: 4, t: 'Withdraws from pain'},
              {v: 3, t: 'Abnormal flexion (decorticate)'},
              {v: 2, t: 'Extensor response (decerebrate)'},
              {v: 1, t: 'None'}
            ].map(opt => (
              <TouchableOpacity key={opt.v} style={[styles.gcsBtn, gcsMotor === opt.v && styles.gcsBtnActive]} onPress={() => setGcsMotor(opt.v)}>
                <Text style={[styles.gcsBtnText, gcsMotor === opt.v && styles.gcsBtnTextActive]}>[{opt.v}] {opt.t}</Text>
              </TouchableOpacity>
            ))}
            <View style={{height: 40}} />
          </ScrollView>
        );
      case 6:
        return (
          <ScrollView style={styles.stepContainer}>
            <Text style={styles.stepTitle}>6. Disposition & Details</Text>
            
            <Text style={styles.label}>Incident/Patient Disposition</Text>
            <TouchableOpacity style={styles.multiSelectHeader} onPress={() => setShowDispositionDropdown(!showDispositionDropdown)}>
              <Text style={styles.multiSelectText}>
                {selectedDispositions.length > 0 ? selectedDispositions.join('; ') : 'Tap to select dispositions...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            
            {showDispositionDropdown && (
              <View style={styles.dropdownBox}>
                {dispositionOptions.map(disp => (
                  <TouchableOpacity key={disp} style={styles.dispOption} onPress={() => toggleDisposition(disp)}>
                    <Ionicons name={selectedDispositions.includes(disp) ? "checkbox" : "square-outline"} size={22} color={selectedDispositions.includes(disp) ? "#0d6efd" : "#666"} />
                    <Text style={styles.dispText}>{disp}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.label, {marginTop: 15}]}>Special Instructions</Text>
            <TextInput style={[styles.input, {height: 60}]} multiline value={specialInstructions} onChangeText={setSpecialInstructions} />

            <Text style={styles.label}>Responders (Auto-filled)</Text>
            <TextInput style={styles.input} value={responders} onChangeText={setResponders} />

            <Text style={styles.label}>Transported To</Text>
            <TextInput style={styles.input} value={transportedTo} onChangeText={setTransportedTo} />

            <Text style={styles.label}>Received By</Text>
            <TextInput style={styles.input} value={receivedBy} onChangeText={setReceivedBy} />
          </ScrollView>
        );
      case 7:
        return (
          <ScrollView style={styles.stepContainer}>
            <Text style={styles.stepTitle}>7. Waiver & Signatures</Text>
            
            <View style={styles.waiverBox}>
              <Text style={styles.waiverText}>By signing this form, I</Text>
              <TextInput style={styles.waiverInput} value={waiverName} onChangeText={setWaiverName} />
              <Text style={styles.waiverText}>is releasing OPOL RESCUE TEAM of any liability and/or medical claim resulting from my decision to refuse care against medical advice.</Text>
            </View>

            <Text style={styles.label}>Digital Signature</Text>
            <TouchableOpacity style={styles.signaturePad} onPress={() => setIsSigned(!isSigned)}>
              {isSigned ? (
                <Text style={styles.signedText}>[ SIGNED BY {waiverName.toUpperCase() || 'PATIENT'} ]</Text>
              ) : (
                <Text style={styles.signHintText}>Tap here to sign</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Witness Information (Optional)</Text>
            <TextInput style={styles.input} value={witnessName} onChangeText={setWitnessName} placeholder="Name of Witness" />

            <Text style={styles.label}>Date</Text>
            <TextInput style={[styles.input, styles.readOnly]} value={patientDate} editable={false} />
          </ScrollView>
        );
    }
  };

  if (!showForm) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.backgroundGlowTop} pointerEvents="none" />
        <View style={styles.backgroundGlowBottom} pointerEvents="none" />
        
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerSubtitle}>MDRRMO MANAGEMENT SYSTEM</Text>
            <Text style={styles.headerTitle}>PATIENT CARE RECORD</Text>
          </View>
        </View>

        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30}}>
          <View style={{ backgroundColor: 'rgba(10, 132, 255, 0.1)', padding: 24, borderRadius: 50, marginBottom: 20 }}>
            <Ionicons name="document-text" size={64} color="#0a84ff" />
          </View>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>No Active Report</Text>
          <Text style={{ color: '#8e8e93', fontSize: 14, textAlign: 'center', marginBottom: 40, lineHeight: 22 }}>
            There is currently no emergency dispatch or Patient Care Report being drafted.
          </Text>
          
          <TouchableOpacity 
            style={{ backgroundColor: '#0a84ff', flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16 }} 
            onPress={() => setShowForm(true)}
          >
            <Ionicons name="add-circle" size={20} color="#fff" style={{marginRight: 8}} />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Create New PCR</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backgroundGlowTop} pointerEvents="none" />
      <View style={styles.backgroundGlowBottom} pointerEvents="none" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerSubtitle}>STEP {step} OF {totalSteps}</Text>
          <Text style={styles.headerTitle}>PATIENT CARE RECORD</Text>
        </View>
        <TouchableOpacity onPress={handleClearDraft} style={{ padding: 8 }}>
          <Ionicons name="trash-outline" size={24} color="#ef4544" />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${(step / totalSteps) * 100}%` }]} />
      </View>

      {/* Form Content */}
      <View style={styles.content}>
        {renderStep()}
      </View>

      {/* Footer Navigation */}
      <View style={styles.footer} pointerEvents="box-none">
        <TouchableOpacity 
          style={[styles.navBtn, step === 1 && styles.navBtnDisabled]} 
          disabled={step === 1}
          onPress={() => setStep(step - 1)}
        >
          <Ionicons name="arrow-back" size={18} color={step === 1 ? "#3a3a44" : "#fff"} />
        </TouchableOpacity>

        {step < totalSteps ? (
          <TouchableOpacity style={styles.navBtnPrimary} onPress={handleNextStep}>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.navBtnText}>Submit PCR</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050507',
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 64 : 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0a84ff',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#1f1f26',
    marginHorizontal: 24,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0a84ff',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 24,
    paddingBottom: 200, // extra padding so content scrolls above floating footer
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8e8e93',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#111115',
    borderWidth: 1,
    borderColor: '#1f1f26',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#fff',
  },
  readOnly: {
    backgroundColor: '#0a0a0c',
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  navBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111115',
    borderWidth: 1,
    borderColor: '#1f1f26',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  navBtnDisabled: {
    backgroundColor: '#0a0a0c',
    borderColor: '#111115',
    opacity: 0.5,
  },
  navBtnPrimary: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a84ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#0a84ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34c759',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#34c759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  navBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    marginHorizontal: 8,
  },
  dropdownResults: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: '#111115',
    borderWidth: 1,
    borderColor: '#1f1f26',
    borderRadius: 12,
    maxHeight: 180,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 100,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f26',
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  alertText: {
    color: '#0a84ff',
    marginLeft: 12,
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  checkboxOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111115',
    borderWidth: 1,
    borderColor: '#1f1f26',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  checkboxSelected: {
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderColor: '#0a84ff',
  },
  checkboxText: {
    marginLeft: 10,
    fontSize: 13,
    color: '#e1e3e5',
    fontWeight: '600',
  },
  vitalCard: {
    backgroundColor: '#111115',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1f1f26',
  },
  vitalTakeLabel: {
    fontWeight: '900',
    color: '#0a84ff',
    marginBottom: 16,
    fontSize: 14,
    letterSpacing: 1,
  },
  vitalCol: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 12,
  },
  vLabel: {
    fontSize: 10,
    color: '#8e8e93',
    marginBottom: 6,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  vInput: {
    borderWidth: 1,
    borderColor: '#1f1f26',
    backgroundColor: '#0a0a0c',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  gcsTotalBox: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  gcsTotalText: {
    color: '#34c759',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  gcsSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    marginTop: 8,
    marginBottom: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  gcsBtn: {
    backgroundColor: '#111115',
    borderWidth: 1,
    borderColor: '#1f1f26',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  gcsBtnActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderColor: '#0a84ff',
  },
  gcsBtnText: {
    fontSize: 14,
    color: '#8e8e93',
    fontWeight: '600',
  },
  gcsBtnTextActive: {
    color: '#0a84ff',
    fontWeight: '800',
  },
  multiSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111115',
    borderWidth: 1,
    borderColor: '#1f1f26',
    borderRadius: 12,
    padding: 16,
  },
  multiSelectText: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#111115',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f1f26',
    maxHeight: '80%',
    paddingVertical: 10,
  },
  modalTitle: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f26',
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    marginBottom: -2,
    marginLeft: 4,
    fontWeight: '600',
  },
  dropdownBox: {
    backgroundColor: '#111115',
    borderWidth: 1,
    borderColor: '#1f1f26',
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 8,
  },
  dispOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f26',
  },
  dispText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#e1e3e5',
    fontWeight: '500',
  },
  waiverBox: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    marginBottom: 24,
  },
  waiverText: {
    color: '#ff453a',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  waiverInput: {
    backgroundColor: '#0a0a0c',
    borderWidth: 1,
    borderColor: '#ff453a',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
    fontWeight: '800',
    color: '#fff',
    fontSize: 15,
  },
  signaturePad: {
    height: 140,
    backgroundColor: '#111115',
    borderWidth: 2,
    borderColor: '#2b2b35',
    borderStyle: 'dashed',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signHintText: {
    color: '#8e8e93',
    fontSize: 15,
    fontWeight: '600',
  },
  signedText: {
    color: '#34c759',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  }
});
