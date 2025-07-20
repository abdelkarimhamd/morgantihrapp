/* ------------------------------------------------------------------
   HRVacationRequestsScreen.js — Org‑wide requests that need HR action
   (or full history) for HR‑admin users. Endpoints aligned to the
-------------------------------------------------------------------*/

import React, { useEffect, useState } from 'react';
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
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../services/api';
import { useSelector } from 'react-redux';

export default function HRVacationRequestsScreen() {
  const [tab, setTab] = useState('pending'); // 'pending' | 'all'
  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#1f3d7c", "#248bbc"]} style={styles.headerGradient}>
        <Text style={styles.headerTitle}>HR ‑ Vacation Requests</Text>
        <Text style={styles.headerSubtitle}>Approve, reject or inspect leave</Text>
        {/* Tabs */}
        <View style={styles.tabRow}>
          {['pending', 'all'].map(t => (
            <TouchableOpacity key={t} style={[styles.tabButton, tab === t && styles.tabButtonActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'pending' ? 'Pending HR' : 'All Requests'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <RequestsList listType={tab} />
      </View>
    </View>
  );
}

/* ------------------------ list component ------------------------ */
function RequestsList({ listType }) {
  const [requests, setRequests]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [confirm, setConfirm]         = useState({ visible: false, id: null, action: null });
  const [details, setDetails]         = useState({ visible: false, item: null });

  /* fetch every time tab changes */
  useEffect(() => { fetchRequests(); }, [listType]);
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
    setLoading(true); setError('');
    try {
      const url = listType === 'pending'
        ? `${apiPrefix}/hrAdminRequests/vacation-requests?filter=pending`
        : '/admin/hrAdminRequests/vacation-requests';
      const res = await api.get(url);
      console.log(res,'res.data');
      
      setRequests(res.data || []);
    } catch (e) {
      console.error(e);
      setError('Could not load HR vacation requests.');
    } finally {
      setLoading(false);
    }
  };

  const askAction = (id, action) => setConfirm({ visible: true, id, action });

  const doAction = async () => {
    const { id, action } = confirm;
    if (!id) return;
    try {
      await api.patch(`${apiPrefix}/vacation-requests/${id}`, { hr_status: action });
      fetchRequests();
    } catch (e) {
      Alert.alert('Error', 'Could not update the request.');
    } finally {
      setConfirm({ visible: false, id: null, action: null });
    }
  };

  const StatusPill = ({ status }) => {
    const lower = String(status || '').toLowerCase();
    const bg = lower === 'approved' ? '#4caf50'
           : lower === 'rejected'  ? '#e53935'
           : lower === 'cancelled' ? '#ffb300'
           : lower === 'pending'   ? '#757575'
           : '#248bbc';
    return (
      <View style={[styles.statusPill, { backgroundColor: bg }]}>      
        <Text style={styles.statusPillText}>{status}</Text>
      </View>
    );
  };

  const Item = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.empName}>{item.user?.name || 'Unknown'}</Text>
        <Text style={styles.smallText}>{item.leave_type}</Text>
        <Text style={styles.smallText}>Start: {item.start_date}</Text>
        <Text style={styles.smallText}>End: {item.end_date}</Text>
      </View>
      <StatusPill status={item.hr_status || item.status} />
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.viewBtn} onPress={() => setDetails({ visible: true, item })}>
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>
        {String(item.hr_status).toLowerCase() === 'pending' && (
          <>
            <TouchableOpacity style={styles.approveBtn} onPress={() => askAction(item.id, 'Approved')}>
              <Text style={styles.actionText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => askAction(item.id, 'Rejected')}>
              <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#1c6c7c" />
      <Text style={{ marginTop: 8, color: '#555' }}>Loading requests…</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList data={requests} keyExtractor={i=>String(i.id)} renderItem={Item} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} />
      )}

      {/* details modal */}
      <Modal visible={details.visible} transparent animationType="fade" onRequestClose={() => setDetails({ visible:false,item:null })}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer,{paddingBottom:12}]}>            
            {details.item && <RequestDetails req={details.item} />}
            <TouchableOpacity style={[styles.modalButton, styles.primaryBtn]} onPress={() => setDetails({ visible:false,item:null })}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* confirm modal */}
      <Modal visible={confirm.visible} transparent animationType="fade" onRequestClose={() => setConfirm({ visible:false,id:null,action:null })}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirm Action</Text>
            <Text style={styles.modalText}>Are you sure you want to <Text style={styles.bold}>{confirm.action}</Text> this request?</Text>
            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop:16 }}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setConfirm({ visible:false,id:null,action:null })}>
                <Text style={styles.modalButtonText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, confirm.action==='approved'?styles.approveBtn:styles.rejectBtn]} onPress={doAction}>
                <Text style={styles.modalButtonText}>Yes, {confirm.action}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ------------------------ Request details ------------------------ */
function RequestDetails({ req }) {
  return (
    <ScrollView style={{ maxHeight:'80%' }}>
      <Text style={styles.modalTitle}>Leave Request Details</Text>
      <View style={styles.detailSection}><Text style={styles.label}>👤 Employee</Text><Text style={styles.value}>{req.user?.name}</Text></View>
      {/* dept + title */}
      <View style={styles.rowWrap}>
        <View style={styles.detailSection}><Text style={styles.label}>🏢 Dept</Text><Text style={styles.value}>{req.user?.department}</Text></View>
        <View style={styles.detailSection}><Text style={styles.label}>💼 Title</Text><Text style={styles.value}>{req.user?.job_title}</Text></View>
      </View>
      <View style={styles.divider} />
      <View style={styles.rowWrap}>
        <View style={styles.detailSection}><Text style={styles.label}>📅 Start</Text><Text style={styles.value}>{req.start_date}</Text></View>
        <View style={styles.detailSection}><Text style={styles.label}>📅 End</Text><Text style={styles.value}>{req.end_date}</Text></View>
      </View>
      <View style={styles.detailSection}><Text style={styles.label}>📌 Leave Type</Text><Text style={styles.value}>{req.leave_type}</Text></View>
      <View style={styles.detailSection}><Text style={styles.label}>📆 Days</Text><Text style={styles.value}>{req.days}</Text></View>
      <View style={styles.divider} />
      <View style={styles.detailSection}><Text style={styles.label}>📝 Desc</Text><Text style={styles.value}>{req.description || 'N/A'}</Text></View>
      <View style={styles.detailSection}><Text style={styles.label}>📄 HR Status</Text><Text style={styles.value}>{req.hr_status}</Text></View>
      <View style={styles.detailSection}><Text style={styles.label}>🕒 Submitted</Text><Text style={styles.value}>{req.created_at}</Text></View>
      {req.attachment && (
        <TouchableOpacity onPress={() => Linking.openURL(`https://app.morgantigcc.com/hr_system/backend/storage/app/public/${req.attachment}`)}>
          <Text style={styles.attachmentLink}>📎 View Attachment</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
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
    backgroundColor: '#1c6c7c',
  },
  cancelBtn: {
    backgroundColor: '#ccc',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 20,
    fontWeight: '600',
  },rowWrap: {
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