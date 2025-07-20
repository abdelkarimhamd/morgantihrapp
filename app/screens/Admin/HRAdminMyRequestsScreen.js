/* ------------------------------------------------------------------
   HRAdminMyRequestsScreen.js — Personal vacation requests
   for *HR‑admin* users. Mirrors the employee version but calls HR‑scoped
   endpoints so the user only sees *their own* requests while wearing the
   HR role.
-------------------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import VacationRequestItem from '../../components/Vacations/VacationRequestItem';
import api from '../../../services/api';

const { width } = Dimensions.get('window');

// ───────── helper ─────────
const getRequestedDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (isNaN(s) || isNaN(e) || e < s) return 0;
  return Math.floor((e - s) / 86400000) + 1;
};

export default function HRAdminMyRequestsScreen({ navigation }) {
  const [vacationRequests, setVacationRequests] = useState([]);
  const [vacLoading, setVacLoading] = useState(false);
  const [vacError, setVacError] = useState('');
  const [vacPage, setVacPage] = useState(1);
  const [vacRowsPerPage] = useState(5);
  const [vacTotal, setVacTotal] = useState(0);
  const [detailModal, setDetailModal] = useState({ visible: false, item: null });
  const [cancelModal, setCancelModal] = useState({ visible: false, id: null });

  useEffect(() => {
    fetchVacations();
  }, [vacPage]);

  const fetchVacations = async () => {
    setVacLoading(true);
    setVacError('');
    try {
      const res = await api.get('/admin/Myindex/vacation-requests', {
        params: { page: vacPage, per_page: vacRowsPerPage },
      });
      setVacationRequests(res.data.data || res.data);
      console.log('Vacation Requests:', res.data);
      
      setVacTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      setVacError('Could not load your vacation requests.');
    } finally {
      setVacLoading(false);
    }
  };

  const cancelVacation = async () => {
    try {
      await api.patch(`/admin/vacation-requests/${cancelModal.id}`, { status: 'Cancelled' });
      fetchVacations();
    } catch (e) {
      Alert.alert('Error', 'Could not cancel the request.');
    } finally {
      setCancelModal({ visible: false, id: null });
    }
  };

  const handleNewVacationRequest = () => {
    // navigate to create vacation screen
    navigation.navigate('CreateVacationRequest');
  };

  const VacationList = () => {
    if (vacLoading) return <Loader msg="Loading Vacation Requests…" />;
    if (vacError) return <ErrorMsg text={vacError} />;
    return (
      <FlatList
        data={vacationRequests}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <VacationRequestItem
            request={item}
            onViewDetails={() => setDetailModal({ visible: true, item })}
            onCancel={() => setCancelModal({ visible: true, id: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time" size={48} color="#bdc3c7" />
            <Text style={styles.emptyText}>No vacation requests found</Text>
          </View>
        }
      />
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1f3d7c', '#248bbc']} style={styles.headerContainer}>
        <Text style={styles.headerTitle}>My Vacation Requests (HR)</Text>
      </LinearGradient>

      {/* === New Request Button === */}
      <View style={{ padding: 16 }}>
        <TouchableOpacity style={styles.newButton} onPress={handleNewVacationRequest}>
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.newButtonText}>New Vacation Request</Text>
        </TouchableOpacity>
      </View>

      <VacationList />

      {/* Cancel modal */}
      <YesNoModal
        visible={cancelModal.visible}
        title="Confirm Cancellation"
        message="Are you sure you want to cancel this request?"
        onNo={() => setCancelModal({ visible: false, id: null })}
        onYes={cancelVacation}
      />

      {/* Details modal */}
      <Modal
        visible={detailModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModal({ visible: false, item: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: 12, maxHeight: '85%' }]}>
            <ScrollView>
              {detailModal.item && (
                <>
                  <Text style={styles.modalTitle}>Vacation Details</Text>
                  <DetailRow label="Type" value={detailModal.item.leave_type} icon="event-note" />
                  <DetailRow label="Start" value={detailModal.item.start_date} icon="calendar-today" />
                  <DetailRow label="End" value={detailModal.item.end_date} icon="calendar-today" />
                  <DetailRow
                    label="Days"
                    value={getRequestedDays(detailModal.item.start_date, detailModal.item.end_date)}
                    icon="date-range"
                  />
                  <DetailRow label="Status" value={detailModal.item.status} icon="check-circle" />
                  {detailModal.item?.attachment && (
                    <TouchableOpacity
                      style={styles.attachmentButton}
                      onPress={() =>
                        Linking.openURL(
                          `https://app.morgantigcc.com/hr_system/backend/storage/app/public/${detailModal.item.attachment}`
                        )
                      }
                    >
                      <MaterialIcons name="attach-file" size={20} color="#1f3d7c" />
                      <Text style={styles.attachmentText}>View Attachment</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#1c6c7c' }]}
              onPress={() => setDetailModal({ visible: false, item: null })}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ───────── sub components ───────── */
const Loader = ({ msg }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4c6c7c" />
    <Text style={styles.loadingText}>{msg}</Text>
  </View>
);

const ErrorMsg = ({ text }) => <Text style={styles.errorText}>{text}</Text>;

const YesNoModal = ({ visible, title, message, onYes, onNo }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onNo}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalMessage}>{message}</Text>
        <View style={styles.modalActions}>
          <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={onNo}>
            <Text style={styles.modalButtonText}>No</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalButton, styles.confirmBtn]} onPress={onYes}>
            <Text style={styles.modalButtonText}>Yes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const DetailRow = ({ label, value, icon }) => (
  <View style={styles.detailRow}>
    <MaterialIcons name={icon} size={18} color="#4c6c7c" style={{ marginRight: 8 }} />
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{String(value)}</Text>
  </View>
);

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  headerTitle: { fontSize: 28, color: '#fff', textAlign: 'center', fontWeight: '600' },

  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#74933c',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#74933c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  newButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8, fontSize: 16, color: '#555' },
  errorText: { color: 'red', textAlign: 'center', marginTop: 16, fontWeight: '700' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#7f8c8d',
    marginTop: 16,
    fontSize: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: { backgroundColor: '#fff', borderRadius: 10, padding: 20, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#1f3d7c' },
  modalMessage: { fontSize: 16, color: '#555', marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  modalButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, marginLeft: 8 },
  cancelBtn: { backgroundColor: '#ccc' },
  confirmBtn: { backgroundColor: '#1c6c7c' },
  modalButtonText: { color: '#fff', fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  detailLabel: { fontWeight: '700', fontSize: 14, color: '#333', marginRight: 6 },
  detailValue: { fontSize: 14, color: '#555', flexShrink: 1 },
  attachmentButton: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  attachmentText: {
    color: '#1f3d7c',
    textDecorationLine: 'underline',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '600',
  },
});
