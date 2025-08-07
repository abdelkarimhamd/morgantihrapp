import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import api from '../../../../services/api';
import VacationRequestItem from '../../../components/Vacations/VacationRequestItem';
import { Linking } from 'react-native';

// Same five colors (for reference):
// #1f3d7c, #248bbc, #74933c, #1f3d7c, #74933c

const { width } = Dimensions.get('window');

// Helper to compute inclusive day counts for vacation requests
function getRequestedDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
  const diff = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export default function EmployeeAllRequestsTabs({ navigation }) {
  // ==================== GLOBAL TAB STATE ====================
  // 0 = Vacation, 1 = Exit/Entry
  const [activeTab, setActiveTab] = useState(0);

  // ==================== VACATION STATES =====================
  const [vacationRequests, setVacationRequests] = useState([]);
  const [vacLoading, setVacLoading] = useState(false);
  const [vacError, setVacError] = useState('');

  // Vacation Filters
  const [startFilter, setStartFilter] = useState('');
  const [endFilter, setEndFilter] = useState('');

  // Pagination
  const [vacPage, setVacPage] = useState(1);
  const [vacRowsPerPage, setVacRowsPerPage] = useState(5);
  const [vacTotalRecords, setVacTotalRecords] = useState(0);

  // Vacation Cancel + Details
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // ==================== EXIT/ENTRY STATES ===================
  const [exitRequests, setExitRequests] = useState([]);
  const [exitLoading, setExitLoading] = useState(false);
  const [exitError, setExitError] = useState('');

  // ==================== EFFECTS =============================
  // Whenever active tab changes or vacation page changes, fetch data
  useEffect(() => {
    if (activeTab === 0) {
      fetchVacationRequests();
    } else {
      fetchExitRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, vacPage, vacRowsPerPage]);

  // ==================== VACATION LOGIC ======================
  const fetchVacationRequests = async (dateStart = startFilter, dateEnd = endFilter) => {
    if (activeTab !== 0) return;
    setVacLoading(true);
    setVacError('');

    try {
      const response = await api.get('/employee/vacation-requests', {
        params: {
          page: vacPage,
          per_page: vacRowsPerPage,
          start_date: dateStart || undefined,
          end_date: dateEnd || undefined,
        },
      });

      // Adjust if your API returns differently
      setVacationRequests(response.data.data || response.data);
      setVacTotalRecords(response.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch vacation requests:', err);
      setVacError('Could not load your vacation requests. Please try again later.');
    } finally {
      setVacLoading(false);
    }
  };

  const applyVacationFilters = () => {
    setVacPage(1);
    fetchVacationRequests(startFilter, endFilter);
  };

  const handleCancelVacation = (reqId) => {
    setCancelId(reqId);
    setCancelModalVisible(true);
  };

  const confirmCancelVacation = async () => {
    if (!cancelId) return;
    try {
      await api.patch(`/employee/vacation-requests/${cancelId}`, { status: 'Cancelled' });
      fetchVacationRequests();
      setCancelModalVisible(false);
      setCancelId(null);
    } catch (error) {
      console.error('Failed to cancel request:', error);
      Alert.alert('Error', 'Could not cancel the request. Please try again.');
    }
  };

  const closeCancelModal = () => {
    setCancelModalVisible(false);
    setCancelId(null);
  };

const viewVacationDetails = async (req) => {
  try {
    const res = await api.get(`/employee/vacation-requests/${req.id}`);
    setSelectedRequest(res.data);
    setDetailsModalVisible(true);
  } catch (error) {
    console.error('Failed to fetch vacation request details:', error);
    Alert.alert('Error', 'Could not load request details.');
  }
};


  const closeDetailsModal = () => {
    setDetailsModalVisible(false);
    setSelectedRequest(null);
  };

  const handleNewVacationRequest = () => {
    navigation.navigate('CreateVacationRequest');
  };

  // Pagination
  const handleVacationNextPage = () => {
    if (vacPage * vacRowsPerPage < vacTotalRecords) {
      setVacPage(vacPage + 1);
    }
  };
  const handleVacationPrevPage = () => {
    if (vacPage > 1) {
      setVacPage(vacPage - 1);
    }
  };

  // ==================== EXIT/ENTRY LOGIC ====================
  const fetchExitRequests = async () => {
    setExitLoading(true);
    setExitError('');

    try {
      const res = await api.get('/employee/exit-entry/list');
      setExitRequests(res.data || []);
    } catch (err) {
      console.error('Failed to fetch exit/entry requests:', err);
      setExitError('Could not load exit/entry requests. Please try again later.');
    } finally {
      setExitLoading(false);
    }
  };

  const handleNewExitEntry = () => {
    navigation.navigate('CreateExitEntry');
  };

  const handleCancelExitRequest = async (requestId) => {
    try {
      await api.patch(`/employee/exit-entry/${requestId}`, { status: 'Cancelled' });
      Alert.alert('Success', 'Request cancelled successfully!');
      fetchExitRequests();
    } catch (error) {
      console.error('Error cancelling exit/entry request:', error);
      Alert.alert('Failed to cancel request', 'Please try again.');
    }
  };
const DetailRow = ({ label, value, icon, multiline = false }) => (
  <View style={styles.detailRow}>
    <MaterialIcons name={icon} size={18} color="#1f3d7c" style={{ marginRight: 8 }} />
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text
      style={[styles.detailValue, multiline && { flexWrap: 'wrap', flex: 1 }]}
      numberOfLines={multiline ? 0 : 1}
    >
      {value}
    </Text>
  </View>
);

  // (If user is HR admin, you might need an approve/reject function, etc.)
  const handleExitStatusUpdate = async (requestId, newStatus) => {
    try {
      await api.patch(`/admin/exit-entry/${requestId}`, { status: newStatus });
      Alert.alert('Success', `Request ${newStatus} successfully!`);
      fetchExitRequests();
    } catch (error) {
      console.error('Error updating request status:', error);
      Alert.alert('Failed to update request status', 'Please try again.');
    }
  };

  // ==================== RENDER: TAB BAR =====================
const renderTabBar = () => (
  <View style={styles.tabBar}>
    {['Vacation', 'Exit/Entry'].map((tab, index) => (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tabItem,
          activeTab === index && styles.tabItemActive
        ]}
        onPress={() => setActiveTab(index)}
      >
        <Text style={[
          styles.tabText,
          activeTab === index && styles.tabTextActive
        ]}>
          {tab}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

  // ==================== RENDER: VACATION TAB ====================
  const renderVacationTab = () => {
    if (vacLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f3d7c" />
          <Text style={styles.loadingText}>Loading Vacation Requests...</Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        {/* Filter Card */}


        {/* New Vacation Button */}
        <TouchableOpacity style={styles.newButton} onPress={handleNewVacationRequest}>
          <LinearGradient
            // New vacation button gradient (#1f3d7c => #74933c)
            colors={['#1f3d7c', '#74933c']}
            style={styles.gradientButton}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
            <Text style={styles.newButtonText}>New Vacation Request</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Error or List of Vacation Requests */}
        {vacError ? (
          <Text style={styles.errorText}>{vacError}</Text>
        ) : (
          <FlatList
            data={vacationRequests}
            keyExtractor={(item) => String(item.id)}
            style={{ marginTop: 10 }}
            renderItem={({ item }) => (
              <VacationRequestItem
                request={item}
                onViewDetails={() => viewVacationDetails(item)}
                onCancel={() => handleCancelVacation(item.id)}
              />
            )}
          />
        )}

        {/* Simple Pagination */}
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.pageButton, vacPage <= 1 && styles.disabledButton]}
            onPress={handleVacationPrevPage}
            disabled={vacPage <= 1}
          >
            <Text style={styles.pageButtonText}>Prev</Text>
          </TouchableOpacity>

          <Text style={styles.pageInfo}>Page: {vacPage}</Text>

          <TouchableOpacity
            style={[
              styles.pageButton,
              vacPage * vacRowsPerPage >= vacTotalRecords && styles.disabledButton,
            ]}
            onPress={handleVacationNextPage}
            disabled={vacPage * vacRowsPerPage >= vacTotalRecords}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>

        {/* Cancel Confirmation Modal */}
        <Modal
          visible={cancelModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeCancelModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Confirm Cancellation</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to cancel this vacation request?
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelBtn]}
                  onPress={closeCancelModal}
                >
                  <Text style={styles.modalButtonText}>No</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmBtn]}
                  onPress={confirmCancelVacation}
                >
                  <Text style={styles.modalButtonText}>Yes, Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Vacation Details Modal */}
        <Modal
          visible={detailsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeDetailsModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
{selectedRequest && (
  <>
    <Text style={styles.modalTitle}>Vacation Request Details</Text>

    <View style={styles.detailsSection}>
      <DetailRow label="Type" value={selectedRequest.leave_type} icon="event-note" />
      <DetailRow label="Start Date" value={selectedRequest.start_date} icon="calendar-today" />
      <DetailRow label="End Date" value={selectedRequest.end_date} icon="calendar-today" />
      <DetailRow
        label="Total Days"
        value={getRequestedDays(selectedRequest.start_date, selectedRequest.end_date)}
        icon="date-range"
      />
    </View>

    <View style={styles.detailsSection}>
      <DetailRow label="Status" value={selectedRequest.status} icon="check-circle" />
      <DetailRow label="HR Status" value={selectedRequest.hr_status} icon="verified-user" />
    </View>

    {(selectedRequest.country ||
      selectedRequest.phone_number ||
      selectedRequest.location_in_country ||
      selectedRequest.description) && (
      <View style={styles.detailsSection}>
        {selectedRequest.country && (
          <DetailRow label="Country" value={selectedRequest.country} icon="flag" />
        )}
        {selectedRequest.phone_number && (
          <DetailRow label="Phone" value={selectedRequest.phone_number} icon="phone" />
        )}
        {selectedRequest.location_in_country && (
          <DetailRow
            label="Location"
            value={selectedRequest.location_in_country}
            icon="location-on"
          />
        )}
        {selectedRequest.description && (
          <DetailRow label="Reason" value={selectedRequest.description} icon="notes" multiline />
        )}
      </View>
    )}

    {selectedRequest.attachment_url && (
      <TouchableOpacity
        onPress={() => 
          Linking.openURL(`https://app.morgantigcc.com/hr_system/backend/storage/app/public/${selectedRequest.attachment}`)}
 
          style={styles.attachmentButton}
      >
        <MaterialIcons name="attach-file" size={20} color="#1f3d7c" />
        <Text style={styles.attachmentText}>View Attachment</Text>
      </TouchableOpacity>
    )}
  </>
)}


              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmBtn]}
                  onPress={closeDetailsModal}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // ==================== RENDER: EXIT/ENTRY TAB ====================
  const renderExitEntryTab = () => {
    if (exitLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f3d7c" />
          <Text style={styles.loadingText}>Loading Exit/Entry Requests...</Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, padding: 16 }}>
        <TouchableOpacity style={styles.newButton} onPress={handleNewExitEntry}>
          <LinearGradient
            // New exit button gradient (#74933c => #1f3d7c)
            colors={['#74933c', '#1f3d7c']}
            style={styles.gradientButton}
          >
            <MaterialIcons name="exit-to-app" size={24} color="#fff" />
            <Text style={styles.newButtonText}>New Exit/Entry Request</Text>
          </LinearGradient>
        </TouchableOpacity>

        {exitError ? (
          <Text style={styles.errorText}>{exitError}</Text>
        ) : (
          <FlatList
            data={exitRequests}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              // Subtle gradient for each exit item
              <LinearGradient
                colors={['#f0fafc', '#fbfeff']}
                style={styles.exitItem}
              >
                <View style={styles.exitHeader}>
                  <Text style={styles.exitType}>{item.visa_type}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors[item.status] || '#9e9e9e' },
                    ]}
                  >
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <MaterialIcons name="date-range" size={16} color="#1f3d7c" />
                  <Text style={styles.detailText}>
                    {item.validity_from_date} - {item.validity_to_date}
                  </Text>
                </View>

                {item.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelExitRequest(item.id)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel Request</Text>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            )}
          />
        )}
      </View>
    );
  };

  // ==================== MAIN RENDER ==========================
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />

      {/* Header: gradient from #1f3d7c to #248bbc */}
      <LinearGradient
        colors={['#1f3d7c', '#248bbc']}
        style={styles.headerContainer}
      >
        <Text style={styles.headerTitle}>My Requests</Text>
      </LinearGradient>

      {/* Tabs */}
      {renderTabBar()}

      {/* Tab Content */}
      {activeTab === 0 ? renderVacationTab() : renderExitEntryTab()}
    </View>
  );
}

// Colors for the exit/entry status badges
const statusColors = {
  approved: '#00c853',
  pending: '#ffab00',
  cancelled: '#d50000',
  rejected: '#d50000',
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'sans-serif-medium',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
tabBar: {
  flexDirection: 'row',
  backgroundColor: '#fff',
  borderBottomColor: '#ddd',
  borderBottomWidth: 1,
  elevation: 4,
},

tabItem: {
  flex: 1,
  alignItems: 'center',
  paddingVertical: 15,
  borderBottomWidth: 3,
  borderBottomColor: 'transparent', // default
},

tabItemActive: {
  borderBottomColor: '#1f3d7c', // the underline color for active tab
},

tabText: {
  fontSize: 16,
  color: '#757575',
  fontWeight: '500',
},

tabTextActive: {
  color: '#1f3d7c',
  fontWeight: '600',
},

  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    height: 3,
    width: '100%',
    backgroundColor: '#1f3d7c',
    transform: [{ translateX: -width * 0.5 }],
  },

  // Vacation UI
  filterCard: {
    margin: 16,
    borderRadius: 15,
    padding: 20,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1f3d7c',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputContainer: {
    flex: 1,
  },
  label: {
    color: '#1f3d7c',
    fontSize: 14,
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  applyButton: {
    marginTop: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 10,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  newButton: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  newButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: 'bold',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  pageButton: {
    backgroundColor: '#74933c',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 8,
  },
  disabledButton: {
    opacity: 0.4,
  },
  pageButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  pageInfo: {
    fontSize: 16,
    color: '#333',
  },
detailsSection: {
  marginTop: 15,
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderColor: '#e0e0e0',
},

detailRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 8,
},

detailLabel: {
  fontWeight: 'bold',
  fontSize: 14,
  color: '#333',
  marginRight: 6,
},

detailValue: {
  fontSize: 14,
  color: '#555',
  flexShrink: 1,
},

attachmentButton: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 12,
},

attachmentText: {
  color: '#1f3d7c',
  fontSize: 14,
  textDecorationLine: 'underline',
  marginLeft: 4,
  fontWeight: '600',
},

  // Exit/Entry
  exitItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  exitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exitType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f3d7c',
  },
  statusBadge: {
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  detailText: {
    color: '#616161',
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#ffebee',
  },
  cancelButtonText: {
    color: '#d50000',
    fontWeight: '500',
  },

  // Modals
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
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1f3d7c',
  },
  modalMessage: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 6,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginLeft: 8,
  },
  cancelBtn: {
    backgroundColor: '#ccc',
  },
  confirmBtn: {
    backgroundColor: '#74933c',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
// Note: Ensure you have the necessary imports and that your API endpoints match the ones used here.
// This code provides a comprehensive employee request management screen with vacation and exit/entry tabs, including filtering, pagination, and modals for actions.    