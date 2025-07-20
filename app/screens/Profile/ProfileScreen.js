import React, { useEffect, useState } from 'react';
import {
  createMaterialTopTabNavigator,
} from '@react-navigation/material-top-tabs';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import api from '../../../services/api';
import ProfileTab from './ProfileTab';
import AssetsTab from './AssetsTab';
import FamilyTab from './FamilyTab';
import InsuranceTab from './InsuranceTab';
import CertificatesTab from './CertificatesTab';
// import your logout action
import { logout } from '../../../features/auth/authSlice';

const Tab = createMaterialTopTabNavigator();
const { width } = Dimensions.get('window');

const COLORS = {
  green: '#74933c',
  lightBlue: '#1f3d7c',
  darkBlue: '#248bbc',
  slateBlue: '#4c6c7c',
  tealBlue: '#1c6c7c',
  danger: '#e53935',
};

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigation = useNavigation();

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
      setAssets(assetsRes.data);
    } catch (err) {
      console.error('Failed to fetch profile data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Delete",
          style: "destructive",
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      await api.delete(`/deleteacount/${currentUser?.id}`);
      Alert.alert("Account Deleted", "Your account has been removed.");
      // Log out the user
      dispatch(logout());
      // Or navigate to Login screen
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (err) {
      console.error("Failed to delete account:", err);
      Alert.alert("Error", "Failed to delete account. Please try again later.");
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noUserText}>No user data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ===== HEADER SECTION ===== */}
      <LinearGradient
        colors={[COLORS.lightBlue, COLORS.darkBlue]}
        style={styles.headerGradient}
      >
        <View style={styles.avatarWrapper}>
          <Text style={styles.avatarText}>
            {user.name?.[0] ?? '?'}
          </Text>
        </View>

        <View style={styles.infoWrapper}>
          <Text style={styles.nameText}>{user.name}</Text>
          {/* <Text style={styles.roleText}>{ user.role=='hr_admin'? 'Admin':user.role  }</Text> */}
          <Text style={styles.metaText}>
            {user.position} • {user.site}
          </Text>
        </View>
      </LinearGradient>

      {/* ===== TABS ===== */}
      <View style={styles.tabContainer}>
        <Tab.Navigator
          screenOptions={{
            tabBarIndicatorStyle: { backgroundColor: COLORS.green, height: 3 },
            tabBarLabelStyle: { fontSize: 13, fontWeight: '600', textTransform: 'none' },
            tabBarActiveTintColor: COLORS.darkBlue,
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
            {() => <InsuranceTab assignedPolicies={user.assigned_policies || []} />}
          </Tab.Screen>
          <Tab.Screen name="Certificates">
            {() => <CertificatesTab certificates={user.certificates || []} />}
          </Tab.Screen>
        </Tab.Navigator>
      </View>

      {/* ===== Delete Account Button ===== */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
        <Text style={styles.deleteBtnText}>Delete Account</Text>
      </TouchableOpacity>
    </View>
  );
}

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
    backgroundColor: '#4c6c7c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
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
  tabContainer: {
    flex: 1,
  },
  deleteBtn: {
    backgroundColor: COLORS.danger,
    padding: 16,
    margin: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
