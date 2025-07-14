// CertificatesTab.js
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // or any icon library you prefer

/**
 * Renders a list of certificates for the user.
 *
 * @param {Array} certificates - Array of certificate objects~
 * @param {number|string} certificates[].id - Unique ID
 * @param {string} certificates[].title - Certificate title
 * @param {string} [certificates[].issue_date] - Issue date
 * @param {string} [certificates[].file_path] - Download URL or file path
 */
export default function CertificatesTab({ certificates = [] }) {
  // Base URL for certificate storage
  const BASE_CERT_URL =
    'https://app.morgantigcc.com/hr_system/backend/storage/app/public/';

  // If no certificates
  if (!certificates.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No certificates available</Text>
      </View>
    );
  }

  /**
   * Attempt to open a URL (if file_path is a remote link).
   * If file_path is just a filename, we convert it to a full URL.
   */
  const openFile = async (rawPath) => {
    // If rawPath doesn't start with 'http', build the full link
    let url = rawPath;
    if (!url.startsWith('http')) {
      url = BASE_CERT_URL + url.replace(/^\/+/, ''); // remove leading slash if any
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.log("Don't know how to open this URL:", url);
      }
    } catch (error) {
      console.log('Error opening file:', error);
    }
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.certCard}>
        <Text style={styles.certTitle}>{item.title}</Text>
        {item.issue_date ? (
          <Text style={styles.certDate}>Issued: {item.issue_date}</Text>
        ) : null}

        {/* Download button if file_path exists */}
        {item.file_path ? (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => openFile(item.file_path)}
          >
            <Ionicons name="download-outline" size={16} color="#007BFF" />
            <Text style={styles.downloadText}> Download</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.noFileText}>No file available</Text>
        )}
      </View>
    );
  };

  return (
    <FlatList
      style={styles.container}
      data={certificates}
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
  certCard: {
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
  certTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  certDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F0F8FF',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  downloadText: {
    color: '#007BFF',
    fontSize: 14,
    marginLeft: 4,
  },
  noFileText: {
    color: '#999',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
  },
});
