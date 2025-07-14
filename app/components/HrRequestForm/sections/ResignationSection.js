import React from 'react';
import { View, StyleSheet } from 'react-native';
import SectionHeader from '../SectionHeader';
import DateTimeField from '../DateTimeField';
import FieldWithIcon from '../FieldWithIcon';
const COLORS = {
  primary: '#00796B',      // Teal
  secondary: '#FF7043',    // Coral Orange
  accent: '#4CAF50',       // Green (for success, positive actions)
  background: '#ECEFF1',   // Light Gray - Main background
  card: '#FFFFFF',         // White - For cards and input backgrounds
  textDark: '#263238',     // Dark Slate Gray - Primary text
  textLight: '#546E7A',    // Slate Gray - Secondary text, placeholders
  error: '#E53935',        // Red - For errors
  border: '#CFD8DC',       // Light Border Color
  disabled: '#B0BEC5',     // For disabled states
  shadow: '#90A4AE',       // For subtle shadows
  progressBarFill: '#004D40', // Darker Teal for progress
};

export default function ResignationSection({ formValues, setFormValues }) {
  const handleChange = (field, value) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  };

  return (
    <View style={styles.sectionCard}>
      <SectionHeader icon="account-arrow-left-outline" title="Resignation Details" />

      <DateTimeField
        icon="calendar-today"
        label="Intended Resignation Date"
        mode="date"
        value={formValues.resignation_date}
        onChangeValue={val => handleChange('resignation_date', val)}
        placeholderText="Select resignation date"
      />

      <DateTimeField
        icon="calendar-check"
        label="Proposed Last Working Day"
        mode="date"
        value={formValues.last_working_day}
        onChangeValue={val => handleChange('last_working_day', val)}
        placeholderText="Select last working day"
      />

      <FieldWithIcon
        icon="timer-sand-outline"
        label="Notice Period (days)"
        placeholder="e.g., 30"
        value={formValues.notice_period}
        onChangeText={val => handleChange('notice_period', val)}
        keyboardType="numeric"
      />

      <FieldWithIcon
        icon="comment-text-outline"
        label="Reason for Resignation"
        placeholder="Enter reason"
        value={formValues.resignation_reason}
        onChangeText={val => handleChange('resignation_reason', val)}
        multiline
        numberOfLines={3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
