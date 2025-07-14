// EmployeeVacationRequestsScreen.js

import React, { useEffect, useState } from 'react';
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
  ScrollView,
  Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // expo install expo-linear-gradient
import api from '../../../services/api';
import VacationRequestItem from '../../components/Vacations/VacationRequestItem';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
/**
 * Example color usage:
 * #74933c  (greenish)
 * #248bbc  (blue)
 * #1f3d7c  (dark blue)
 * #4c6c7c  (gray/blue)
 * #1c6c7c  (blueish)
 */

export default function EmployeeVacationRequestsScreen({ navigation }) {
  const [vacationRequests, setVacationRequests] = useState([]);
  const [loading, setLoading] = useState(false);
const vacationBalance = useSelector((state) => state.auth.user?.vacation_balance || 0);

  const [errorMsg, setErrorMsg] = useState('');
const [summaryStats, setSummaryStats] = useState({
  daysLeft: 0,
  pending: 0,
  approved: 0,
});

  // Filters
  const [startFilter, setStartFilter] = useState('');
  const [endFilter, setEndFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalRecords, setTotalRecords] = useState(0);

  // Cancel confirm
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelId, setCancelId] = useState(null);

  // View details modal
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchVacationRequests();
  }, [page, rowsPerPage]);
 const role = useSelector((state) => state.auth.user?.role);

const fetchVacationRequests = async (start = startFilter, end = endFilter) => {
  setLoading(true);
  setErrorMsg('');
  try {
    const response = await api.get(`/${role}/vacation-requests`, {
      params: {
        page,
        per_page: rowsPerPage,
        start_date: start || undefined,
        end_date: end || undefined,
      },
    });

    const allRequests = response.data.data || response.data;
    setVacationRequests(allRequests);
    setTotalRecords(response.data.total || allRequests.length);

    // === Calculate Summary Stats ===
    let pendingCount = 0;
    let approvedCount = 0;

    allRequests.forEach((req) => {
      if (req.status === 'Pending') pendingCount++;
      if (req.status === 'Approved') approvedCount++;
    });

    setSummaryStats({
      daysLeft: vacationBalance,
      pending: pendingCount,
      approved: approvedCount,
    });

  } catch (error) {
    console.error('Failed to fetch vacation requests:', error);
    setErrorMsg('Could not load your vacation requests. Please try again later.');
  } finally {
    setLoading(false);
  }
};



  // Apply filters => reset page & re-fetch
  const applyFilters = () => {
    setPage(1);
    fetchVacationRequests(startFilter, endFilter);
  };

  // Cancel request
  const onCancelRequest = (requestId) => {
    setCancelId(requestId);
    setCancelModalVisible(true);
  };

  const confirmCancelVacation = async () => {
    if (!cancelId) return;
    try {
      await api.patch(`/employee/vacation-requests/${cancelId}`, { status: 'Cancelled' });
      fetchVacationRequests();
      setCancelModalVisible(false);
      setCancelId(null);
    } catch (err) {
      console.error('Failed to cancel request:', err);
      Alert.alert('Error', 'Could not cancel the request. Please try again.');
    }
  };

  // Details modal
  const onViewDetails = (req) => {
    setSelectedRequest(req);
    setDetailsModalVisible(true);
  };

  const closeDetailsModal = () => {
    setDetailsModalVisible(false);
    setSelectedRequest(null);
  };

  // New Vacation
  const handleNewVacationRequest = () => {
    navigation.navigate('CreateVacationRequest');
  };

  // Pagination
  const handleNextPage = () => {
    if (page * rowsPerPage < totalRecords) {
      setPage(page + 1);
    }
  };
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1c6c7c" />
        <Text style={styles.loadingText}>Loading Vacation Requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {role ==='employee' && (
      <LinearGradient
        colors={['#1f3d7c', '#248bbc']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Vacation Requests</Text>
            <Text style={styles.headerSubtitle}>Manage your time off</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={applyFilters}>
              <Ionicons name="filter" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
      )}
      {/* ===== Modern Gradient Header ===== */}


      {/* ===== Main Content ===== */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* ===== Stats Summary ===== */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
      <Text style={styles.statValue}>{summaryStats.daysLeft}</Text>
            <Text style={styles.statLabel}>Days Left</Text>
          </View>
          <View style={styles.statCard}>
           <Text style={styles.statValue}>{summaryStats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
          <Text style={styles.statValue}>{summaryStats.approved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
        </View>

        {/* ===== Filter Panel ===== */}


        {/* ===== Action Button ===== */}
        <TouchableOpacity 
          style={styles.newButton} 
          onPress={handleNewVacationRequest}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.newButtonText}>New Request</Text>
        </TouchableOpacity>

        {/* ===== Request List ===== */}
        <Text style={styles.sectionTitle}>Your Requests</Text>
        
        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={24} color="#e74c3c" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : (
          <FlatList
            data={vacationRequests}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <VacationRequestItem
                request={item}
                onViewDetails={() => onViewDetails(item)}
                onCancel={() => onCancelRequest(item.id)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="time" size={48} color="#bdc3c7" />
                <Text style={styles.emptyText}>No vacation requests found</Text>
              </View>
            }
          />
        )}

        {/* ===== Pagination ===== */}
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.pageButton, page <= 1 && styles.disabledButton]}
            onPress={handlePrevPage}
            disabled={page <= 1}
          >
            <Ionicons name="chevron-back" size={20} color={page > 1 ? "#1f3d7c" : "#95a5a6"} />
            <Text style={[styles.pageButtonText, page > 1 && styles.activeText]}>Prev</Text>
          </TouchableOpacity>

          <Text style={styles.pageInfo}>Page {page} of {Math.ceil(totalRecords / rowsPerPage)}</Text>

          <TouchableOpacity
            style={[styles.pageButton, (page * rowsPerPage) >= totalRecords && styles.disabledButton]}
            onPress={handleNextPage}
            disabled={(page * rowsPerPage) >= totalRecords}
          >
            <Text style={[styles.pageButtonText, (page * rowsPerPage) < totalRecords && styles.activeText]}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color={(page * rowsPerPage) < totalRecords ? "#1f3d7c" : "#95a5a6"} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ===== Modals (same as before) ===== */}
{/* ===== Vacation Request Details Modal ===== */}
<Modal
  visible={detailsModalVisible}
  transparent
  animationType="fade"
  onRequestClose={closeDetailsModal}
>
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContainer, { maxHeight: '80%' }]}>
      {selectedRequest && (
        <ScrollView>
          <Text style={styles.modalTitle}>Request Details</Text>
          <Text style={styles.detailText}><Text style={styles.bold}>Type:</Text> {selectedRequest.leave_type}</Text>
          <Text style={styles.detailText}><Text style={styles.bold}>Start Date:</Text> {selectedRequest.start_date}</Text>
          <Text style={styles.detailText}><Text style={styles.bold}>End Date:</Text> {selectedRequest.end_date}</Text>
          <Text style={styles.detailText}><Text style={styles.bold}>Days:</Text> {selectedRequest.days}</Text>
          <Text style={styles.detailText}><Text style={styles.bold}>Status:</Text> {selectedRequest.status}</Text>
          <Text style={styles.detailText}><Text style={styles.bold}>Description:</Text> {selectedRequest.description || 'N/A'}</Text>
          <Text style={styles.detailText}><Text style={styles.bold}>Submitted:</Text> {selectedRequest.created_at}</Text>

          {/* Attachment Link */}
          {selectedRequest.attachment && (
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(`https://app.morgantigcc.com/hr_system/backend/storage/app/public/${selectedRequest.attachment}`)
              }
            >
              <Text style={[styles.detailText, { color: '#1f3d7c', textDecorationLine: 'underline' }]}>
                📎 View Attachment
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.modalButton, styles.confirmBtn]}
        onPress={closeDetailsModal}
      >
        <Text style={styles.modalButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '30%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f3d7c',
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  filterPanel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f3d7c',
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateInputContainer: {
    width: '48%',
  },
  inputLabel: {
    fontSize: 14,
    color: '#4c6c7c',
    marginBottom: 8,
    fontWeight: '500',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e7ee',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#f8fafc',
  },
  inputField: {
    flex: 1,
    height: 48,
    color: '#2c3e50',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1c6c7c',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#74933c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#74933c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  newButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#feeceb',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#e74c3c',
    flex: 1,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 16,
  },
  emptyText: {
    color: '#7f8c8d',
    marginTop: 16,
    fontSize: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#edf2f7',
    gap: 6,
  },
  disabledButton: {
    backgroundColor: '#f5f7fa',
  },
  pageButtonText: {
    fontWeight: '500',
    fontSize: 15,
  },
  activeText: {
    color: '#1f3d7c',
  },
  pageInfo: {
    color: '#4a5568',
    fontWeight: '500',
  },
  // Modals
  modalOverlay: {
    flex:1,
    backgroundColor:'rgba(0,0,0,0.5)',
    justifyContent:'center',
    alignItems:'center',
  },
  modalContainer: {
    backgroundColor:'#fff',
    borderRadius:10,
    padding:20,
    width:'80%',
  },
  modalTitle: {
    fontSize:18,
    fontWeight:'bold',
    marginBottom:12,
    color:'#1f3d7c',
  },
  modalMessage: {
    fontSize:16,
    color:'#555',
  },
  detailText: {
    fontSize:16,
    marginBottom:6,
    color:'#333',
  },
  modalActions: {
    flexDirection:'row',
    justifyContent:'flex-end',
    marginTop:16,
  },
  modalButton: {
    paddingVertical:8,
    paddingHorizontal:16,
    borderRadius:6,
    marginLeft:8,
  },
  cancelBtn: {
    backgroundColor:'#ccc',
  },
  confirmBtn: {
    backgroundColor:'#1c6c7c',
  },
  modalButtonText: {
    color:'#fff',
    fontWeight:'600',
  },
});
