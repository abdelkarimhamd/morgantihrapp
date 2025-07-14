import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

export default function DateTimeField({
  icon,
  label,
  mode = 'date',
  value,
  onChangeValue,
  placeholderText
}) {
  const [showPicker, setShowPicker] = useState(false);

  const displayValue = () => {
    if (!value) return placeholderText || `Select ${mode}`;
    const date = new Date(value);
    if (mode === 'date') return date.toLocaleDateString();
    if (mode === 'time') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return value; // fallback
  };

  const handlePickerChange = (event, selectedDate) => {
    // On iOS, keep the picker open, on Android, auto-close
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      onChangeValue(selectedDate.toISOString());
    }
  };

  return (
    <View style={styles.fieldGroup}>
      {label ? (
        <View style={styles.labelRow}>
          <MaterialCommunityIcons
            name={icon || (mode === 'date' ? 'calendar-month-outline' : 'clock-time-four-outline')}
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.label}>{label}</Text>
        </View>
      ) : null}

      <Pressable onPress={() => setShowPicker(true)} style={styles.dateTimePickerButton}>
        <Text style={[styles.dateTimePickerText, !value && styles.dateTimePickerPlaceholder]}>
          {displayValue()}
        </Text>
        <MaterialCommunityIcons
          name={mode === 'date' ? 'calendar-edit' : 'clock-edit-outline'}
          size={20}
          color={COLORS.secondary}
        />
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode={mode}
          display="default"
          onChange={handlePickerChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: 15,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textDark,
    marginLeft: 8,
  },
  dateTimePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateTimePickerText: {
    fontSize: 15,
    color: COLORS.textDark,
  },
  dateTimePickerPlaceholder: {
    color: COLORS.textLight,
  },
});
