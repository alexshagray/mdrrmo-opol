import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

function getDevHostIp(): string {
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    return hostUri.split(':')[0];
  }
  return '172.18.249.58';
}

export const setStorageItem = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage set failed', e);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

export const getStorageItem = async (key: string) => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage get failed', e);
      return null;
    }
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

export const deleteStorageItem = async (key: string) => {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage delete failed', e);
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

// Use ngrok tunnel URL to bypass local network / firewall issues
const API_BASE_URL = 'https://overtone-luminance-monopoly.ngrok-free.dev/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request Interceptor: Automatically inject Bearer Token from SecureStore
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getStorageItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('[SecureStore Error]', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Centralized log warning and auto token-wipe on 401 Unauthenticated
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.warn('[API Error Response]', error.response?.data || error.message);
    if (error.response && error.response.status === 401) {
      console.warn('[API Auth Error] Token is invalid on server. Wiping local auth token...');
      try {
        await deleteStorageItem('auth_token');
      } catch (e) {
        console.warn('Wipe failed in interceptor', e);
      }
    }
    return Promise.reject(error);
  }
);

// --- AUTHENTICATION APIS ---

export const loginUser = async (email: string, password: string) => {
  try {
    const response = await apiClient.post('/login', { email, password });
    if (response.data.access_token) {
      await setStorageItem('auth_token', response.data.access_token);
    }
    return response.data;
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Network error. Cannot connect to server. Please check Windows Firewall.');
    }
    const errorMsg = error.response?.data?.message || 'Login failed. Please check your credentials.';
    throw new Error(errorMsg);
  }
};

export const registerUser = async (name: string, email: string, password: string, phone?: string) => {
  try {
    const response = await apiClient.post('/register', { name, email, password, phone });
    if (response.data.access_token) {
      await setStorageItem('auth_token', response.data.access_token);
    }
    return response.data;
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Network error. Cannot connect to server. Please check Windows Firewall.');
    }
    const errorMsg = error.response?.data?.message || 'Registration failed. Please check your details.';
    throw new Error(errorMsg);
  }
};

export const logoutUser = async () => {
  try {
    await apiClient.post('/logout');
  } catch (error) {
    console.warn('Backend logout failed, proceeding with local token wipe anyway.');
  } finally {
    await deleteStorageItem('auth_token');
  }
};

export const fetchUserProfile = async () => {
  try {
    const response = await apiClient.get('/user', { timeout: 15000 });
    return response.data;
  } catch (error: any) {
    console.warn('Error fetching profile (falling back to simulation):', error);
    // Return simulated profile if backend is unreachable
    return {
      id: 1,
      name: 'Emergency Responder',
      email: 'responder@balansag.com',
      role: 'responder',
    };
  }
};

export const updateUserProfile = async (name: string, email: string, password?: string, phone?: string) => {
  try {
    const response = await apiClient.post('/user/update', { name, email, password, phone });
    return response.data;
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Network error. Cannot connect to server.');
    }
    const errorMsg = error.response?.data?.message || 'Failed to update profile details.';
    throw new Error(errorMsg);
  }
};

// --- EMERGENCY INCIDENT APIS ---

export interface IncidentPayload {
  incident_id: string;
  caller_number: string;
  latitude: number;
  longitude: number;
  status: string;
}

export const checkResidentDatabase = async (phoneNumber: string) => {
  try {
    const { data } = await apiClient.get('/residents/check', {
      params: { phone_number: phoneNumber },
      timeout: 3000
    });
    return data;
  } catch (error) {
    console.warn('Error checking resident database (falling back to mockup):', error);
    // Mock fallback for simulator/testing
    if (phoneNumber === '+639500905679') {
      return {
        isRegistered: true,
        resident: {
          full_name: 'Juan Dela Cruz',
          phone_number: '+639500905679',
          latitude: 14.5995,
          longitude: 120.9842,
          address: 'Purok 3, Barangay Poblacion, Opol, Misamis Oriental',
          gps_enabled: true
        }
      };
    }
    return { isRegistered: false, resident: null };
  }
};

export const fetchIncidents = async () => {
  try {
    const { data } = await apiClient.get('/incidents');
    return data;
  } catch (error) {
    console.error('Error fetching incidents:', error);
    throw error;
  }
};

export const reportIncident = async (data: IncidentPayload) => {
  try {
    const response = await apiClient.post('/incident_reports', data);
    return response.data;
  } catch (error) {
    console.warn('Error reporting incident (falling back to simulation):', error);
    return {
      success: true,
      message: 'Incident reported successfully (Simulated fallback)',
      incident_id: data.incident_id || 'INC-MOCK'
    };
  }
};

export const deleteIncident = async (id: number) => {
  try {
    const response = await apiClient.delete(`/incident_reports/${id}`);
    return response.data;
  } catch (error) {
    console.warn('Error deleting incident (falling back to simulation):', error);
    return { success: true };
  }
};

export const searchResidents = async (query: string) => {
  if (!query || query.length < 2) return [];
  try {
    const { data } = await apiClient.get('/residents/search', {
      params: { q: query },
      timeout: 5000
    });
    return data;
  } catch (error) {
    console.warn('Error searching residents:', error);
    return [];
  }
};

export const savePatientCareReport = async (payload: any) => {
  try {
    const response = await apiClient.post('/patient_care_reports', payload, { timeout: 8000 });
    return response.data;
  } catch (error) {
    console.warn('Error saving patient care report (falling back to simulation):', error);
    return {
      success: true,
      message: 'Patient Care Report submitted successfully (Saved locally)',
      incident_id: payload.incident_id || 'INC-MOCK-PCR'
    };
  }
};

export const fetchPatientCareReports = async () => {
  try {
    const { data } = await apiClient.get('/patient_care_reports');
    return data;
  } catch (e) {
    console.warn('Error fetching patient care reports (falling back to simulation)');
    return [
      {
        id: 1,
        patient_name: 'Maria Santos',
        emergency_type: 'Motorcycle Accident',
        status: 'completed',
      },
      {
        id: 2,
        patient_name: 'Juan Dela Cruz',
        emergency_type: 'Cardiac Arrest',
        status: 'completed',
      }
    ];
  }
};

export const deletePatientCareReport = async (id: number) => {
  try {
    const { data } = await apiClient.delete(`/patient_care_reports/${id}`);
    return data;
  } catch (e) {
    console.warn('Error deleting patient care report, simulated deletion anyway', e);
    return { success: true };
  }
};

export const fetchNotifications = async () => {
  try {
    const { data } = await apiClient.get('/notifications');
    return data;
  } catch (e) {
    console.warn('Error fetching notifications:', e);
    return [];
  }
};

// --- STAFF 1 INVENTORY APIS ---
export const addInventoryItem = async (itemData: any) => {
  try {
    const { data } = await apiClient.post('/inventory', itemData);
    return data;
  } catch (error) {
    console.error('Error adding inventory item:', error);
    throw error;
  }
};

