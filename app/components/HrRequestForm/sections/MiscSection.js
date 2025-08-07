import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MiscSection = ({ formValues, setFormValues }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [pickerConfig, setPickerConfig] = useState({ field: null, mode: 'date' });

  const handleChange = (field, value) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSwitch = (field, val) => {
    setFormValues(prev => ({ ...prev, [field]: val }));
  };

  const handleOpenPicker = (field, mode) => {
    setPickerConfig({ field, mode });
  };

  const handlePickerChange = (event, selectedDate) => {
    if (event.type === 'set' && selectedDate) {
      handleChange(pickerConfig.field, selectedDate);
    }
    setPickerConfig({ field: null, mode: 'date' });
  };

  const resetForm = () => {
    setFormValues({
      requestedItem: 'laptop_it',
      isTemporary: false,
      miscFromDate: null,
      miscFromTime: null,
      miscToDate: null,
      miscToTime: null,
      miscReason: '',
      miscNotes: ''
    });
    setIsSubmitted(false);
    setError('');
  };

  const formatDate = (date) => {
    if (!date || !(date instanceof Date)) return 'Select date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (date) => {
    if (!date || !(date instanceof Date)) return 'Select time';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleSubmit = () => {
    if (!formValues.miscReason.trim()) {
      setError('Please provide a reason for your request');
      return;
    }
    setIsSubmitted(true);
    setError('');
  };

  const requestItems = [
    { id: 'laptop_it', name: 'Laptop', icon: 'laptop', category: 'IT Request' },
    { id: 'mobile_phone', name: 'Mobile Phone', icon: 'cellphone' },
    { id: 'mobile_sim', name: 'SIM Card', icon: 'sim' },
    { id: 'profession_change', name: 'Profession', icon: 'account-convert', category: 'Change' },
    { id: 'access_card', name: 'Access Card', icon: 'card-account-details' },
    { id: 'other', name: 'Other', icon: 'dots-horizontal' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons name="puzzle" size={28} color="#FFF" />
        </View>
        <Text style={styles.headerTitle}>Miscellaneous Request</Text>
        <Text style={styles.headerSubtitle}>
          Submit requests for equipment, access changes, and more
        </Text>
      </View>

      {/* Submitted Confirmation */}
      {isSubmitted ? (
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <MaterialCommunityIcons name="check-circle" size={48} color="#4CAF50" />
          </View>
          <Text style={styles.successTitle}>Request Submitted!</Text>
          <Text style={styles.successText}>
            Your {requestItems.find(i => i.id === formValues.requestedItem)?.name} request has been received.
          </Text>
          <Text style={styles.referenceText}>Reference ID: #MSC-{Math.floor(1000 + Math.random() * 9000)}</Text>
          <TouchableOpacity style={styles.newRequestButton} onPress={resetForm}>
            <Text style={styles.newRequestButtonText}>Submit Another Request</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.formCard}>
          {/* Request Item Selection */}
          <Text style={styles.sectionHeader}>Requested Item</Text>
          <View style={styles.requestItemsContainer}>
            {requestItems.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.requestItem,
                  formValues.requestedItem === item.id && styles.selectedRequestItem
                ]}
                onPress={() => handleChange('requestedItem', item.id)}
              >
                <View style={styles.itemIconContainer}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={20}
                    color={formValues.requestedItem === item.id ? '#74933c' : '#74933c'}
                  />
                </View>
                <View>
                  <Text style={styles.requestItemText}>{item.name}</Text>
                  {item.category && (
                    <Text style={styles.itemCategory}>{item.category}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Temporary Switch */}
          <View style={styles.switchContainer}>
            <View style={styles.switchLabel}>
              <MaterialCommunityIcons name="timer-sand" size={20} color="#74933c" />
              <Text style={styles.switchText}>Temporary Request</Text>
            </View>
            <Switch
              trackColor={{ false: "#E0E0E0", true: "#4c6c7c" }}
              thumbColor={formValues.isTemporary ? "#74933c" : "#FAFAFA"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={val => handleSwitch('isTemporary', val)}
              value={formValues.isTemporary}
            />
          </View>

          {/* Temporary Period */}
          {formValues.isTemporary && (
            <View style={styles.temporarySection}>
              <Text style={styles.temporaryHeader}>Temporary Period</Text>
              <View style={styles.dateTimeGroup}>
                <View style={styles.dateTimeColumn}>
                  <Text style={styles.dateTimeLabel}>From</Text>
                  <TouchableOpacity
                    style={styles.dateTimeInput}
                    onPress={() => handleOpenPicker('miscFromDate', 'date')}
                  >
                    <MaterialCommunityIcons name="calendar" size={18} color="#74933c" />
                    <Text style={styles.dateTimeText}>{formatDate(formValues.miscFromDate)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dateTimeInput, styles.timeInput]}
                    onPress={() => handleOpenPicker('miscFromTime', 'time')}
                  >
                    <MaterialCommunityIcons name="clock" size={18} color="#74933c" />
                    <Text style={styles.dateTimeText}>{formatTime(formValues.miscFromTime)}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.arrowContainer}>
                  <MaterialCommunityIcons name="arrow-right" size={24} color="#74933c" />
                </View>

                <View style={styles.dateTimeColumn}>
                  <Text style={styles.dateTimeLabel}>To</Text>
                  <TouchableOpacity
                    style={styles.dateTimeInput}
                    onPress={() => handleOpenPicker('miscToDate', 'date')}
                  >
                    <MaterialCommunityIcons name="calendar" size={18} color="#74933c" />
                    <Text style={styles.dateTimeText}>{formatDate(formValues.miscToDate)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dateTimeInput, styles.timeInput]}
                    onPress={() => handleOpenPicker('miscToTime', 'time')}
                  >
                    <MaterialCommunityIcons name="clock" size={18} color="#74933c" />
                    <Text style={styles.dateTimeText}>{formatTime(formValues.miscToTime)}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Reason */}
          <Text style={styles.sectionHeader}>Reason for Request</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Explain why you need this item/service..."
              placeholderTextColor="#90A4AE"
              value={formValues.miscReason}
              onChangeText={val => handleChange('miscReason', val)}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Notes */}
          <Text style={styles.sectionHeader}>Additional Notes</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Special requirements or additional details..."
              placeholderTextColor="#90A4AE"
              value={formValues.miscNotes}
              onChangeText={val => handleChange('miscNotes', val)}
              multiline
              numberOfLines={3}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      )}

      {/* Global Picker */}
      {pickerConfig.field && (
        <DateTimePicker
          value={formValues[pickerConfig.field] || new Date()}
          mode={pickerConfig.mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handlePickerChange}
        />
      )}
    </ScrollView>
  );
};



const styles = StyleSheet.create({
  container: { 
    padding: 5, 
    paddingBottom: 40, 
    backgroundColor: '#F5F7FB' 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 24, 
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#1f3d7c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  headerIconContainer: {
    backgroundColor: '#74933c',
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#1f3d7c', 
    textAlign: 'center',
    fontFamily: 'sans-serif-medium' 
  },
  headerSubtitle: { 
    fontSize: 15, 
    color: '#607D8B', 
    textAlign: 'center', 
    marginTop: 8, 
    lineHeight: 22,
    maxWidth: 300,
    fontFamily: 'sans-serif' 
  },
  formCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 24, 
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#74933c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  sectionHeader: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1f3d7c', 
    marginBottom: 16, 
    marginTop: 8,
    fontFamily: 'sans-serif-medium',
    letterSpacing: 0.2
  },
  // #74933c (greenish)
// #248bbc (blue)
// #1f3d7c (dark blue)
// #4c6c7c (gray/blue)
// #1c6c7c (blueish)
  requestItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  requestItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4c6c7c',
    backgroundColor: '#fffff',
    marginBottom: 12,
  },
  selectedRequestItem: {
    backgroundColor: '#4c6c7c',
    borderColor: '#4c6c7c',
    borderWidth: 1.5,
  },
  itemIconContainer: {
    backgroundColor: '#4c6c7c',
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#74933c',
    fontFamily: 'sans-serif-medium'
  },
  itemCategory: {
    fontSize: 12,
    color: '#74933c',
    marginTop: 2,
    fontFamily: 'sans-serif'
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4c6c7c',
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#74933c',
    marginLeft: 10,
    fontFamily: 'sans-serif-medium'
  },
  temporarySection: {
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4c6c7c',
  },
  temporaryHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#74933c',
    marginBottom: 16,
    fontFamily: 'sans-serif-medium'
  },
  dateTimeGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateTimeColumn: {
    flex: 1,
  },
  arrowContainer: {
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingTop: 30,
  },
  dateTimeLabel: {
    fontSize: 13,
    color: '#74933c',
    marginBottom: 8,
    fontWeight: '500',
    fontFamily: 'sans-serif'
  },
  dateTimeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0D4F9',
    marginBottom: 12,
  },
  timeInput: {
    marginBottom: 0,
  },
  dateTimeText: {
    fontSize: 15,
    marginLeft: 10,
    color: '#1f3d7c',
    fontWeight: '500',
    fontFamily: 'sans-serif-medium'
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    fontSize: 15,
    color: '#263238',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontFamily: 'sans-serif'
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#74933c',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 2,
    shadowColor: '#74933c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginRight: 10,
    fontFamily: 'sans-serif-medium'
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    elevation: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  successIcon: {
    backgroundColor: '#E8F5E9',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 8,
    fontFamily: 'sans-serif-medium'
  },
  successText: {
    fontSize: 16,
    color: '#455A64',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 24,
    fontFamily: 'sans-serif'
  },
  referenceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#74933c',
    marginTop: 12,
    fontFamily: 'sans-serif-medium'
  },
  newRequestButton: {
    backgroundColor: '#4c6c7c',
    borderRadius: 14,
    padding: 16,
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#4c6c7c',
  },
  newRequestButtonText: {
    color: '#74933c',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'sans-serif-medium'
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginTop: -10,
    marginBottom: 16,
    fontFamily: 'sans-serif'
  },
});

export default MiscSection;