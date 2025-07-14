import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

/**
 * Renders a row for a section header with an icon and title.
 * If `noDivider` prop is true, it won't show a bottom border.
 */
export default function SectionHeader({ icon, title, noDivider = false }) {
  return (
    <View style={[styles.sectionHeaderRow, noDivider && { borderBottomWidth: 0 }]}>
      {icon && (
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
      )}
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
