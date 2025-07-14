// secureStoreService.js
import * as SecureStore from 'expo-secure-store';

export async function saveCredentials(key, value) {
  await SecureStore.setItemAsync(key, value);
}

export async function getCredentials(key) {
  return await SecureStore.getItemAsync(key);
}

export async function deleteCredentials(key) {
  await SecureStore.deleteItemAsync(key);
}
