import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; // npm install @react-native-picker/picker
import * as DocumentPicker from 'expo-document-picker'; // expo install expo-document-picker
import { LinearGradient } from 'expo-linear-gradient';   // expo install expo-linear-gradient

import api from '../../../services/api';

// Example brand colors:
// #74933c (greenish)
// #248bbc (blue)
// #1f3d7c (dark blue)
// #4c6c7c (gray/blue)
// #1c6c7c (blueish)

export default function NewHrRequestScreen({ navigation }) {
  // Master state for form
  const [requestType, setRequestType] = useState('to_leave');
  
  // Example fields
  const [leaveType, setLeaveType] = useState('personal');
  const [fromDate, setFromDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toDate, setToDate] = useState('');
  const [toTime, setToTime] = useState('');
  const [reason, setReason] = useState('');

  // Loans
  const [loanDate, setLoanDate] = useState('');
  const [noOfPayments, setNoOfPayments] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanReason, setLoanReason] = useState('');

  // Finance Claim (multiple items)
  const [financeClaims, setFinanceClaims] = useState([
    { transaction_date: '', expense_type: '', amount: '', notes: '', attachment: null },
  ]);

  // Misc
  const [requestedItem, setRequestedItem] = useState('laptop_it');
  const [isTemporary, setIsTemporary] = useState(false);
  const [miscFromDate, setMiscFromDate] = useState('');
  const [miscToDate, setMiscToDate] = useState('');
  const [miscReason, setMiscReason] = useState('');
  const [miscNotes, setMiscNotes] = useState('');

  // Bank
  const [bankName, setBankName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newIbanNumber, setNewIbanNumber] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [bankNotes, setBankNotes] = useState('');

  // Resignation
  const [resignationDate, setResignationDate] = useState('');
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [resignationReason, setResignationReason] = useState('');

  // Personal Data
  const [personalDataField, setPersonalDataField] = useState('');
  const [personalDataValue, setPersonalDataValue] = useState('');
  const [personalDataDesc, setPersonalDataDesc] = useState(''); // Reason/notes

  // Business Trip
  const [busTripRegion, setBusTripRegion] = useState('gcc');
  const [busTripReason, setBusTripReason] = useState('');
  const [busTripNotes, setBusTripNotes] = useState('');
  const [busFromDate, setBusFromDate] = useState('');
  const [busToDate, setBusToDate] = useState('');
  const [businessTripAttachments, setBusinessTripAttachments] = useState([]);

  // Single common attachment
  const [attachment, setAttachment] = useState(null);

  const [loading, setLoading] = useState(false);

  // ---- FINANCE CLAIM: Add / Remove Rows ----
  const addFinanceClaimRow = () => {
    setFinanceClaims((prev) => [
      ...prev,
      { transaction_date: '', expense_type: '', amount: '', notes: '', attachment: null },
    ]);
  };
  const removeFinanceClaimRow = (index) => {
    if (financeClaims.length === 1) return;
    const updated = [...financeClaims];
    updated.splice(index, 1);
    setFinanceClaims(updated);
  };

  // pick doc for a specific row's attachment
  const pickFinanceClaimAttachment = async (index) => {
    let result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (result.type === 'cancel') return;
    const updated = [...financeClaims];
    updated[index].attachment = result;
    setFinanceClaims(updated);
  };

  // pick multiple docs for business trip
  const pickBusinessTripFiles = async () => {
    let result = await DocumentPicker.getDocumentAsync({ multiple: true });
    if (result.type === 'cancel') return;
    if (!result.output || result.output.length === 0) {
      setBusinessTripAttachments([...businessTripAttachments, result]);
    } else {
      setBusinessTripAttachments([...businessTripAttachments, ...result.output]);
    }
  };

  // Common Attachment
  const pickCommonAttachment = async () => {
    let result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (result.type === 'cancel') return;
    setAttachment(result);
  };

  // Submit
  const handleSubmit = async () => {
    const data = {
      request_type: requestType,
      // to_leave
      leaveType, fromDate, fromTime, toDate, toTime, reason,
      // loans
      loanDate, noOfPayments, loanAmount, loanReason,
      // finance_claim
      financeClaims,
      // misc
      requestedItem, isTemporary, miscFromDate, miscToDate, miscReason, miscNotes,
      // bank
      bankName, newAccountNumber, newIbanNumber, swiftCode, bankNotes,
      // resignation
      resignationDate, lastWorkingDay, noticePeriod, resignationReason,
      // personal data
      personalDataField, personalDataValue, personalDataDesc,
      // business trip
      busTripRegion, busTripReason, busTripNotes,
      busFromDate, busToDate, businessTripAttachments,
      // single common attachment
      attachment,
    };

    setLoading(true);
    try {
      const response = await api.post('/hr-requests', data);
      Alert.alert('Success', 'Request created successfully!');
      navigation.goBack();
    } catch (err) {
      console.error('Error creating request:', err);
      Alert.alert('Error', 'Failed to create request. Check your input or try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1f3d7c', '#248bbc']}
      style={styles.gradientBackground}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>Create New HR Request</Text>

        {/* Container for form content (white card) */}
        <View style={styles.formContainer}>
          {/* REQUEST TYPE */}
          <Text style={styles.label}>Request Type</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={requestType}
              onValueChange={(val) => setRequestType(val)}
            >
              <Picker.Item label="Request to Leave" value="to_leave" />
              <Picker.Item label="Loans" value="loans" />
              <Picker.Item label="Finance Claim" value="finance_claim" />
              <Picker.Item label="Miscellaneous" value="misc" />
              <Picker.Item label="Business Trip" value="business_trip" />
              <Picker.Item label="Bank" value="bank" />
              <Picker.Item label="Resignation" value="resignation" />
              <Picker.Item label="Personal Data Change" value="personal_data_change" />
            </Picker>
          </View>

          {/* ========== TO_LEAVE ========== */}
          {requestType === 'to_leave' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>To Leave</Text>
              <Text style={styles.label}>Leave Type</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={leaveType}
                  onValueChange={(val) => setLeaveType(val)}
                >
                  <Picker.Item label="Personal" value="personal" />
                  <Picker.Item label="Unpaid" value="unpaid" />
                  <Picker.Item label="Work Leave" value="work_leave" />
                </Picker>
              </View>

              <Text style={styles.label}>From Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={fromDate}
                onChangeText={setFromDate}
                placeholder="2025-07-01"
              />
              <Text style={styles.label}>From Time (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={fromTime}
                onChangeText={setFromTime}
                placeholder="08:00"
              />
              <Text style={styles.label}>To Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={toDate}
                onChangeText={setToDate}
                placeholder="2025-07-05"
              />
              <Text style={styles.label}>To Time (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={toTime}
                onChangeText={setToTime}
                placeholder="17:00"
              />
              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={reason}
                onChangeText={setReason}
                multiline
              />
            </View>
          )}

          {/* ========== LOANS ========== */}
          {requestType === 'loans' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Loans</Text>
              <Text style={styles.label}>Loan Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={loanDate}
                onChangeText={setLoanDate}
                placeholder="2025-07-10"
              />
              <Text style={styles.label}>Number of Payments</Text>
              <TextInput
                style={styles.input}
                value={noOfPayments}
                onChangeText={setNoOfPayments}
                placeholder="e.g. 6"
                keyboardType="numeric"
              />
              <Text style={styles.label}>Loan Amount</Text>
              <TextInput
                style={styles.input}
                value={loanAmount}
                onChangeText={setLoanAmount}
                placeholder="e.g. 1500"
                keyboardType="numeric"
              />
              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={loanReason}
                onChangeText={setLoanReason}
                multiline
              />
            </View>
          )}

          {/* ========== FINANCE CLAIM ========== */}
          {requestType === 'finance_claim' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Finance Claim</Text>
              {financeClaims.map((row, idx) => (
                <View key={idx} style={styles.claimRow}>
                  <TextInput
                    style={[styles.claimInput, { flex: 1 }]}
                    placeholder="Transaction Date"
                    value={row.transaction_date}
                    onChangeText={(val) => {
                      const updated = [...financeClaims];
                      updated[idx].transaction_date = val;
                      setFinanceClaims(updated);
                    }}
                  />
                  <TextInput
                    style={[styles.claimInput, { flex: 1 }]}
                    placeholder="Expense Type"
                    value={row.expense_type}
                    onChangeText={(val) => {
                      const updated = [...financeClaims];
                      updated[idx].expense_type = val;
                      setFinanceClaims(updated);
                    }}
                  />
                  <TextInput
                    style={[styles.claimInput, { flex: 1 }]}
                    placeholder="Amount"
                    keyboardType="numeric"
                    value={row.amount}
                    onChangeText={(val) => {
                      const updated = [...financeClaims];
                      updated[idx].amount = val;
                      setFinanceClaims(updated);
                    }}
                  />
                  <TextInput
                    style={[styles.claimInput, { flex: 1 }]}
                    placeholder="Notes"
                    value={row.notes}
                    onChangeText={(val) => {
                      const updated = [...financeClaims];
                      updated[idx].notes = val;
                      setFinanceClaims(updated);
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.attachButton]}
                    onPress={() => pickFinanceClaimAttachment(idx)}
                  >
                    <Text style={{ color: '#fff' }}>Attach</Text>
                  </TouchableOpacity>
                  {financeClaims.length > 1 && (
                    <TouchableOpacity
                      style={[styles.removeBtn]}
                      onPress={() => removeFinanceClaimRow(idx)}
                    >
                      <Text style={{ color: '#fff' }}>X</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity style={styles.addRowBtn} onPress={addFinanceClaimRow}>
                <Text style={{ color: '#fff' }}>+ Add Expense Row</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ========== RESIGNATION ========== */}
          {requestType === 'resignation' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Resignation</Text>
              <Text style={styles.label}>Resignation Date</Text>
              <TextInput
                style={styles.input}
                value={resignationDate}
                onChangeText={setResignationDate}
                placeholder="YYYY-MM-DD"
              />
              <Text style={styles.label}>Last Working Day</Text>
              <TextInput
                style={styles.input}
                value={lastWorkingDay}
                onChangeText={setLastWorkingDay}
                placeholder="YYYY-MM-DD"
              />
              <Text style={styles.label}>Notice Period (days)</Text>
              <TextInput
                style={styles.input}
                value={noticePeriod}
                onChangeText={setNoticePeriod}
                keyboardType="numeric"
              />
              <Text style={styles.label}>Resignation Reason</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={resignationReason}
                onChangeText={setResignationReason}
                multiline
              />
            </View>
          )}

          {/* ========== MISC ========== */}
          {requestType === 'misc' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Miscellaneous</Text>
              <Text style={styles.label}>Requested Item</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={requestedItem}
                  onValueChange={(val) => setRequestedItem(val)}
                >
                  <Picker.Item label="Laptop (IT)" value="laptop_it" />
                  <Picker.Item label="Mobile Phone" value="mobile_phone" />
                  <Picker.Item label="Mobile SIM Card" value="mobile_sim" />
                  <Picker.Item label="Profession Change" value="profession_change" />
                  <Picker.Item label="Other" value="other" />
                </Picker>
              </View>

              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  style={[styles.checkboxOuter, isTemporary && styles.checkboxOuterChecked]}
                  onPress={() => setIsTemporary(!isTemporary)}
                >
                  {isTemporary && <View style={styles.checkboxInner} />}
                </TouchableOpacity>
                <Text style={{ marginLeft: 8 }}>Temporary?</Text>
              </View>

              {isTemporary && (
                <>
                  <Text style={styles.label}>From Date</Text>
                  <TextInput
                    style={styles.input}
                    value={miscFromDate}
                    onChangeText={setMiscFromDate}
                    placeholder="YYYY-MM-DD"
                  />
                  <Text style={styles.label}>To Date</Text>
                  <TextInput
                    style={styles.input}
                    value={miscToDate}
                    onChangeText={setMiscToDate}
                    placeholder="YYYY-MM-DD"
                  />
                </>
              )}

              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={miscReason}
                onChangeText={setMiscReason}
                multiline
              />

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={miscNotes}
                onChangeText={setMiscNotes}
                multiline
              />
            </View>
          )}

          {/* ========== BANK ========== */}
          {requestType === 'bank' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Bank Request</Text>
              <Text style={styles.label}>Bank Name</Text>
              <TextInput
                style={styles.input}
                value={bankName}
                onChangeText={setBankName}
                placeholder="Bank Name"
              />
              <Text style={styles.label}>Account Number</Text>
              <TextInput
                style={styles.input}
                value={newAccountNumber}
                onChangeText={setNewAccountNumber}
              />
              <Text style={styles.label}>IBAN</Text>
              <TextInput
                style={styles.input}
                value={newIbanNumber}
                onChangeText={setNewIbanNumber}
              />
              <Text style={styles.label}>SWIFT Code</Text>
              <TextInput
                style={styles.input}
                value={swiftCode}
                onChangeText={setSwiftCode}
              />
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={bankNotes}
                onChangeText={setBankNotes}
                multiline
              />
            </View>
          )}

          {/* ========== PERSONAL DATA CHANGE ========== */}
          {requestType === 'personal_data_change' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Personal Data Change</Text>
              <Text style={styles.label}>Field to Change</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={personalDataField}
                  onValueChange={(val) => setPersonalDataField(val)}
                >
                  <Picker.Item label="Full Name" value="name" />
                  <Picker.Item label="Email Address" value="email" />
                  <Picker.Item label="Iqama Number" value="iqama_no" />
                  <Picker.Item label="Position" value="position" />
                  <Picker.Item label="Department" value="department" />
                  <Picker.Item label="Cost Center" value="cost_center" />
                  <Picker.Item label="Site / Location" value="site" />
                  <Picker.Item label="Nationality" value="nationality" />
                  <Picker.Item label="Religion" value="religion" />
                  <Picker.Item label="Gender" value="gender" />
                </Picker>
              </View>

              <Text style={styles.label}>New Value</Text>
              <TextInput
                style={styles.input}
                value={personalDataValue}
                onChangeText={setPersonalDataValue}
              />

              <Text style={styles.label}>Reason / Notes</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={personalDataDesc}
                onChangeText={setPersonalDataDesc}
                multiline
              />
            </View>
          )}

          {/* ========== BUSINESS TRIP ========== */}
          {requestType === 'business_trip' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Business Trip</Text>
              <Text style={styles.label}>Region</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={busTripRegion}
                  onValueChange={(val) => setBusTripRegion(val)}
                >
                  <Picker.Item label="GCC" value="gcc" />
                  <Picker.Item label="Non-GCC" value="non_gcc" />
                </Picker>
              </View>

              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={busTripReason}
                onChangeText={setBusTripReason}
                multiline
              />
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={busTripNotes}
                onChangeText={setBusTripNotes}
                multiline
              />

              <Text style={styles.label}>From Date</Text>
              <TextInput
                style={styles.input}
                value={busFromDate}
                onChangeText={setBusFromDate}
                placeholder="YYYY-MM-DD"
              />
              <Text style={styles.label}>To Date</Text>
              <TextInput
                style={styles.input}
                value={busToDate}
                onChangeText={setBusToDate}
                placeholder="YYYY-MM-DD"
              />

              <TouchableOpacity style={styles.pickFileBtn} onPress={pickBusinessTripFiles}>
                <Text style={styles.pickFileText}>Upload Attachments</Text>
              </TouchableOpacity>
              {businessTripAttachments.length > 0 && (
                <View style={{ marginTop: 6 }}>
                  {businessTripAttachments.map((f, i) => (
                    <Text key={i} style={{ fontSize: 12 }}>
                      {f.name}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* COMMON ATTACHMENT */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Optional Attachment</Text>
            <TouchableOpacity style={styles.pickFileBtn} onPress={pickCommonAttachment}>
              <Text style={styles.pickFileText}>Upload File</Text>
            </TouchableOpacity>
            {attachment && (
              <Text style={{ fontSize: 12, marginTop: 4 }}>{attachment.name}</Text>
            )}
          </View>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.submitBtnText}>{loading ? 'Saving...' : 'Create Request'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Full-screen gradient background
  gradientBackground: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  // White card for form
  formContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 16,
    // shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    // shadow for Android
    elevation: 4,
  },
  label: {
    fontWeight: '600',
    marginVertical: 6,
    color: '#4c6c7c',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  // Card inside the form
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1c6c7c',
    marginBottom: 8,
  },
  // Finance claim row
  claimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  claimInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 5,
    marginBottom: 5,
    backgroundColor: '#fff',
  },
  attachButton: {
    backgroundColor: '#248bbc',
    padding: 8,
    borderRadius: 6,
    marginRight: 5,
  },
  removeBtn: {
    backgroundColor: '#e74c3c',
    padding: 8,
    borderRadius: 6,
  },
  addRowBtn: {
    backgroundColor: '#4c6c7c',
    paddingVertical: 10,
    marginTop: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  // Checkbox row
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  checkboxOuter: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxOuterChecked: {
    backgroundColor: '#4c6c7c',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: '#fff',
  },
  // BizTrip
  pickFileBtn: {
    backgroundColor: '#74933c',
    padding: 10,
    borderRadius: 6,
    marginTop: 6,
    alignItems: 'center',
  },
  pickFileText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Submit
  submitBtn: {
    backgroundColor: '#1c6c7c',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
