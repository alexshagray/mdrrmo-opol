import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function IndexGateway() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0a84ff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0e',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
