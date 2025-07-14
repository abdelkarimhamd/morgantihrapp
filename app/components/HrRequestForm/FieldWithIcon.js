import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
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

export default function FieldWithIcon({
  icon,
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  secureTextEntry = false,
  editable = true,
}) {
  return (
    <View style={styles.fieldGroup}>
      {label ? (
        <View style={styles.labelRow}>
          {icon && <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} />}
          <Text style={styles.label}>{label}</Text>
        </View>
      ) : null}

      <TextInput
        style={[
          styles.textInput,
          multiline && styles.multilineInput,
          !editable && styles.disabledInput
        ]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : 1}
        secureTextEntry={secureTextEntry}
        editable={editable}
      />
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
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: COLORS.textDark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  disabledInput: {
    backgroundColor: COLORS.disabled || '#E0E0E0',
    color: COLORS.disabledText || '#9E9E9E',
  },
});
