// app/components/HrRequestForm/sections/FinanceClaimSection.js
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import DateTimeField from '../DateTimeField';

/* ------------ UI constants ------------ */
const COLORS = {
  green: '#2E7D32',
  dark: '#1B5E20',
  grey: '#607D8B',
};

/* ------------ File rules ------------ */
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/* ------------ Helpers ------------ */
const toFile = (asset) => ({
  uri: asset.uri,
  name: asset.name ?? `file-${Date.now()}`,
  type: asset.mimeType ?? asset.type ?? 'application/octet-stream',
  size: asset.size ?? 0,
});
const fmtMoney = (val = 0) =>
  `$${parseFloat(val).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

/* ------------ Main component ------------ */
export default function FinanceClaimSection({ formValues, setFormValues }) {
  /* ----- expense types ----- */
  const expenseTypes = [
    { id: 'travel', name: 'Travel', icon: 'car' },
    { id: 'meals', name: 'Meals', icon: 'food' },
    { id: 'accommodation', name: 'Accommodation', icon: 'home' },
    { id: 'supplies', name: 'Office Supplies', icon: 'file-document' },
    { id: 'training', name: 'Training', icon: 'school' },
    { id: 'other', name: 'Other', icon: 'dots-horizontal' },
  ];

  /* ----- row CRUD ----- */
  const addRow = () =>
    setFormValues((p) => ({
      ...p,
      financeClaims: [
        ...p.financeClaims,
        {
          transaction_date: null,
          transaction_time: null,
          expense_type: '',
          amount: '',
          notes: '',
          attachment: null,
        },
      ],
    }));

  const removeRow = (idx) => {
    if (formValues.financeClaims.length <= 1) return;
    const clone = [...formValues.financeClaims];
    clone.splice(idx, 1);
    setFormValues((p) => ({ ...p, financeClaims: clone }));
  };

  /* ----- field change ----- */
  const updateItem = (idx, field, value) => {
    const clone = [...formValues.financeClaims];
    clone[idx] = { ...clone[idx], [field]: value };
    setFormValues((p) => ({ ...p, financeClaims: clone }));
  };

  /* ----- attachment picker ----- */
  const pickFile = async (idx) => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const file = toFile('assets' in res ? res.assets[0] : res);

      const badSize = file.size > MAX_SIZE;
      const badMime = !ALLOWED_MIME.some((m) =>
        m.endsWith('/*') ? file.type.startsWith(m.split('/')[0]) : file.type === m
      );
      if (badSize || badMime) {
        Alert.alert(
          'Invalid file',
          badSize
            ? 'File exceeds 8 MB.'
            : 'File type not allowed (image / PDF / Word / Excel only).'
        );
        return;
      }
      updateItem(idx, 'attachment', file);
    } catch (e) {
      if (e?.code !== 'DOCUMENT_PICKER_CANCELED') {
        console.warn('[FinanceClaim/pickFile]', e);
        Alert.alert('Error', 'Could not pick the file.');
      }
    }
  };

  const clearFile = (idx) => updateItem(idx, 'attachment', null);

  /* ----- total ----- */
  const total = formValues.financeClaims
    .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    .toFixed(2);

  /* ----- render ----- */
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="receipt-text" size={36} color={COLORS.green} />
        <Text style={styles.headerTitle}>Finance Claim</Text>
        <Text style={styles.headerSubtitle}>
          Submit your expense claims for reimbursement
        </Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        {/* Submission date */}
        <Text style={styles.sectionTitle}>Claim Submission Date</Text>
        <DateTimeField
          icon="calendar-star"
          mode="date"
          value={formValues.claimSubmissionDate || undefined}
          onChangeValue={(d) => setFormValues((p) => ({ ...p, claimSubmissionDate: d }))}
          placeholderText="Select claim date"
        />

        {/* Items */}
        <Text style={styles.sectionTitle}>
          Expense Items{' '}
          <Text style={styles.itemCount}>({formValues.financeClaims.length})</Text>
        </Text>

        {formValues.financeClaims.map((item, idx) => (
          <View key={idx} style={styles.expCard}>
            {/* row header */}
            <View style={styles.expHeader}>
              <Text style={styles.expTitle}>Expense #{idx + 1}</Text>
              {formValues.financeClaims.length > 1 && (
                <TouchableOpacity onPress={() => removeRow(idx)}>
                  <MaterialCommunityIcons name="close" size={20} color="#E53935" />
                </TouchableOpacity>
              )}
            </View>

            {/* expense type */}
            <Text style={styles.label}>Expense Type</Text>
            <View style={styles.typeWrap}>
              {expenseTypes.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.typeChip,
                    item.expense_type === t.id && styles.typeChipSelected,
                  ]}
                  onPress={() => updateItem(idx, 'expense_type', t.id)}
                >
                  <MaterialCommunityIcons
                    name={t.icon}
                    size={18}
                    color={item.expense_type === t.id ? '#fff' : COLORS.green}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      item.expense_type === t.id && { color: '#fff' },
                    ]}
                  >
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* date / time */}
            <Text style={styles.label}>Transaction Date</Text>
            <DateTimeField
              icon="calendar-range"
              mode="date"
              value={item.transaction_date || undefined}
              onChangeValue={(d) => updateItem(idx, 'transaction_date', d)}
              placeholderText="Select date"
            />

            <Text style={styles.label}>Transaction Time</Text>
            <DateTimeField
              icon="clock-outline"
              mode="time"
              value={item.transaction_time || undefined}
              onChangeValue={(d) => updateItem(idx, 'transaction_time', d)}
              placeholderText="Select time"
            />

            {/* amount */}
            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountRow}>
              <MaterialCommunityIcons name="currency-usd" size={22} color={COLORS.green} />
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={item.amount}
                onChangeText={(v) => updateItem(idx, 'amount', v)}
              />
              <Text style={styles.amountCur}>USD</Text>
            </View>

            {/* notes */}
            <Text style={styles.label}>Notes</Text>
            <View style={styles.notesRow}>
              <MaterialCommunityIcons name="note-text" size={22} color={COLORS.green} />
              <TextInput
                style={styles.notesInput}
                placeholder="Details about the expense"
                value={item.notes}
                onChangeText={(v) => updateItem(idx, 'notes', v)}
                multiline
              />
            </View>

            {/* attachment */}
            <Text style={styles.label}>Attachment</Text>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => (item.attachment ? clearFile(idx) : pickFile(idx))}
            >
              <MaterialCommunityIcons
                name={item.attachment ? 'check-circle' : 'paperclip'}
                size={20}
                color={COLORS.green}
              />
              <Text style={styles.uploadText}>
                {item.attachment ? item.attachment.name : 'Upload receipt'}
              </Text>
              {item.attachment && (
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color="#E53935"
                  style={{ marginLeft: 'auto' }}
                />
              )}
            </TouchableOpacity>
          </View>
        ))}

        {/* add row */}
        <TouchableOpacity style={styles.addBtn} onPress={addRow}>
          <MaterialCommunityIcons name="plus-circle" size={22} color={COLORS.green} />
          <Text style={styles.addTxt}>Add Another Expense Item</Text>
        </TouchableOpacity>

        {/* total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLbl}>Total Claim Amount</Text>
          <Text style={styles.totalVal}>{fmtMoney(total)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

/* ------------ styles ------------ */
const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, backgroundColor: '#F5F5F5' },
  header: { alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.green, marginTop: 8 },
  headerSubtitle: { fontSize: 14, color: COLORS.grey, textAlign: 'center', marginTop: 6 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.dark, marginBottom: 16 },
  itemCount: { color: COLORS.grey, fontWeight: '400', fontSize: 14 },
  expCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.green,
  },
  expHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  expTitle: { color: COLORS.dark, fontWeight: '600' },
  label: { color: COLORS.grey, fontSize: 14, fontWeight: '500', marginTop: 4, marginBottom: 8 },
  typeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    borderColor: '#CFD8DC',
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  typeChipSelected: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  typeText: { marginLeft: 6, fontSize: 13, color: '#263238' },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    backgroundColor: '#FFF',
  },
  amountInput: { flex: 1, fontSize: 15, color: '#263238' },
  amountCur: { fontSize: 13, color: COLORS.grey },
  notesRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#FFF',
  },
  notesInput: { flex: 1, fontSize: 15, color: '#263238', textAlignVertical: 'top' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#BDBDBD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FFF',
  },
  uploadText: { marginLeft: 8, fontSize: 14, color: COLORS.grey },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.green,
    backgroundColor: '#C8E6C9',
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
  },
  addTxt: { marginLeft: 8, fontSize: 15, fontWeight: '500', color: COLORS.dark },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  totalLbl: { fontWeight: '600', color: COLORS.dark },
  totalVal: { fontWeight: '700', color: COLORS.dark, fontSize: 17 },
});
