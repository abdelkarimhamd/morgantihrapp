import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import api from '../../../services/api';

export default function HRAdminExitEntryRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState({ visible: false, id: null, type: null });
  const [detailsModal, setDetailsModal] = useState({ visible: false, item: null });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchExitRequests();
  }, []);

  const fetchExitRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/exit-entry-requests');
      setRequests(Array.isArray(res.data) ? res.data : []);
      console.log('Exit/Entry Requests:', res.data);
      
    } catch (e) {
      console.error('Error fetching exit requests:', e);
      setError('Failed to load Exit/Entry requests.');
    } finally {
      setLoading(false);
    }
  };

  // === Handle Approve or Reject ===
  const handleAction = async () => {
    const { id, type } = confirmAction;
    if (!id || !type) return;

    setProcessing(true);
    try {
      // PATCH /exit-entry-requests/{id}/status with { status: "Approved" | "Rejected" }
      await api.patch(`/exit-entry-requests/${id}/status`, { status: type });

      // Notify success
      Alert.alert('Success', `Request has been ${type.toLowerCase()} successfully!`);

      // Refresh list
      fetchExitRequests();
    } catch (e) {
      console.error('Error updating status:', e);
      Alert.alert('Error', 'Could not update request status. Please try again.');
    } finally {
      setProcessing(false);
      setConfirmAction({ visible: false, id: null, type: null });
    }
  };

  const ExitCard = ({ item }) => (
    <LinearGradient colors={['#f9fdfd', '#f3f8fc']} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.visa_type}</Text>
        <StatusBadge status={item.status} />
      </View>

      <Text style={styles.cardSubtitle}>
        📅 {item.validity_from_date} → {item.validity_to_date}
      </Text>
      <Text style={styles.cardSubtitle}>Period: {item.period_in_days} days</Text>
      {item.reason && <Text style={styles.reason}>📝 {item.reason}</Text>}

      <View style={styles.actionsRow}>
        {/* Details */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#2196f3' }]}
          onPress={() => setDetailsModal({ visible: true, item })}
        >
          <MaterialIcons name="visibility" size={18} color="#fff" />
          <Text style={styles.actionText}>Details</Text>
        </TouchableOpacity>

        {/* Approve/Reject only if Pending */}
        {item.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#4caf50' }]}
              onPress={() =>
                setConfirmAction({ visible: true, id: item.id, type: 'approved' })
              }
            >
              <MaterialIcons name="check" size={18} color="#fff" />
              <Text style={styles.actionText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#f44336' }]}
              onPress={() =>
                setConfirmAction({ visible: true, id: item.id, type: 'rejected' })
              }
            >
              <MaterialIcons name="close" size={18} color="#fff" />
              <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </LinearGradient>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1f3d7c" />
        <Text style={{ marginTop: 10 }}>Loading Exit/Entry Requests…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: 'red' }}>{error}</Text>
        <TouchableOpacity onPress={fetchExitRequests}>
          <Text style={{ color: '#2196f3', marginTop: 8 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1f3d7c', '#248bbc']} style={styles.header}>
        <Text style={styles.headerTitle}>Exit/Entry Requests</Text>
        <Text style={styles.headerSubtitle}>Review and manage visa requests</Text>
      </LinearGradient>

      {requests.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ color: '#555' }}>No exit/entry requests found.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => <ExitCard item={item} />}
        />
      )}

      {/* Confirm Approve/Reject Modal */}
      <Modal visible={confirmAction.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Confirm {confirmAction.type}</Text>
            <Text>
              Are you sure you want to{' '}
              <Text style={{ fontWeight: 'bold' }}>
                {confirmAction.type?.toLowerCase()}
              </Text>{' '}
              this request?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#ccc' }]}
                onPress={() => setConfirmAction({ visible: false })}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor:
                      confirmAction.type === 'Approved' ? '#4caf50' : '#f44336',
                  },
                ]}
                onPress={handleAction}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>
                    Yes, {confirmAction.type}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal visible={detailsModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <ScrollView>
              {detailsModal.item && (
                <>
                  <Text style={styles.modalTitle}>Exit/Entry Details</Text>
                  <Detail label="Visa Type" value={detailsModal.item.visa_type} />
                  <Detail
                    label="Validity From"
                    value={detailsModal.item.validity_from_date}
                  />
                  <Detail
                    label="Validity To"
                    value={detailsModal.item.validity_to_date}
                  />
                  <Detail
                    label="Period (days)"
                    value={detailsModal.item.period_in_days}
                  />
                  <Detail label="Reason" value={detailsModal.item.reason} />
                  {detailsModal.item.document && (
                    <TouchableOpacity
                      style={{ marginTop: 10 }}
                      onPress={() =>
                        Linking.openURL(
                          `https://app.morgantigcc.com/hr_system/backend/storage/app/public/${detailsModal.item.document}`
                        )
                      }
                    >
                      <Text
                        style={{
                          color: '#1f3d7c',
                          textDecorationLine: 'underline',
                        }}
                      >
                        📎 View Document
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.modalBtn,
                { backgroundColor: '#1f3d7c', marginTop: 12 },
              ]}
              onPress={() => setDetailsModal({ visible: false })}
            >
              <Text style={{ color: '#fff', textAlign: 'center' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const StatusBadge = ({ status }) => {
  const bg =
    status === 'Approved'
      ? '#4caf50'
      : status === 'Rejected'
      ? '#f44336'
      : status === 'Pending'
      ? '#ff9800'
      : '#9e9e9e';
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={styles.statusText}>{status}</Text>
    </View>
  );
};

const Detail = ({ label, value }) => (
  <Text style={{ marginBottom: 6 }}>
    <Text style={{ fontWeight: 'bold' }}>{label}: </Text>
    {value || '—'}
  </Text>
);

const styles = StyleSheet.create({
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: 22, color: '#fff', fontWeight: 'bold' },
  headerSubtitle: { fontSize: 14, color: '#fff', opacity: 0.9 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  cardSubtitle: { fontSize: 14, color: '#555' },
  reason: { fontSize: 13, color: '#666', marginTop: 4 },
  actionsRow: { flexDirection: 'row', marginTop: 10, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 6,
  },
  actionText: { color: '#fff', marginLeft: 4, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
  },
  modalTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  modalBtn: { padding: 10, borderRadius: 8, marginLeft: 8 },
});
