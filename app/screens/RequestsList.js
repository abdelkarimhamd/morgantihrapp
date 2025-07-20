// RequestsList.js (main component)
import React, {
  useEffect,
  useState,
  useRef,
} from 'react';

import {
  View,
  Linking,
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
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Badge } from 'react-native-paper';

import api from '../../services/api';
import { fetchHrRequests, updateRequestStatus } from '../../services/allRequestsApi';
import { getColumnsForTab, getIconForTab, STATUS_COLORS, getFinalStatus } from '../../utils/columnConfig';

/* --------------------------------------------
   UNIVERSAL COLOR SYSTEM & SIZES
-------------------------------------------- */
export const COLORS = {
  primary: '#1f3d7c',
  primaryLight: '#3a5a9c',
  secondary: '#248bbc',
  accent: '#74933c',
  background: '#f8f9fd',
  backgroundLight: '#ffffff',
  textDark: '#2c3e50',
  textLight: '#667385',
  textMuted: '#94a3b8',
  success: '#27ae60',
  successLight: '#d1fae5',
  error: '#e74c3c',
  errorLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  white: '#ffffff',
  border: '#e2e8f0',
  shadow: 'rgba(0,0,0,0.08)',
};

const SIZES = {
  padding: 16,
  paddingSm: 12,
  radius: 12,
  radiusSm: 8,
  icon: 24,
  iconSm: 18,
};

const ROLES_CAN_VIEW_ASSIGNED = [
  'manager', 'hr_admin', 'finance_coordinator', 'finance', 'ceo'
];


if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RequestsList() {
  const navigation = useNavigation();
  const route = useRoute();
  const { requestType } = route.params;
  const iconName = getIconForTab(requestType);

  const role = useSelector((state) => state.auth.user?.role);
  const userName = useSelector((state) => state.auth.user?.name);
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
  const [filterVisible, setFilterVisible] = useState(false);

  // Fade-in animation for modal content
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const FILE_BASE_URL = 'https://app.morgantigcc.com/hr_system/backend/'
  const columns = getColumnsForTab(requestType);
  const getApprovalMeta = (req) => {
    /** Default: cannot act */
    const meta = { canAct: false, field: null };

    if (!isAssignedTab) return meta;           // employees can’t act
    const { request_type: t } = req;

    switch (role) {
      /* ── Manager ── */
      case 'manager':
        if (
          ['to_leave', 'misc', 'business_trip', 'resignation', 'personal_data_change'].includes(t) &&
          req.status === 'Pending'
        ) {
          meta.canAct = true;
          meta.field = 'status';
        }
        break;

      /* ── HR Admin ── */
      case 'hr_admin':
        if (req.hr_status === 'Pending') {
          // anything waiting for HR
          meta.canAct = true;
          meta.field = 'hr_status';
        }
        break;

      /* ── Finance-Coordinator ── */
      case 'finance_coordinator':
        if (
          t === 'finance_claim' &&
          req.hr_status === 'Approved' &&
          req.finance_coordinator_status === 'Pending'
        ) {
          meta.canAct = true;
          meta.field = 'finance_coordinator_status';
        }
        break;

      /* ── Finance ── */
      case 'finance':
        if (
          t === 'finance_claim' &&
          req.finance_coordinator_status === 'Approved' &&
          req.finance_status === 'Pending'
        ) {
          meta.canAct = true;
          meta.field = 'finance_status';
        }
        if (
          t === 'loans' &&
          req.hr_status === 'Approved' &&
          req.finance_status === 'Pending'
        ) {
          meta.canAct = true;
          meta.field = 'finance_status';
        }
        break;

      /* ── CEO ── */
      case 'ceo':
        if (
          t === 'loans' &&
          req.finance_status === 'Approved' &&
          req.ceo_status === 'Pending'
        ) {
          meta.canAct = true;
          meta.field = 'ceo_status';
        }
        break;
    }
    return meta;
  };
  /* -----------------------------
     LIFECYCLE
  ----------------------------- */
  useEffect(() => {
    fetchData();
  }, [mainTab, requestType, fromDate, toDate]);

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
      setError('Failed to load requests. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  /** Given “public/attachments/foo.pdf” ➜ “https://…/storage/attachments/foo.pdf” */
  const buildFileUrl = (storagePath = '') => {
    if (storagePath.startsWith('http')) return storagePath;          // already absolute
    return FILE_BASE_URL.replace(/\/$/, '') +                       // trim trailing /
      '/storage/app/private/'+storagePath;      // public → storage
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
  /* --------------- USER ACTIONS --------------- */
  const handleApproveReject = async (request, action /* 'approved' | 'rejected' */) => {
    // Which column are we updating?
    const isHRAction = role === 'hr_admin';
    const fieldName = isHRAction ? 'hr_status' : 'status';

    // The backend expects Title-case words (Approved / Rejected)
    const newStatus = action === 'approved' ? 'Approved' : 'Rejected';

    Alert.alert(
      `${newStatus} Request`,
      `Are you sure you want to mark this request as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              await updateRequestStatus(request.id, newStatus.toLocaleLowerCase(), fieldName);
              fetchData();
              console.log(`Request ${request.id} marked as ${newStatus}`);
              if (isAssignedTab) fetchAssignedBreakdown();
            } catch {
              console.error('Failed to update request status:', error);
              Alert.alert('Error', 'Failed to update status. Please try again.');
            }
          },
        },
      ],
    );
  };

  function AttachmentRow({ name, path, onPress }) {
    return (
      <TouchableOpacity
        onPress={() => onPress(path)}
        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}
      >
        <MaterialIcons name="attach-file" size={18} color={COLORS.primary} />
        <Text style={{ color: COLORS.textDark, fontSize: 13 }} numberOfLines={1}>
          {name}
        </Text>
      </TouchableOpacity>
    );
  }

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
  };

  const openUrl = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert('Cannot open link', url);
    } catch (err) {
      Alert.alert('Error', 'Unable to open attachment.');
    }
  };

  const handleViewAttachment = (storagePath) => {
    const url = buildFileUrl(storagePath);
    openUrl(url);
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

  const toggleFilters = () => {
    setFilterVisible(!filterVisible);
    Animated.spring(slideAnim, {
      toValue: filterVisible ? 0 : 1,
      useNativeDriver: true,
    }).start();
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
      requestType={requestType}
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
      <Text style={styles.emptySubText}>Try adjusting your filters</Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <MaterialIcons name={iconName} size={28} color={COLORS.primary} />
        <Text style={styles.headerTitle}>
          {requestType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity onPress={toggleFilters} style={styles.filterBtn}>
          <MaterialIcons
            name={filterVisible ? "close" : "filter-list"}
            size={24}
            color={COLORS.primary}
          />
          {(fromDate || toDate) && (
            <View style={styles.filterBadge} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  /* -----------------------------
     JSX
  ----------------------------- */
  return (
    <View style={styles.container}>
      {renderHeader()}

      <Animated.View
        style={[
          styles.filterPanel,
          {
            height: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 100]
            }),
            opacity: slideAnim
          }
        ]}
      >
        <Filters
          fromDate={fromDate}
          toDate={toDate}
          setFromDate={setFromDate}
          setToDate={setToDate}
          onSearch={fetchData}
          onClear={clearFilters}
        />
      </Animated.View>

      {/* Tabs */}
      <Tabs
        mainTab={mainTab}
        setMainTab={setMainTab}
        assignedTotal={assignedBreakdown.total}
        canViewAssigned={canViewAssigned}
      />

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorWrapper}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => `${item.id}`}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={!loading && <Empty />}
          contentContainerStyle={{ paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* New Request FAB */}
      {!isAssignedTab && (
        <FloatingButton
          onPress={() => navigation.navigate('NewHrRequestForm', { requestType })}
        />
      )}

      {/* Details Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalBox, { opacity: fadeAnim }]}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Request #{selectedRequest?.id}</Text>
                <TouchableOpacity onPress={closeModal} style={styles.modalCloseIcon}>
                  <MaterialIcons name="close" size={26} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              <View style={styles.userInfo}>
                <View style={styles.avatarPlaceholder}>
                  <MaterialIcons name="person" size={24} color={COLORS.white} />
                </View>
                <View>
                  <Text style={styles.userName}>{userName}</Text>
                  <Text style={styles.userRole}>{role?.toUpperCase()}</Text>
                </View>
              </View>

              {selectedRequest && (
                <View style={styles.detailsContainer}>
                  {columns.map((col, idx) => {
                    const isStatus = col.status;
                    const value = col.accessor(selectedRequest);
                    const statusColor = STATUS_COLORS[value] || STATUS_COLORS.default;

                    return (
                      <View key={idx} style={styles.detailRow}>
                        <View style={styles.detailLabelContainer}>
                          <MaterialIcons
                            name={col.icon}
                            size={18}
                            color={COLORS.textLight}
                            style={styles.detailIcon}
                          />
                          <Text style={styles.detailLabel}>{col.label}</Text>
                        </View>
                        {isStatus ? (
                          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                            <Text style={[styles.detailValue, { color: statusColor }]}>
                              {value}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.detailValue}>{value}</Text>
                        )}
                      </View>
                    );
                  })}

                  {/* -------- attachments ---------- */}
                  {(selectedRequest.attachments ?? []).length > 0 || selectedRequest.attachment_path ? (
                    <>
                      <Text style={[styles.detailLabel, { marginTop: 12 }]}>Attachments</Text>
                      {/* main attachment_path (single-file requests) */}
                      {selectedRequest.attachment_path && (
                        <AttachmentRow
                          name={selectedRequest.attachment_path.split('/').pop()}
                          path={selectedRequest.attachment_path}
                          onPress={handleViewAttachment}
                        />
                      )}

                      {/* many-file requests (business_trip etc.) */}
                      {(selectedRequest.attachments || []).map((a) => (
                        <AttachmentRow
                          key={a.id}
                          name={a.file_path.split('/').pop()}
                          path={a.file_path}
                          onPress={handleViewAttachment}
                        />
                      ))}
                    </>
                  ) : null}
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

/* ----------------------------------------
   REUSABLE COMPONENTS
---------------------------------------- */
function Tabs({ mainTab, setMainTab, assignedTotal, canViewAssigned }) {
  const Tab = ({ id, label, count }) => {
    const active = mainTab === id;
    return (
      <TouchableOpacity
        style={[styles.tab, active && styles.tabActive]}
        onPress={() => setMainTab(id)}
      >
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
        {count > 0 && (
          <View style={[styles.countBadge, active && styles.countBadgeActive]}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.tabs}>
      <Tab id="my_requests" label="My Requests" />
      {canViewAssigned ? (
        <Tab id="assigned_requests" label="Assigned" count={assignedTotal || 0} />
      ) : (
        <Text style={styles.singleTabNotice}>Employee View</Text>
      )}
    </View>
  );
}

function Filters({ fromDate, toDate, setFromDate, setToDate, onSearch, onClear }) {
  const hasFilters = fromDate || toDate;

  return (
    <View style={styles.filters}>
      <DatePickerField value={fromDate} onChange={setFromDate} placeholder="From Date" />
      <DatePickerField value={toDate} onChange={setToDate} placeholder="To Date" />

      <TouchableOpacity style={styles.searchBtn} onPress={onSearch}>
        <MaterialIcons name="search" size={SIZES.iconSm} color={COLORS.white} />
      </TouchableOpacity>

      {hasFilters && (
        <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
          <MaterialIcons name="clear" size={SIZES.iconSm} color={COLORS.error} />
        </TouchableOpacity>
      )}
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
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={[
          styles.dateInput,
          value && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' }
        ]}
      >
        <Text style={{ color: value ? COLORS.primary : COLORS.textLight }}>
          {value || placeholder}
        </Text>
        {value && (
          <MaterialIcons
            name="event"
            size={16}
            color={COLORS.primary}
            style={styles.dateIcon}
          />
        )}
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onChangeDate}
        />
      )}
    </>
  );
}

function RequestCard({ request, columns, role, isAssignedTab, onApproveReject, onPress, requestType }) {
  const status = getFinalStatus(request);

  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.default;
  /* ---- approval flags (type-aware, lower-case safe) ------------------- */
 /* ---------- who can take action?  ---------------------------------- */

// A.  Manager goes first for these types
const MANAGER_FIRST_TYPES = [
  'to_leave',
  'misc',
  'business_trip',
  'resignation',
  'personal_data_change',
];

// B.  HR Admin is the first approver for these
const HR_DIRECT_TYPES = ['bank', 'finance_claim', 'loans'];

// Helper → always compare lowercase to avoid case-mismatch
const lc = (v) => (v ?? '').toLowerCase();

const type   = request.request_type;
const st     = lc(request.status);                     // manager
const hrSt   = lc(request.hr_status);                  // HR
const fcSt   = lc(request.finance_coordinator_status); // coordinator
const finSt  = lc(request.finance_status);             // finance
const ceoSt  = lc(request.ceo_status);                 // CEO

/* 1) Manager */
const managerCanAct =
  isAssignedTab &&
  role === 'manager' &&
  MANAGER_FIRST_TYPES.includes(type) &&
  st === 'pending';

/* 2) HR Admin  (first or second depending on type) */
const hrAdminCanAct =
  isAssignedTab &&
  role === 'hr_admin' &&
  hrSt === 'pending' &&
  (
    HR_DIRECT_TYPES.includes(type) ||            // HR goes first
    (MANAGER_FIRST_TYPES.includes(type) && st === 'approved') // manager already signed
  );

/* 3) Finance-Coordinator  (only for finance_claim) */
const financeCoordCanAct =
  isAssignedTab &&
  role === 'finance_coordinator' &&
  type === 'finance_claim' &&
  hrSt === 'approved' &&
  fcSt === 'pending';

/* 4) Finance */
const financeCanAct =
  isAssignedTab &&
  role === 'finance' &&
  (
    (type === 'finance_claim' && fcSt === 'approved' && finSt === 'pending') ||
    (type === 'loans'        && hrSt === 'approved' && finSt === 'pending')
  );

/* 5) CEO  (loans final step) */
const ceoCanAct =
  isAssignedTab &&
  role === 'ceo' &&
  type === 'loans' &&
  finSt === 'approved' &&
  ceoSt === 'pending';

/* 6) Aggregate flag consumed by the UI */
const canTakeAction =
  managerCanAct ||
  hrAdminCanAct ||
  financeCoordCanAct ||
  financeCanAct ||
  ceoCanAct;


  const iconName = getIconForTab(requestType);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <MaterialIcons name={iconName} size={18} color={COLORS.primary} />
        </View>
        <Text style={styles.cardId}>#{request.id}</Text>
        <View >
          <Text style={styles.cardType}>{requestType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</Text>
        <Text style={styles.cardName}>{request.user.name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        {columns.slice(0, 3).map((col, idx) => (
          <View style={styles.cardRow} key={idx}>
            <View style={styles.cardLabelContainer}>
              <MaterialIcons
                name={col.icon}
                size={14}
                color={COLORS.textLight}
                style={styles.cardRowIcon}
              />
              <Text style={styles.cardLabel}>{col.label}</Text>
            </View>
            <Text
              style={[
                styles.cardValue,
                col.status && { fontWeight: '600', color: STATUS_COLORS[col.accessor(request)] || COLORS.textDark }
              ]}
              numberOfLines={1}
            >
              {col.accessor(request)}
            </Text>
          </View>
        ))}
      </View>

      {canTakeAction && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => onApproveReject(request, 'approved')}
          >
            <Text style={styles.actionText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
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
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.9}>
      <MaterialIcons name="add" size={28} color={COLORS.white} />
    </TouchableOpacity>
  );
}

/* ----------------------------------------
   STYLE DEFINITIONS
---------------------------------------- */
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
    marginLeft: 12,
  },
  headerRight: {
    flexDirection: 'row',
  },
  filterBtn: {
    padding: 6,
    borderRadius: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  /* Tabs */
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.padding,
    marginTop: 8,
    borderRadius: SIZES.radiusSm,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontWeight: '600',
    color: COLORS.textLight,
    fontSize: 14,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  countBadge: {
    backgroundColor: COLORS.textLight,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  countBadgeActive: {
    backgroundColor: COLORS.white,
  },
  countText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
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
  filterPanel: {
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.paddingSm,
  },
  dateInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.white,
    marginRight: 10,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  dateIcon: {
    position: 'absolute',
    right: 12,
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: SIZES.radiusSm,
    elevation: 2,
    marginRight: 8,
  },
  clearBtn: {
    backgroundColor: COLORS.errorLight,
    padding: 10,
    borderRadius: SIZES.radiusSm,
  },
  /* Cards */
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
    padding: SIZES.paddingSm,
    borderRadius: SIZES.radiusSm,
    elevation: 1,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardId: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '500',
    marginRight: 10,
  },
  cardName: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '500',
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontWeight: '600',
    fontSize: 11,
  },
  cardContent: {
    paddingHorizontal: 4,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRowIcon: {
    marginRight: 6,
  },
  cardLabel: {
    color: COLORS.textLight,
    fontSize: 13,
  },
  cardValue: {
    color: COLORS.textDark,
    fontWeight: '500',
    fontSize: 13,
    maxWidth: '55%',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: SIZES.radiusSm,
    marginLeft: 10,
  },
  approveBtn: {
    backgroundColor: COLORS.successLight,
  },
  rejectBtn: {
    backgroundColor: COLORS.errorLight,
  },
  actionText: {
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
  loadingText: {
    marginTop: 16,
    color: COLORS.textLight,
  },
  errorWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.padding,
  },
  errorText: {
    textAlign: 'center',
    color: COLORS.textDark,
    fontSize: 16,
    marginVertical: 16,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: SIZES.radiusSm,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  blankStateWrapper: {
    alignItems: 'center',
    padding: SIZES.padding,
    marginTop: SCREEN_HEIGHT * 0.15,
  },
  emptyText: {
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  emptySubText: {
    color: COLORS.textLight,
    fontSize: 14,
    marginTop: 4,
  },
  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: COLORS.white,
    width: '100%',
    maxHeight: '85%',
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  modalCloseIcon: {
    padding: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userName: {
    fontWeight: '600',
    color: COLORS.textDark,
  },
  userRole: {
    color: COLORS.textLight,
    fontSize: 12,
    marginTop: 2,
  },
  detailsContainer: {
    padding: SIZES.padding,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  detailValue: {
    color: COLORS.textDark,
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'right',
    flexShrink: 1,
    flexWrap: 'wrap',
    marginLeft: 10,
    maxWidth: '60%',
  },
  attachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: COLORS.primary + '10',
    borderRadius: SIZES.radiusSm,
    marginTop: 10,
    justifyContent: 'center',
  },
  attachmentText: {
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  /* FAB */
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});