import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  Dimensions,
  Image,
  RefreshControl, // 1. Imported RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import * as LocalAuthentication from 'expo-local-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../services/api';
import { useSelector } from 'react-redux';

// We merge your color palette from both snippets
const COLORS = {
  primary: '#1f3d7c',
  secondary: '#248bbc',
  accent: '#74933c',
  background: '#f8f9fd',
  text: '#2c3e50',
  success: '#27ae60',
  error: '#e74c3c',
  warning: '#f1c40f',
  white: '#ffffff',

  // Additional tints from second snippet
  green: '#74933c',
  blue: '#248bbc',
  navy: '#1f3d7c',
  tealG: '#4c6c7c',
  teal: '#1c6c7c',
  light: '#f2f2f2',
  textD: '#333333',
  textL: '#666666',
};

// For dynamic dimensions
const { width, height } = Dimensions.get('window');

// Animated Touchable for the punch button
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * Utility function: Calculate service period from an employee's joining date
 */
function calculateServicePeriod(joinDate) {
  if (!joinDate) return '';
  const start = new Date(joinDate);
  const now = new Date();
  let y = now.getFullYear() - start.getFullYear();
  let m = now.getMonth() - start.getMonth();
  let d = now.getDate() - start.getDate();

  if (d < 0) {
    m--;
    d += 30;
  }
  if (m < 0) {
    y--;
    m += 12;
  }
  return `${y}y ${m}m ${d}d`;
}

/**
 * Return color for request status
 */
function getStatusColor(status) {
  if (status === 'Approved') return COLORS.success;
  if (status === 'Pending') return COLORS.warning;
  return COLORS.error;
}

export default function EmployeeDashboard() {
  // =============== STATE ===============
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // 2. Added state for refreshing

  // Employee data
  const [employee, setEmployee] = useState(null);
  // Vacation balances
  const [vacations, setVacations] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupText, setPopupText] = useState('');
  const popupScale = useRef(new Animated.Value(0)).current;
  function triggerSuccessPopup(message) {
    setPopupText(message);
    setShowPopup(true);
    popupScale.setValue(0);

    Animated.spring(popupScale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(popupScale, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowPopup(false));
      }, 2000); // popup stays for 2 seconds
    });
  }

  // Attendance data
  const [attendanceMsg, setAttendanceMsg] = useState('');
  const [lastPunchType, setLastPunchType] = useState(null);
  const [lastAttendances, setLastAttendances] = useState([]);

  // Requests + announcements + holidays
  const [requests, setRequests] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [holidays, setHolidays] = useState([]);

  // For partial reveal of announcements, holidays
  const INITIAL = 3;
  const [annCount, setAnnCount] = useState(INITIAL);
  const [holCount, setHolCount] = useState(INITIAL);

  // Location
  const [location, setLocation] = useState(null);
  const [geoStatus, setGeoStatus] = useState('');
  const [currentProject, setCurrentProject] = useState(null); // geofence

  // Animated values
  const mapOpacity = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const apiPrefix = getRoutePrefixByRole();

  function getRoutePrefixByRole() {
    const role = useSelector((state) => state.auth.user?.role);
    if (role === 'hr_admin') return '/admin';
    if (role === 'manager') return '/manager';
    if (role === 'finance') return '/finance';
    if (role === 'ceo') return '/ceo';
    if (role === 'finance_coordinator') return '/finance_coordinator';
    return '/employee';
  }
  console.log('API Prefix:', apiPrefix);
  // =============== EFFECTS ===============
  useEffect(() => {
    (async () => {
      await requestLocationPermission();
      await fetchAllData();
    })();
  }, []);

  // Once we have employee data, fetch last punch + last attendances
  useEffect(() => {
    if (employee) {
      fetchLastPunchOfToday();
      fetchLastFiveAttendances(employee.employee_code);
    }
  }, [employee]);

  // Animate attendance message if we have one
  useEffect(() => {
    if (attendanceMsg) {
      Animated.timing(messageOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      messageOpacity.setValue(0);
    }
  }, [attendanceMsg]);

  // =============== LOCATION + GEOFENCE ===============
  async function requestLocationPermission() {
    try {
      setGeoStatus('Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGeoStatus('Location permission denied.');
        return;
      }
      startLocationWatch();
    } catch (err) {
      console.log('Location permission error:', err);
      setGeoStatus('Permission error.');
    }
  }

  async function startLocationWatch() {
    setGeoStatus('Acquiring location...');
    await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 1 },
      (pos) => {
        setLocation(pos.coords);
        setGeoStatus('Location updated');

        // Animate map in
        Animated.timing(mapOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();

        // Check geofence from server
        checkGeofence(pos.coords);
      }
    );
  }

  async function checkGeofence(coords) {
    try {
      const res = await api.get('/attendances/functionlati', {
        params: {
          lat: coords.latitude,
          lng: coords.longitude,
        },
      });
      const { projects } = res.data;
      const inRange = projects.find((p) => p.in_range === true);
      setCurrentProject(inRange ? inRange.project_id : null);
    } catch (err) {
      console.log('Error checking geofence:', err);
      setCurrentProject(null);
    }
  }

  // =============== FETCH DATA ===============
  async function fetchAllData() {
    // Keep setLoading true only for initial load, not for background refresh
    if (!isRefreshing) {
      setLoading(true);
    }
    try {
      const dash = await api.get(`${apiPrefix}/dashboard`);
      setEmployee(dash.data.employee || {});
      if (dash.data.vacations) setVacations(dash.data.vacations);

      // Vacation requests
      const reqResp = await api.get(`${apiPrefix}/vacation-requests`);
      setRequests(reqResp.data || []);

      // Announcements
      const annResp = await api.get('/announcements');
      setAnnouncements(annResp.data || []);

      // Holidays
      const holResp = await api.get('/holidays');
      setHolidays(holResp.data || []);
    } catch (err) {
      Alert.alert('Error', 'Could not fetch data.');
      console.log('fetchAllData error:', err);
    } finally {
      setLoading(false);
    }
  }

  // 3. Implemented the onRefresh function
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAllData().then(() => {
      setIsRefreshing(false);
    });
  }, []);

  function formatLocalTime() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  }

  // Get today's last punch
  async function fetchLastPunchOfToday() {
    if (!employee) return;
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const from = `${yyyy}-${mm}-${dd} 00:00:00`;
      const to = `${yyyy}-${mm}-${dd} 23:59:59`;

      const resp = await api.get('/attendances', {
        params: { employee_code: employee.employee_code, from, to },
      });
      const list = resp.data?.data || [];
      list.sort((a, b) => new Date(b.log_time) - new Date(a.log_time));

      if (list.length > 0) {
        setLastPunchType(list[0].type);
      } else {
        setLastPunchType(null);
      }
    } catch (err) {
      console.log('fetchLastPunchOfToday error:', err);
      setLastPunchType(null);
    }
  }

  // Last 5 attendance logs
  async function fetchLastFiveAttendances(empCode) {
    try {
      const resp = await api.get('/attendances', { params: { employee_code: empCode } });
      const all = resp.data?.data || [];
      all.sort((a, b) => new Date(b.log_time) - new Date(a.log_time));
      setLastAttendances(all.slice(0, 5));
    } catch (err) {
      console.log('fetchLastFiveAttendances error:', err);
    }
  }

  // =============== ATTENDANCE ACTIONS ===============
  function decideNextPunch() {
    if (!lastPunchType) return 'CheckIn';
    return lastPunchType === 'CheckIn' ? 'CheckOut' : 'CheckIn';
  }
  const nextPunch = decideNextPunch();

  function canCheckInOut() {
    // We require user has location & is in range
    return location && currentProject !== null;
  }

  async function promptBiometricAuth() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) throw new Error('No biometric hardware.');
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) throw new Error('No Face/Touch ID enrolled.');

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to proceed',
      fallbackEnabled: true,
      disableDeviceFallback: false,
    });
    if (!result.success) throw new Error('Biometric cancelled/failed');
  }

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  async function handleCheckBiometric() {
    if (!canCheckInOut()) {
      setAttendanceMsg('No location or out of range.');
      return;
    }
    const punch = decideNextPunch();
    try {
      await promptBiometricAuth();
      handleCheck(punch);
    } catch (err) {
      console.log('Biometric error:', err);
      setAttendanceMsg(err.message || 'Biometric failed');
    }
  }
  function getLocalTimeString() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000; // in ms
    const local = new Date(now - offset);
    return local.toISOString().slice(0, 19).replace('T', ' ');
  }

  async function handleCheck(type) {
    try {
      const payload = {
        employee_code: employee.employee_code,
        device_stgid: 'PHONE-01',
        project_id: currentProject,
        log_time: getLocalTimeString(),
        type,
        input_type: 'GPS',
        raw_payload: JSON.stringify({
          latitude: location?.latitude,
          longitude: location?.longitude,
        }),
      };

      const res = await api.post('/attendances', payload);
      if (res.data?.id) {
        setLastPunchType(type);
        triggerSuccessPopup(`${type === 'CheckIn' ? 'Checked in' : 'Checked out'} 🤘`);
        setAttendanceMsg(`${type} successful! #${res.data.id}`);

        // Refresh last 5 attendance logs
        fetchLastFiveAttendances(employee.employee_code);
      } else {
        setAttendanceMsg('Attendance returned no ID?');
      }
    } catch (err) {
      console.log('handleCheck error:', err?.response?.data || err);
      const serverError = err?.response?.data?.error || '';

      if (serverError.includes('already checked in')) {
        Alert.alert('Already Checked In', 'You are already checked in. Check out now?e', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes',
            onPress: () => handleCheck('CheckOut'),
          },
        ]);
      } else if (serverError.includes('No CheckIn found')) {
        Alert.alert('No Check-In Found', 'Check in now?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes',
            onPress: () => handleCheck('CheckIn'),
          },
        ]);
      } else if (err.response?.status === 403) {
        Alert.alert('Out of Range', serverError || 'You are not within the allowed geofence.');
      } else {
        setAttendanceMsg(serverError || 'Attendance error');
      }
    }
  }

  // =============== RENDER VACATION BALANCES ===============
  const VacationCarousel = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {vacations.map((vac) => (
        <LinearGradient
          key={vac.leave_type}
          colors={[COLORS.primary, COLORS.secondary]}
          style={styles.vacationCard}
        >
          <Ionicons name="calendar" size={28} color={COLORS.white} />
          <Text style={styles.vacationType}>{vac.leave_type}</Text>
          <View style={styles.vacationStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{vac.current_balance}</Text>
              <Text style={styles.statLabel}>Days Left</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{vac.days_taken}</Text>
              <Text style={styles.statLabel}>Used</Text>
            </View>
          </View>
        </LinearGradient>
      ))}

    </ScrollView>

  );

  // last 5 requests
  const last5Requests = requests.slice(0, 5);

  // If loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.teal} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <>
      {showPopup && (
        <Animated.View style={[styles.successPopupWrapper, { transform: [{ scale: popupScale }] }]}>
          <LinearGradient
            colors={['#27ae60', '#2ecc71']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.successPopup}
          >
            <Ionicons name="checkmark-circle" size={60} color={COLORS.white} style={{ marginBottom: 10 }} />
            <Text style={styles.popupText}>{popupText}</Text>
          </LinearGradient>
        </Animated.View>
      )}


      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        // 4. Added refreshControl prop to ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary, COLORS.secondary]} // Android spinner colors
            tintColor={COLORS.primary} // iOS spinner color
          />
        }
      >
        {/* Enhanced Header with gradient */}
        <LinearGradient
          colors={[COLORS.primary, '#3949ab']}
          style={styles.header}
        >
          <View style={styles.profileContainer}>
            <LinearGradient
              colors={[COLORS.white, COLORS.background]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{employee?.name?.[0] || '?'}</Text>
            </LinearGradient>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{employee?.name}</Text>
              <Text style={styles.userRole}>{employee?.position}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Leave Balances */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Leave Balances</Text>
          </View>
          <VacationCarousel />
        </View>

        {/* Location Tracking */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="navigate" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Current Location</Text>
          </View>
          <Text style={{ color: COLORS.text, marginBottom: 8 }}>
            {location
              ? `Lat: ${location.latitude.toFixed(4)}, Lng: ${location.longitude.toFixed(4)}`
              : geoStatus || 'Location not available'}
          </Text>
          {currentProject === null && location && (
            <Text style={[styles.locationStatus, { color: COLORS.error }]}>
              You are not within any project's allowed radius!
            </Text>
          )}

          <Animated.View style={[styles.mapContainer, { opacity: mapOpacity }]}>
            {location && (
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker coordinate={location} pinColor={COLORS.secondary} />
              </MapView>
            )}
          </Animated.View>
        </View>

        {/* Attendance Control */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Attendance</Text>
          </View>

          <Animated.View style={{ opacity: messageOpacity }}>
            <Text
              style={[
                styles.attendanceMessage,
                attendanceMsg.includes('successful') && styles.successMessage,
              ]}
            >
              {attendanceMsg}
            </Text>
          </Animated.View>

          {/* Pulse & Press scale button */}
          <AttendanceButton
            nextPunch={nextPunch}
            handleCheckBiometric={handleCheckBiometric}
            canCheckInOut={canCheckInOut}
            buttonScale={buttonScale}
            handlePressIn={handlePressIn}
            handlePressOut={handlePressOut}
          />
        </View>

        {/* Last 5 Attendance Logs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Recent Attendance</Text>
          </View>
          {lastAttendances.map((att) => (
            <View key={att.id} style={styles.activityCard}>
              <Ionicons
                name={att.type === 'CheckIn' ? 'log-in' : 'log-out'}
                size={20}
                color={att.type === 'CheckIn' ? COLORS.success : COLORS.error}
              />
              <View style={styles.activityDetails}>
                <Text style={styles.activityTime}>
                  {new Date(att.log_time).toLocaleTimeString()}
                </Text>
                <Text style={styles.activityDate}>
                  {new Date(att.log_time).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.activityProject}>{att.project.name || 'No Project'}</Text>
            </View>
          ))}
        </View>

        {/* Recent Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Recent Requests</Text>
          </View>
          {last5Requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <Text style={styles.requestType}>{request.leave_type}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(request.status) },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{request.status}</Text>
                </View>
              </View>
              <Text style={styles.requestDates}>
                {request.start_date} → {request.end_date}
              </Text>
              {request.description && (
                <Text style={styles.requestDescription} numberOfLines={1}>
                  {request.description}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Announcements & Holidays */}
        <View style={styles.section}>
          <View style={styles.infoTabs}>
            <TouchableOpacity
              style={[styles.infoTab, annCount < announcements.length && styles.activeTab]}
              onPress={() => setAnnCount((p) => p + 3)}
            >
              <Ionicons name="megaphone" size={18} color={COLORS.teal} />
              <Text style={styles.infoTabText}>Announcements</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.infoTab, holCount < holidays.length && styles.activeTab]}
              onPress={() => setHolCount((p) => p + 3)}
            >
              <Ionicons name="calendar" size={18} color={COLORS.teal} />
              <Text style={styles.infoTabText}>Holidays</Text>
            </TouchableOpacity>
          </View>

          {/* Render announcements */}
          {announcements.slice(0, annCount).map((ann) => (
            <View key={ann.id} style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>{ann.title}</Text>
              <Text style={styles.infoCardContent}>{ann.content}</Text>
            </View>
          ))}

          {/* Render holidays */}
          {holidays.slice(0, holCount).map((hol) => (
            <View key={hol.id} style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>{hol.name}</Text>
              <Text style={styles.infoCardContent}>{hol.holiday_date}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </>

  );
}

/**
 * A sub-component for your attendance button that pulses and scales
 */
function AttendanceButton({
  nextPunch,
  handleCheckBiometric,
  canCheckInOut,
  buttonScale,
  handlePressIn,
  handlePressOut,
}) {
  // We'll do a continuous pulse in the background
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <AnimatedTouchable
      style={[
        styles.attendanceButton,
        {
          transform: [{ scale: buttonScale }, { scale: pulseAnim }],
          opacity: canCheckInOut() ? 1 : 0.5,
        },
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handleCheckBiometric}
      disabled={!canCheckInOut()}
    >
      <Ionicons
        name={nextPunch === 'CheckIn' ? 'finger-print' : 'log-out'}
        size={28}
        color={COLORS.white}
      />
      <Text style={styles.buttonText}>
        {nextPunch} with{'\n'}Biometrics
      </Text>
    </AnimatedTouchable>
  );
}

// Add / merge final styles
const mapStyle = []; // If you have custom map style, place it here.

const styles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.teal,
    fontWeight: '500',
  },

  /* ---- Enhanced Header ---- */
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    elevation: 5,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
  },

  /* ---- Section cards ---- */
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    marginHorizontal: 15,
    marginVertical: 10, // Added vertical margin for better spacing
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 10,
  },

  /* ---- Vacation Carousel ---- */
  vacationCard: {
    width: width * 0.7,
    borderRadius: 15,
    padding: 20,
    marginRight: 15,
    elevation: 5,
  },
  vacationType: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 10,
  },
  vacationStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.white,
    fontSize: 12,
    opacity: 0.9,
  },

  /* ---- Map & location ---- */
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  locationStatus: {
    fontSize: 13,
    marginBottom: 8,
  },

  /* ---- Attendance & button ---- */
  attendanceMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 8,
    color: COLORS.error, // default to error color
  },
  successMessage: {
    color: COLORS.success,
  },
  attendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    padding: 10,
    borderRadius: 15,
    marginVertical: 10,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 15,
    textAlign: 'center',
  },

  /* ---- Activity Card ---- */
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  activityDetails: {
    flex: 1,
    marginHorizontal: 15,
  },
  activityTime: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  activityDate: {
    fontSize: 12,
    color: COLORS.text,
    opacity: 0.7,
  },
  activityProject: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },

  /* ---- Requests ---- */
  requestCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestType: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statusBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  requestDates: {
    fontSize: 13,
    color: COLORS.text,
    opacity: 0.8,
    marginBottom: 4,
  },
  requestDescription: {
    fontSize: 13,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  successPopup: {
    position: 'absolute',
    top: height * 0.3,
    left: width * 0.1,
    width: width * 0.8,
    padding: 25,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 20,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.success,
    zIndex: 9999,
  },

  popupText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.success,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },



  /* ---- Announcements & Holidays ---- */
  infoTabs: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    marginHorizontal: 4,
  }, successPopupWrapper: {
    position: 'absolute',
    top: height * 0.3,
    left: width * 0.1,
    width: width * 0.8,
    zIndex: 9999,
    elevation: 20,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },

  successPopup: {
    width: '100%',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  popupText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  activeTab: {
    backgroundColor: 'rgba(28,108,124,0.08)',
    borderColor: COLORS.teal,
    borderWidth: 1,
  },
  infoTabText: {
    color: COLORS.teal,
    fontWeight: '500',
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  infoCardContent: {
    fontSize: 13,
    color: COLORS.text,
  },
});


if (mapStyle.length > 0) {
  styles.map = {
    ...styles.map,
    style: { mapStyle }, // Apply your custom style here
  };
}