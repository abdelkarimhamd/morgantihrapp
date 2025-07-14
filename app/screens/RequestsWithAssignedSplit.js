import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';

import api from '../../services/api';
import { fetchHrRequests, updateRequestStatus } from '../../services/allRequestsApi';
import { getColumnsForTab } from '../../utils/columnConfig';
import { useSelector } from 'react-redux';

/* --------------------------------------------
   COLOR PALETTE
-------------------------------------------- */
const COLORS = {
  primary: '#1f3d7c',
  secondary: '#248bbc',
  accent: '#74933c',
  background: '#f8f9fd',
  textDark: '#2c3e50',
  textLight: '#666666',
  success: '#27ae60',
  error: '#e74c3c',
  warning: '#f1c40f',
  white: '#ffffff',
};

const ROLES_CAN_VIEW_ASSIGNED = ['manager', 'hr_admin', 'finance'];

const ALL_SUB_TABS = [
  { key: 'to_leave', label: 'Leave', icon: 'exit-to-app' },
  { key: 'loans', label: 'Loans', icon: 'attach-money' },
  { key: 'finance_claim', label: 'Finance', icon: 'monetization-on' },
  { key: 'misc', label: 'Misc', icon: 'more-horiz' },
  { key: 'business_trip', label: 'Business', icon: 'business-center' },
  { key: 'bank', label: 'Bank', icon: 'account-balance' },
  { key: 'resignation', label: 'Resign', icon: 'person-off' },
  { key: 'personal_data_change', label: 'Data', icon: 'manage-accounts' },
];

/* --------------------------------------------
   MAIN COMPONENT
-------------------------------------------- */
export default function RequestsWithAssignedSplit() {
  const [mainTab, setMainTab] = useState('my_requests');
  const [requestType, setRequestType] = useState('to_leave');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [assignedBreakdown, setAssignedBreakdown] = useState({ total: 0 });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const navigation = useNavigation();

  // Example role
 const role = useSelector((state) => state.auth.user?.role);
  const canViewAssignedTab = ROLES_CAN_VIEW_ASSIGNED.includes(role);
  const isAssignedTab = mainTab === 'assigned_requests' && canViewAssignedTab;

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const dynamicStyles = useMemo(() => getDynamicStyles(isLargeScreen), [isLargeScreen]);

  useEffect(() => {
    fetchData();
  }, [mainTab, requestType]);

  useEffect(() => {
    if (isAssignedTab) {
      fetchAssignedBreakdown();
    } else {
      setAssignedBreakdown({ total: 0 });
    }
  }, [isAssignedTab]);

  const columns = getColumnsForTab(requestType);

  /* --------------------------------------------
     Fetch assigned requests breakdown
  -------------------------------------------- */
  async function fetchAssignedBreakdown() {
    try {
      const res = await api.get('/hr-requests/assigned-pending-breakdown');
      setAssignedBreakdown(res.data || {});
    } catch (err) {
      console.warn(err);
    }
  }

  /* --------------------------------------------
     Fetch main data
  -------------------------------------------- */
  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        request_type: requestType,
        from_date: fromDate,
        to_date: toDate,
        view_mode: mainTab,
      };
      const data = await fetchHrRequests(payload);
      setRequests(data || []);
    } catch (err) {
      setError('Failed to fetch requests.');
    } finally {
      setLoading(false);
    }
  }

  /* --------------------------------------------
     Approve/Reject
  -------------------------------------------- */
  async function handleApproveReject(request, newStatus) {
    setLoading(true);
    try {
      await updateRequestStatus(request.id, newStatus, 'status');
      await fetchData();
      if (isAssignedTab) {
        fetchAssignedBreakdown();
      }
    } catch {
      Alert.alert('Error', 'Failed to update request status.');
    } finally {
      setLoading(false);
    }
  }

  /* --------------------------------------------
     Tabs & Filter
  -------------------------------------------- */
  function handleMainTabChange(newTab) {
    setMainTab(newTab);
  }
  function handleSubTabChange(newSubTab) {
    setRequestType(newSubTab);
  }
  function handleSearch() {
    fetchData();
  }
  function handleCreateNew() {
    // Navigate to create new request screen
    navigation.navigate('NewHrRequestForm', {
      requestType,
    });
  }

  function handleCardPress(request) {
    setSelectedRequest(request);
    setModalVisible(true);
  }
  function closeModal() {
    setSelectedRequest(null);
    setModalVisible(false);
  }

  let subTabs = [...ALL_SUB_TABS];
  if (role === 'manager' && isAssignedTab) {
    // Manager might not see certain sub types
    subTabs = subTabs.filter(st => !['loans', 'finance_claim', 'bank'].includes(st.key));
  }

  const assignedTotal = assignedBreakdown.total || 0;
  const assignedLabel = assignedTotal > 0
    ? `Assigned Requests (${assignedTotal})`
    : 'Assigned Requests';

  return (
    <View style={dynamicStyles.container}>
      {/* Header with gradient */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={dynamicStyles.header}
      >
        <Text style={dynamicStyles.headerTitle}>HR Requests</Text>
      </LinearGradient>

      {/* Main Tabs */}
      <View style={dynamicStyles.mainTabRow}>
        <TouchableOpacity
          style={[
            dynamicStyles.mainTabItem,
            mainTab === 'my_requests' && dynamicStyles.mainTabActive,
          ]}
          onPress={() => handleMainTabChange('my_requests')}
        >
          <Text
            style={[
              dynamicStyles.mainTabText,
              mainTab === 'my_requests' && dynamicStyles.mainTabTextActive,
            ]}
          >
            My Requests
          </Text>
        </TouchableOpacity>

        {canViewAssignedTab && (
          <TouchableOpacity
            style={[
              dynamicStyles.mainTabItem,
              mainTab === 'assigned_requests' && dynamicStyles.mainTabActive,
            ]}
            onPress={() => handleMainTabChange('assigned_requests')}
          >
            <Text
              style={[
                dynamicStyles.mainTabText,
                mainTab === 'assigned_requests' && dynamicStyles.mainTabTextActive,
              ]}
            >
              {assignedLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sub Tabs (horizontal) 
          REPLACED View with ScrollView, plus a fixed height 
      */}
      <ScrollView
        horizontal
        style={dynamicStyles.subTabScroll}               // See updated style
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={dynamicStyles.subTabContent}
      >
        {subTabs.map((sub) => {
          const pendingCount = assignedBreakdown[sub.key] || 0;
          const isActiveSub = requestType === sub.key;
          return (
            <TouchableOpacity
              key={sub.key}
              style={[
                dynamicStyles.subTabItem,
                isActiveSub && dynamicStyles.subTabItemActive,
              ]}
              onPress={() => handleSubTabChange(sub.key)}
            >
              <MaterialIcons
                name={sub.icon}
                size={isLargeScreen ? 22 : 18}
                color={isActiveSub ? COLORS.primary : COLORS.textLight}
                style={{ marginBottom: 4 }}
              />
              <Text style={dynamicStyles.subTabLabel}>{sub.label}</Text>
              {pendingCount > 0 && (
                <View style={dynamicStyles.subTabBadge}>
                  <Text style={dynamicStyles.subTabBadgeText}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Filters */}
      <View style={dynamicStyles.filterCard}>
        <DatePickerField
          value={fromDate}
          onChange={setFromDate}
          placeholder="Start Date"
        />
        <DatePickerField
          value={toDate}
          onChange={setToDate}
          placeholder="End Date"
        />

        <TouchableOpacity style={dynamicStyles.actionBtnFilter} onPress={handleSearch}>
          <MaterialIcons name="search" size={isLargeScreen ? 22 : 18} color={COLORS.white} />
        </TouchableOpacity>

        {mainTab === 'my_requests' && (
          <TouchableOpacity
            style={[
              dynamicStyles.actionBtnFilter,
              { backgroundColor: COLORS.accent, marginLeft: 8 },
            ]}
            onPress={handleCreateNew}
          >
            <MaterialIcons name="add" size={isLargeScreen ? 22 : 18} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {error ? (
        <View style={dynamicStyles.errorContainer}>
          <MaterialIcons name="error-outline" size={32} color={COLORS.error} />
          <Text style={dynamicStyles.errorText}>{error}</Text>
        </View>
      ) : loading ? (
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: isLargeScreen ? 40 : 20 }}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              columns={columns}
              role={role}
              isAssignedTab={isAssignedTab}
              onApproveReject={handleApproveReject}
              onPress={() => handleCardPress(item)}
              dynamicStyles={dynamicStyles}
            />
          )}
          ListEmptyComponent={(
            <View style={dynamicStyles.emptyContainer}>
              <MaterialIcons name="inbox" size={48} color={COLORS.textLight} />
              <Text style={dynamicStyles.emptyText}>No requests found</Text>
            </View>
          )}
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContainer}>
            <ScrollView contentContainerStyle={dynamicStyles.modalScroll}>
              {/* Close button */}
              <TouchableOpacity
                style={dynamicStyles.modalClose}
                onPress={closeModal}
              >
                <MaterialIcons name="close" size={24} color={COLORS.error} />
              </TouchableOpacity>

              {/* Title */}
              <Text style={dynamicStyles.modalTitle}>
                Request #{selectedRequest?.id}
              </Text>

              {/* Columns */}
              {selectedRequest && columns.map((col, idx) => {
                const val = col.accessor(selectedRequest);
                return (
                  <View key={String(idx)} style={dynamicStyles.detailRow}>
                    <Text style={dynamicStyles.detailLabel}>{col.label}</Text>
                    <Text style={dynamicStyles.detailValue}>{val}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* --------------------------------------------
   REQUEST CARD
-------------------------------------------- */
function RequestCard({
  request,
  columns,
  role,
  isAssignedTab,
  onApproveReject,
  onPress,
  dynamicStyles,
}) {
  const lowerStatus = (request.status || '').toLowerCase();
  const statusColor = {
    pending: COLORS.warning,
    approved: COLORS.success,
    rejected: COLORS.error,
  }[lowerStatus] || COLORS.warning;

  const canApproveReject =
    isAssignedTab && role === 'manager' && lowerStatus === 'pending';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={dynamicStyles.requestCard}
      onPress={onPress}
    >
      {/* Status badge */}
      <View style={dynamicStyles.badgePosition}>
        <View style={[dynamicStyles.badge, { backgroundColor: statusColor }]}>
          <Text style={dynamicStyles.badgeText}>{request.status}</Text>
        </View>
      </View>

      {/* Info Rows */}
      {columns.map((col, idx) => {
        const val = col.accessor(request);
        return (
          <View style={dynamicStyles.cardRow} key={String(idx)}>
            <Text style={dynamicStyles.cardLabel}>{col.label}</Text>
            <Text
              style={[dynamicStyles.cardValue, val.length > 40 && { flexWrap: 'wrap' }]}
              numberOfLines={val.length > 40 ? 3 : 1}
            >
              {val}
            </Text>
          </View>
        );
      })}

      {/* Approve/Reject */}
      {canApproveReject && (
        <View style={dynamicStyles.actionRow}>
          <TouchableOpacity
            style={[dynamicStyles.actionBtn, { backgroundColor: COLORS.success }]}
            onPress={() => onApproveReject(request, 'approved')}
          >
            <MaterialIcons name="check" size={18} color={COLORS.white} />
            <Text style={dynamicStyles.actionBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[dynamicStyles.actionBtn, { backgroundColor: COLORS.error }]}
            onPress={() => onApproveReject(request, 'rejected')}
          >
            <MaterialIcons name="close" size={18} color={COLORS.white} />
            <Text style={dynamicStyles.actionBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

/* --------------------------------------------
   DATE PICKER FIELD
-------------------------------------------- */
function DatePickerField({ value, onChange, placeholder }) {
  const [showPicker, setShowPicker] = useState(false);

  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS !== 'ios') {
      setShowPicker(false);
    }
    if (selectedDate) {
      onChange(selectedDate.toISOString().slice(0, 10));
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
        style={styleHelpers.dateInputTouchable}
      >
        <Text style={[styleHelpers.dateInputText, !value && { color: '#999' }]}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onChangeDate}
          maximumDate={new Date(2100, 11, 31)}
        />
      )}
    </>
  );
}

/* --------------------------------------------
   SHARED STYLES
-------------------------------------------- */
const styleHelpers = StyleSheet.create({
  dateInputTouchable: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginRight: 8,
    backgroundColor: COLORS.white,
  },
  dateInputText: {
    fontSize: 14,
    color: '#111',
  },
});

/* --------------------------------------------
   DYNAMIC STYLES
-------------------------------------------- */
function getDynamicStyles(isLargeScreen) {
  const baseFont = isLargeScreen ? 16 : 14;
  const subTabSize = isLargeScreen ? 80 : 70;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      paddingTop: isLargeScreen ? 60 : 40,
      paddingBottom: isLargeScreen ? 40 : 25,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 6,
    },
    headerTitle: {
      fontSize: isLargeScreen ? 24 : 20,
      fontWeight: '700',
      color: COLORS.white,
      letterSpacing: 0.5,
    },
    // Main tab row
    mainTabRow: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: isLargeScreen ? 16 : 12,
      paddingBottom: isLargeScreen ? 8 : 6,
      borderRadius: 12,
      backgroundColor: COLORS.white,
      elevation: 2,
      overflow: 'hidden',
    },
    mainTabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: isLargeScreen ? 12 : 12,
      marginBottom: isLargeScreen ? 0 : 4,
    },
    mainTabActive: {
      backgroundColor: COLORS.primary,
    },
    mainTabText: {
      fontSize: baseFont,
      fontWeight: '600',
      color: COLORS.textDark,
    },
    mainTabTextActive: {
      color: COLORS.white,
    },

    // Sub tabs
    // Make sure to add a fixed height or "flex: 0" to avoid pushing filters down
    subTabScroll: {
      marginHorizontal: 10,
      marginTop: isLargeScreen ? 16 : 10,
      marginBottom: isLargeScreen ? 8 : 9,
      // Ensure the scroll doesn't expand:
      flexGrow: 0,
      height: subTabSize + 10, // or something around subTabSize
    },
    subTabContent: {
      alignItems: 'center', // if you want them centered vertically
    },
    subTabItem: {
      width: subTabSize + 10,
      height: subTabSize,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 5,
      borderRadius: 12,
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: 'rgba(28,108,124,0.1)',
      position: 'relative',
      padding: 4,
    },
    subTabItemActive: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.secondary + '15', // slight tint
    },
    subTabLabel: {
      fontSize: baseFont - 2,
      fontWeight: '500',
      color: COLORS.textDark,
    },
    subTabBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: COLORS.accent,
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    subTabBadgeText: {
      color: COLORS.white,
      fontSize: 10,
      fontWeight: '700',
    },

    // Filter card
    filterCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.white,
      marginHorizontal: 16,
      borderRadius: 12,
      padding: isLargeScreen ? 14 : 10,
      elevation: 1,
      marginBottom: isLargeScreen ? 18 : 12,
    },
    actionBtnFilter: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.primary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: isLargeScreen ? 10 : 8,
    },

    // Error
    errorContainer: {
      marginTop: 30,
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    errorText: {
      color: COLORS.error,
      fontSize: baseFont,
      fontWeight: '600',
      marginTop: 8,
      textAlign: 'center',
    },
    badge:{
      marginTop: 4,
      backgroundColor: COLORS.accent,
      paddingVertical: 4,
      paddingHorizontal:  8,
    },

    loadingContainer: {
      marginTop: 40,
      alignItems: 'center',
    },
    emptyContainer: {
      marginTop: 40,
      alignItems: 'center',
      opacity: 0.7,
    },
    emptyText: {
      color: COLORS.textLight,
      fontSize: baseFont + 2,
      marginTop: 12,
      textAlign: 'center',
    },
// Card container
requestCard: {
  backgroundColor: COLORS.white,
  borderRadius: 16,
  padding: 20,
  marginHorizontal: 20,
  marginTop: 16,
  marginBottom: 20,
  elevation: 5,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.1,
  shadowRadius: 6,
  position: 'relative',
},

// Badge wrapper (positioned absolutely)
badgePosition: {
  position: 'relative',
  zIndex: 10,
},

// Badge itself
badge: {
  borderRadius: 10,
  minWidth: 44,
  paddingVertical: 8,
  marginBottom: 12,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: COLORS.primary, // fallback if statusColor not defined
},

// Badge label
badgeText: {
  color: COLORS.white,
  fontWeight: 'bold',
  fontSize: baseFont - 1,
  textTransform: 'capitalize',
},

// Label + value row
cardRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 8,
},
    cardLabel: {
      fontSize: baseFont - 1,
      color: COLORS.textLight,
      width: '45%',
    },
    cardValue: {
      fontSize: baseFont,
      fontWeight: '500',
      color: COLORS.textDark,
      width: '55%',
      textAlign: 'right',
    },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 12,
      gap: 8,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: isLargeScreen ? 10 : 8,
    },
    actionBtnText: {
      color: COLORS.white,
      fontWeight: '600',
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      width: isLargeScreen ? '50%' : '85%',
      backgroundColor: COLORS.white,
      borderRadius: 12,
      padding: 16,
      elevation: 10,
      maxHeight: '80%',
    },
    modalScroll: {
      paddingBottom: 20,
    },
    modalClose: {
      alignSelf: 'flex-end',
      marginBottom: 8,
    },
    modalTitle: {
      fontSize: baseFont + 2,
      fontWeight: '700',
      color: COLORS.textDark,
      marginBottom: 12,
      alignSelf: 'center',
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: COLORS.background,
      borderRadius: 8,
      padding: 8,
      marginBottom: 6,
    },
    detailLabel: {
      fontSize: baseFont - 1,
      color: COLORS.textLight,
      width: '40%',
    },
    detailValue: {
      fontSize: baseFont,
      fontWeight: '500',
      color: COLORS.textDark,
      width: '60%',
      textAlign: 'right',
    },
  });
}
