import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import * as Location from 'expo-location';
import { getSocket, initializeSocket, isTrackingActive } from '@/services/socket';
import { fetchUserProfile } from '@/services/api';

const TabIcon = ({ focused, name, outlineName, color }: { focused: boolean, name: any, outlineName: any, color: string }) => (
  <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
    {focused && (
      <View style={{ 
        position: 'absolute', 
        top: -8, // Moves the line to the very top edge of the tab bar
        width: 36, 
        height: 3, 
        backgroundColor: color, 
        borderBottomLeftRadius: 3, 
        borderBottomRightRadius: 3 
      }} />
    )}
    <Ionicons name={focused ? name : outlineName} size={24} color={color} />
  </View>
);

export default function TabsLayout() {
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let broadcastInterval: ReturnType<typeof setInterval> | null = null;
    let currentLoc: any = null;
    let responderInfo: any = null;

    (async () => {
      try {
        const profile = await fetchUserProfile();
        if (profile) {
          responderInfo = { id: profile.id, name: profile.name };
        }
      } catch (err) {
        console.warn('[_layout] Failed to fetch user profile:', err);
      }

      initializeSocket();

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      try {
        const lastLoc = await Location.getLastKnownPositionAsync();
        if (lastLoc) {
          currentLoc = {
            latitude: lastLoc.coords.latitude,
            longitude: lastLoc.coords.longitude,
          };
        }
      } catch (e) {
        console.warn('Could not get initial location', e);
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLoc) => {
          currentLoc = {
            latitude: newLoc.coords.latitude,
            longitude: newLoc.coords.longitude,
          };
        }
      );

      broadcastInterval = setInterval(() => {
        // If tracking tab is active, let it handle the broadcasting to avoid conflicts
        if (!currentLoc || !responderInfo || isTrackingActive) return;
        
        const socket = getSocket();
        if (socket) {
          const payload = {
            responderId: responderInfo.id,
            responderName: responderInfo.name,
            incidentId: null,
            latitude: currentLoc.latitude,
            longitude: currentLoc.longitude,
            destLatitude: null,
            destLongitude: null,
            status: 'available'
          };
          socket.emit('responderLocationUpdate', payload);
        }
      }, 5000);
    })();

    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (broadcastInterval) clearInterval(broadcastInterval);
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0a84ff', // Keeping your existing primary color
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: {
          backgroundColor: '#000000', 
          borderTopColor: '#000000',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 80 : 95,
          paddingBottom: Platform.OS === 'ios' ? 24 : 36,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} name="home" outlineName="home-outline" />,
        }}
      />
      <Tabs.Screen
        name="tracking"
        options={{
          title: 'Tracking',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} name="map" outlineName="map-outline" />,
        }}
      />
      <Tabs.Screen
        name="pcr"
        options={{
          title: 'PCR',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} name="document-text" outlineName="document-text-outline" />,
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Call Logs',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} name="call" outlineName="call-outline" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} name="person" outlineName="person-outline" />,
        }}
      />
      {/* Hide the old manage screen from tab bar (keep as hidden sheet or detail page if referenced) */}
      <Tabs.Screen
        name="manage"
        options={{
          href: null, // Hides from tab bar
        }}
      />
    </Tabs>
  );
}
