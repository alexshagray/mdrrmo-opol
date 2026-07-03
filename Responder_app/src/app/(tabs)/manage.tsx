import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

const ManageIncidentScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const incidentId = params.incidentId;

  // Mock details loaded for visual confirmation
  const incident = {
    id: incidentId,
    title: `Incident #${incidentId || 'MOCK'}`,
    status: 'Active',
    description: 'Emergency responders are on-site and treatment protocol has initiated.',
    location: { latitude: 14.5995, longitude: 120.9842 },
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{incident.title}</Text>
        <Text style={styles.status}>Status: {incident.status}</Text>
        <Text style={styles.sectionHeader}>Description</Text>
        <Text style={styles.body}>{incident.description}</Text>
        <Text style={styles.sectionHeader}>Incident Location Coordinates</Text>
        <Text style={styles.body}>
          Latitude: {incident.location.latitude}, Longitude: {incident.location.longitude}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#0c0c0e',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#16161a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2d2d34',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    color: '#0a84ff',
    fontWeight: '600',
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8e8e93',
    marginTop: 16,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 15,
    color: '#e1e3e5',
    lineHeight: 22,
  },
});

export default ManageIncidentScreen;
