import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Alert,
  Platform,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import api from '../../services/api';
import { fetchHrRequests, updateRequestStatus } from '../../services/allRequestsApi';
import { getColumnsForTab } from '../../utils/columnConfig';

/* --------------------------------------------
   UNIVERSAL COLOR SYSTEM & SIZES
-------------------------------------------- */
export const COLORS = {
  primary: '#1f3d7c',
  secondary: '#248bbc',
  accent: '#74933c',
  background: '#f8f9fd',
  textDark: '#2c3e50',
  textLight: '#667385',
  success: '#27ae60',
  error: '#e74c3c',
  white: '#ffffff',
  shadow: 'rgba(0,0,0,0.15)',
};

const SIZES = {
  padding: 16,
  radius: 12,
  icon: 22,
};

const ROLES_CAN_VIEW_ASSIGNED = ['manager', 'hr_admin', 'finance'];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RequestsList() {
  const navigation = useNavigation();
  const route = useRoute();
  const { requestType } = route.params;

  const role = useSelector((state) => state.auth.user?.role);
  const canViewAssigned = ROLES_CAN_VIEW_ASSIGNED.includes(role);

  const [mainTab, setMainTab] = useState('my_requests');
  const isAssignedTab = mainTab === 'assigned_requests' && canViewAssigned;

  const [requests, setRequests] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignedBreakdown, setAssignedBreakdown] = useState({ total: 0 });

  // Fade-in animation for modal content
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const columns = getColumnsForTab(requestType);

  /* -----------------------------
     LIFECYCLE
  ----------------------------- */
  useEffect(() => {
    fetchData();
  }, [mainTab, requestType]);

  useEffect(() => {
    if (isAssignedTab) fetchAssignedBreakdown();
  }, [isAssignedTab]);

  // Ensure employees always stay in "My Requests" tab
  useEffect(() => {
    if (!canViewAssigned && mainTab === 'assigned_requests') {
      setMainTab('my_requests');
    }
  }, [canViewAssigned, mainTab]);

  /* -----------------------------
     DATA FETCHERS
  ----------------------------- */
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        request_type: requestType,
        from_date: fromDate,
        to_date: toDate,
        view_mode: mainTab,
      };
      const res = await fetchHrRequests(payload);
      setRequests(res || []);
      LayoutAnimation.easeInEaseOut();
    } catch (e) {
      setError('Something went wrong while loading requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAssignedBreakdown = async () => {
    try {
      const res = await api.get('/hr-requests/assigned-pending-breakdown');
      setAssignedBreakdown(res.data || {});
    } catch (_) {
      // silent fail – non-critical
    }
  };

  /* -----------------------------
     USER ACTIONS
  ----------------------------- */
  const handleApproveReject = async (request, status) => {
    Alert.alert(
      `${status === 'approved' ? 'Approve' : 'Reject'} Request`,
      `Are you sure you want to mark this request as ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            setLoading(true);
            try {
              await updateRequestStatus(request.id, status, 'status');
              fetchData();
              if (isAssignedTab) fetchAssignedBreakdown();
            } catch (_) {
              Alert.alert('Error', 'Failed to update status.');
            }
          },
        },
      ],
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  /* -----------------------------
     MODAL HANDLERS
  ----------------------------- */
  const openModal = (item) => {
    setSelectedRequest(item);
    setModalVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setSelectedRequest(null);
    });
  };

  /* -----------------------------
     RENDER HELPERS
  ----------------------------- */
  const renderItem = ({ item }) => (
    <RequestCard
      request={item}
      columns={columns}
      role={role}
      isAssignedTab={isAssignedTab}
      onApproveReject={handleApproveReject}
      onPress={() => openModal(item)}
    />
  );

  const Empty = () => (
    <View style={styles.blankStateWrapper}>
      <MaterialIcons
        name="find-in-page"
        size={48}
        color={COLORS.textLight}
        style={{ marginBottom: 8 }}
      />
      <Text style={styles.emptyText}>No requests found</Text>
    </View>
  );

  /* -----------------------------
     JSX
  ----------------------------- */
  return (
    <View style={styles.container}>
      {/* Tabs */}
      <Tabs
        mainTab={mainTab}
        setMainTab={setMainTab}
        assignedTotal={assignedBreakdown.total}
        canViewAssigned={canViewAssigned}
      />

      {/* Filters */}
      <Filters
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={setFromDate}
        setToDate={setToDate}
        onSearch={fetchData}
      />

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => `${item.id}`}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={!loading && <Empty />}
          contentContainerStyle={{ paddingBottom: 90 }}
        />
      )}

      {/* New Request FAB - Updated condition */}
      {!isAssignedTab && (
        <FloatingButton
          onPress={() => navigation.navigate('NewHrRequestForm', { requestType })}
        />
      )}

      {/* Details Modal */}
      <Modal visible={modalVisible} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalBox, { opacity: fadeAnim }]}>
            <ScrollView>
              <TouchableOpacity onPress={closeModal} style={styles.modalCloseIcon}>
                <MaterialIcons name="close" size={26} color={COLORS.error} />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>Request #{selectedRequest?.id}</Text>

              {selectedRequest &&
                columns.map((col, idx) => (
                  <View key={idx} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{col.label}</Text>
                    <Text style={styles.detailValue}>{col.accessor(selectedRequest)}</Text>
                  </View>
                ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

/* ----------------------------------------
   REUSABLE SMALL COMPONENTS
---------------------------------------- */
function Tabs({ mainTab, setMainTab, assignedTotal, canViewAssigned }) {
  const Tab = ({ id, label }) => {
    const active = mainTab === id;
    return (
      <TouchableOpacity
        style={[styles.tab, active && styles.tabActive]}
        onPress={() => setMainTab(id)}
      >
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.tabs}>
      <Tab id="my_requests" label="My Requests" />
      {canViewAssigned ? (
        <Tab id="assigned_requests" label={`Assigned (${assignedTotal || 0})`} />
      ) : (
        <Text style={styles.singleTabNotice}>Employee View</Text>
      )}
    </View>
  );
}

function Filters({ fromDate, toDate, setFromDate, setToDate, onSearch }) {
  return (
    <View style={styles.filters}>
      <DatePickerField value={fromDate} onChange={setFromDate} placeholder="From" />
      <DatePickerField value={toDate} onChange={setToDate} placeholder="To" />
      <TouchableOpacity style={styles.searchBtn} onPress={onSearch}>
        <MaterialIcons name="search" size={SIZES.icon} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

function DatePickerField({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  const onChangeDate = (event, date) => {
    if (Platform.OS !== 'ios') setShow(false);
    if (date) onChange(date.toISOString().slice(0, 10));
  };

  return (
    <>
      <TouchableOpacity onPress={() => setShow(true)} style={styles.dateInput}>
        <Text style={{ color: value ? COLORS.textDark : COLORS.textLight }}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}
    </>
  );
}

function RequestCard({ request, columns, role, isAssignedTab, onApproveReject, onPress }) {
  const statusColor = {
    pending: COLORS.accent,
    approved: COLORS.success,
    rejected: COLORS.error,
  }[request.status?.toLowerCase()] || COLORS.textLight;

  const canTakeAction =
    isAssignedTab && role === 'manager' && request.status?.toLowerCase() === 'pending';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
        <Text style={styles.statusText}>{request.status}</Text>
      </View>

      {columns.map((col, idx) => (
        <View style={styles.cardRow} key={idx}>
          <Text style={styles.cardLabel}>{col.label}</Text>
          <Text style={styles.cardValue}>{col.accessor(request)}</Text>
        </View>
      ))}

      {canTakeAction && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
            onPress={() => onApproveReject(request, 'approved')}
          >
            <Text style={styles.actionText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.error }]}
            onPress={() => onApproveReject(request, 'rejected')}
          >
            <Text style={styles.actionText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

function FloatingButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.8}>
      <MaterialIcons name="add" size={28} color={COLORS.white} />
    </TouchableOpacity>
  );
}

/* ----------------------------------------
   STYLE DEFINITIONS
---------------------------------------- */
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  /* Tabs */
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    margin: SIZES.padding,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontWeight: '500',
    color: COLORS.textDark,
    fontSize: 14,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  singleTabNotice: {
    position: 'absolute',
    right: 10,
    alignSelf: 'center',
    color: COLORS.textLight,
    fontSize: 12,
    fontStyle: 'italic',
  },
  /* Filters */
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIZES.padding,
    marginBottom: 8,
  },
  dateInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.white,
    marginRight: 8,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: SIZES.radius,
    borderColor: '#dfe3e8',
    borderWidth: 1,
    elevation: 1,
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: SIZES.radius,
    elevation: 2,
  },
  /* Cards */
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    marginBottom: 10,
  },
  statusText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardLabel: {
    color: COLORS.textLight,
    fontSize: 13,
  },
  cardValue: {
    color: COLORS.textDark,
    fontWeight: '500',
    fontSize: 14,
    maxWidth: '55%',
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: SIZES.radius,
    marginLeft: 10,
  },
  actionText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
  /* Blank / Error */
  loaderWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  blankStateWrapper: {
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.15,
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  errorText: {
    textAlign: 'center',
    color: COLORS.error,
    marginTop: 20,
  },
  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: COLORS.white,
    width: '100%',
    maxHeight: '85%',
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
  },
  modalCloseIcon: {
    alignSelf: 'flex-end',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    color: COLORS.textLight,
    fontSize: 14,
    width: '45%',
  },
  detailValue: {
    color: COLORS.textDark,
    fontWeight: '500',
    fontSize: 14,
    width: '55%',
    textAlign: 'right',
  },
  /* FAB */
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
});