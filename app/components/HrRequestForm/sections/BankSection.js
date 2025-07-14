import React from 'react';
import { View, StyleSheet } from 'react-native';
import SectionHeader from '../SectionHeader';
import DateTimeField  from '../DateTimeField';
import FieldWithIcon  from '../FieldWithIcon';

/* ------------------------------------------------------------------
   PALETTE
------------------------------------------------------------------ */
const COLORS = {
  primary: '#00796B',
  background: '#ECEFF1',
  card: '#FFFFFF',
  border: '#CFD8DC',
};

/* ------------------------------------------------------------------
   COMPONENT
------------------------------------------------------------------ */
export default function BankSection({ formValues, setFormValues }) {
  const handleChange = (field, value) =>
    setFormValues((prev) => ({ ...prev, [field]: value }));

  return (
    <View style={styles.sectionCard}>
      <SectionHeader icon="bank-outline" title="Bank Information" />

      {/* ---- Transaction date (matches web) ------------------- */}
      <DateTimeField
        icon="calendar-edit"
        label="Transaction Date"               // ⬅︎ UPDATED (was “Effective Date”)
        mode="date"
        value={formValues.bankTransactionDate}
        onChangeValue={(v) => handleChange('bankTransactionDate', v)}
        placeholderText="Select date"
      />

      {/* ---- Bank name ---------------------------------------- */}
      <FieldWithIcon
        icon="domain"
        label="Bank Name"
        placeholder="e.g. Al‑Rajhi Bank"
        value={formValues.bankName}
        onChangeText={(v) => handleChange('bankName', v)}
      />

      {/* ---- Branch ------------------------------------------- */}
      <FieldWithIcon
        icon="map-marker-outline"
        label="Branch"
        placeholder="main"
        value={formValues.bankBranch}
        onChangeText={(v) => handleChange('bankBranch', v)}
      />

      {/* ---- Account number ----------------------------------- */}
      <FieldWithIcon
        icon="credit-card-outline"
        label="New Account Number"
        placeholder="Enter new account number"
        value={formValues.newAccountNumber}
        onChangeText={(v) => handleChange('newAccountNumber', v)}
        keyboardType="numeric"
      />

      {/* ---- IBAN --------------------------------------------- */}
      <FieldWithIcon
        icon="barcode"
        label="New IBAN Number"
        placeholder="Enter new IBAN"
        value={formValues.newIbanNumber}
        onChangeText={(v) => handleChange('newIbanNumber', v)}
      />

      {/* ---- SWIFT / BIC -------------------------------------- */}
      <FieldWithIcon
        icon="pound"
        label="SWIFT / BIC Code"
        placeholder="Enter SWIFT or BIC"
        value={formValues.swiftCode}
        onChangeText={(v) => handleChange('swiftCode', v)}
      />

      {/* ---- Notes -------------------------------------------- */}
      <FieldWithIcon
        icon="file-document-outline"
        label="Notes"
        placeholder="Reason for change…"
        value={formValues.bankNotes}
        onChangeText={(v) => handleChange('bankNotes', v)}
        multiline
        numberOfLines={2}
      />
    </View>
  );
}

/* ------------------------------------------------------------------
   STYLES
------------------------------------------------------------------ */
const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
