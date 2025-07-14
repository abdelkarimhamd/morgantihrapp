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

/* ——— theme ——— */
const COLORS = {
  primary: '#00796B',
  background: '#F4F6F8',
  card: '#FFFFFF',
  textDark: '#263238',
  error: '#E53935',
  border: '#CFD8DC',
  disabled: '#B0BEC5',
  progressBarFill: '#004D40',
};

/* ——— request meta ——— */
export const REQUEST_TYPE_DETAILS = {
  to_leave:             { label: 'Leave Request',         color: '#42A5F5' },
  loans:                { label: 'Loan Application',      color: '#AB47BC' },
  finance_claim:        { label: 'Finance Claim',         color: '#26A69A' },
  misc:                 { label: 'Miscellaneous',         color: '#FFA726' },
  business_trip:        { label: 'Business Trip',         color: '#7E57C2' },
  bank:                 { label: 'Bank Information',      color: '#66BB6A' },
  resignation:          { label: 'Resignation',           color: '#EF5350' },
  personal_data_change: { label: 'Data Change',           color: '#5D4037' },
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
  const handleSubmit = async () => {
    try {
      setError(null);
      setLoading(true);

      /* tiny client validation (example) */
      if (formValues.request_type === 'to_leave' &&
          (!formValues.fromDate || !formValues.toDate || !formValues.reason)) {
        setError('Please fill From/To dates and Reason.');
        setLoading(false);
        return;
      }

      const fd = buildFormData(formValues);
      /* 👉  NO manual Content-Type header.
            Axios sets multipart/form-data & boundary automatically */
      await api.post('/hr-requests', fd);

      Alert.alert('Success', 'Request created!');
      navigation.goBack();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Could not create request.');
    } finally {
      setLoading(false);
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
    paddingTop: Platform.OS === 'android' ? 25 : 40,
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
