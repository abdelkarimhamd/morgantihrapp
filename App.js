import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider, useSelector } from 'react-redux';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import store from './store/store';

// Screens
import WelcomeScreen from './app/screens/WelcomeScreen';
import LoginScreen from './app/screens/LoginScreen';
import AppDrawer from './app/AppDrawer';
import NewHrRequestScreen from './app/screens/Common/NewHrRequestScreen';
import VacationRequestForm from './app/screens/Common/VacationRequestForm';
import EmployeeExitEntryRequestsScreen from './app/screens/Common/EmployeeExitEntryRequestsScreen';
import ExitEntryRequestScreen from './app/screens/Employee/Requests/ExitEntryRequestScreen';
import EmployeeDashboard from './app/screens/Employee/EmployeeDashboard';

// Notification
import NotificationHeader from './app/components/NotificationHeader';
import api from './services/api';
import NewHrRequestForm from './app/components/HrRequestForm/NewHrRequestForm';
import RequestsList from './app/screens/RequestsList';
import ExitEntryRequestDetailsScreen from './app/screens/Employee/Requests/ExitEntryRequestDetailsScreen';
import { AuthProvider } from './context/AuthContext';
import ForgotPasswordScreen from './app/screens/RestPassword/ForgotPasswordScreen';
import OTPScreen from './app/screens/RestPassword/OTPScreen';
import ChangePasswordScreen from './app/screens/RestPassword/ChangePasswordScreen';
import HRVacationRequestsScreen from './app/screens/Admin/HRVacationRequestsScreen';
import HrAdminFinalApprovalsScreen from './app/screens/Admin/HrAdminFinalApprovalsScreen';
import HRAdminMyRequestsScreen from './app/screens/Admin/HRAdminMyRequestsScreen';
import ExitEntryRequestHRScreen from './app/screens/Admin/ExitEntryRequestHRScreen';
import HRAdminExitEntryRequestsScreen from './app/screens/Admin/HRAdminExitEntryRequestsScreen';
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Stack = createNativeStackNavigator();


async function requestLocationPermission() {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status === 'granted') return true;

  const { status: asked } = await Location.requestForegroundPermissionsAsync();
  if (asked !== 'granted') {
    alert('Location permission is required for site-based features.');
    return false;
  }
  return true;
}

function LocationPermissionManager() {
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    if (!user) return;                    
    requestLocationPermission();
  }, [user]);

  return null;
}


export async function registerForPushNotificationsAsync() {
  let token;

  // ✅ Check if running on a real device
  if (!Device.isDevice) {
    Alert.alert('Push notifications require a physical device!');
    return null;
  }

  // ✅ Configure Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX, // highest priority
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default', // ensure sound plays
    });
  }

  // ✅ Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // ✅ If not granted → ask for permission
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // ✅ If still not granted → abort
  if (finalStatus !== 'granted') {
    Alert.alert('Notifications disabled', 'You will not receive alerts.');
    return null;
  }

  // ✅ Get Expo Push Token
  token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("✅ Expo Push Token:", token);

  return token;
}



function useNotificationListener() {
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      // Handle the notification
      console.log('Notification received:', notification);
      // You can navigate to a specific screen or show a custom alert here
      // For example, you can navigate to a specific screen:
      // navigation.navigate('NotificationScreen', { notification });
    });
    return () => subscription.remove();
  }, []);
}
// MUST be outside the component


function PushTokenManager() {
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          // Send token to backend
          await api.post('/save-expo-token', {
            user_id: user.employee_code,
            expo_token: token,
          });
        }
      } catch (error) {
        console.error('Error saving push token:', error);
      }
    })();
  }, [user]);

  useNotificationListener();

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <Provider store={store}>
        <PushTokenManager />
        <LocationPermissionManager />
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Welcome">
            {/* Hide header on Welcome & Login */}
            <Stack.Screen
              name="Welcome"
              component={WelcomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ headerShown: false }} />
            <Stack.Screen
              name="OTPScreen"
              component={OTPScreen}
              options={{ headerShown: false }} />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ headerShown: false }} />
      
            <Stack.Screen
              name="CreateVacationRequest"
              component={VacationRequestForm}
              options={{ title: 'CreateVacationRequest', headerShown: true }}
            />
            <Stack.Screen
              name="HRVacationRequestsScreen"
              component={HRVacationRequestsScreen}
              options={{ title: 'HRVacationRequestsScreen', headerShown: true }}
            />
            <Stack.Screen
              name="HRAdminExitEntryRequestsScreen"
              component={HRAdminExitEntryRequestsScreen}
              options={{ title: 'HRAdminExitEntryRequestsScreen', headerShown: true }}
            />
            <Stack.Screen
              name="ExitEntryRequestHRScreen"
              component={ExitEntryRequestHRScreen}
              options={{ title: 'ExitEntryRequestHRScreen', headerShown: true }}
            />
            <Stack.Screen
              name="HRAdminMyRequestsScreen"
              component={HRAdminMyRequestsScreen}
              options={{ title: 'HRAdminMyRequestsScreen', headerShown: true }}
            />
            <Stack.Screen
              name="HrAdminFinalApprovalsScreen"
              component={HrAdminFinalApprovalsScreen}
              options={{ title: 'HrAdminFinalApprovalsScreen', headerShown: true }}
            />
            <Stack.Screen
              name="EmployeeExitEntryRequest"
              component={EmployeeExitEntryRequestsScreen}
              options={{ title: 'Exit/Entry', headerShown: true }}
            />
            <Stack.Screen
              name="CreateExitEntry"
              component={ExitEntryRequestScreen}
              options={{ title: 'Exit/Entry', headerShown: true }}
            />
            <Stack.Screen
              name="CreateRequest"
              component={NewHrRequestScreen}
              options={{ title: 'CreateRequest', headerShown: false }}
            />
            <Stack.Screen
              name="EmployeeDashboard"
              component={EmployeeDashboard}
              options={{ title: 'Employee Dashboard', headerShown: true }}
            />
            <Stack.Screen
              name="NewHrRequestForm"
              component={NewHrRequestForm}
              options={{ title: 'New HR Request Form', headerShown: false }}
            />
            <Stack.Screen
              name="RequestsList"
              component={RequestsList}
              options={{ title: 'Requests List', headerShown: true }}
            />
            <Stack.Screen
              name="ExitEntryRequestDetails"
              component={ExitEntryRequestDetailsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Drawer"
              component={AppDrawer}
              options={{ headerShown: false }}
            />

          </Stack.Navigator>
        </NavigationContainer>
      </Provider>
    </AuthProvider>
  );
}
