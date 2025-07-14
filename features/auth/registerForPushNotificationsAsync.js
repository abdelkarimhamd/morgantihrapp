import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';

// Helper to get the Expo push token
export async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    Alert.alert('Permissions Required', 'Enable notifications in your settings.');
    return null;
  }
  token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}
