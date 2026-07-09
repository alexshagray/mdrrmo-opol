
import { io } from 'socket.io-client';

let socket: any = null;

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Dynamically resolve Metro bundler IP address to support wireless local connection
const getDevHostIp = (): string => {
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri && !hostUri.includes('172.')) {
    return hostUri.split(':')[0];
  }
  // Force the correct Wi-Fi IP address for the user's current network
  return '192.168.1.19';
};

// --- CHOOSE YOUR CONNECTION METHOD (Uncomment the one you want to use) ---

// Option 1: LocalTunnel (Works anywhere over the internet)
// const SOCKET_URL = Platform.OS === 'web'
//   ? 'http://127.0.0.1:3000'
//   : 'https://mdrrmo-opol-socket.loca.lt'; // Permanent LocalTunnel URL

// Option 2: Local Wi-Fi Network (Requires phone and PC on same Wi-Fi)
const SOCKET_URL = Platform.OS === 'web'
  ? 'http://127.0.0.1:3000'
  : `http://${getDevHostIp()}:3000`;


export const initializeSocket = (url = SOCKET_URL) => {
  if (!socket) {
    console.log(`[Socket] Connecting mobile client to dispatch socket: ${url}`);
    socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
      forceNew: true,
      extraHeaders: {
        "Bypass-Tunnel-Reminder": "true" // Required to bypass LocalTunnel warning page
      }
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to dispatcher telemetry hub.');
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from dispatcher.');
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket first.');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected');
  }
};

export let isTrackingActive = false;
export const setTrackingActive = (val: boolean) => {
  isTrackingActive = val;
};
