import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';

const TabIcon = ({ focused, name, outlineName, color }: { focused: boolean, name: any, outlineName: any, color: string }) => (
  <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
    {focused && (
      <View style={{ 
        position: 'absolute', 
        top: -12, // Moves the line to the very top edge of the tab bar
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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0a84ff', // Keeping your existing primary color
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: {
          backgroundColor: '#16161a', // Keeping your dark theme
          borderTopColor: '#2d2d34',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 90 : 75,
          paddingBottom: Platform.OS === 'ios' ? 30 : 16,
          paddingTop: 12,
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
