import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';

/* ——— dynamic sections ——— */
import LeaveSection from './sections/LeaveSection';
import LoansSection from './sections/LoansSection';
import FinanceClaimSection from './sections/FinanceClaimSection';
import ResignationSection from './sections/ResignationSection';
import MiscSection from './sections/MiscSection';
import BankSection from './sections/BankSection';
import PersonalDataChangeSection from './sections/PersonalDataChangeSection';
import BusinessTripSection from './sections/BusinessTripSection';

import FileUploadField from './FileUploadField';
import SectionHeader from './SectionHeader';
import api from '../../../services/api';
// "#74933c", "#248bbc", "#1f3d7c", "#4c6c7c", "#1c6c7c"
/* ——— theme ——— */
const COLORS = {
  primary: '#74933c',
  background: '#F4F6F8',
  card: '#FFFFFF',
  textDark: '#263238',
  error: '#E53935',
  border: '#CFD8DC',
  disabled: '#B0BEC5',
  progressBarFill: '#248bbc',
};

/* ——— request meta ——— */
export const REQUEST_TYPE_DETAILS = {
  to_leave:             { label: 'Leave Request',         color: '#42A5F5' },
  loans:                { label: 'Loan Application',      color: '#1f3d7c' },
  finance_claim:        { label: 'Finance Claim',         color: '#26A69A' },
  misc:                 { label: 'Miscellaneous',         color: '#1f3d7c' },
  business_trip:        { label: 'Business Trip',         color: '#74933c' },
  bank:                 { label: 'Bank Information',      color: '#66BB6A' },
  resignation:          { label: 'Resignation',           color: '#1f3d7c' },
  personal_data_change: { label: 'Data Change',           color: '#74933c' },
};

/* ——— date helpers ——— */
const isoDate = (v) =>
  !v ? null : v instanceof Date ? v.toISOString().slice(0, 10) : v.slice(0, 10);
const isoTime = (v) =>
  !v ? null : v instanceof Date ? v.toTimeString().slice(0, 5) : v.slice(0, 5);

/* =======================================================================
   BUILD FORMDATA (ALL files + plain fields in ONE object)
   ======================================================================= */
const buildFormData = (v) => {
  const fd = new FormData();

  const add = (k, val) => {
    if (val === null || val === '' || val === undefined) return;

    // If it looks like a file object -> keep binary
    if (typeof val === 'object' && val.uri) {
      fd.append(k, {
        uri: Platform.OS === 'ios' ? val.uri.replace('file://', '') : val.uri,
        name: val.name || `file-${Date.now()}`,
        type: val.type || 'application/octet-stream',
      });
    } else {
      fd.append(k, String(val));
    }
  };

  /* ------- common ------- */
  add('request_type', v.request_type);
  add('description',  v.description);
  add('attachment',   v.attachment);          // optional single file

  /* ------- per-type specifics ------- */
  switch (v.request_type) {
    case 'to_leave':
      add('leave_type', v.leaveType);
      add('from_date',  isoDate(v.fromDate));
      add('from_time',  isoTime(v.fromTime));
      add('to_date',    isoDate(v.toDate));
      add('to_time',    isoTime(v.toTime));
      add('reason',     v.reason);
      break;

    case 'loans':
      add('loan_date',      isoDate(v.loanDate));
      add('no_of_payments', v.noOfPayments);
      add('amount',         v.loanAmount);
      add('description',    v.loanReason);
      break;

    case 'finance_claim':
      v.financeClaims.forEach((c, i) => {
        add(`financeClaims[${i}][transaction_date]`, isoDate(c.transaction_date));
        add(`financeClaims[${i}][expense_type]`,     c.expense_type);
        add(`financeClaims[${i}][amount]`,           c.amount);
        add(`financeClaims[${i}][notes]`,            c.notes);
        add(`financeClaims[${i}][attachment]`,       c.attachment);
      });
      break;

    case 'misc':
      add('requested_item', v.requestedItem);
      add('is_temporary',   v.isTemporary ? 1 : 0);
      add('miscReason',     v.miscReason);
      add('miscNotes',      v.miscNotes);
      add('from_date',      isoDate(v.miscFromDate));
      add('from_time',      isoTime(v.miscFromTime));
      add('to_date',        isoDate(v.miscToDate));
      add('to_time',        isoTime(v.miscToTime));
      break;

    case 'business_trip':
      add('business_trip_region', v.busTripRegion);
      add('description',          v.busTripReason);
      add('notes',                v.busTripNotes);
      add('from_date',            isoDate(v.fromDate));
      add('from_time',            isoTime(v.fromTime));
      add('to_date',              isoDate(v.toDate));
      add('to_time',              isoTime(v.toTime));
      v.businessTripAttachments.forEach((file, i) =>
        add(`attachments[${i}]`, file)
      );
      break;

    case 'bank':
      add('bank_transaction_date', isoDate(v.bankTransactionDate));
      add('bank_name',             v.bankName);
      add('bank_branch',           v.bankBranch);
      add('new_account_number',    v.newAccountNumber);
      add('new_iban_number',       v.newIbanNumber);
      add('swift_code',            v.swiftCode);
      add('bank_notes',            v.bankNotes);
      break;

    case 'resignation':
      add('resignation_date',   isoDate(v.resignation_date));
      add('last_working_day',   isoDate(v.last_working_day));
      add('notice_period',      v.notice_period);
      add('resignation_reason', v.resignation_reason);
      break;

    case 'personal_data_change':
      add('personal_data_field', v.personalDataField);
      add('personal_data_value', v.personalDataValue);
      break;
  }
  return fd;
};

/* =======================================================================
   COMPONENT
   ======================================================================= */
export default function NewHrRequestForm({ navigation, route }) {
  const initialType = route?.params?.requestType || 'to_leave';

  const [formValues, setFormValues] = useState({
    request_type: initialType,
    description : '',
    attachment  : null,

    /* leave */
    leaveType: 'personal',
    fromDate: '', fromTime: '', toDate: '', toTime: '', reason: '',

    /* loans */
    loanDate: '', noOfPayments: '', loanAmount: '', loanReason: '',

    /* finance claim */
    financeClaims: [
      { transaction_date: '', expense_type: '', amount: '', notes: '', attachment: null }
    ],

    /* resignation */
    resignation_date: '', last_working_day: '', notice_period: '', resignation_reason: '',

    /* misc */
    requestedItem: 'laptop_it', isTemporary: false,
    miscFromDate: '', miscFromTime: '', miscToDate: '', miscToTime: '', miscReason: '', miscNotes: '',

    /* bank */
    bankTransactionDate: '', bankName: '', bankBranch: 'main',
    newAccountNumber: '', newIbanNumber: '', swiftCode: '', bankNotes: '',

    /* business trip */
    busTripRegion: 'gcc', busTripReason: '', busTripNotes: '',
    businessTripAttachments: [],

    /* personal data */
    personalDataField: '', personalDataValue: '',
  });

  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  /* progress bar (unchanged) */
  const progressVal = useMemo(() => {
    const filled = (...f) => f.filter((key) => !!formValues[key]).length;
    switch (formValues.request_type) {
      case 'to_leave':   return (filled('leaveType','fromDate','toDate','reason') / 4) * 100;
      case 'loans':      return (filled('loanDate','loanAmount','noOfPayments') / 3) * 100;
      case 'resignation':return (filled('resignation_date','last_working_day','resignation_reason') / 3) * 100;
      case 'misc':       return (filled('requestedItem','miscReason') / 2) * 100;
      default:           return 30;
    }
  }, [formValues]);

  const current = REQUEST_TYPE_DETAILS[formValues.request_type];

  /* -------- submit -------- */
/* -------- submit -------- */
/* -------- submit -------- */
const handleSubmit = async () => {
  try {
    setError(null);
    setLoading(true);

    console.log("📝 Submitting form with values:", formValues);

    // Basic client-side validation for required fields
    if (formValues.request_type === 'to_leave') {
      if (!formValues.fromDate || !formValues.toDate || !formValues.reason) {
        console.warn("⚠️ Validation failed: Missing From/To dates or Reason.");
        setError('Please fill From/To dates and Reason.');
        setLoading(false);
        return;
      }
    }

    // ✅ Build FormData dynamically based on request type
    const fd = new FormData();

    const appendSafe = (key, value) => {
      if (value === null || value === undefined || value === '') return;
      if (typeof value === 'object' && value.uri) {
        // RN-safe file append
        const fileUri = value.uri;
        const fileName = value.name || fileUri.split('/').pop() || `upload-${Date.now()}.jpg`;
        const mimeType = value.mimeType || value.type || 'application/octet-stream';
        fd.append(key, {
          uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
          name: fileName,
          type: mimeType,
        });
      } else {
        fd.append(key, String(value));
      }
    };

    // Common field for all
    appendSafe('request_type', formValues.request_type);

    // ✅ Per-type mapping
    switch (formValues.request_type) {
      case 'to_leave':
        appendSafe('leave_type', formValues.leaveType);
        appendSafe('from_date', isoDate(formValues.fromDate));
        appendSafe('from_time', isoTime(formValues.fromTime));
        appendSafe('to_date', isoDate(formValues.toDate));
        appendSafe('to_time', isoTime(formValues.toTime));
        appendSafe('reason', formValues.reason);
        break;

      case 'loans':
        appendSafe('loan_date', isoDate(formValues.loanDate));
        appendSafe('no_of_payments', formValues.noOfPayments);
        appendSafe('amount', formValues.loanAmount);
        appendSafe('description', formValues.loanReason);
        break;

      case 'finance_claim':
        formValues.financeClaims?.forEach((c, i) => {
          appendSafe(`financeClaims[${i}][transaction_date]`, isoDate(c.transaction_date));
          appendSafe(`financeClaims[${i}][expense_type]`, c.expense_type);
          appendSafe(`financeClaims[${i}][amount]`, c.amount);
          appendSafe(`financeClaims[${i}][notes]`, c.notes);
          appendSafe(`financeClaims[${i}][attachment]`, c.attachment);
        });
        break;

      case 'misc':
        appendSafe('requested_item', formValues.requestedItem);
        appendSafe('is_temporary', formValues.isTemporary ? 1 : 0);
        appendSafe('miscReason', formValues.miscReason);
        appendSafe('miscNotes', formValues.miscNotes);
        appendSafe('from_date', isoDate(formValues.miscFromDate));
        appendSafe('from_time', isoTime(formValues.miscFromTime));
        appendSafe('to_date', isoDate(formValues.miscToDate));
        appendSafe('to_time', isoTime(formValues.miscToTime));
        break;

      case 'business_trip':
        appendSafe('business_trip_region', formValues.busTripRegion);
        appendSafe('description', formValues.busTripReason);
        appendSafe('notes', formValues.busTripNotes);
        appendSafe('from_date', isoDate(formValues.fromDate));
        appendSafe('from_time', isoTime(formValues.fromTime));
        appendSafe('to_date', isoDate(formValues.toDate));
        appendSafe('to_time', isoTime(formValues.toTime));

        // Multiple attachments for business trip
        formValues.businessTripAttachments?.forEach((file, idx) => {
          console.log(`📂 Adding Business Trip file #${idx}:`, file);
          appendSafe(`attachments[${idx}]`, file);
        });
        break;

      case 'bank':
        appendSafe('bank_transaction_date', isoDate(formValues.bankTransactionDate));
        appendSafe('bank_name', formValues.bankName);
        appendSafe('bank_branch', formValues.bankBranch);
        appendSafe('new_account_number', formValues.newAccountNumber);
        appendSafe('new_iban_number', formValues.newIbanNumber);
        appendSafe('swift_code', formValues.swiftCode);
        appendSafe('bank_notes', formValues.bankNotes);
        break;

      case 'resignation':
        appendSafe('resignation_date', isoDate(formValues.resignation_date));
        appendSafe('last_working_day', isoDate(formValues.last_working_day));
        appendSafe('notice_period', formValues.notice_period);
        appendSafe('resignation_reason', formValues.resignation_reason);
        break;

      case 'personal_data_change':
        appendSafe('personal_data_field', formValues.personalDataField);
        appendSafe('personal_data_value', formValues.personalDataValue);
        break;
    }

    // ✅ Single optional attachment (for most types)
    if (formValues.request_type !== 'finance_claim' && formValues.attachment?.uri) {
      appendSafe('attachment', formValues.attachment);
    }

    // ✅ Debug log FormData contents
    console.log("📦 Final FormData to send:");
    for (let pair of fd._parts || []) {
      console.log(`   ${pair[0]}:`, pair[1]);
    }

    // ✅ Send to backend
    console.log("🚀 Sending multipart request...");
    const response = await api.post('/hr-requests', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });

    console.log("✅ API Success Response:", response.data);
    Alert.alert('Success', 'Request created successfully!');
    navigation.goBack();

  } catch (e) {
    console.error("❌ API Error:", e?.message);

    if (e?.response) {
      console.error("Server Response:", e.response.data);
      console.error("Status Code:", e.response.status);
      setError(e.response?.data?.message || 'Server rejected the request.');
    } else if (e?.request) {
      console.error("🚨 No response received. Likely network or SSL issue.");
      setError('Network error: could not reach server.');
    } else {
      console.error("🚨 Unknown error:", e.message);
      setError(e.message || 'Unexpected error.');
    }
  } finally {
    setLoading(false);
    console.log("⏳ Request finished");
  }
};



  /* -------- UI -------- */
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* header */}
      <LinearGradient colors={[current.color, COLORS.primary]} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <MaterialIcons name="arrow-back-ios" size={22} color={COLORS.card} />
          </Pressable>
          <Text style={styles.headerTitle}>{current.label}</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressVal}%` }]} />
        </View>
      </LinearGradient>

      {/* body */}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {error && <View style={styles.errorBanner}><Text style={{ color: COLORS.card }}>{error}</Text></View>}

        <View style={styles.card}>
          {/* type picker */}
          <SectionHeader icon="format-list-bulleted-type" title="Request Type" />
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={formValues.request_type}
              onValueChange={(v) => setFormValues((p) => ({ ...p, request_type: v }))}
              style={{ height: Platform.OS === 'ios' ? undefined : 48, color: COLORS.textDark }}
            >
              {Object.entries(REQUEST_TYPE_DETAILS).map(([k, d]) => (
                <Picker.Item key={k} label={d.label} value={k} />
              ))}
            </Picker>
          </View>

          {/* dynamic section */}
          {formValues.request_type === 'to_leave'   && <LeaveSection             {...{ formValues, setFormValues }} />}
          {formValues.request_type === 'loans'      && <LoansSection             {...{ formValues, setFormValues }} />}
          {formValues.request_type === 'finance_claim' && <FinanceClaimSection   {...{ formValues, setFormValues }} />}
          {formValues.request_type === 'resignation'&& <ResignationSection       {...{ formValues, setFormValues }} />}
          {formValues.request_type === 'misc'       && <MiscSection             {...{ formValues, setFormValues }} />}
          {formValues.request_type === 'bank'       && <BankSection             {...{ formValues, setFormValues }} />}
          {formValues.request_type === 'personal_data_change' &&
            <PersonalDataChangeSection {...{ formValues, setFormValues }} />}
          {formValues.request_type === 'business_trip' &&
            <BusinessTripSection {...{ formValues, setFormValues }} />}

          {/* optional single attachment */}
          {formValues.request_type !== 'finance_claim' && (
            <View style={styles.attachCard}>
              <SectionHeader icon="paperclip" title="Attachment (Optional)" />
              <FileUploadField
                file={formValues.attachment}
                onPickFile={(f) => setFormValues((p) => ({ ...p, attachment: f }))}
                onRemoveFile={()   => setFormValues((p) => ({ ...p, attachment: null }))}
              />
            </View>
          )}

          {/* submit */}
          <Pressable
            style={[
              styles.submitBtn,
              loading && { backgroundColor: COLORS.disabled },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.card} size="small" />
            ) : (
              <>
                <MaterialIcons name="send" size={20} color={COLORS.card} style={{ marginRight: 6 }} />
                <Text style={{ color: COLORS.card, fontWeight: '700' }}>Submit Request</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/* -------- styles -------- */
const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 90,
    paddingBottom: 12,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.card },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,.3)', borderRadius: 3 },
  progressFill: { height: '100%', backgroundColor: COLORS.progressBarFill },

  errorBanner: { backgroundColor: COLORS.error, margin: 15, padding: 10, borderRadius: 8 },

  card: { backgroundColor: COLORS.card, margin: 15, borderRadius: 12, padding: 15 },

  pickerWrap: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    backgroundColor: COLORS.background, marginVertical: 12,
  },

  attachCard: {
    backgroundColor: COLORS.card, borderRadius: 10, padding: 12,
    marginTop: 12, borderWidth: 1, borderColor: COLORS.border,
  },

  submitBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.primary, paddingVertical: 14,
    borderRadius: 10, marginTop: 18,
  },
});
