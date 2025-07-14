// FamilyTab.js
import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

/**
 * Renders a list of family members in a simple card-like layout.
 * 
 * @param {Object[]} familyMembers - Array of family members
 * @param {number|string} familyMembers[].id - Unique ID
 * @param {string} familyMembers[].name - Name of the family member
 * @param {string} familyMembers[].relationship - Relationship to the user
 * @param {string} [familyMembers[].birth_date] - (Optional) Date of birth
 */
export default function FamilyTab({ familyMembers = [] }) {
  // If the family list is empty
  console.log("Family members:", familyMembers);
  
  if (!familyMembers.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No family members registered</Text>
      </View>
    );
  }

  // Render each family member item
  const renderItem = ({ item }) => {
    return (
      <View style={styles.memberCard}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.subText}>Relationship: {item.relationship}</Text>
        {!!item.birth_date && (
          <Text style={styles.subText}>DOB: {item.birth_date}</Text>
        )}
      </View>
    );
  };

  return (
    <FlatList
      style={styles.container}
      data={familyMembers}
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
  memberCard: {
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
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
  },
});
