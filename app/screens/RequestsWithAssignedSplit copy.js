import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

// Colors
const COLORS = {
  primary: '#2563eb',    // Vibrant blue
  secondary: '#059669',  // Emerald green
  accent: '#f59e0b',     // Amber
  background: '#f8fafc', // Light gray
  surface: '#ffffff',    // White
  error: '#dc2626',      // Red
  text: '#1e293b',       // Dark slate
  subtitle: '#64748b',   // Slate
};

// Roles that can see assigned requests
const ROLES_CAN_VIEW_ASSIGNED = ['manager', 'hr_admin', 'finance'];

// Sub Tabs
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

// Import your real API calls and the function for column config
import { fetchHrRequests, updateRequestStatus } from '../../services/allRequestsApi';
import api from '../../services/api';
import { getColumnsForTab } from '../../utils/columnConfig';

/**
 * Enhanced RequestCard: displays columns and a status badge.
 */
function RequestCard({ request, columns, onApproveReject, onPress }) {
  // Color the status badge
  const statusColor = {
    pending: COLORS.accent,
    approved: COLORS.secondary,
    rejected: COLORS.error,
  }[request.status?.toLowerCase()] || COLORS.accent;

  return (
    <TouchableOpacity style={styles.requestCard} onPress={onPress}>
      {/* Status badge in top-right corner */}
      <View style={{ position: 'absolute', top: 16, right: 16 }}>
        <View style={[styles.badge, { backgroundColor: statusColor }]}>
          <Text style={styles.badgeText}>{request.status}</Text>
        </View>
      </View>

      {/* Show each column's label/value */}
      {columns.map((col, idx) => (
        <View style={styles.cardRow} key={idx}>
          <Text style={styles.cardLabel}>{col.label}</Text>
          <Text style={styles.cardValue}>{col.accessor(request)}</Text>
        </View>
      ))}

      {/* Approve/Reject buttons if provided */}
      {onApproveReject && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.approveButton}
            onPress={() => onApproveReject(request, 'approved')}
          >
            <MaterialIcons name="check" size={18} color={COLORS.surface} />
            <Text style={styles.actionText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => onApproveReject(request, 'rejected')}
          >
            <MaterialIcons name="close" size={18} color={COLORS.surface} />
            <Text style={styles.actionText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function RequestsWithAssignedSplit() {
  // Main tab: "my_requests" or "assigned_requests"
  const [mainTab, setMainTab] = useState('my_requests');
  // Sub tab: "to_leave", "loans", etc.
  const [requestType, setRequestType] = useState('to_leave');

  // Date filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Data states
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  // assigned pending breakdown
  const [assignedBreakdown, setAssignedBreakdown] = useState({ total: 0 });

  // Suppose role is read from your auth context
  const role = 'employee'; // or 'manager','hr_admin','finance'
  const canViewAssignedTab = ROLES_CAN_VIEW_ASSIGNED.includes(role);

  // Is assigned tab with a role that can see assigned?
  const isAssignedTab = (mainTab === 'assigned_requests' && canViewAssignedTab);

  // Re-fetch data whenever mainTab or requestType changes
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [mainTab, requestType]);

  // Load assigned breakdown if we are on assigned_requests
  useEffect(() => {
    if (isAssignedTab) {
      fetchAssignedBreakdown();
    } else {
      setAssignedBreakdown({ total: 0 });
    }
  }, [isAssignedTab]);

  // Columns for current sub tab
  const columns = getColumnsForTab(requestType);

  // ===== API calls =====
  async function fetchAssignedBreakdown() {
    try {
      const res = await api.get('/hr-requests/assigned-pending-breakdown');
      setAssignedBreakdown(res.data || {});
    } catch (err) {
      console.warn('Failed to load assigned breakdown', err);
    }
  }

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
      console.error('Fetch error:', err);
      setError('Failed to fetch requests.');
    } finally {
      setLoading(false);
    }
  }

  // Approve/Reject
  async function handleApproveReject(request, newStatus) {
    try {
      setLoading(true);
      await updateRequestStatus(request.id, newStatus, 'status');
      await fetchData();
      if (isAssignedTab) {
        fetchAssignedBreakdown();
      }
    } catch (err) {
      console.error('Approval error:', err);
      Alert.alert('Error', 'Failed to update request status.');
    } finally {
      setLoading(false);
    }
  }

  // === UI Handlers ===
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
    Alert.alert('Create Request', `Creating new request of type: ${requestType}`);
  }

  function handleCardPress(request) {
    Alert.alert('Request Detail', `Open detail for request #${request.id}`);
  }

  // Possibly remove some subTabs if manager => no finance stuff in assigned
  let subTabs = [...ALL_SUB_TABS];
  if (role === 'manager' && isAssignedTab) {
    subTabs = subTabs.filter(
      (st) => !['loans', 'finance_claim', 'bank'].includes(st.key)
    );
  }

  // assigned requests label
  const assignedTotal = assignedBreakdown.total || 0;
  const assignedLabel = assignedTotal > 0
    ? `Assigned Requests (${assignedTotal})`
    : 'Assigned Requests';

  return (
    <View style={styles.container}>
      {/* Header: gradient with app name */}
      <LinearGradient
        colors={[COLORS.primary, '#1d4ed8']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Request Manager</Text>
      </LinearGradient>

      {/* Main Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            mainTab === 'my_requests' && styles.activeTab,
          ]}
          onPress={() => handleMainTabChange('my_requests')}
        >
          <Text style={[
            styles.tabText,
            mainTab === 'my_requests' && styles.activeTabText,
          ]}>
            My Requests
          </Text>
        </TouchableOpacity>

        {canViewAssignedTab && (
          <TouchableOpacity
            style={[
              styles.tabButton,
              mainTab === 'assigned_requests' && styles.activeTab,
            ]}
            onPress={() => handleMainTabChange('assigned_requests')}
          >
            <Text style={[
              styles.tabText,
              mainTab === 'assigned_requests' && styles.activeTabText,
            ]}>
              {assignedLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sub Tabs */}
      <ScrollView
        horizontal
        style={styles.subTabContainer}
        showsHorizontalScrollIndicator={false}
      >
        {subTabs.map((sub) => (
          <TouchableOpacity
            key={sub.key}
            style={[
              styles.subTab,
              requestType === sub.key && styles.activeSubTab,
            ]}
            onPress={() => handleSubTabChange(sub.key)}
          >
            <MaterialIcons 
              name={sub.icon} 
              size={24} 
              color={requestType === sub.key ? COLORS.primary : COLORS.subtitle}
            />
            <Text style={styles.subTabLabel}>{sub.label}</Text>
            {assignedBreakdown[sub.key] > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{assignedBreakdown[sub.key]}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filter Section */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.dateInput}
          placeholder="Start Date"
          placeholderTextColor={COLORS.subtitle}
          value={fromDate}
          onChangeText={setFromDate}
        />
        <TextInput
          style={[styles.dateInput, { marginLeft: 8 }]}
          placeholder="End Date"
          placeholderTextColor={COLORS.subtitle}
          value={toDate}
          onChangeText={setToDate}
        />
        <TouchableOpacity style={styles.actionButton} onPress={handleSearch}>
          <MaterialIcons name="search" size={20} color={COLORS.surface} />
        </TouchableOpacity>

        {mainTab === 'my_requests' && (
          <TouchableOpacity 
            style={[styles.actionButton, { marginLeft: 8 }]} 
            onPress={handleCreateNew}
          >
            <MaterialIcons name="add" size={20} color={COLORS.surface} />
          </TouchableOpacity>
        )}
      </View>

      {/* Error / Loading / List */}
      {error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={24} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              columns={columns}
              // Only pass onApproveReject if assigned tab
              onApproveReject={isAssignedTab ? handleApproveReject : null}
              onPress={() => handleCardPress(item)}
            />
          )}
          ListEmptyComponent={(
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={48} color={COLORS.subtitle} />
              <Text style={styles.emptyText}>No requests found</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </View>
  );
}

// === STYLES ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.surface,
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  activeTabText: {
    color: COLORS.surface,
  },
  subTabContainer: {
    height: 72,
    paddingHorizontal: 8,
  },
  subTab: {
    width: 100,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  activeSubTab: {
    borderColor: COLORS.primary,
    backgroundColor: '#eff6ff',
  },
  subTabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: COLORS.text,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  errorContainer: {
    marginTop: 30,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
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
    color: COLORS.subtitle,
    fontSize: 16,
    marginTop: 12,
  },

  // RequestCard styles
  requestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 13,
    color: COLORS.subtitle,
    width: '40%',
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    width: '60%',
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  approveButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    color: COLORS.surface,
    marginLeft: 4,
    fontWeight: '600',
  },
});
