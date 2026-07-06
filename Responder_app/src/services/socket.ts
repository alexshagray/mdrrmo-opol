
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
  return '192.168.1.14';
};

const SOCKET_URL = Platform.OS === 'web' 
  ? 'http://127.0.0.1:3000'
  : `http://${getDevHostIp()}:3000`;


export const initializeSocket = (url = SOCKET_URL) => {
  if (!socket) {
    console.log(`[Socket] Connecting mobile client to dispatch socket: ${url}`);
    socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
      forceNew: true
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
