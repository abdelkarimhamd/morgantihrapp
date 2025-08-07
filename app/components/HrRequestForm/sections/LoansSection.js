import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimeField from '../DateTimeField';

const LoansSection = ({ formValues, setFormValues }) => {
  const handleChange = (field, value) => {
    setFormValues(prev => {
      const updated = { ...prev, [field]: value };
      if ((field === 'loanAmount' || field === 'noOfPayments') &&
        updated.loanAmount && updated.noOfPayments) {
        const amount = parseFloat(updated.loanAmount) || 0;
        const payments = parseInt(updated.noOfPayments) || 1;
        const interestRate = parseFloat(updated.interestRate) || 0;
        const total = amount + (amount * (interestRate / 100));
        updated.monthlyPayment = (total / payments).toFixed(2);
      }
      return updated;
    });
  };

  const formatCurrency = (val) => `$${parseFloat(val || 0).toFixed(2)}`;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="cash-multiple" size={32} color="#2E7D32" />
          <Text style={styles.headerTitle}>Loan Request</Text>
          <Text style={styles.headerSubtitle}>Apply for a new loan below</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionHeader}>Loan Type</Text>
          <View style={styles.row}>
            {['personal', 'home', 'auto', 'education'].map((type, i) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, formValues.loanType === type && styles.selectedBtn]}
                onPress={() => handleChange('loanType', type)}
              >
                <MaterialCommunityIcons
                  name={['account', 'home', 'car', 'school'][i]}
                  size={20}
                  color={formValues.loanType === type ? '#fff' : '#00796B'}
                />
                <Text style={[styles.typeText, formValues.loanType === type && styles.selectedText]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionHeader}>Loan Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Amount (USD)"
            keyboardType="numeric"
            value={formValues.loanAmount}
            onChangeText={val => handleChange('loanAmount', val)}
          />
          <TextInput
            style={styles.input}
            placeholder="Number of Payments"
            keyboardType="numeric"
            value={formValues.noOfPayments}
            onChangeText={val => handleChange('noOfPayments', val)}
          />
          <TextInput
            style={styles.input}
            placeholder="Interest Rate (%)"
            keyboardType="numeric"
            value={formValues.interestRate}
            onChangeText={val => handleChange('interestRate', val)}
          />
          <DateTimeField
            icon="calendar"
            mode="date"
            label="Loan Date"
            value={formValues.loanDate || undefined}
            onChangeValue={(d) => d && handleChange('loanDate', d)}
            placeholderText="Select date"
          />

          {formValues.monthlyPayment && (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Estimated Monthly</Text>
              <Text style={styles.previewValue}>{formatCurrency(formValues.monthlyPayment)}</Text>
            </View>
          )}

          <Text style={styles.sectionHeader}>Repayment Method</Text>
          <View style={styles.row}>
            {['direct-debit', 'payroll', 'manual'].map((method, i) => (
              <TouchableOpacity
                key={method}
                style={[styles.typeBtn, formValues.repaymentMethod === method && styles.selectedBtn]}
                onPress={() => handleChange('repaymentMethod', method)}
              >
                <MaterialCommunityIcons
                  name={['bank-transfer', 'credit-card-settings', 'cash-multiple'][i]}
                  size={20}
                  color={formValues.repaymentMethod === method ? '#fff' : '#00796B'}
                />
                <Text style={[styles.typeText, formValues.repaymentMethod === method && styles.selectedText]}>
                  {method.replace('-', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionHeader}>Reason</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Briefly explain..."
            value={formValues.loanReason}
            onChangeText={val => handleChange('loanReason', val)}
            multiline
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContainer: { padding: 5 },
  header: { alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: '700', marginTop: 10, color: '#00796B' },
  headerSubtitle: { fontSize: 14, color: '#607D8B', textAlign: 'center' },
  sectionHeader: { fontSize: 16, fontWeight: '600', marginVertical: 12, color: '#004D40' },
  row: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  typeBtn: {
    width: '48%', padding: 12, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: '#B2DFDB', borderRadius: 10, backgroundColor: '#FAFAFA',
  },
  selectedBtn: { backgroundColor: '#00796B', borderColor: '#00796B' },
  typeText: { marginLeft: 10, color: '#004D40', fontWeight: '500' },
  selectedText: { color: '#fff' },
  input: {
    borderWidth: 1, borderColor: '#CFD8DC', backgroundColor: '#FFFFFF',
    borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 16
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  preview: {
    backgroundColor: '#E8F5E9', padding: 14, borderRadius: 10,
    alignItems: 'center', marginBottom: 20,
  },
  previewLabel: { color: '#388E3C', fontWeight: '500' },
  previewValue: { fontSize: 20, fontWeight: '700', color: '#2E7D32' },
  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 3,
  },
});

export default LoansSection;
