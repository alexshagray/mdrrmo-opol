import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addInventoryItem } from '@/services/api';

export default function Staff1Inventory() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [threshold, setThreshold] = useState('');
  const [status, setStatus] = useState('Available');
  const [itemCondition, setItemCondition] = useState('New');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddItem = async () => {
    if (!name || !category || !quantity || !threshold) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      await addInventoryItem({
        name,
        category,
        quantity: parseInt(quantity, 10),
        threshold: parseInt(threshold, 10),
        status,
        item_condition: itemCondition,
      });

      Alert.alert('Success', 'Inventory item added successfully!');
      // Reset form
      setName('');
      setCategory('');
      setQuantity('');
      setThreshold('');
      setStatus('Available');
      setItemCondition('New');
    } catch (error) {
      Alert.alert('Error', 'Failed to add inventory item.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Premium glowing background overlay */}
      <View style={styles.backgroundGlowTop} />
      
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="cube-outline" size={28} color="#0a84ff" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Inventory Manager</Text>
          <Text style={styles.headerSubtitle}>Staff1 Dashboard</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add New Item</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. First Aid Kit"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Medical Supplies"
              placeholderTextColor="#666"
              value={category}
              onChangeText={setCategory}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Threshold</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={threshold}
                onChangeText={setThreshold}
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Condition</Text>
            <View style={styles.chipContainer}>
              {['New', 'Good', 'Fair', 'Poor'].map((cond) => (
                <TouchableOpacity
                  key={cond}
                  style={[styles.chip, itemCondition === cond && styles.chipActive]}
                  onPress={() => setItemCondition(cond)}
                >
                  <Text style={[styles.chipText, itemCondition === cond && styles.chipTextActive]}>
                    {cond}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.chipContainer}>
              {['Available', 'Low Stock', 'Out of Stock'].map((stat) => (
                <TouchableOpacity
                  key={stat}
                  style={[styles.chip, status === stat && styles.chipActive]}
                  onPress={() => setStatus(stat)}
                >
                  <Text style={[styles.chipText, status === stat && styles.chipTextActive]}>
                    {stat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleAddItem}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>ADD INVENTORY ITEM</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    filter: 'blur(80px)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f26',
    backgroundColor: 'rgba(5, 5, 7, 0.8)',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#0a84ff',
    fontWeight: '600',
    marginTop: 2,
  },
  scrollContent: {
    padding: 24,
  },
  card: {
    backgroundColor: '#111115',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1f1f26',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8e8e93',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#181822',
    borderWidth: 1,
    borderColor: '#2b2b36',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    color: '#fff',
    fontSize: 15,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#181822',
    borderWidth: 1,
    borderColor: '#2b2b36',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    borderColor: '#0a84ff',
  },
  chipText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#0a84ff',
  },
  submitButton: {
    backgroundColor: '#0a84ff',
    flexDirection: 'row',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
    shadowColor: '#0a84ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#004280',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
