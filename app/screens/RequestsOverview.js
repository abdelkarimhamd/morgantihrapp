import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';

/* --------------------------------------------
   COLOR PALETTE (enhanced with gradients)
-------------------------------------------- */
const COLORS = {
  primary: '#1f3d7c',
  secondary: '#248bbc',
  accent: '#74933c',
  background: '#f8f9fd',
  white: '#ffffff',
  textDark: '#2c3e50',
  textLight: '#666666',
  badge: '#e74c3c',
  cardGradientStart: '#f0f4ff',
  cardGradientEnd: '#e6eeff',
};

/* --------------------------------------------
   REQUEST TYPES
-------------------------------------------- */
const ALL_SUB_TABS = [
  { key: 'to_leave', label: 'Leave', icon: 'exit-to-app', color: '#4a86e8' },
  { key: 'loans', label: 'Loans', icon: 'attach-money', color: '#34a853' },
  { key: 'finance_claim', label: 'Finance', icon: 'monetization-on', color: '#f9ab00' },
  { key: 'misc', label: 'Misc', icon: 'more-horiz', color: '#9e9e9e' },
  { key: 'business_trip', label: 'Business', icon: 'business-center', color: '#673ab7' },
  { key: 'bank', label: 'Bank', icon: 'account-balance', color: '#009688' },
  { key: 'resignation', label: 'Resign', icon: 'person-off', color: '#ea4335' },
  { key: 'personal_data_change', label: 'Data', icon: 'manage-accounts', color: '#ff6d00' },
];

const ROLES_CAN_VIEW_ASSIGNED = ['manager', 'hr_admin', 'finance'];

export default function RequestsOverview() {
  const navigation = useNavigation();
  const role = useSelector((state) => state.auth.user?.role);
  const canViewAssigned = ROLES_CAN_VIEW_ASSIGNED.includes(role);
  const screenWidth = Dimensions.get('window').width;
  
  const [loading, setLoading] = useState(false);
  const [assignedCounts, setAssignedCounts] = useState({});
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (canViewAssigned) fetchAssignedCounts();
    
    // Fade-in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [canViewAssigned]);

  async function fetchAssignedCounts() {
    setLoading(true);
    try {
      const res = await api.get('/hr-requests/assigned-pending-breakdown');
      setAssignedCounts(res.data || {});
    } catch (err) {
      console.warn('Failed to fetch pending counts', err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate card width based on screen size
  const cardWidth = (screenWidth - 48) / 2; // 32 padding + 16 gap

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>HR Request Categories</Text>
        <Text style={styles.subtitle}>Select a category to view or create requests</Text>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      )}

      <Animated.View style={[styles.grid, { opacity: fadeAnim }]}>
        {ALL_SUB_TABS.map((item) => {
          const showBadge = canViewAssigned && (assignedCounts[item.key] > 0);
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.card, { width: cardWidth }]}
              onPress={() => navigation.navigate('RequestsList', { requestType: item.key })}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[COLORS.cardGradientStart, COLORS.cardGradientEnd]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                  <MaterialIcons
                    name={item.icon}
                    size={28}
                    color={item.color}
                  />
                </View>
                <Text style={styles.label}>{item.label}</Text>
                
                {showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{assignedCounts[item.key]}</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
      
      {canViewAssigned && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {Object.values(assignedCounts).reduce((a, b) => a + b, 0)} pending requests need your attention
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

/* --------------------------------------------
   ENHANCED STYLES
-------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: COLORS.background,
    minHeight: '100%',
  },
  header: {
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gradient: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  label: {
    fontWeight: '600',
    fontSize: 15,
    color: COLORS.textDark,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.badge,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textLight,
  },
  summaryContainer: {
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  summaryText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});