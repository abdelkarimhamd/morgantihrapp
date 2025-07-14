// VacationRequestItem.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function VacationRequestItem({ request, onViewDetails, onCancel }) {
  const isPending = request.status === 'Pending';

  return (
    <View style={styles.cardContainer}>
      {/* Top Row: Leave Type & Status */}
      <View style={styles.rowSpaceBetween}>
        <Text style={styles.leaveTypeText}>{request.leave_type} Leave</Text>
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, 
            request.status === 'Approved' && styles.approved,
            request.status === 'Rejected' && styles.rejected,
            isPending && styles.pending
          ]}>
            {request.status}
          </Text>
        </View>
      </View>

      {/* Middle Info: Dates & HR Status */}
      <View style={styles.infoRow}>
        <Text style={styles.label}>Start:</Text>
        <Text style={styles.value}>{request.start_date}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>End:</Text>
        <Text style={styles.value}>{request.end_date}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>HR Status:</Text>
        <Text style={styles.value}>{request.hr_status}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionButton, styles.viewButton]} onPress={onViewDetails}>
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>

        {isPending && (
          <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={onCancel}>
            <Text style={styles.actionText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    padding: 14,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    // Shadow for Android
    elevation: 2,
  },
  rowSpaceBetween: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  leaveTypeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f1f1f1',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  approved: {
    color: 'green',
  },
  rejected: {
    color: 'red',
  },
  pending: {
    color: 'orange',
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  label: {
    fontWeight: '600',
    width: 100,
    color: '#666',
  },
  value: {
    flex: 1,
    fontWeight: '400',
    color: '#333',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'flex-end',
  },
  actionButton: {
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 12,
  },
  viewButton: {
    backgroundColor: '#3498db',
  },
  cancelButton: {
    backgroundColor: '#e67e22',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
  },
});
