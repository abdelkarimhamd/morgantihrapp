import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function ProfileTab({ user }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Employee Details</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>EMPLOYEE CODE</Text>
          <Text style={styles.value}>{user.employee_code || '—'}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>POSITION</Text>
          <Text style={styles.value}>{user.position || '—'}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>DEPARTMENT</Text>
          <Text style={styles.value}>{user.department || '—'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bank Information</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>BANK NAME</Text>
          <Text style={styles.value}>{user.bank_name || '—'}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>ACCOUNT NUMBER</Text>
          <Text style={styles.value}>{user.account_number || '—'}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>IBAN</Text>
          <Text style={styles.value}>{user.iban || '—'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#1F2687',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 16,
  },
  fieldContainer: {
    marginVertical: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A202C',
  },
  divider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 4,
  },
});