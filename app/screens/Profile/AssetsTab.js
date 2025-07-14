// AssetsTab.js
import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

/**
 * Displays a list of assigned assets in a simple card format.
 *
 * @param {Object[]} assets - Array of asset objects
 * @param {number|string} assets[].id - Unique ID
 * @param {string} assets[].asset_tag - Tag or name of the asset
 * @param {string} assets[].asset_type - Type/category of the asset
 * @param {string} [assets[].serial_number] - Serial number (optional)
 * @param {string} [assets[].condition] - Condition (optional)
 * @param {string} [assets[].status] - Status (e.g., assigned, returned, etc.)
 */
export default function AssetsTab({ assets = [] }) {
  if (!assets.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No assets assigned</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    return (
      <View style={styles.assetCard}>
        {/* Asset Title (e.g., asset tag) */}
        <Text style={styles.assetTitle}>{item.asset_tag}</Text>

        {/* Optional Fields */}
        <Text style={styles.assetField}>Type: {item.asset_type}</Text>
        {item.serial_number ? (
          <Text style={styles.assetField}>Serial: {item.serial_number}</Text>
        ) : null}
        {item.condition ? (
          <Text style={styles.assetField}>Condition: {item.condition}</Text>
        ) : null}
        {item.status ? (
          <Text style={styles.assetField}>Status: {item.status}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <FlatList
      style={styles.container}
      data={assets}
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
  assetCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,

    // iOS shadow
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },

    // For Android shadow
    elevation: 2,
  },
  assetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  assetField: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
  },
});
