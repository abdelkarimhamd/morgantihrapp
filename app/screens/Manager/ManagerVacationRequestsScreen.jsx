import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../services/api';
import EmployeeVacationRequestsScreen from '../Common/EmployeeVacationRequestsScreen';
import { Linking } from 'react-native';
import { useSelector } from 'react-redux';

/**
 * Manager‑facing screen that lets a line manager:
 *  1. Review & act on the team’s vacation requests (approve / reject / view)
 *  2. See their *own* requests (re‑uses the employee screen internally)
 *
 * You can register it in your navigator like:
 *   <Stack.Screen name="ManagerVacationRequests" component={ManagerVacationRequestsScreen} />
 */
export default function ManagerVacationRequestsScreen({ navigation }) {
  const [tab, setTab] = useState('team'); // 'team' | 'personal'

  return (
    <View style={styles.container}>
      {/* ==== Gradient header ==== */}
      <LinearGradient colors={["#1f3d7c", "#248bbc"]} style={styles.headerGradient}>
        <Text style={styles.headerTitle}>Time‑Off Management</Text>
        <Text style={styles.headerSubtitle}>Handle team & personal leave</Text>

        {/* Tab selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, tab === 'team' && styles.tabButtonActive]}
            onPress={() => setTab('team')}>
            <Text style={[styles.tabText, tab === 'team' && styles.tabTextActive]}>Team Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, tab === 'personal' && styles.tabButtonActive]}
            onPress={() => setTab('personal')}>
            <Text style={[styles.tabText, tab === 'personal' && styles.tabTextActive]}>My Requests</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ==== body ==== */}
      <View style={{ flex: 1 }}>
        {tab === 'team' ? (
          <TeamRequestsList />
        ) : (
          // Re‑use the employee version but make sure it points at the manager endpoints
          <MyRequestsForManager navigation={navigation} />
        )}
      </View>
    </View>
  );
}

/***************************  TEAM ‑ REQUESTS  ***************************/
function TeamRequestsList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // approve / reject state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [actionType, setActionType] = useState(null); // 'Approved' | 'Rejected'
  const [actionId, setActionId] = useState(null);

  // details modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailReq, setDetailReq] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);
  const apiPrefix = getRoutePrefixByRole();

  function getRoutePrefixByRole() {
    const role = useSelector((state) => state.auth.user?.role);
    if (role === 'hr_admin') return '/admin';
    if (role === 'manager') return '/manager';
    if (role === 'finance') return '/finance';
    if (role === 'ceo') return '/ceo';
    if (role === 'finance_coordinator') return '/finance_coordinator';
    return '/employee';
  }
  console.log('API Prefix:', apiPrefix);
  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`${apiPrefix}/vacation-requests`);
      setRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load team requests', err);
      setError('Could not load team vacation requests. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const openConfirm = (id, status) => {
    setActionId(id);
    setActionType(status);
    setConfirmVisible(true);
  };

  const handleConfirm = async () => {
    if (!actionId || !actionType) return;
    try {
      await api.patch(`/manager/vacation-requests/${actionId}`, { status: actionType });
      fetchRequests();
    } catch (err) {
      console.error('Failed to update request', err);
      Alert.alert('Error', 'Could not update the request. Please try again.');
    } finally {
      setConfirmVisible(false);
      setActionId(null);
      setActionType(null);
    }
  };

  const renderStatusPill = (status) => {
    const lower = (status || '').toLowerCase();
    const bg =
      lower === 'approved'
        ? '#4caf50'
        : lower === 'rejected'
          ? '#e53935'
          : lower === 'cancelled'
            ? '#ffb300'
            : '#757575';
    return (
      <View style={[styles.statusPill, { backgroundColor: bg }]}>
        <Text style={styles.statusPillText}>{status}</Text>
      </View>
    );
  };

  const ListItem = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.empName}>{item.user?.name || 'Unknown'}</Text>
        <Text style={styles.smallText}>{item.leave_type}</Text>
        <Text style={styles.smallText}>Start: {item.start_date}</Text>
        <Text style={styles.smallText}>End: {item.end_date}</Text>
      </View>
      {renderStatusPill(item.status)}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.viewBtn} onPress={() => { setDetailReq(item); setDetailVisible(true); }}>
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>
        {item.status === 'Pending' && (
          <>
            <TouchableOpacity style={[styles.approveBtn]} onPress={() => openConfirm(item.id, 'Approved')}>
              <Text style={styles.actionText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.rejectBtn]} onPress={() => openConfirm(item.id, 'Rejected')}>
              <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1c6c7c" />
        <Text style={{ marginTop: 8, color: '#555' }}>Loading team requests...</Text>
      </View>
    );
  }


  return (
    <View style={{ flex: 1, padding: 16 }}>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          renderItem={ListItem}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* ====== DETAILS MODAL ====== */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: 12 }]}>
            {detailReq && (
              <ScrollView style={{ maxHeight: '80%' }}>
                <Text style={styles.modalTitle}>Leave Request Details</Text>

                <View style={styles.detailSection}>
                  <Text style={styles.label}>👤 Employee</Text>
                  <Text style={styles.value}>{detailReq.user?.name || 'N/A'}</Text>
                </View>

                <View style={styles.rowWrap}>
                  <View style={styles.detailSection}>
                    <Text style={styles.label}>🏢 Department</Text>
                    <Text style={styles.value}>{detailReq.user?.department || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.label}>💼 Job Title</Text>
                    <Text style={styles.value}>{detailReq.user?.job_title || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.rowWrap}>
                  <View style={styles.detailSection}>
                    <Text style={styles.label}>📅 Start</Text>
                    <Text style={styles.value}>{detailReq.start_date}</Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.label}>📅 End</Text>
                    <Text style={styles.value}>{detailReq.end_date}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.label}>📌 Leave Type</Text>
                  <Text style={styles.value}>{detailReq.leave_type}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.label}>📆 Requested Days</Text>
                  <Text style={styles.value}>{detailReq.days}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailSection}>
                  <Text style={styles.label}>📞 Phone</Text>
                  <Text style={styles.value}>{detailReq.phone_number || 'N/A'}</Text>
                </View>

                <View style={styles.rowWrap}>
                  <View style={styles.detailSection}>
                    <Text style={styles.label}>🌍 Country</Text>
                    <Text style={styles.value}>{detailReq.country || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.label}>📍 Location</Text>
                    <Text style={styles.value}>{detailReq.location_in_country || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.label}>📝 Description</Text>
                  <Text style={styles.value}>{detailReq.description || 'N/A'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.label}>📄 Status</Text>
                  <Text style={styles.value}>{detailReq.status}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.label}>🕒 Submitted At</Text>
                  <Text style={styles.value}>{detailReq.created_at}</Text>
                </View>

                {detailReq?.attachment && (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(`https://app.morgantigcc.com/hr_system/backend/storage/app/public/${detailReq.attachment}`)
                    }>
                    <Text style={[styles.attachmentLink]}>
                      📎 View Attachment
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.modalButton, styles.primaryBtn]}
              onPress={() => setDetailVisible(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>



      {/* ====== CONFIRM APPROVE / REJECT MODAL ====== */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirm Action</Text>
            <Text style={styles.modalText}>Are you sure you want to <Text style={styles.bold}>{actionType}</Text> this request?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setConfirmVisible(false)}>
                <Text style={styles.modalButtonText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, actionType === 'Approved' ? styles.approveBtn : styles.rejectBtn]} onPress={handleConfirm}>
                <Text style={styles.modalButtonText}>Yes, {actionType}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/***************************  PERSONAL REQUESTS (manager’s own)  ***************************/
// Renders the same component we built for employees but forces it to hit the manager endpoints.
function MyRequestsForManager({ navigation }) {
  /**
   * We simply re‑use the EmployeeVacationRequestsScreen but override
   * its endpoint via props. If you didn’t build it that way, just copy the
   * employee component and replace the api paths.
   */
  return (
    <EmployeeVacationRequestsScreen
      navigation={navigation}
      customApiPathPrefix="/manager" // <‑‑ tell the employee component to hit /manager/…
    />
  );
}

/***************************  STYLES  ***************************/
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
  },
  tabRow: {
    flexDirection: 'row',
    marginTop: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#1f3d7c',
  },
  // card
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    elevation: 2,
  },
  empName: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 2,
  },
  smallText: {
    color: '#555',
    fontSize: 13,
  },
  cardActions: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  viewBtn: {
    backgroundColor: '#1c6c7c',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  approveBtn: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  rejectBtn: {
    backgroundColor: '#e53935',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    paddingVertical: 2,
    fontWeight: '600',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  statusPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '85%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 15,
    marginBottom: 6,
  },
  bold: {
    fontWeight: '700',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginLeft: 8,
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  primaryBtn: {
    backgroundColor: '#1f3d7c',
  },
  cancelBtn: {
    backgroundColor: '#ccc',
    paddingVertical: 4,
    fontSize: 16,
    marginBottom: 6,

    paddingHorizontal: 12,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    paddingVertical: 4,
    fontSize: 16,
    paddingHorizontal: 12,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 20,
    fontWeight: '600',
  }, rowWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailSection: {
    marginBottom: 10,
    flex: 1,
  },
  label: {
    fontWeight: '700',
    fontSize: 14,
    color: '#1f3d7c',
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  attachmentLink: {
    color: '#1f3d7c',
    textDecorationLine: 'underline',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 10,
  },

});
