import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NotificationHeader from '../components/NotificationHeader';

import EmployeeDashboard from '../screens/Employee/EmployeeDashboard';
import EmployeeAllRequestsTabs from '../screens/Employee/Requests/EmployeeAllRequestsTabs';
// ... any other Employee screens

const Stack = createNativeStackNavigator();

export default function EmployeeStack() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        header: () => <NotificationHeader navigation={navigation} />,
      })}
    >
      <Stack.Screen
        name="EmployeeDashboard"
        component={EmployeeDashboard}
        options={{ title: 'Employee Dashboard' }}
      />
      <Stack.Screen
        name="EmployeeAllRequestsTabs"
        component={EmployeeAllRequestsTabs}
        options={{ title: 'All Requests' }}
      />
      {/* ... more employee screens if needed */}
    </Stack.Navigator>
  );
}
