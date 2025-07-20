
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import api from '../../../services/api';
import { useSelector } from 'react-redux';

// ------------------ Unified Color Theme ------------------ //
const COLORS = {
  navy: '#1f3d7c',
  brightBlue: '#248bbc',
  forest: '#74933c',
  teal: '#1c6c7c',
  tealGray: '#4c6c7c',
  white: '#ffffff',
  background: '#f4f7f9',
  textDark: '#2d3748',
  textLight: '#718096',
  danger: '#e53935',
  success: '#43a047',
  warning: '#fb8c00',
  border: '#e2e8f0',
};

// ------------------ Constants & Helpers ------------------ //
const allLeaveTypes = [
  'Annual',
  'Sick',
  'Emergency',
  'Unpaid',
  'BabyBorn',
  'FamilyDeath', // Simplified name for display
  'Exam',
  'Haj',
  'Marriage',
  'Pregnancy',
  'HusbandDeath', // Simplified name for display
];

const leaveTypeApiMapping = {
  'FamilyDeath': 'Passing Away (Family)',
  'HusbandDeath': 'Passing Away (Husband)',
};

function getLeaveTypesForGender(gender) {
  const base = allLeaveTypes;
  if ((gender || '').toLowerCase() === 'male') {
    return base.filter(type => type !== 'Pregnancy' && type !== 'HusbandDeath');
  }
  return base;
}

function getDailyAccrualRate(contractType, leaveType) {
  if (leaveType !== 'Annual') return 0;
  switch (contractType) {
    case '30 Days Yearly': return 30 / 365;
    case '21 Days Yearly': return 21 / 365;
    default: return 0;
  }
}

function getRemainingDaysInYear(date) {
  const yearEnd = new Date(date.getFullYear(), 11, 31);
  const diff = yearEnd - date;
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

// ------------------ FloatingLabelInput Component ------------------ //
function FloatingLabelInput({ label, value, ...props }) {
  const [isFocused, setIsFocused] = useState(false);
  const labelStyle = {
    position: 'absolute',
    left: 16,
    top: isFocused || !!value ? -10 : 18,
    fontSize: isFocused || !!value ? 12 : 15,
    color: isFocused ? COLORS.navy : COLORS.textLight,
    backgroundColor: COLORS.white,
    paddingHorizontal: 4,
    zIndex: 1,
  };

  return (
    <View style={styles.inputContainer}>
      <Text style={labelStyle}>{label}</Text>
      <TextInput
        style={[styles.textFieldInput, props.multiline && { height: 100, textAlignVertical: 'top' }]}
        value={value}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
    </View>
  );
}

// ------------------ Main Component ------------------ //
export default function VacationRequestForm({ navigation }) {
  const [formData, setFormData] = useState({
    leave_type: 'Annual',
    start_date: null,
    end_date: null,
    country: '',
    phone_number: '',
    location_in_country: '',
    description: '',
  });

  const [gender] = useState('female'); // This should come from user state/context
  const [vacationBalances, setVacationBalances] = useState([]);
  const [baseBalance, setBaseBalance] = useState(0);
  const [contractType, setContractType] = useState('');
  const [requestedDays, setRequestedDays] = useState(0);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
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

  useEffect(() => {

    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    await Promise.all([fetchVacationBalances(), fetchPendingRequests()]);
  }

  async function fetchVacationBalances() {
    setLoadingBalances(true);
    try {
      const { data } = await api.get('/vacation-balances/my');
      const balances = Array.isArray(data) ? data : [];
      setVacationBalances(balances);
      if (balances.length) {
        setContractType(balances[0]?.user?.contract_type || '');
        const annualBal = balances.find(b => b.leave_type === 'Annual');
        setBaseBalance(parseFloat(annualBal?.balance) || 0);
      }
    } catch (err) {
      console.error('Failed to fetch vacation balances:', err);
      setError('Could not load vacation balances.');
    } finally {
      setLoadingBalances(false);
    }
  }

  async function fetchPendingRequests() {
    try {
      const { data } = await api.get(`${apiPrefix}/vacation-requests2/index`);
      setHasPendingRequest((data || []).some(req => req.status === 'pending' || req.hr_status === 'pending'));
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    }
  }
  const getMaxPossibleDays = (startDate, endDate) => {
    if (formData.leave_type !== 'Annual') return baseBalance;

    const dailyRate = getDailyAccrualRate(contractType, formData.leave_type);
    const today = new Date();
    const accrualEndDate = endDate ? new Date(endDate) : new Date(today.getFullYear(), 11, 31);

    const daysFromNow = Math.max(
      0,
      Math.floor((accrualEndDate - today) / (1000 * 60 * 60 * 24))
    );

    return Math.floor(baseBalance + (dailyRate * daysFromNow));
  };


  const calcDays = (start, end) => {
    if (!start || !end || end < start) return 0;
    const diff = new Date(end).setHours(0, 0, 0, 0) - new Date(start).setHours(0, 0, 0, 0);
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleDateChange = (name, event, selectedDate) => {
    name === 'start_date' ? setShowStartPicker(false) : setShowEndPicker(false);
    if (event.type === 'set' && selectedDate) {
      handleFormChange(name, selectedDate);
    }
  };

  const handleFormChange = (name, value) => {
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);

    if (name === 'leave_type') {
      const match = vacationBalances.find(bal => bal.leave_type === value);
      setBaseBalance(parseFloat(match?.balance) || 0);
    }

    if (name === 'start_date' || name === 'end_date') {
      setRequestedDays(calcDays(newFormData.start_date, newFormData.end_date));
    }
  };

  const suggestEndDate = () => {
    if (!formData.start_date) return;
    const maxDays = getMaxPossibleDays(formData.start_date, formData.end_date);

    const end = new Date(formData.start_date);
    end.setDate(end.getDate() + (maxDays - 1));
    handleFormChange('end_date', end);
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (!result.canceled) setFile(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (hasPendingRequest) {
      Alert.alert('Pending Request', 'You already have a pending vacation request.');
      return;
    }

    const maxPossible = getMaxPossibleDays(formData.start_date, formData.end_date);

    if (!['Emergency', 'Unpaid'].includes(formData.leave_type) && requestedDays > maxPossible) {
      Alert.alert('Insufficient Balance', `Your request for ${requestedDays} days exceeds the maximum of ${maxPossible} available days.`);
      return;
    }

    setLoading(true);
    setError('');
    setValidationErrors([]);

    const formDataObj = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'start_date' || key === 'end_date') {
        if (formData[key]) formDataObj.append(key, new Date(formData[key]).toISOString().split('T')[0]);
      } else if (key === 'leave_type') {
        formDataObj.append(key, leaveTypeApiMapping[formData[key]] || formData[key]);
      } else {
        formDataObj.append(key, formData[key]);
      }
    });
    if (file) formDataObj.append('attachment', { uri: file.uri, name: file.name, type: file.mimeType });

    try {
      await api.post(`${apiPrefix}/vacation-requests`, formDataObj, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error creating request:', err.response?.data || err);
      if (err.response?.status === 422 && err.response.data.errors) {
        setValidationErrors(Object.values(err.response.data.errors).flat());
      } else {
        setError(err.response?.data?.message || 'Failed to submit the request.');
      }
    } finally {
      setLoading(false);
    }
  };

  const maxDays = getMaxPossibleDays(formData.start_date, formData.end_date);


  const leaveTypes = getLeaveTypesForGender(gender);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Leave Request Form</Text>
          <Text style={styles.headerSubtitle}>Complete the details below to submit your request.</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {validationErrors.length > 0 && (
          <View style={styles.errorBox}>
            {validationErrors.map((msg, i) => <Text key={i} style={styles.errorItem}>• {msg}</Text>)}
          </View>
        )}
        {hasPendingRequest && (
          <View style={styles.warningBox}>
            <Icon name="alert-circle-outline" size={22} color={COLORS.warning} />
            <Text style={styles.warningText}>You have a pending leave request.</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="chart-box-outline" size={24} color={COLORS.navy} />
            <Text style={styles.cardTitle}>Balance Summary</Text>
          </View>
          {loadingBalances ? <ActivityIndicator color={COLORS.navy} /> : (
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Leave Type</Text><Text style={styles.summaryValue}>{formData.leave_type}</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Base Balance</Text><Text style={styles.summaryValue}>{baseBalance.toFixed(2)} days</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Requested</Text><Text style={[styles.summaryValue, { color: COLORS.forest }]}>{requestedDays} days</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Max Available</Text><Text style={[styles.summaryValue, { color: COLORS.navy, fontWeight: 'bold' }]}>{maxDays} days</Text></View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="calendar-edit" size={24} color={COLORS.navy} />
            <Text style={styles.cardTitle}>Leave Details</Text>
          </View>

          <Text style={styles.label}>Leave Type</Text>
          <View style={styles.leaveTypeGrid}>
            {leaveTypes.map(type => (
              <TouchableOpacity key={type} style={[styles.leaveTypeChip, formData.leave_type === type && styles.leaveTypeChipSelected]} onPress={() => handleFormChange('leave_type', type)}>
                <Text style={[styles.leaveTypeChipText, formData.leave_type === type && styles.leaveTypeChipTextSelected]}>{type.replace('Death', ' Leave')}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.dateText}>{formData.start_date ? new Date(formData.start_date).toDateString() : 'Select'}</Text>
                <Icon name="calendar-blank" size={20} color={COLORS.navy} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.dateText}>{formData.end_date ? new Date(formData.end_date).toDateString() : 'Select'}</Text>
                <Icon name="calendar-blank" size={20} color={COLORS.navy} />
              </TouchableOpacity>
            </View>
          </View>
          {showStartPicker && <DateTimePicker mode="date" value={formData.start_date || new Date()} onChange={(e, d) => handleDateChange('start_date', e, d)} minimumDate={new Date()} />}
          {showEndPicker && <DateTimePicker mode="date" value={formData.end_date || new Date()} onChange={(e, d) => handleDateChange('end_date', e, d)} minimumDate={formData.start_date || new Date()} />}

          <TouchableOpacity style={styles.suggestBtn} onPress={suggestEndDate}>
            <Icon name="lightbulb-on-outline" size={18} color={COLORS.forest} />
            <Text style={styles.suggestBtnText}>Suggest End Date based on Max Balance</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="card-account-details-outline" size={24} color={COLORS.navy} />
            <Text style={styles.cardTitle}>Contact & Remarks</Text>
          </View>
          <FloatingLabelInput label="Country" value={formData.country} onChangeText={val => handleFormChange('country', val)} />
          <FloatingLabelInput label="Phone Number" value={formData.phone_number} onChangeText={val => handleFormChange('phone_number', val)} keyboardType="phone-pad" />
          <FloatingLabelInput label="Location in Country" value={formData.location_in_country} onChangeText={val => handleFormChange('location_in_country', val)} />
          <FloatingLabelInput label="Description (Optional)" value={formData.description} onChangeText={val => handleFormChange('description', val)} multiline />

          <Text style={[styles.label, { marginTop: 10 }]}>Attachment (Optional)</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickFile}>
            <Icon name="paperclip" size={18} color={COLORS.white} />
            <Text style={styles.uploadBtnText}>{file ? 'Change File' : 'Choose File'}</Text>
          </TouchableOpacity>
          {file && (
            <View style={styles.filePreview}>
              <Icon name="file-document-outline" size={18} color={COLORS.navy} />
              <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
              <TouchableOpacity onPress={() => setFile(null)}><Icon name="close-circle" size={20} color={COLORS.danger} /></TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity style={[styles.submitBtn, loading && styles.disabledBtn]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.white} /> : (
            <>
              <Icon name="send" size={20} color={COLORS.white} />
              <Text style={styles.submitBtnText}>Submit Request</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showSuccessModal} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}><Icon name="check-circle" size={60} color={COLORS.success} /></View>
            <Text style={styles.modalTitle}>Request Submitted!</Text>
            <Text style={styles.modalText}>Your leave request has been sent for approval.</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => { setShowSuccessModal(false); navigation.goBack(); }}>
              <Text style={styles.modalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ------------------ Styles ------------------ //
const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerContainer: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.navy },
  headerSubtitle: { fontSize: 16, color: COLORS.textLight, marginTop: 4 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.navy, marginLeft: 10 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  summaryItem: { width: '48%', marginBottom: 10 },
  summaryLabel: { fontSize: 13, color: COLORS.textLight, marginBottom: 2 },
  summaryValue: { fontSize: 15, fontWeight: '500', color: COLORS.textDark },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8, color: COLORS.textDark },
  leaveTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  leaveTypeChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: COLORS.white },
  leaveTypeChipSelected: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  leaveTypeChipText: { color: COLORS.textDark, fontWeight: '500' },
  leaveTypeChipTextSelected: { color: COLORS.white, fontWeight: 'bold' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 12 },
  dateInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: COLORS.white },
  dateText: { color: COLORS.textDark, fontSize: 15 },
  suggestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f9f0', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.forest },
  suggestBtnText: { color: COLORS.forest, fontWeight: '500', marginLeft: 8 },
  inputContainer: { marginBottom: 16 },
  textFieldInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, fontSize: 15, color: COLORS.textDark, paddingHorizontal: 20, paddingVertical: 18, backgroundColor: COLORS.white },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brightBlue, padding: 14, borderRadius: 12 },
  uploadBtnText: { color: COLORS.white, fontWeight: 'bold', marginLeft: 8 },
  filePreview: { flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 12, backgroundColor: COLORS.background, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  fileName: { flex: 1, fontSize: 14, color: COLORS.textDark, marginHorizontal: 12 },
  submitBtn: { flexDirection: 'row', backgroundColor: COLORS.navy, paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  disabledBtn: { opacity: 0.7 },
  submitBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  errorBox: { backgroundColor: '#feebee', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: COLORS.danger },
  errorItem: { color: COLORS.danger, marginBottom: 4, fontSize: 14 },
  errorText: { color: COLORS.danger, marginBottom: 16, textAlign: 'center', fontWeight: '500' },
  warningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff8e1', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: COLORS.warning },
  warningText: { color: '#6f4f00', marginLeft: 10, fontWeight: '500', fontSize: 15 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 24, padding: 32, margin: 20, width: '90%', alignItems: 'center', elevation: 5 },
  successIcon: { marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 12 },
  modalText: { fontSize: 16, color: COLORS.textLight, textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  modalButton: { backgroundColor: COLORS.navy, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center' },
  modalButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
});
