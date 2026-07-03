import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Staff1Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Staff1 Home</Text>
      <Text style={styles.subtitle}>Welcome to the Staff1 Dashboard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050507',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#8e8e93',
    fontSize: 16,
    marginTop: 8,
  },
});
