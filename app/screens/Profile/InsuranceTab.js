// InsuranceTab.js
import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

/**
 * Renders a list of insurance policies assigned to the user.
 *
 * @param {Array} assignedPolicies - Array of policy objects
 * @param {number|string} assignedPolicies[].id - Unique ID
 * @param {Object} assignedPolicies[].insurance_policy - Policy information
 * @param {string} assignedPolicies[].insurance_policy.name - Insurance policy name
 * @param {string} assignedPolicies[].insurance_policy.type - Insurance policy type
 * @param {string} [assignedPolicies[].start_date] - Start date of the assignment
 * @param {string} [assignedPolicies[].end_date] - End date of the assignment
 */
export default function InsuranceTab({ assignedPolicies = [] }) {
  // If no assigned policies
  if (!assignedPolicies.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No insurance policies assigned</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const policy = item.insurance_policy || {};
    const endDate = new Date(item.end_date);
    const today = new Date();
    const isActive = endDate > today;

    return (
      <View style={styles.policyCard}>
        <Text style={styles.policyName}>{policy.name}</Text>
        <Text style={styles.policyType}>Type: {policy.type}</Text>

        <Text style={styles.policyDate}>
          Start Date: {item.start_date || '—'}
        </Text>
        <Text style={styles.policyDate}>
          End Date: {item.end_date || '—'}
        </Text>

        <Text style={[styles.status, isActive ? styles.active : styles.expired]}>
          {isActive ? 'Active' : 'Expired'}
        </Text>
      </View>
    );
  };

  return (
    <FlatList
      style={styles.container}
      data={assignedPolicies}
      keyExtractor={(item) => item.id?.toString()}
      renderItem={renderItem}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  policyCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,

    // Optional shadow for iOS
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },

    // For Android shadow
    elevation: 2,
  },
  policyName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  policyType: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
  policyDate: {
    fontSize: 14,
    color: '#444',
    marginBottom: 2,
  },
  status: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    borderRadius: 4,
    color: '#fff',
    overflow: 'hidden',
  },
  active: {
    backgroundColor: 'green',
  },
  expired: {
    backgroundColor: 'red',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
  },
});
