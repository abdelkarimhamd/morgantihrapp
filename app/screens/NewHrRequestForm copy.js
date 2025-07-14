import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { createHrRequest } from '../../services/allRequestsApi';

/* --------------------------------------------
   GOOGLE-INSPIRED COLOR PALETTE
-------------------------------------------- */
const COLORS = {
  primary: '#1f3d7c',   // Google-ish blue
  secondary: '#248bbc', // modern green accent
  accent: '#74933c',    // secondary accent (orange-ish)
  background: '#4c6c7c',
  white: '#ffffff',
  textDark: '#3c4043',
  textLight: '#777',
  error: '#d93025',
  // for an even lighter background
  card: '#ffffff',
};
// #74933c
// #248bbc
// #1f3d7c
// #4c6c7c
// #1c6c7c
/* Optional new type badge colors:
   (You can define more subtle or pastel shades
   for request type badges)
*/
const REQUEST_COLORS = {
  to_leave: '#4285f4',
  loans: '#9c27b0',
  finance_claim: '#00897b',
  misc: '#f9a825',
  business_trip: '#ab47bc',
  bank: '#afb42b',
  resignation: '#e65100',
  personal_data_change: '#546e7a',
};

const { width } = Dimensions.get('window');

const pdOptions = [
  { value: 'name', label: 'Full Name' },
  { value: 'email', label: 'Email Address' },
  { value: 'iqama_no', label: 'Iqama Number' },
  { value: 'position', label: 'Position / Title' },
  { value: 'department', label: 'Department' },
  { value: 'cost_center', label: 'Cost Center' },
  { value: 'site', label: 'Site / Location' },
  { value: 'nationality', label: 'Nationality' },
  { value: 'religion', label: 'Religion' },
  { value: 'gender', label: 'Gender' },
];

export default function NewHrRequestForm({ navigation, route }) {
  // e.g. route.params?.type || 'to_leave'
  const initialType = 'to_leave'; 
  const [formValues, setFormValues] = useState({
    request_type: initialType,

    // Common fields
    description: '',
    attachment: null,

    // to_leave
    leaveType: 'personal',
    fromDate: '',
    fromTime: '',
    toDate: '',
    toTime: '',
    reason: '',

    // loans
    loanDate: '',
    noOfPayments: '',
    loanAmount: '',
    loanReason: '',

    // finance_claim
    financeClaims: [
      {
        transaction_date: '',
        expense_type: '',
        amount: '',
        notes: '',
        attachment: null,
      },
    ],

    // resignation
    resignation_date: '',
    last_working_day: '',
    notice_period: '',
    resignation_reason: '',

    // misc
    requestedItem: '',
    isTemporary: false,
    miscFromDate: '',
    miscFromTime: '',
    miscToDate: '',
    miscToTime: '',
    miscReason: '',
    miscNotes: '',

    // bank
    bankTransactionDate: '',
    bankName: '',
    bankBranch: 'main',
    newAccountNumber: '',
    newIbanNumber: '',
    swiftCode: '',
    bankNotes: '',

    // business_trip
    busTripRegion: 'gcc',
    busTripReason: '',
    busTripNotes: '',
    businessTripFromDate: '',
    businessTripFromTime: '',
    businessTripToDate: '',
    businessTripToTime: '',
    businessTripAttachments: [],

    // personal_data_change
    personalDataField: '',
    personalDataValue: '',
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  /* --------------
     FORM HANDLERS
  -------------- */
  const handleChange = (field, value, index = null, subfield = null) => {
    if (index !== null && subfield) {
      // financeClaims row
      const updatedClaims = [...formValues.financeClaims];
      updatedClaims[index][subfield] = value;
      setFormValues((prev) => ({ ...prev, financeClaims: updatedClaims }));
      return;
    }
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSwitch = (field, val) => {
    setFormValues((prev) => ({ ...prev, [field]: val }));
  };

  const addFinanceClaimRow = () => {
    setFormValues((prev) => ({
      ...prev,
      financeClaims: [
        ...prev.financeClaims,
        { transaction_date: '', expense_type: '', amount: '', notes: '', attachment: null },
      ],
    }));
  };

  const removeFinanceClaimRow = (idx) => {
    const updated = [...formValues.financeClaims];
    updated.splice(idx, 1);
    setFormValues((prev) => ({ ...prev, financeClaims: updated }));
  };

  async function pickSingleFile(field) {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.type === 'cancel') return;
      handleChange(field, result);
    } catch (err) {
      console.warn('file pick error:', err);
    }
  }

  async function pickMultipleFiles(field) {
    try {
      const results = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (results.type === 'cancel') return;
      handleChange(field, results.output || []);
    } catch (err) {
      console.warn('file pick error:', err);
    }
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await createHrRequest(formValues);
      Alert.alert('Success', 'Request created successfully!');
      // e.g. navigation.goBack();
    } catch (err) {
      setError('Failed to create request. Please try again.');
      console.error('Error creating request:', err);
    } finally {
      setLoading(false);
    }
  }

  const { request_type } = formValues;

  /* --------------
     RENDER
  -------------- */
  // We can implement a "progress indicator" by calculating the "fields filled" out of "total fields," 
  // or keep it simpler. For brevity, let's place a placeholder progress bar:
  const progressVal = 25; // Example placeholder percentage

  const handleBackPress = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  // Provide a nice "request type" badge color
  const requestBadgeColor = REQUEST_COLORS[request_type] || COLORS.primary;

  return (
    <View style={styles.container}>
      {/* Header with a back button and a progress indicator */}
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable onPress={handleBackPress} style={styles.headerIcon}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
          </Pressable>
          <Text style={styles.headerTitle}>New HR Request</Text>
          {/* A placeholder request type badge */}
          <View style={[styles.typeBadge, { backgroundColor: requestBadgeColor }]}>
            <Text style={styles.typeBadgeText}>{request_type}</Text>
          </View>
        </View>
        {/* Progress bar below the header content */}
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progressVal}%` }]} />
        </View>
      </LinearGradient>

      {/* SCROLLABLE FORM */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* MAIN CARD */}
        <View style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="file-document-edit-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionHeaderText}>Create New Request</Text>
          </View>

          {/* Request Type (with icon + label) */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <MaterialCommunityIcons name="shape-square-plus" size={16} color={COLORS.primary} />
              <Text style={styles.label}>Request Type</Text>
            </View>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formValues.request_type}
                onValueChange={(val) => handleChange('request_type', val)}
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
          </View>

          {/* ---------- to_leave ---------- */}
          {request_type === 'to_leave' && (
            <LeaveSection
              formValues={formValues}
              handleChange={handleChange}
            />
          )}

          {/* ---------- loans ---------- */}
          {request_type === 'loans' && (
            <LoansSection
              formValues={formValues}
              handleChange={handleChange}
            />
          )}

          {/* ---------- finance_claim ---------- */}
          {request_type === 'finance_claim' && (
            <FinanceClaimSection
              formValues={formValues}
              handleChange={handleChange}
              addFinanceClaimRow={addFinanceClaimRow}
              removeFinanceClaimRow={removeFinanceClaimRow}
              pickSingleFile={pickSingleFile}
            />
          )}

          {/* ---------- resignation ---------- */}
          {request_type === 'resignation' && (
            <ResignationSection
              formValues={formValues}
              handleChange={handleChange}
            />
          )}

          {/* ---------- misc ---------- */}
          {request_type === 'misc' && (
            <MiscSection
              formValues={formValues}
              handleChange={handleChange}
              handleSwitch={handleSwitch}
            />
          )}

          {/* ---------- bank ---------- */}
          {request_type === 'bank' && (
            <BankSection
              formValues={formValues}
              handleChange={handleChange}
            />
          )}

          {/* ---------- personal_data_change ---------- */}
          {request_type === 'personal_data_change' && (
            <PersonalDataChangeSection
              formValues={formValues}
              handleChange={handleChange}
            />
          )}

          {/* ---------- business_trip ---------- */}
          {request_type === 'business_trip' && (
            <BusinessTripSection
              formValues={formValues}
              handleChange={handleChange}
              pickMultipleFiles={pickMultipleFiles}
            />
          )}

          {/* Single Attachment (common to all) */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <MaterialIcons name="attach-file" size={16} color={COLORS.primary} />
              <Text style={styles.label}>Upload Attachment (Optional)</Text>
            </View>
            <Pressable
              style={styles.attachBtn}
              onPress={() => pickSingleFile('attachment')}
              android_ripple={{ color: '#cccccc' }}
            >
              <MaterialIcons name="file-upload" size={18} color={COLORS.white} />
              <Text style={styles.attachBtnText}>Browse</Text>
            </Pressable>
            {formValues.attachment && (
              <View style={styles.fileRow}>
                <MaterialIcons name="insert-drive-file" size={16} color={COLORS.primary} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {formValues.attachment.name || formValues.attachment.uri}
                </Text>
                <Pressable onPress={() => handleChange('attachment', null)}>
                  <MaterialIcons name="close" size={16} color={COLORS.error} />
                </Pressable>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <Pressable
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            android_ripple={{ color: '#fff' }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color={COLORS.white} style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>Create Request</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/* 
 * For brevity, we can define smaller components 
 * to handle each request_type section 
 * (to_leave, loans, finance_claim, etc.) 
 * Instead of a massive single file.
 */
function LeaveSection({ formValues, handleChange }) {
  return (
    <View style={styles.sectionCard}>
      <SectionHeader icon="event" title="Leave Details" />
      {/* Leave Type */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Leave Type</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formValues.leaveType}
            onValueChange={(val) => handleChange('leaveType', val)}
          >
            <Picker.Item label="Personal" value="personal" />
            <Picker.Item label="Unpaid" value="unpaid" />
            <Picker.Item label="Work Leave" value="work_leave" />
          </Picker>
        </View>
      </View>
      <FieldWithIcon
        icon="date-range"
        label="From Date"
        placeholder="YYYY-MM-DD"
        value={formValues.fromDate}
        onChangeText={(val) => handleChange('fromDate', val)}
      />
      <FieldWithIcon
        icon="access-time"
        label="From Time"
        placeholder="HH:MM"
        value={formValues.fromTime}
        onChangeText={(val) => handleChange('fromTime', val)}
      />
      <FieldWithIcon
        icon="date-range"
        label="To Date"
        placeholder="YYYY-MM-DD"
        value={formValues.toDate}
        onChangeText={(val) => handleChange('toDate', val)}
      />
      <FieldWithIcon
        icon="access-time"
        label="To Time"
        placeholder="HH:MM"
        value={formValues.toTime}
        onChangeText={(val) => handleChange('toTime', val)}
      />
      <FieldWithIcon
        icon="help-outline"
        label="Reason"
        placeholder="Your reason"
        value={formValues.reason}
        onChangeText={(val) => handleChange('reason', val)}
        multiline
      />
    </View>
  );
}

function LoansSection({ formValues, handleChange }) {
  return (
    <View style={styles.sectionCard}>
      <SectionHeader icon="attach-money" title="Loans Details" />
      <FieldWithIcon
        icon="event"
        label="Loan Date"
        placeholder="YYYY-MM-DD"
        value={formValues.loanDate}
        onChangeText={(val) => handleChange('loanDate', val)}
      />
      <FieldWithIcon
        icon="calculate"
        label="Number of Payments"
        placeholder="e.g. 6"
        value={formValues.noOfPayments}
        onChangeText={(val) => handleChange('noOfPayments', val)}
        keyboardType="numeric"
      />
      <FieldWithIcon
        icon="payments"
        label="Loan Amount"
        placeholder="0"
        value={formValues.loanAmount}
        onChangeText={(val) => handleChange('loanAmount', val)}
        keyboardType="numeric"
      />
      <FieldWithIcon
        icon="help-outline"
        label="Loan Reason"
        value={formValues.loanReason}
        onChangeText={(val) => handleChange('loanReason', val)}
        multiline
      />
    </View>
  );
}

function FinanceClaimSection({ formValues, handleChange, addFinanceClaimRow, removeFinanceClaimRow, pickSingleFile }) {
  return (
    <View style={styles.sectionCard}>
      <SectionHeader icon="request-quote" title="Finance Claim" />
      <Text style={[styles.label, { marginBottom: 6 }]}>Expense Items</Text>
      <ScrollView
        horizontal
        style={styles.financeScroll}
        contentContainerStyle={{ paddingRight: 20 }}
        showsHorizontalScrollIndicator={false}
      >
        {formValues.financeClaims.map((item, idx) => (
          <View key={idx} style={styles.financeRow}>
            <FieldWithIcon
              icon="event"
              label="Transaction Date"
              placeholder="YYYY-MM-DD"
              value={item.transaction_date}
              onChangeText={(val) => handleChange('financeClaims', val, idx, 'transaction_date')}
              compact
            />
            <FieldWithIcon
              icon="receipt-long"
              label="Expense Type"
              placeholder="E.g. Travel"
              value={item.expense_type}
              onChangeText={(val) => handleChange('financeClaims', val, idx, 'expense_type')}
              compact
            />
            <FieldWithIcon
              icon="attach-money"
              label="Amount"
              placeholder="0"
              value={item.amount}
              onChangeText={(val) => handleChange('financeClaims', val, idx, 'amount')}
              keyboardType="numeric"
              compact
            />
            <FieldWithIcon
              icon="info-outline"
              label="Notes"
              placeholder="Any notes"
              value={item.notes}
              onChangeText={(val) => handleChange('financeClaims', val, idx, 'notes')}
              compact
            />

            {/* Attach for each row */}
            <Pressable
              style={[styles.attachBtn, { marginTop: 6 }]}
              onPress={() => pickSingleFile('attachment')}
              android_ripple={{ color: '#fff' }}
            >
              <MaterialIcons name="file-upload" size={16} color={COLORS.white} />
              <Text style={styles.attachBtnText}>Attach</Text>
            </Pressable>

            {formValues.financeClaims.length > 1 && (
              <Pressable
                style={styles.removeBtn}
                onPress={() => removeFinanceClaimRow(idx)}
              >
                <MaterialIcons name="close" size={16} color={COLORS.white} />
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>

      <Pressable
        style={[styles.addBtn, { marginTop: 6 }]}
        onPress={addFinanceClaimRow}
        android_ripple={{ color: '#fff' }}
      >
        <MaterialIcons name="add" size={16} color={COLORS.white} />
        <Text style={styles.addBtnText}>Add Expense Row</Text>
      </Pressable>
    </View>
  );
}

function ResignationSection({ formValues, handleChange }) {
  return (
    <View style={styles.sectionCard}>
      <SectionHeader icon="exit-to-app" title="Resignation Details" />
      <FieldWithIcon
        icon="event"
        label="Resignation Date"
        placeholder="YYYY-MM-DD"
        value={formValues.resignation_date}
        onChangeText={(val) => handleChange('resignation_date', val)}
      />
      <FieldWithIcon
        icon="event"
        label="Last Working Day"
        placeholder="YYYY-MM-DD"
        value={formValues.last_working_day}
        onChangeText={(val) => handleChange('last_working_day', val)}
      />
      <FieldWithIcon
        icon="timelapse"
        label="Notice Period (days)"
        placeholder="e.g. 30"
        value={formValues.notice_period}
        onChangeText={(val) => handleChange('notice_period', val)}
        keyboardType="numeric"
      />
      <FieldWithIcon
        icon="help-outline"
        label="Reason"
        placeholder="Why resignation?"
        value={formValues.resignation_reason}
        onChangeText={(val) => handleChange('resignation_reason', val)}
        multiline
      />
    </View>
  );
}

function MiscSection({ formValues, handleChange, handleSwitch }) {
  return (
    <View style={styles.sectionCard}>
      <SectionHeader icon="extension" title="Miscellaneous" />
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Requested Item</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formValues.requestedItem}
            onValueChange={(val) => handleChange('requestedItem', val)}
          >
            <Picker.Item label="Laptop (IT Request)" value="laptop_it" />
            <Picker.Item label="Mobile Phone" value="mobile_phone" />
            <Picker.Item label="Mobile SIM Card" value="mobile_sim" />
            <Picker.Item label="Profession Change" value="profession_change" />
            <Picker.Item label="Other" value="other" />
          </Picker>
        </View>
      </View>

      <View style={[styles.fieldGroup, styles.switchRow]}>
        <Text style={styles.label}>Temporary?</Text>
        <Switch
          value={formValues.isTemporary}
          onValueChange={(val) => handleSwitch('isTemporary', val)}
          trackColor={{ false: '#aaa', true: COLORS.secondary }}
          thumbColor={formValues.isTemporary ? COLORS.white : '#fff'}
        />
      </View>

      {formValues.isTemporary && (
        <View>
          <FieldWithIcon
            icon="event"
            label="From Date"
            placeholder="YYYY-MM-DD"
            value={formValues.miscFromDate}
            onChangeText={(val) => handleChange('miscFromDate', val)}
          />
          <FieldWithIcon
            icon="access-time"
            label="From Time"
            placeholder="HH:MM"
            value={formValues.miscFromTime}
            onChangeText={(val) => handleChange('miscFromTime', val)}
          />

          <FieldWithIcon
            icon="event"
            label="To Date"
            placeholder="YYYY-MM-DD"
            value={formValues.miscToDate}
            onChangeText={(val) => handleChange('miscToDate', val)}
          />
          <FieldWithIcon
            icon="access-time"
            label="To Time"
            placeholder="HH:MM"
            value={formValues.miscToTime}
            onChangeText={(val) => handleChange('miscToTime', val)}
          />
        </View>
      )}

      <FieldWithIcon
        icon="help-outline"
        label="Reason"
        placeholder="Reason for request"
        value={formValues.miscReason}
        onChangeText={(val) => handleChange('miscReason', val)}
        multiline
      />
      <FieldWithIcon
        icon="comment"
        label="Notes"
        placeholder="Additional notes"
        value={formValues.miscNotes}
        onChangeText={(val) => handleChange('miscNotes', val)}
        multiline
      />
    </View>
  );
}

function BankSection({ formValues, handleChange }) {
  return (
    <View style={styles.sectionCard}>
      <SectionHeader icon="account-balance" title="Bank Details" />
      <FieldWithIcon
        icon="event"
        label="Transaction Date"
        placeholder="YYYY-MM-DD"
        value={formValues.bankTransactionDate}
        onChangeText={(val) => handleChange('bankTransactionDate', val)}
      />
      <FieldWithIcon
        icon="account-balance"
        label="Bank Name"
        placeholder="e.g. Al-Rajhi Bank"
        value={formValues.bankName}
        onChangeText={(val) => handleChange('bankName', val)}
      />
      <FieldWithIcon
        icon="location-on"
        label="Branch"
        placeholder="e.g. Main branch"
        value={formValues.bankBranch}
        onChangeText={(val) => handleChange('bankBranch', val)}
      />
      <FieldWithIcon
        icon="credit-card"
        label="New Account Number"
        placeholder="e.g. 1234..."
        value={formValues.newAccountNumber}
        onChangeText={(val) => handleChange('newAccountNumber', val)}
      />
      <FieldWithIcon
        icon="confirmation-number"
        label="New IBAN Number"
        placeholder="e.g. SA03..."
        value={formValues.newIbanNumber}
        onChangeText={(val) => handleChange('newIbanNumber', val)}
      />
      <FieldWithIcon
        icon="vpn-lock"
        label="SWIFT Code"
        placeholder="e.g. RJHISARI..."
        value={formValues.swiftCode}
        onChangeText={(val) => handleChange('swiftCode', val)}
      />
      <FieldWithIcon
        icon="notes"
        label="Notes"
        placeholder="Any extra notes"
        value={formValues.bankNotes}
        onChangeText={(val) => handleChange('bankNotes', val)}
        multiline
      />
    </View>
  );
}

function PersonalDataChangeSection({ formValues, handleChange }) {
  return (
    <View style={styles.sectionCard}>
      <SectionHeader icon="person" title="Personal Data Change" />
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Field to Change</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formValues.personalDataField}
            onValueChange={(val) => handleChange('personalDataField', val)}
          >
            {pdOptions.map((opt) => (
              <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </Picker>
        </View>
      </View>

      <FieldWithIcon
        icon="edit"
        label="New Value"
        placeholder="Enter new value"
        value={formValues.personalDataValue}
        onChangeText={(val) => handleChange('personalDataValue', val)}
      />
      <FieldWithIcon
        icon="notes"
        label="Reason / Notes"
        placeholder="Optional"
        value={formValues.description}
        onChangeText={(val) => handleChange('description', val)}
        multiline
      />
    </View>
  );
}

function BusinessTripSection({ formValues, handleChange, pickMultipleFiles }) {
  return (
    <View style={styles.sectionCard}>
      <SectionHeader icon="flight" title="Business Trip" />
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Region</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formValues.busTripRegion}
            onValueChange={(val) => handleChange('busTripRegion', val)}
          >
            <Picker.Item label="GCC" value="gcc" />
            <Picker.Item label="Non-GCC" value="non_gcc" />
          </Picker>
        </View>
      </View>

      <FieldWithIcon
        icon="help-outline"
        label="Reason"
        placeholder="Why the trip?"
        value={formValues.busTripReason}
        onChangeText={(val) => handleChange('busTripReason', val)}
        multiline
      />
      <FieldWithIcon
        icon="notes"
        label="Notes"
        placeholder="Any extra notes"
        value={formValues.busTripNotes}
        onChangeText={(val) => handleChange('busTripNotes', val)}
        multiline
      />
      <FieldWithIcon
        icon="event"
        label="From Date"
        placeholder="YYYY-MM-DD"
        value={formValues.businessTripFromDate}
        onChangeText={(val) => handleChange('businessTripFromDate', val)}
      />
      <FieldWithIcon
        icon="access-time"
        label="From Time"
        placeholder="HH:MM"
        value={formValues.businessTripFromTime}
        onChangeText={(val) => handleChange('businessTripFromTime', val)}
      />
      <FieldWithIcon
        icon="event"
        label="To Date"
        placeholder="YYYY-MM-DD"
        value={formValues.businessTripToDate}
        onChangeText={(val) => handleChange('businessTripToDate', val)}
      />
      <FieldWithIcon
        icon="access-time"
        label="To Time"
        placeholder="HH:MM"
        value={formValues.businessTripToTime}
        onChangeText={(val) => handleChange('businessTripToTime', val)}
      />

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Attachments</Text>
        <Pressable
          style={styles.attachBtn}
          onPress={() => pickMultipleFiles('businessTripAttachments')}
          android_ripple={{ color: '#fff' }}
        >
          <MaterialIcons name="file-upload" size={16} color={COLORS.white} />
          <Text style={styles.attachBtnText}>Upload</Text>
        </Pressable>
        {formValues.businessTripAttachments.length > 0 && (
          <View style={{ marginVertical: 6 }}>
            {formValues.businessTripAttachments.map((file, idx) => (
              <View key={idx} style={styles.fileRow}>
                <MaterialIcons name="insert-drive-file" size={16} color={COLORS.primary} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name || file.uri}
                </Text>
                <Pressable onPress={() => {
                  const updated = [...formValues.businessTripAttachments];
                  updated.splice(idx, 1);
                  handleChange('businessTripAttachments', updated);
                }}>
                  <MaterialIcons name="close" size={16} color={COLORS.error} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

/* 
 * Shared sub-components for consistent styling
 */
function SectionHeader({ icon, title }) {
  return (
    <View style={styles.subHeaderRow}>
      <MaterialIcons name={icon} size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
      <Text style={styles.subHeaderText}>{title}</Text>
    </View>
  );
}

function FieldWithIcon({
  icon,
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  multiline = false,
  compact = false,
}) {
  return (
    <View style={[styles.fieldGroup, compact && { width: 180 }]}>
      <View style={styles.labelRow}>
        <MaterialIcons name={icon} size={16} color={COLORS.primary} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={[styles.inputRow, multiline && { height: 80 }]}>
        <TextInput
          style={[styles.input, multiline && { textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

/* ------------------
   STYLES
------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerIcon: {
    marginRight: 6,
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  typeBadge: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: COLORS.white,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: COLORS.accent,
  },

  scrollContainer: {
    paddingBottom: 60,
    paddingHorizontal: 16,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    marginVertical: 8,
  },
  errorText: {
    color: COLORS.error,
    marginLeft: 6,
    fontWeight: '600',
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
    color: COLORS.primary,
  },

  /* subheader row for inside sections */
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },

  fieldGroup: {
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  inputRow: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  input: {
    fontSize: 14,
    color: COLORS.textDark,
    padding: 4,
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
  },

  /* finance claim horizontal scroller */
  financeScroll: {
    maxHeight: 240,
    marginBottom: 6,
  },
  financeRow: {
    width: 220,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
    elevation: 2,
    position: 'relative',
  },

  /* file attachments */
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  attachBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    backgroundColor: '#fafafa',
    borderRadius: 6,
    padding: 4,
  },
  fileName: {
    flex: 1,
    marginHorizontal: 4,
    color: COLORS.textDark,
    fontSize: 13,
  },

  /* add row button */
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  addBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 14,
  },

  /* switch row styling */
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  /* final submit */
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 14,
    justifyContent: 'center',
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },

  /* smaller section card inside the main form card if needed */
  sectionCard: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    elevation: 1,
  },
});
