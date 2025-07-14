import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import api from '../../services/api';
import { fetchHrRequests, updateRequestStatus } from '../../services/allRequestsApi';
import { getColumnsForTab } from '../../utils/columnConfig';

/* --------------------------------------------
   ENHANCED COLOR PALETTE & DESIGN TOKENS
-------------------------------------------- */
const COLORS = {
  primary: '#4361ee',      // Vibrant blue
  secondary: '#3a0ca3',    // Deep blue
  accent: '#7209b7',       // Purple accent
  background: '#f8f9fa',   // Light background
  surface: '#ffffff',      // Card surfaces
  textDark: '#212529',     // Dark text
  textMedium: '#495057',   // Medium text
  textLight: '#6c757d',    // Light text
  success: '#2ecc71',      // Success green
  error: '#e74c3c',        // Error red
  warning: '#f39c12',      // Warning yellow
  info: '#3498db',         // Info blue
  white: '#ffffff',
  border: '#dee2e6',       // Border color
  cardShadow: '#adb5bd20', // Shadow with opacity
};

const ROLES_CAN_VIEW_ASSIGNED = ['manager', 'hr_admin', 'finance'];

const ALL_SUB_TABS = [
  { key: 'to_leave', label: 'Leave', icon: 'flight-takeoff' },
  { key: 'loans', label: 'Loans', icon: 'attach-money' },
  { key: 'finance_claim', label: 'Finance', icon: 'receipt' },
  { key: 'misc', label: 'Misc', icon: 'more-horiz' },
  { key: 'business_trip', label: 'Business', icon: 'business-center' },
  { key: 'bank', label: 'Bank', icon: 'account-balance' },
  { key: 'resignation', label: 'Resign', icon: 'logout' },
  { key: 'personal_data_change', label: 'Data', icon: 'manage-accounts' },
];

// Design tokens
const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  circle: 100,
};
const SHADOWS = {
  sm: {
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
};

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
  const [refreshing, setRefreshing] = useState(false);
  const [assignedBreakdown, setAssignedBreakdown] = useState({ total: 0 });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const navigation = useNavigation();
  const role = useSelector((state) => state.auth.user?.role);
  const canViewAssignedTab = ROLES_CAN_VIEW_ASSIGNED.includes(role);
  const isAssignedTab = mainTab === 'assigned_requests' && canViewAssignedTab;

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const dynamicStyles = useMemo(() => getDynamicStyles(isLargeScreen), [isLargeScreen]);

  // Data fetching
  useEffect(() => {
    fetchData();
    if (isAssignedTab) fetchAssignedBreakdown();
  }, [mainTab, requestType]);

  const fetchAssignedBreakdown = async () => {
    try {
      const res = await api.get('/hr-requests/assigned-pending-breakdown');
      setAssignedBreakdown(res.data || {});
    } catch (err) {
      console.warn('Failed to fetch assigned breakdown:', err);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const payload = {
        request_type: requestType,
        from_date: fromDate,
        to_date: toDate,
        view_mode: mainTab,
      };
      const data = await fetchHrRequests(payload);
      setRequests(data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch requests. Please try again.');
    }
  }, [requestType, fromDate, toDate, mainTab]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchData();
    if (isAssignedTab) await fetchAssignedBreakdown();
    setLoading(false);
  }, [fetchData, isAssignedTab]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
      if (isAssignedTab) await fetchAssignedBreakdown();
    } finally {
      setRefreshing(false);
    }
  }, [fetchData, isAssignedTab]);

  // Action handlers
  const handleApproveReject = async (request, newStatus) => {
    setLoading(true);
    try {
      await updateRequestStatus(request.id, newStatus, 'status');
      await fetchData();
      if (isAssignedTab) fetchAssignedBreakdown();
      Alert.alert('Success', `Request ${newStatus.toLowerCase()} successfully`);
    } catch {
      Alert.alert('Error', 'Failed to update request status');
    } finally {
      setLoading(false);
    }
  };

  const handleMainTabChange = (newTab) => setMainTab(newTab);
  const handleSubTabChange = (newSubTab) => setRequestType(newSubTab);
  const handleCreateNew = () => navigation.navigate('NewHrRequestForm', { requestType });
  const handleCardPress = (request) => {
    setSelectedRequest(request);
    setModalVisible(true);
  };
  const closeModal = () => setModalVisible(false);

  // Filter sub-tabs based on role
  const subTabs = useMemo(() => {
    if (role === 'manager' && isAssignedTab) {
      return ALL_SUB_TABS.filter(st => !['loans', 'finance_claim', 'bank'].includes(st.key));
    }
    return ALL_SUB_TABS;
  }, [role, isAssignedTab]);

  const assignedLabel = assignedBreakdown.total > 0
    ? `Assigned (${assignedBreakdown.total})`
    : 'Assigned';

  return (
    <View style={dynamicStyles.container}>
      {/* Enhanced Gradient Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={dynamicStyles.header}
      >
        <View style={dynamicStyles.headerContent}>
          <Text style={dynamicStyles.headerTitle}>HR Requests</Text>
          <TouchableOpacity 
            onPress={loadData}
            style={dynamicStyles.refreshButton}
            accessibilityLabel="Refresh requests"
          >
            <MaterialIcons 
              name="refresh" 
              size={24} 
              color={COLORS.white} 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Enhanced Main Tabs - Modern Segmented Control */}
      <View style={dynamicStyles.mainTabContainer}>
        <TouchableOpacity
          style={[
            dynamicStyles.mainTabItem,
            mainTab === 'my_requests' && dynamicStyles.mainTabActive,
          ]}
          onPress={() => handleMainTabChange('my_requests')}
          accessibilityLabel="View my requests"
        >
          <Text style={dynamicStyles.mainTabText}>
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
            accessibilityLabel="View assigned requests"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={dynamicStyles.mainTabText}>
                {assignedLabel}
              </Text>
              {assignedBreakdown.total > 0 && (
                <View style={dynamicStyles.tabBadge}>
                  <Text style={dynamicStyles.tabBadgeText}>
                    {assignedBreakdown.total}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Fixed Sub Tabs Alignment */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={dynamicStyles.subTabContainer}
      >
        {subTabs.map((sub) => {
          const pendingCount = assignedBreakdown[sub.key] || 0;
          const isActive = requestType === sub.key;
          
          return (
            <TouchableOpacity
              key={sub.key}
              style={[
                dynamicStyles.subTabItem,
                isActive && dynamicStyles.subTabItemActive,
              ]}
              onPress={() => handleSubTabChange(sub.key)}
              accessibilityLabel={`Filter by ${sub.label}`}
            >
              <MaterialIcons
                name={sub.icon}
                size={isLargeScreen ? 22 : 20}
                color={isActive ? COLORS.white : COLORS.textLight}
              />
              <Text style={[
                dynamicStyles.subTabLabel,
                isActive && dynamicStyles.subTabLabelActive
              ]}>
                {sub.label}
              </Text>
              {pendingCount > 0 && (
                <View style={[
                  dynamicStyles.subTabBadge,
                  isActive && { backgroundColor: COLORS.white }
                ]}>
                  <Text style={[
                    dynamicStyles.subTabBadgeText,
                    isActive && { color: COLORS.primary }
                  ]}>
                    {pendingCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Enhanced Filter Bar */}
      <View style={dynamicStyles.filterBar}>
        <DatePickerField
          value={fromDate}
          onChange={setFromDate}
          placeholder="From Date"
          dynamicStyles={dynamicStyles}
        />
        <View style={dynamicStyles.dateSeparator}>
          <MaterialIcons name="arrow-forward" size={16} color={COLORS.textLight} />
        </View>
        <DatePickerField
          value={toDate}
          onChange={setToDate}
          placeholder="To Date"
          dynamicStyles={dynamicStyles}
        />
        
        <View style={dynamicStyles.filterActions}>
          <TouchableOpacity 
            style={dynamicStyles.filterButton} 
            onPress={loadData}
            accessibilityLabel="Search requests"
          >
            <MaterialIcons name="search" size={20} color={COLORS.white} />
            <Text style={dynamicStyles.filterButtonText}>Search</Text>
          </TouchableOpacity>

          {mainTab === 'my_requests' && (
            <TouchableOpacity
              style={[dynamicStyles.filterButton, { backgroundColor: COLORS.accent }]}
              onPress={handleCreateNew}
              accessibilityLabel="Create new request"
            >
              <MaterialIcons name="add" size={20} color={COLORS.white} />
              <Text style={dynamicStyles.filterButtonText}>New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Enhanced Content Area */}
      {error ? (
        <View style={dynamicStyles.errorContainer}>
          <MaterialIcons name="error-outline" size={36} color={COLORS.error} />
          <Text style={dynamicStyles.errorText}>{error}</Text>
          <TouchableOpacity
            style={dynamicStyles.retryButton}
            onPress={loadData}
            accessibilityLabel="Try again"
          >
            <Text style={dynamicStyles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : loading && !refreshing ? (
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={dynamicStyles.loadingText}>Loading requests...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={dynamicStyles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
              progressBackgroundColor={COLORS.background}
            />
          }
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              columns={getColumnsForTab(requestType)}
              role={role}
              isAssignedTab={isAssignedTab}
              onApproveReject={handleApproveReject}
              onPress={() => handleCardPress(item)}
              dynamicStyles={dynamicStyles}
              style={{
                marginBottom: SPACING.md,
                marginHorizontal: SPACING.md,
                height: isLargeScreen ? 120 : 100,
              }}
            />
          )}
          ListEmptyComponent={
            <View style={dynamicStyles.emptyContainer}>
              <MaterialIcons 
                name="inbox" 
                size={48} 
                color={COLORS.textLight} 
                style={{ opacity: 0.3 }}
              />
              <Text style={dynamicStyles.emptyText}>No requests found</Text>
              <Text style={dynamicStyles.emptySubtext}>
                {mainTab === 'my_requests' 
                  ? 'Create your first request' 
                  : 'All caught up!'}
              </Text>
              {mainTab === 'my_requests' && (
                <TouchableOpacity
                  style={dynamicStyles.emptyButton}
                  onPress={handleCreateNew}
                  accessibilityLabel="Create new request"
                >
                  <Text style={dynamicStyles.emptyButtonText}>Create Request</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Enhanced Request Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableOpacity 
          style={dynamicStyles.modalOverlay} 
          activeOpacity={1}
          onPress={closeModal}
        >
          <View style={dynamicStyles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={dynamicStyles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>
                Request #{selectedRequest?.id}
              </Text>
              <TouchableOpacity 
                onPress={closeModal}
                style={dynamicStyles.closeButton}
                accessibilityLabel="Close modal"
              >
                <MaterialIcons name="close" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              // style={dynamicStyles.modalScroll}
              showsVerticalScrollIndicator={false}
              style={{ height: 120 }}
            >
              {selectedRequest && getColumnsForTab(requestType).map((col, idx) => (
                <View key={idx} style={dynamicStyles.detailRow}>
                  <Text style={dynamicStyles.detailLabel}>{col.label}:</Text>
                  <Text style={dynamicStyles.detailValue}>
                    {col.accessor(selectedRequest)}
                  </Text>
                </View>
              ))}
            </ScrollView>
            
            <View style={dynamicStyles.modalFooter}>
              <TouchableOpacity 
                style={[dynamicStyles.modalButton, { backgroundColor: COLORS.border }]}
                onPress={closeModal}
              >
                <Text style={[dynamicStyles.modalButtonText, { color: COLORS.textDark }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/* --------------------------------------------
   ENHANCED REQUEST CARD COMPONENT
-------------------------------------------- */
function RequestCard({ request, columns, role, isAssignedTab, onApproveReject, onPress, dynamicStyles }) {
  const statusColors = {
    pending: COLORS.warning,
    approved: COLORS.success,
    rejected: COLORS.error,
    draft: COLORS.textLight,
  };
  
  const statusColor = statusColors[request.status.toLowerCase()] || COLORS.info;
  const canApproveReject = isAssignedTab && role === 'manager' && request.status.toLowerCase() === 'pending';

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      style={dynamicStyles.card}
      onPress={onPress}
      accessibilityLabel={`View request details: ${request.id}`}
    >
      {/* Status indicator as left border */}
      <View style={[dynamicStyles.cardStatus, { backgroundColor: statusColor }]} />
      
      <View style={dynamicStyles.cardContent}>
        {columns.slice(0, 3).map((col, idx) => (
          <View key={idx} style={dynamicStyles.cardRow}>
            <Text style={dynamicStyles.cardLabel}>{col.label}:</Text>
            <Text 
              style={dynamicStyles.cardValue}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {col.accessor(request)}
            </Text>
          </View>
        ))}
        
        {/* Status badge */}
        <View style={[dynamicStyles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[dynamicStyles.statusText, { color: statusColor }]}>
            {request.status}
          </Text>
        </View>
      </View>

      {canApproveReject && (
        <View style={dynamicStyles.cardActions}>
          <TouchableOpacity
            style={[dynamicStyles.actionButton, { backgroundColor: COLORS.success }]}
            onPress={() => onApproveReject(request, 'approved')}
            accessibilityLabel="Approve request"
          >
            <MaterialIcons name="check" size={18} color={COLORS.white} />
            <Text style={dynamicStyles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[dynamicStyles.actionButton, { backgroundColor: COLORS.error }]}
            onPress={() => onApproveReject(request, 'rejected')}
            accessibilityLabel="Reject request"
          >
            <MaterialIcons name="close" size={18} color={COLORS.white} />
            <Text style={dynamicStyles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

/* --------------------------------------------
   ENHANCED DATE PICKER FIELD COMPONENT
-------------------------------------------- */
function DatePickerField({ value, onChange, placeholder, dynamicStyles }) {
  const [showPicker, setShowPicker] = useState(false);
  const [internalDate, setInternalDate] = useState(value || '');

  const onChangeDate = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setInternalDate(dateString);
      onChange(dateString);
    }
  };

  const clearDate = () => {
    setInternalDate('');
    onChange('');
  };

  return (
    <View style={dynamicStyles.dateInputContainer}>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        style={dynamicStyles.dateInput}
        accessibilityLabel={placeholder}
      >
        <MaterialIcons 
          name="event" 
          size={20} 
          color={COLORS.textLight} 
          style={dynamicStyles.dateIcon} 
        />
        <Text style={[
          dynamicStyles.dateText,
          !internalDate && { color: COLORS.textLight }
        ]}>
          {internalDate || placeholder}
        </Text>
        
        {internalDate && (
          <TouchableOpacity 
            onPress={clearDate} 
            style={dynamicStyles.clearButton}
            accessibilityLabel="Clear date"
          >
            <MaterialIcons name="close" size={16} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={internalDate ? new Date(internalDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onChangeDate}
          maximumDate={new Date(2100, 11, 31)}
          themeVariant="light"
        />
      )}
    </View>
  );
}

/* --------------------------------------------
   ENHANCED DYNAMIC STYLES
-------------------------------------------- */
function getDynamicStyles(isLargeScreen) {
  const baseFontSize = isLargeScreen ? 16 : 14;
  const horizontalPadding = isLargeScreen ? SPACING.lg : SPACING.md;
  
  return StyleSheet.create({
    // Container
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    
    // Header
    header: {
      paddingTop: isLargeScreen ? SPACING.xl * 1.5 : SPACING.lg,
      paddingBottom: SPACING.lg,
      paddingHorizontal: horizontalPadding,
      borderBottomLeftRadius: RADII.lg,
      borderBottomRightRadius: RADII.lg,
    },
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: isLargeScreen ? 26 : 22,
      fontWeight: '800',
      color: COLORS.white,
      letterSpacing: 0.5,
      textShadowColor: 'rgba(0,0,0,0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    refreshButton: {
      padding: SPACING.sm,
      borderRadius: RADII.circle,
      backgroundColor: '#ffffff20',
    },
    
    // Main Tabs
    mainTabContainer: {
      flexDirection: 'row',
      backgroundColor: COLORS.border,
      marginHorizontal: horizontalPadding,
      marginVertical: SPACING.sm,
      borderRadius: RADII.lg,
      padding: SPACING.xs,
    },
    mainTabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.sm,
      borderRadius: RADII.md,
    },
    mainTabActive: {
      backgroundColor: COLORS.surface,
      ...SHADOWS.sm,
    },
    mainTabText: {
      fontSize: baseFontSize,
      fontWeight: '600',
      color: COLORS.textDark,
    },
    tabBadge: {
      backgroundColor: COLORS.error,
      borderRadius: RADII.circle,
      width: 22,
      height: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: SPACING.xs,
    },
    tabBadgeText: {
      color: COLORS.white,
      fontSize: baseFontSize - 3,
      fontWeight: '700',
    },
    
    // Sub Tabs
    subTabContainer: {
      paddingHorizontal: horizontalPadding - SPACING.xs,
      paddingBottom: SPACING.sm,
      minHeight: 50,
    },
    subTabItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      marginHorizontal: SPACING.xs,
      borderRadius: RADII.lg,
      backgroundColor: COLORS.surface,
      ...SHADOWS.sm,
      marginVertical: SPACING.xs,
    },
    subTabItemActive: {
      backgroundColor: COLORS.primary,
    },
    subTabLabel: {
      fontSize: baseFontSize - 1,
      fontWeight: '600',
      color: COLORS.textLight,
      marginLeft: SPACING.xs,
    },
    subTabLabelActive: {
      color: COLORS.white,
      fontWeight: '700',
    },
    subTabBadge: {
      backgroundColor: COLORS.accent,
      borderRadius: RADII.circle,
      minWidth: 22,
      height: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: SPACING.xs,
      paddingHorizontal: SPACING.xs,
    },
    subTabBadgeText: {
      color: COLORS.white,
      fontSize: baseFontSize - 3,
      fontWeight: '700',
    },
    
    // Filter Bar
    filterBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      marginHorizontal: horizontalPadding,
      marginBottom: SPACING.md,
      borderRadius: RADII.lg,
      padding: SPACING.md,
      ...SHADOWS.md,
    },
    dateInputContainer: {
      flex: 1,
    },
    dateInput: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADII.sm,
      padding: SPACING.sm,
      backgroundColor: COLORS.background,
    },
    dateIcon: {
      marginRight: SPACING.sm,
    },
    dateText: {
      fontSize: baseFontSize,
      color: COLORS.textDark,
      fontWeight: '500',
      flex: 1,
    },
    clearButton: {
      padding: SPACING.xs,
      marginLeft: SPACING.xs,
    },
    dateSeparator: {
      paddingHorizontal: SPACING.sm,
    },
    filterActions: {
      flexDirection: 'row',
      marginLeft: SPACING.sm,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.primary,
      borderRadius: RADII.md,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      marginLeft: SPACING.sm,
      ...SHADOWS.sm,
    },
    filterButtonText: {
      color: COLORS.white,
      fontWeight: '600',
      marginLeft: SPACING.xs,
    },
    
    // Content Area
    listContent: {
      paddingHorizontal: horizontalPadding,
      paddingBottom: SPACING.lg,
    },
    
    // Request Card
    card: {
      backgroundColor: COLORS.surface,
      borderRadius: RADII.md,
      marginBottom: SPACING.md,
      overflow: 'hidden',
      flexDirection: 'row',
      ...SHADOWS.md,
    },
    cardStatus: {
      width: 6,
    },
    cardContent: {
      flex: 1,
      padding: SPACING.md,
    },
    cardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: SPACING.sm,
    },
    cardLabel: {
      fontSize: baseFontSize - 1,
      color: COLORS.textLight,
      fontWeight: '500',
      flex: 1,
    },
    cardValue: {
      fontSize: baseFontSize,
      color: COLORS.textDark,
      fontWeight: '600',
      flex: 2,
      textAlign: 'right',
    },
    statusBadge: {
      alignSelf: 'flex-start',
      borderRadius: RADII.sm,
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      marginTop: SPACING.sm,
    },
    statusText: {
      fontSize: baseFontSize - 2,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      padding: SPACING.sm,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADII.sm,
      marginLeft: SPACING.sm,
      ...SHADOWS.sm,
    },
    actionButtonText: {
      color: COLORS.white,
      fontWeight: '600',
      marginLeft: SPACING.xs,
    },
    
    // Empty State
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: SPACING.xl * 2,
      paddingHorizontal: SPACING.lg,
      backgroundColor: COLORS.surface,
      borderRadius: RADII.lg,
      marginTop: SPACING.md,
      ...SHADOWS.sm,
    },
    emptyText: {
      fontSize: baseFontSize + 2,
      fontWeight: '700',
      color: COLORS.textDark,
      marginTop: SPACING.md,
    },
    emptySubtext: {
      fontSize: baseFontSize,
      color: COLORS.textLight,
      marginTop: SPACING.xs,
      textAlign: 'center',
    },
    emptyButton: {
      backgroundColor: COLORS.primary,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADII.md,
      marginTop: SPACING.md,
      ...SHADOWS.sm,
    },
    emptyButtonText: {
      color: COLORS.white,
      fontWeight: '600',
    },
    
    // Loading State
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: SPACING.xl * 2,
    },
    loadingText: {
      fontSize: baseFontSize,
      color: COLORS.textLight,
      marginTop: SPACING.md,
    },
    
    // Error State
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg,
      backgroundColor: COLORS.surface,
      borderRadius: RADII.lg,
      margin: horizontalPadding,
      ...SHADOWS.sm,
    },
    errorText: {
      fontSize: baseFontSize,
      color: COLORS.error,
      fontWeight: '500',
      textAlign: 'center',
      marginVertical: SPACING.md,
    },
    retryButton: {
      backgroundColor: COLORS.primary,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADII.md,
      marginTop: SPACING.sm,
      ...SHADOWS.sm,
    },
    retryButtonText: {
      color: COLORS.white,
      fontWeight: '600',
    },
    
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: horizontalPadding,
    },
    modalCard: {
      backgroundColor: COLORS.surface,
      borderRadius: RADII.lg,
      overflow: 'hidden',
      width: '100%',
      maxWidth: 600,
      maxHeight: '80%',
      ...SHADOWS.md,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.md,
      backgroundColor: COLORS.background,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    modalTitle: {
      fontSize: baseFontSize + 2,
      fontWeight: '700',
      color: COLORS.textDark,
    },
    closeButton: {
      padding: SPACING.xs,
    },
    modalScroll: {
      padding: SPACING.md,
      maxHeight: 400,
    },
    detailRow: {
      marginBottom: SPACING.md,
      paddingBottom: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    detailLabel: {
      fontSize: baseFontSize - 1,
      color: COLORS.textLight,
      fontWeight: '500',
      marginBottom: SPACING.xs,
    },
    detailValue: {
      fontSize: baseFontSize,
      color: COLORS.textDark,
      fontWeight: '600',
    },
    modalFooter: {
      padding: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    modalButton: {
      borderRadius: RADII.md,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      marginLeft: SPACING.sm,
      ...SHADOWS.sm,
    },
    modalButtonText: {
      fontWeight: '600',
      fontSize: baseFontSize,
    },
  });
}