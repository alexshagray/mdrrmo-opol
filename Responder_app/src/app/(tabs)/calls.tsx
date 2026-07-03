import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Alert, TextInput } from 'react-native';
import { fetchIncidents, deleteIncident } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type Incident = {
  id: number;
  incident_id: string;
  caller_name: string;
  caller_number: string;
  emergency_type: string;
  status: string;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
    phone_number: string;
  };
  location?: {
    location: string;
    barangay: string;
  };
};

export default function CallLogsScreen() {
  const [calls, setCalls] = useState<Incident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const loadCalls = async () => {
    setIsLoading(true);
    try {
      const response = await fetchIncidents();
      // The API returns paginated data (response.data) or a flat array depending on the backend.
      const data = response.data ? response.data : response;
      // Safeguard: Limit to the 50 most recent calls to prevent memory crashes
      const limitedData = Array.isArray(data) ? data.slice(0, 50) : data;
      setCalls(limitedData);
    } catch (e) {
      console.warn('Failed to load call logs', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteIncident(id);
      setCalls(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.warn('Delete failed', e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#ef4444';
      case 'dispatched': return '#f59e0b';
      case 'completed': return '#34c759';
      default: return '#8e8e93';
    }
  };

  const renderCallItem = ({ item }: { item: Incident }) => {
    const callerName = item.user ? `${item.user.first_name} ${item.user.last_name}` : (item.caller_name || 'Unknown Caller');
    const callerNumber = item.user?.phone_number || item.caller_number || 'No Number';
    const date = new Date(item.created_at).toLocaleString();

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerProfileRow}>
            <View style={styles.avatar}>
              <Ionicons name="call" size={16} color="#0a84ff" />
            </View>
            <View>
              <Text style={styles.title}>{callerName}</Text>
              <Text style={styles.phoneNumber}>{callerNumber}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={18} color="#ff453a" />
          </TouchableOpacity>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color="#8e8e93" />
            <Text style={styles.detailText}>{date}</Text>
          </View>
        </View>
      </View>
    );
  };

  const filteredCalls = calls.filter(call => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = call.user ? `${call.user.first_name} ${call.user.last_name}`.toLowerCase() : (call.caller_name || '').toLowerCase();
    const type = (call.emergency_type || '').toLowerCase();
    const phone = (call.user?.phone_number || call.caller_number || '').toLowerCase();
    return name.includes(q) || type.includes(q) || phone.includes(q);
  });

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>AUTOMATIC INCIDENT LOGS</Text>
            <Text style={styles.headerText}>CALL LOGS</Text>
          </View>
          <TouchableOpacity onPress={loadCalls} style={styles.refreshButton}>
            <View style={styles.refreshBadge}>
              <Ionicons name="refresh" size={18} color="#0a84ff" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#8e8e93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, type, or phone..."
            placeholderTextColor="#8e8e93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color="#8e8e93" />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0a84ff" />
            <Text style={styles.loadingText}>Fetching Call Logs...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCalls}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCallItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="call-outline" size={48} color="#8e8e93" />
                </View>
                <Text style={styles.emptyTitle}>No Call Logs</Text>
                <Text style={styles.emptySubtitle}>
                  All incoming emergency calls and reported incidents will appear here automatically.
                </Text>
                <TouchableOpacity onPress={loadCalls} style={styles.emptyButton}>
                  <Ionicons name="refresh-outline" size={16} color="#fff" />
                  <Text style={styles.emptyButtonText}>Sync Database</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050507',
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 64,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0a84ff',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  refreshButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111116',
    borderWidth: 1,
    borderColor: '#1f1f26',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111115',
    borderWidth: 1,
    borderColor: '#1f1f26',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  list: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#111115',
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1f1f26',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  phoneNumber: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  badge: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  detailsContainer: {
    backgroundColor: '#0a0a0c',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#e1e3e5',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1f1f26',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderRadius: 8,
  },
  action: {
    color: '#0a84ff',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#111115',
    borderWidth: 1,
    borderColor: '#1f1f26',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 28,
  },
  emptyButton: {
    flexDirection: 'row',
    backgroundColor: '#0a84ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
