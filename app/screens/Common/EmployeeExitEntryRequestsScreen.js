// app/screens/employee/EmployeeExitEntryRequestsScreen.js
//--------------------------------------------------------
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather, AntDesign } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications'; // optional
import { useSelector } from 'react-redux';

import api from '../../../services/api';

/* ---- shared colours (same object you use elsewhere) ---- */
const COLORS = {
  primary: '#1f3d7c',
  error: '#d32f2f',
  border: '#e0e0e0',
  background: '#f8f9fa',
  card: '#fff',
  shadow: 'rgba(0,0,0,0.05)',
};

const STATUS_COLORS = {
  PENDING: '#f59e0b',
  APPROVED: '#27ae60',
  REJECTED: '#e74c3c',
  CANCELLED: '#9e9e9e',
  default: '#667385',
};

export default function EmployeeExitEntryRequestsScreen() {
  const navigation = useNavigation();
  const toast = useToast();

  const role = useSelector((s) => s.auth.user?.role); // if you store role in Redux

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');

  /* ---------- fetch logic ---------- */
  const fetchList = async () => {
    setErr('');
    try {
      const { data } = await api.get('/exit-entry-requests'); // <- adjust if needed
      setList(data || []);
    } catch (e) {
      console.error(e);
      setErr('Could not load exit/entry requests. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* on mount */
  useEffect(() => {
    fetchList();
  }, []);

  /* on screen focus (ensures list refresh after creating / cancelling) */
  useFocusEffect(
    useCallback(() => {
      fetchList();
    }, [])
  );

  /* pull-to-refresh */
  const onRefresh = () => {
    setRefreshing(true);
    fetchList();
  };

  /* ---------- cancel ---------- */
  const cancelRequest = async (id) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'No' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/exit-entry-requests/${id}/cancel`);
            toast.show('Request cancelled', { type: 'success' });
            fetchList();
          } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to cancel request');
          }
        },
      },
    ]);
  };

  /* ---------- render helpers ---------- */
  const renderItem = ({ item }) => {
    const statusColor = STATUS_COLORS[item.status?.toUpperCase()] || STATUS_COLORS.default;
    const canCancel = item.status === 'PENDING'; // everyone may cancel while pending

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ExitEntryRequestDetails', { requestId: item.id })}
      >
        {/* top row */}
        <View style={styles.row}>
          <Text style={styles.id}>#{item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* body */}
        <View style={styles.row}>
          <Text style={styles.label}>Validity From:</Text>
          <Text style={styles.value}>{item.validity_from_date}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Validity To:</Text>
          <Text style={styles.value}>{item.validity_to_date}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Visa Type:</Text>
          <Text style={styles.value}>{item.visa_type}</Text>
        </View>

        {/* actions */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => cancelRequest(item.id)}
          >
            <AntDesign name="closecircleo" size={16} color="#fff" />
            <Text style={styles.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  /* ---------- render root ---------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 8 }}>Loading Exit/Entry Requests…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <TouchableOpacity
        style={styles.newBtn}
        onPress={() => navigation.navigate('ExitEntryRequest')}
      >
        <Feather name="plus" size={20} color="#fff" />
        <Text style={styles.newTxt}>New Exit/Entry Request</Text>
      </TouchableOpacity>

      {err ? (
        <Text style={{ color: COLORS.error, margin: 16 }}>{err}</Text>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: '#667385' }}>No requests found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* new btn */
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    margin: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newTxt: { color: '#fff', fontWeight: '600' },

  /* card */
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  id: { fontWeight: '700', color: COLORS.primary },
  label: { color: '#667385' },
  value: { color: '#2c3e50', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: { fontWeight: '700', fontSize: 12 },

  /* cancel */
  cancelBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.error,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelTxt: { color: '#fff', fontWeight: '600' },
});
