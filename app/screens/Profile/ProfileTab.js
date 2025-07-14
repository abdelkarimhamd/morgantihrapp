import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

/** 
 * This tab displays basic user info, replacing MUI components
 * with basic React Native elements.
 */
export default function ProfileTab({ user }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Employee Details</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Employee Code:</Text>
          <Text style={styles.value}>{user.employee_code || '—'}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Position:</Text>
          <Text style={styles.value}>{user.position || '—'}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Department:</Text>
          <Text style={styles.value}>{user.department || '—'}</Text>
        </View>
        {/* ... more fields as needed ... */}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bank Information</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Bank Name:</Text>
          <Text style={styles.value}>{user.bank_name || '—'}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Account Number:</Text>
          <Text style={styles.value}>{user.account_number || '—'}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>IBAN:</Text>
          <Text style={styles.value}>{user.iban || '—'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 12,
  },
  field: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontWeight: '600',
    marginRight: 8,
  },
  value: {
    color: '#333',
  },
});
