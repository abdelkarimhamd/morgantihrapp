import React, { use, useEffect, useState } from 'react';
import {
  createMaterialTopTabNavigator,
} from '@react-navigation/material-top-tabs';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';


import api from '../../../services/api';
import ProfileTab from './ProfileTab';
import AssetsTab from './AssetsTab';
import FamilyTab from './FamilyTab';
import InsuranceTab from './InsuranceTab';
import CertificatesTab from './CertificatesTab';

const Tab = createMaterialTopTabNavigator();
const { width } = Dimensions.get('window');

// Example colors from your palette
const COLORS = {
  green: '#74933c',
  lightBlue: '#248bbc',
  darkBlue: '#1f3d7c',
  slateBlue: '#4c6c7c',
  tealBlue: '#1c6c7c',
};

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  // example user from Redux
  const currentUser = useSelector((state) => state.auth.user);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userRes = await api.get(`/users/${currentUser?.id}`);
      const assetsRes = await api.get(
        `/assets/employee/${currentUser?.employee_code}`
      );
      setUser(userRes.data);
      console.log(userRes.data);
      
      setAssets(assetsRes.data);
    } catch (err) {
      console.error('Failed to fetch profile data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // Fallback if no user
  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noUserText}>No user data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ====== HEADER SECTION ====== */}
      <LinearGradient
        colors={[COLORS.lightBlue, COLORS.darkBlue]}
        style={styles.headerGradient}
      >
        {/* USER INITIALS */}
        <View style={styles.avatarWrapper}>
          <Text style={styles.avatarText}>
            {user.name?.[0] ?? '?'}
          </Text>
        </View>

        {/* USER DETAILS */}
        <View style={styles.infoWrapper}>
          <Text style={styles.nameText}>{user.name}</Text>
          <Text style={styles.roleText}>{user.role}</Text>
          <Text style={styles.metaText}>
            {user.position} • {user.site}
          </Text>
        </View>
      </LinearGradient>

      {/* ====== TABS ====== */}
      <View style={styles.tabContainer}>
        <Tab.Navigator
          screenOptions={{
            tabBarIndicatorStyle: {
              backgroundColor: COLORS.green, // indicator = #74933c
              height: 3,
            },
            tabBarLabelStyle: {
              fontSize: 13,
              fontWeight: '600',
              textTransform: 'none',
            },
            tabBarActiveTintColor: COLORS.darkBlue, // for active label color
            tabBarScrollEnabled: true,
          }}
        >
          <Tab.Screen name="Profile Info">
            {() => <ProfileTab user={user} />}
          </Tab.Screen>
          <Tab.Screen name="Assets">
            {() => <AssetsTab assets={assets} />}
          </Tab.Screen>
          <Tab.Screen name="Family">
            {() => <FamilyTab familyMembers={user.family_members || []} />}
          </Tab.Screen>
          <Tab.Screen name="Insurance">
            {() => (
              <InsuranceTab assignedPolicies={user.assigned_policies || []} />
            )}
          </Tab.Screen>
          <Tab.Screen name="Certificates">
            {() => (
              <CertificatesTab certificates={user.certificates || []} />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </View>
    </View>
  );
}

// ----------------- STYLES ----------------- //
const AVATAR_SIZE = 90;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noUserText: {
    fontSize: 16,
  },

  // HEADER
  headerGradient: {
    width: '100%',
    height: 180,
    padding: 16,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#4c6c7c', // #4c6c7c from your palette
    justifyContent: 'center',
    alignItems: 'center',

    // iOS shadow
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    // Android
    elevation: 3,
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 36,
    color: '#fff',
    fontWeight: 'bold',
  },
  infoWrapper: {
    alignItems: 'center',
  },
  nameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  roleText: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 13,
    color: '#eee',
    marginTop: 2,
  },

  // TABS
  tabContainer: {
    flex: 1,
  },
});
