import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SectionHeader from '../SectionHeader';
import FieldWithIcon from '../FieldWithIcon';

const COLORS = {
  primary: '#00796B',
  secondary: '#FF7043',
  accent: '#4CAF50',
  background: '#ECEFF1',
  card: '#FFFFFF',
  textDark: '#263238',
  textLight: '#546E7A',
  error: '#E53935',
  border: '#CFD8DC',
  disabled: '#B0BEC5',
  shadow: '#90A4AE',
  progressBarFill: '#004D40',
};

const pdOptions = [
  { value: 'name', label: 'Full Name', icon: 'account' },
  { value: 'email', label: 'Email Address', icon: 'email-outline' },
  { value: 'iqama_no', label: 'Iqama Number', icon: 'card-account-details' },
  { value: 'phone_number', label: 'Phone Number', icon: 'phone' },
  { value: 'address', label: 'Home Address', icon: 'home-map-marker' },
];

export default function PersonalDataChangeSection({ formValues, setFormValues }) {
  const handleChange = (field, value) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  };

  return (
    <View style={styles.sectionCard}>
      <SectionHeader icon="account-edit-outline" title="Personal Data Change Request" />

      <Text style={styles.label}>Field to Change</Text>
      <View style={styles.optionContainer}>
        {pdOptions.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionCard,
              formValues.personalDataField === opt.value && styles.selectedCard
            ]}
            onPress={() => handleChange('personalDataField', opt.value)}
          >
            <MaterialCommunityIcons
              name={opt.icon}
              size={20}
              color={formValues.personalDataField === opt.value ? '#FFFFFF' : COLORS.primary}
            />
            <Text
              style={[
                styles.optionText,
                formValues.personalDataField === opt.value && styles.selectedText
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FieldWithIcon
        icon="tooltip-edit-outline"
        label="New Value"
        placeholder="Enter the new information"
        value={formValues.personalDataValue}
        onChangeText={val => handleChange('personalDataValue', val)}
      />

      <FieldWithIcon
        icon="comment-alert-outline"
        label="Reason for Change"
        placeholder="e.g., Legal name change, updated contact"
        value={formValues.personalDataReason}
        onChangeText={val => handleChange('personalDataReason', val)}
        multiline
        numberOfLines={2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textLight,
    marginBottom: 8,
  },
  optionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 15,
  },
  optionCard: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedCard: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  selectedText: {
    color: '#FFFFFF',
  },
});
