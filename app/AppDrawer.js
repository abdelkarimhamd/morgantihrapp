import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import api from '../services/api';
import AdminDashboard from './screens/Admin/AdminDashboard';
import ManagerDashboard from './screens/Manager/ManagerDashboard';
import EmployeeDashboard from './screens/Employee/EmployeeDashboard';
import EmployeeAllRequestsTabs from './screens/Employee/Requests/EmployeeAllRequestsTabs';
import ProfileScreen from './screens/Profile/ProfileScreen';
import ManagerVacationRequestsScreen from './screens/Manager/ManagerVacationRequestsScreen';
import RequestsOverview from './screens/RequestsOverview';
import HrAdminFinalApprovalsScreen from './screens/Admin/HrAdminFinalApprovalsScreen';
import { logoutUser } from '../store/actions/authActions';
import NotificationHeader from './components/NotificationHeader';
import VactionsScreenHRScreen from './screens/Admin/VactionsScreenHRScreen';

const { width } = Dimensions.get('window');
const isLargeScreen = width >= 768;
const isIOS = Platform.OS === 'ios';
const Drawer = createDrawerNavigator();
const ROLES_CAN_VIEW_ASSIGNED = ['manager', 'hr_admin', 'finance','ceo', 'finance_coordinator'];

function CustomDrawerContent(props) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const dynamicStyles = getDynamicStyles(isLargeScreen, isIOS);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Logout', 
        onPress: () => {
          dispatch(logoutUser());
          // Navigate to Login screen after logout
          props.navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      },
    ]);
  };

  return (
    <LinearGradient 
      colors={['#1c6c7c', '#1f3d7c']} 
      style={dynamicStyles.gradientContainer}
      start={{x: 0, y: 0}} 
      end={{x: 1, y: 1}}
    >
      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={dynamicStyles.drawerScrollContainer}
      >
        <View style={dynamicStyles.drawerHeader}>
          <View style={dynamicStyles.profilePicContainer}>
            <Image 
              source={{ uri: user?.avatar || 'https://via.placeholder.com/100' }} 
              style={dynamicStyles.profilePic} 
            />
            <TouchableOpacity
              style={dynamicStyles.editProfileButton}
              onPress={() => props.navigation.navigate('Profile')}
            >
              <Feather name="edit" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={dynamicStyles.displayName}>{user?.name || 'Welcome Back'}</Text>
          <Text style={dynamicStyles.roleText}>{user?.role?.toUpperCase() || 'UNKNOWN ROLE'}</Text>
        </View>
        
        <View style={dynamicStyles.drawerItemsContainer}>
          <DrawerItemList 
            {...props} 
            activeTintColor="#fff"
            inactiveTintColor="#fff"
            activeBackgroundColor="rgba(255,255,255,0.2)"
            inactiveBackgroundColor="rgba(255,255,255,0.1)"
            itemStyle={dynamicStyles.drawerItem}
            labelStyle={dynamicStyles.drawerLabel} 
          />
        </View>
      </DrawerContentScrollView>
      
      <TouchableOpacity 
        style={dynamicStyles.logoutButton} 
        onPress={handleLogout}
      >
        <MaterialIcons name="logout" size={24} color="#fff" />
        <Text style={dynamicStyles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

export default function AppDrawer() {
  const role = useSelector((state) => state.auth.user?.role);
  const dynamicStyles = getDynamicStyles(isLargeScreen, isIOS);
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [hasPendingVacations, setHasPendingVacations] = useState(false);
  
  const apiPrefix = useMemo(() => {
    if (role === 'hr_admin') return '/admin';
    if (role === 'manager') return '/manager';
    if (role === 'finance') return '/finance';
    if (role === 'ceo') return '/ceo';
    if (role === 'finance_coordinator') return '/finance_coordinator';
    return '/employee';
  }, [role]);

  useEffect(() => {
    if (ROLES_CAN_VIEW_ASSIGNED.includes(role)) {
      // Fetch pending requests
      api.get('/hr-requests/assigned-pending-breakdown')
        .then(res => {
          const data = res.data || {};
          const total = Object.values(data).reduce((sum, v) => sum + (v || 0), 0);
          setHasPendingRequests(total > 0);
        })
        .catch(err => console.warn('Pending breakdown error', err));
      
      // Fetch pending vacations
      api.get(`${apiPrefix}/vacation-requests/pending-count`)
        .then(res => {
          const count = res.data?.count || 0;
          setHasPendingVacations(count > 0);
        })
        .catch(err => console.warn('Pending vacations error', err));
    }
  }, [role, apiPrefix]);

  const getScreenOptions = ({ navigation, route }) => ({
    header: () => <NotificationHeader navigation={navigation} title="HR System" />,
    drawerIcon: ({ focused, color, size }) => {
      let iconName;
      switch (route.name) {
        case 'AdminDashboard': iconName = 'dashboard'; break;
        case 'ManagerDashboard': iconName = 'supervisor-account'; break;
        case 'EmployeeDashboard': iconName = 'person'; break;
        case 'EmployeeAllRequestsTabs': iconName = 'beach-access'; break;
        case 'VacationRequests': iconName = 'beach-access'; break;
        case 'Profile': iconName = 'account-circle'; break;
        case 'RequestsWithAssignedSplit': iconName = 'assignment'; break;
        default: iconName = 'info';
      }
      return <MaterialIcons name={iconName} size={24} color="#74933c" />;
    },
  });

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={getScreenOptions}
      drawerStyle={dynamicStyles.drawerStyle}
    >
      {role === 'hr_admin' && (
        <>
          <Drawer.Screen 
            name="AdminDashboard" 
            component={AdminDashboard} 
            options={{ title: 'Admin Dashboard' }} 
          />
          <Drawer.Screen
            name="VactionsScreenHRScreen"
            component={VactionsScreenHRScreen}
            options={{
              title: 'Vacations',
              drawerLabel: ({ focused }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[dynamicStyles.drawerLabel, focused && { fontWeight: '700' }]}>
                    Vacations
                  </Text>
                  {hasPendingVacations && (
                    <View style={dynamicStyles.badge} />
                  )}
                </View>
              ),
            }}
          />
          <Drawer.Screen
            name="RequestsOverview"
            component={RequestsOverview}
            options={{
              title: 'Request Overview',
              drawerLabel: ({ focused }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[dynamicStyles.drawerLabel, focused && { fontWeight: '700' }]}>
                    Request Overview
                  </Text>
                  {hasPendingRequests && (
                    <View style={dynamicStyles.badge} />
                  )}
                </View>
              ),
            }}
          />
        </>
      )}

      {role === 'manager' && (
        <>
          <Drawer.Screen 
            name="ManagerDashboard" 
            component={ManagerDashboard} 
            options={{ title: 'Manager Dashboard' }} 
          />
          <Drawer.Screen
            name="VacationRequests"
            component={ManagerVacationRequestsScreen}
            options={{
              title: 'Vacations',
              drawerLabel: ({ focused }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[dynamicStyles.drawerLabel, focused && { fontWeight: '700' }]}>
                    Vacations
                  </Text>
                  {hasPendingVacations && (
                    <View style={dynamicStyles.badge} />
                  )}
                </View>
              ),
            }}
          />
          <Drawer.Screen
            name="RequestsOverview"
            component={RequestsOverview}
            options={{
              title: 'Request Overview',
              drawerLabel: ({ focused }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[dynamicStyles.drawerLabel, focused && { fontWeight: '700' }]}>
                    Request Overview
                  </Text>
                  {hasPendingRequests && (
                    <View style={dynamicStyles.badge} />
                  )}
                </View>
              ),
            }}
          />
        </>
      )}

      {role === 'ceo' && (
        <>
          <Drawer.Screen 
            name="ManagerDashboard" 
            component={ManagerDashboard} 
            options={{ title: 'CEO Dashboard' }} 
          />
          <Drawer.Screen
            name="VacationRequests"
            component={ManagerVacationRequestsScreen}
            options={{
              title: 'Vacations',
              drawerLabel: ({ focused }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[dynamicStyles.drawerLabel, focused && { fontWeight: '700' }]}>
                    Vacations
                  </Text>
                  {hasPendingVacations && (
                    <View style={dynamicStyles.badge} />
                  )}
                </View>
              ),
            }}
          />
          <Drawer.Screen
            name="RequestsOverview"
            component={RequestsOverview}
            options={{
              title: 'Request Overview',
              drawerLabel: ({ focused }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[dynamicStyles.drawerLabel, focused && { fontWeight: '700' }]}>
                    Request Overview
                  </Text>
                  {hasPendingRequests && (
                    <View style={dynamicStyles.badge} />
                  )}
                </View>
              ),
            }}
          />
        </>
      )}

      {role === 'finance' && (
        <>
          <Drawer.Screen 
            name="ManagerDashboard" 
            component={ManagerDashboard} 
            options={{ title: 'Finance Dashboard' }} 
          />
          <Drawer.Screen
            name="VacationRequests"
            component={ManagerVacationRequestsScreen}
            options={{
              title: 'Vacations',
              drawerLabel: ({ focused }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[dynamicStyles.drawerLabel, focused && { fontWeight: '700' }]}>
                    Vacations
                  </Text>
                  {hasPendingVacations && (
                    <View style={dynamicStyles.badge} />
                  )}
                </View>
              ),
            }}
          />
          <Drawer.Screen
            name="RequestsOverview"
            component={RequestsOverview}
            options={{
              title: 'Request Overview',
              drawerLabel: ({ focused }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[dynamicStyles.drawerLabel, focused && { fontWeight: '700' }]}>
                    Request Overview
                  </Text>
                  {hasPendingRequests && (
                    <View style={dynamicStyles.badge} />
                  )}
                </View>
              ),
            }}
          />
        </>
      )}

      {role === 'employee' && (
        <>
          <Drawer.Screen 
            name="EmployeeDashboard" 
            component={EmployeeDashboard} 
            options={{ title: 'Dashboard' }}  
          />
          <Drawer.Screen 
            name="RequestsOverview" 
            component={RequestsOverview} 
            options={{ title: 'Request Overview' }} 
          />
          <Drawer.Screen 
            name="EmployeeAllRequestsTabs" 
            component={EmployeeAllRequestsTabs} 
            options={{ title: 'My Requests' }} 
          />
        </>
      )}

      {role === 'finance_coordinator' && (
        <>
          <Drawer.Screen 
            name="EmployeeDashboard" 
            component={EmployeeDashboard} 
            options={{ title: 'Dashboard' }} 
          />
          <Drawer.Screen 
            name="RequestsOverview" 
            component={RequestsOverview} 
            options={{ title: 'Request Overview' }} 
          />
          <Drawer.Screen 
            name="EmployeeAllRequestsTabs" 
            component={EmployeeAllRequestsTabs} 
            options={{ title: 'My Requests' }} 
          />
        </>
      )}

      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'My Profile' }} 
      />
    </Drawer.Navigator>
  );
}

function getDynamicStyles(isLarge, isIOS) {
  return StyleSheet.create({
    gradientContainer: { 
      flex: 1, 
      paddingTop: isIOS ? 40 : 0 
    },
    drawerScrollContainer: { 
      flexGrow: 1, 
      paddingBottom: 20 
    },
    drawerHeader: {
      alignItems: 'center',
      paddingVertical: 25,
      paddingHorizontal: 15,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.2)',
      marginBottom: 10,
    },
    profilePicContainer: {
      width: isLarge ? 120 : 90,
      height: isLarge ? 120 : 90,
      borderRadius: isLarge ? 60 : 45,
      borderWidth: 3,
      borderColor: '#74933c',
      marginBottom: 15,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      overflow: 'hidden',
      position: 'relative',
    },
    profilePic: { 
      width: '100%', 
      height: '100%' 
    },
    editProfileButton: {
      position: 'absolute',
      bottom: 5,
      right: 5,
      backgroundColor: '#1a237e',
      borderRadius: 15,
      padding: 5,
      zIndex: 10,
    },
    displayName: {
      color: '#fff',
      fontSize: isLarge ? 22 : 18,
      fontWeight: '600',
      marginBottom: 4,
      textAlign: 'center',
    },
    roleText: {
      color: '#74933c',
      fontSize: isLarge ? 16 : 14,
      fontWeight: '500',
      textAlign: 'center',
    },
    drawerItemsContainer: { 
      flex: 1, 
      paddingTop: 10 
    },
    drawerItem: { 
      borderRadius: 10,
      marginHorizontal: 10,
      marginVertical: 4,
    },
    drawerLabel: {
      fontSize: isLarge ? 18 : 16,
      fontWeight: '500',
      color: '#fff',
      marginLeft: -15,
    },
    drawerStyle: {
      width: isLarge ? 320 : 280,
      backgroundColor: 'transparent',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 15,
      marginHorizontal: 15,
      marginBottom: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.2)',
      gap: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    logoutText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    badge: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#e74c3c',
      marginLeft: 8,
    },
  });
}