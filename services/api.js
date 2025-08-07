import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Optional: If you have a decode library installed, you could do:
// import jwtDecode from 'jwt-decode';

let attemptedRefresh = false; // prevents infinite loop if refresh fails

const api = axios.create({

  baseURL: 'https://app.morgantigcc.com/hr_system/backend/public/api',

});

// Attach token on every request if present
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor to handle 401 errors and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If 401: attempt refresh once
    if (error.response?.status === 401 && !attemptedRefresh) {
      attemptedRefresh = true;
      const refreshToken = await AsyncStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          // Call /refresh to get a new access token
          const refreshResp = await api.post('/refresh', { refresh_token: refreshToken });
          const newAccessToken = refreshResp.data.access_token;

          // Save new token and expiry time
          await AsyncStorage.setItem('access_token', newAccessToken);
          await setTokenExpiry(newAccessToken);

          // Update original request's header
          error.config.headers.Authorization = `Bearer ${newAccessToken}`;

          attemptedRefresh = false; // reset flag

          // Retry original request
          return api(error.config);
        } catch (refreshErr) {
          console.error('Refresh token failed:', refreshErr);
          // Show a RN Alert => session expired
          Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
          // Clear tokens and possibly dispatch a logout action or navigate to Login
          await AsyncStorage.clear();
          attemptedRefresh = false;
          // If you have Redux:
          // store.dispatch(logout());
        }
      } else {
        // No refresh token => direct expire
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
        await AsyncStorage.clear();
        attemptedRefresh = false;
        // If you have Redux:
        // store.dispatch(logout());
      }
    }

    // Handle other errors gracefully
    if (error.response?.status === 500) {
      Alert.alert('Error', 'Internal server error. Please try again later.');
    } else if (error.response?.status === 404) {
      Alert.alert('Not Found', 'The requested resource was not found.');
    } else if (error.response) {
      // e.g. 400, 403, or other codes
      // Provide a generic message or use error.response.data
      Alert.alert('Error', 'An unexpected error occurred.');
    }

    return Promise.reject(error);
  }
);

/**
 * Save token expiration time when access token is refreshed
 * @param {string} accessToken - The new access token
 */
const setTokenExpiry = async (accessToken) => {
  try {
    // Decode token payload
    // For example, if you're using a standard JWT:
    const payloadBase64 = accessToken.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    const expiryTime = payload.exp * 1000; // Convert to milliseconds

    // Store in AsyncStorage
    await AsyncStorage.setItem('token_expiry', expiryTime.toString());
  } catch (err) {
    console.error('Failed to set token expiry:', err);
  }
};

/**
 * Check if the token is expired and refresh it if necessary
 * (You might call this on app startup.)
 */
export const checkTokenExpiry = async () => {
  const expiryTimeStr = await AsyncStorage.getItem('token_expiry');
  const expiryTime = parseInt(expiryTimeStr, 10);

  if (expiryTime && Date.now() >= expiryTime) {
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    if (refreshToken) {
      // Attempt to refresh the token if expired
      try {
        const response = await api.post('/refresh', { refresh_token: refreshToken });
        const newAccessToken = response.data.access_token;
        await AsyncStorage.setItem('access_token', newAccessToken);
        await setTokenExpiry(newAccessToken);
      } catch (err) {
        console.error('Token refresh failed:', err);
        Alert.alert('Session Expired', 'Please log in again.');
        await AsyncStorage.clear();
        // store.dispatch(logout());
      }
    }
  }
};

// Optionally run this once at startup
checkTokenExpiry();

export default api;
