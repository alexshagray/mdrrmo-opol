import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator, Platform, Alert, PermissionsAndroid, AppState, AppStateStatus } from 'react-native';
import { fetchNotifications, getStorageItem, setStorageItem } from '../services/api';

// Only import the native module on Android — it will not exist on iOS or web
let CallDetectorModule: any = null;
if (Platform.OS === 'android') {
  try {
    CallDetectorModule = require('expo-call-detector').CallDetectorModule;
  } catch (e) {
    console.warn('CallDetector native module not available', e);
  }
}

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const callSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    checkAuthToken();
  }, []);

  const [incomingCallNumber, setIncomingCallNumber] = useState<string | null>(null);
  const handledCallNumberRef = useRef<string | null>(null);
  const rootNavigationState = useRootNavigationState();

  const checkActiveCall = () => {
    if (!CallDetectorModule) return;
    try {
      if (CallDetectorModule.getCurrentCallPhoneNumber) {
        const activeNumber = CallDetectorModule.getCurrentCallPhoneNumber();
        if (activeNumber && activeNumber !== handledCallNumberRef.current) {
          
          if ((global as any).ignoreCallsUntil && Date.now() < (global as any).ignoreCallsUntil) {
            console.log('[CallDetector] Ignoring outgoing call:', activeNumber);
            handledCallNumberRef.current = activeNumber;
            return;
          }

          console.log('[CallDetector] Active call detected:', activeNumber);
          setIncomingCallNumber(activeNumber);
          handledCallNumberRef.current = activeNumber;
        }
      }
    } catch (e) {
      console.warn('Failed to check active calls', e);
    }
  };

  // Global incoming call listener — must be mounted at root so it fires regardless of screen
  useEffect(() => {
    const setupCallDetection = async () => {
      if (Platform.OS === 'android') {
        try {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
            PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
            PermissionsAndroid.PERMISSIONS.ANSWER_PHONE_CALLS,
            PermissionsAndroid.PERMISSIONS.SEND_SMS,
          ]);
        } catch (e) {
          console.warn('Permission request error', e);
        }
      }

      if (!CallDetectorModule) return;

      // 1. Check if there's ALREADY an active call we missed during cold start
      checkActiveCall();

      // 2. Prompt user to set the app as the default dialer if not already set
      try {
        if (CallDetectorModule.isDefaultDialer) {
          const isDefault = await CallDetectorModule.isDefaultDialer();
          if (!isDefault) {
            Alert.alert(
              "Default Phone App Required",
              "This app must be set as your default phone application to receive and answer incoming emergency calls.",
              [
                { text: "Later", style: "cancel" },
                {
                  text: "Set Default",
                  onPress: async () => {
                    try {
                      await CallDetectorModule.requestDefaultDialer();
                    } catch (e) {
                      console.warn("Failed to request default dialer:", e);
                    }
                  }
                }
              ]
            );
          }
        }
      } catch (err) {
        console.warn("Failed to check default dialer status:", err);
      }

      // 3. Listen for future calls while app is awake
      callSubscriptionRef.current = CallDetectorModule.addListener(
        'onCallAdded',
        ({ phoneNumber }: { phoneNumber: string }) => {
          if (phoneNumber !== handledCallNumberRef.current) {
            
            if ((global as any).ignoreCallsUntil && Date.now() < (global as any).ignoreCallsUntil) {
              console.log('[CallDetector] Ignoring outgoing call listener event:', phoneNumber);
              handledCallNumberRef.current = phoneNumber;
              return;
            }

            setIncomingCallNumber(phoneNumber);
            handledCallNumberRef.current = phoneNumber;
          }
        }
      );
      
      const removedSub = CallDetectorModule.addListener('onCallRemoved', () => {
        handledCallNumberRef.current = null;
      });
    };

    setupCallDetection();

    // 3. Monitor AppState to check for active calls when the app returns to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkActiveCall();
      }
    };
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      callSubscriptionRef.current?.remove();
      appStateSubscription.remove();
    };
  }, []);

  // Handle routing ONLY when Expo Router navigation is actually ready
  useEffect(() => {
    if (rootNavigationState?.key && incomingCallNumber) {
      // Small timeout to ensure AuthGuard finishes its initial mount checks
      setTimeout(() => {
        try {
          router.push({
            pathname: '/incoming-call',
            params: { phoneNumber: incomingCallNumber },
          });
        } catch (err) {
          console.warn('Navigation not ready, deferring push...', err);
          setTimeout(() => {
            try {
              router.push({
                pathname: '/incoming-call',
                params: { phoneNumber: incomingCallNumber },
              });
            } catch (e) {
              console.warn('Deferred navigation failed');
            }
          }, 1000);
        }
      }, 800);
      setIncomingCallNumber(null); // prevent infinite loop
    }
  }, [rootNavigationState?.key, incomingCallNumber]);

  // Poll for global event notifications
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const pollNotifications = async () => {
      if (!isAuthenticated) return;
      try {
        const data = await fetchNotifications();
        
        // Use SecureStore or simple local array to track read notifications
        // For simplicity in this mock, we use a simple set to avoid infinite alerts while app is open
        // A full implementation would use AsyncStorage/SecureStore
        
        const readIdsStr = await getStorageItem('readNotifications') || '[]';
        const readIds = JSON.parse(readIdsStr);
        
        const unreadAlerts = data.filter((n: any) => n.type === 'event_alert' && !readIds.includes(n.id));
        
        if (unreadAlerts.length > 0) {
          const alert = unreadAlerts[0];
          Alert.alert(
            "🚨 New System Alert",
            `${alert.title}\n\n${alert.message}`,
            [
              { 
                text: "Acknowledge", 
                onPress: async () => {
                  readIds.push(alert.id);
                  await setStorageItem('readNotifications', JSON.stringify(readIds));
                }
              }
            ]
          );
        }
      } catch (err) {
        // silently fail polling
      }
    };

    if (isAuthenticated) {
      pollNotifications();
      interval = setInterval(pollNotifications, 10000);
    }
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  async function checkAuthToken() {
    try {
      const token = await getStorageItem('auth_token');
      setIsAuthenticated(!!token);
    } catch (e) {
      console.warn('Failed to load token', e);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

  // React to segment changes for redirection (Auth Guard)
  useEffect(() => {
    if (isLoading) return;

    getStorageItem('auth_token').then(token => {
      const hasToken = !!token;
      if (hasToken !== isAuthenticated) {
        setIsAuthenticated(hasToken);
        return;
      }

      const firstSegment = segments[0] as string;
      const inAuthGroup = firstSegment === '(tabs)' || firstSegment === '(staff1)';

      if (!hasToken && inAuthGroup) {
        router.replace('/login');
      } else if (hasToken && !inAuthGroup && firstSegment !== '(staff1)' && firstSegment !== 'incoming-call') {
        router.replace('/(tabs)/home');
      } else if (!hasToken && !inAuthGroup && firstSegment !== 'login' && firstSegment !== 'incoming-call') {
        router.replace('/login');
      }
    });
  }, [segments, isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121214' }}>
        <ActivityIndicator size="large" color="#0a84ff" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="incoming-call"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}
