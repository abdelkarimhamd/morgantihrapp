// File: app/screens/Manager/ManagerDashboard.jsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import moment from 'moment';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSelector } from 'react-redux';
import api from '../../../services/api';

// Optional: For map display
import MapView, { Marker } from 'react-native-maps';

/* ------------------------------------------
   Enable LayoutAnimation for Android
------------------------------------------ */
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ------------------------------------------
   Color Palette
------------------------------------------ */
const COLORS = {
  navy: '#1f3d7c',
  brightBlue: '#248bbc',
  forest: '#74933c',
  teal: '#1c6c7c',
  tealGray: '#4c6c7c',
  white: '#ffffff',
  background: '#f4f7f9', // Slightly cooler background
  textDark: '#2d3748', // Darker text for better contrast
  textLight: '#718096', // Softer light text
  danger: '#e53935',
  success: '#43a047',
  warning: '#fb8c00',
  border: '#e2e8f0',
};

/* ------------------------------------------
   Leave Type Configuration with Emojis
------------------------------------------ */
const LEAVE_TYPE_CONFIG = {
  Annual: { display: 'Annual', color: '#74933c', icon: '🌴' },
  Sick: { display: 'Sick', color: '#248bbc', icon: '🤒' },
  Emergency: { display: 'Emergency', color: '#e53935', icon: '🚨' },
  Unpaid: { display: 'Unpaid', color: '#9e9e9e', icon: '💸' },
  BabyBorn: { display: 'Baby Born', color: '#ff8f00', icon: '👶' },
  FamilyDeath: { display: 'Passing Away (Family)', color: '#6d4c41', icon: '🕊️' },
  Exam: { display: 'Exam', color: '#5e35b1', icon: '📝' },
  Haj: { display: 'Haj', color: '#00897b', icon: '🕋' },
  Marriage: { display: 'Marriage', color: '#c2185b', icon: '💍' },
  Pregnancy: { display: 'Pregnancy', color: '#f06292', icon: '🤰' },
  HusbandDeath: { display: 'Passing Away (Husband)', color: '#37474f', icon: '🖤' },
};

/* ------------------------------------------
   Helper Functions
------------------------------------------ */
const calculateServicePeriod = (joinDate) => {
  if (!joinDate) return 'N/A';
  const diff = moment.duration(moment().diff(moment(joinDate)));
  const years = diff.years();
  const months = diff.months();
  return `${years}y ${months}m`;
};

const daysRemainingInYear = () => {
  return moment().endOf('year').diff(moment(), 'days');
};

const getDailyAccrualRate = (contract, leaveType) => {
  if (leaveType === 'Annual') {
    if (contract === '30 Days Yearly') return 30 / 365;
    if (contract === '21 Days Yearly') return 21 / 365;
  }
  return 0;
};

// Animated Touchable
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/*
================================================================================
MAIN COMPONENT: ManagerDashboard
================================================================================
*/
export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true);

  // Data states
  const [manager, setManager] = useState(null);
  const [contractType, setContractType] = useState('');
  const [vacations, setVacations] = useState([]);
  const [myReqs, setMyReqs] = useState([]);
  const [subReqs, setSubReqs] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [anns, setAnns] = useState([]);

  // UI states
  const [openSections, setOpenSections] = useState({
    balances: true,
    myReqs: true,
    subReqs: true,
    anns: true,
    hols: true,
  });
  const role = useSelector((state) => state.auth.user?.role);

  // Attendance & Location states
  const [location, setLocation] = useState(null);
  const [geoStatus, setGeoStatus] = useState('');
  const [attendanceMsg, setAttendanceMsg] = useState('');
  const [lastPunchType, setLastPunchType] = useState(null);

  // Animation refs
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Initial data fetch and location setup
  useEffect(() => {
    requestLocationPermission();
    fetchDashboard();

    // Setup pulsing animation for the avatar
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Fetch last punch info after manager data is available
  useEffect(() => {
    if (manager) fetchLastPunch();
  }, [manager]);

  // Animate attendance message visibility
  useEffect(() => {
    Animated.timing(messageOpacity, {
      toValue: attendanceMsg ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [attendanceMsg]);

  /* ------------------------------------------
   Location & Permissions
  ------------------------------------------ */
  const requestLocationPermission = async () => {
    try {
      setGeoStatus('Requesting location...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGeoStatus('Permission denied.');
        Alert.alert('Permission Denied', 'Location access is required for attendance marking.');
        return;
      }
      startLocationWatch();
    } catch (err) {
      console.error('Location Permission Error:', err);
      setGeoStatus('Permission error.');
    }
  };

  const startLocationWatch = async () => {
    setGeoStatus('Acquiring location...');
    Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 1 }, (pos) => {
      setLocation(pos.coords);
      setGeoStatus(''); // Clear status once location is acquired
    });
  };

  /* ------------------------------------------
   API Fetching
  ------------------------------------------ */
  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [dashboard, hol, ann] = await Promise.all([
        api.get('/manager/dashboard'),
        api.get('/holidays'),
        api.get('/announcements'),
      ]);
      const data = dashboard.data;
      setManager(data.manager || {});
      setContractType(data.manager?.contract_type || '');
      setVacations(data.vacations || []);
      setMyReqs(data.managerRequests || []);
      setSubReqs(data.subordinateRequests || []);
      setHolidays(hol.data || []);
      setAnns(ann.data || []);
    } catch (err) {
      console.error('Dashboard Fetch Error:', err);
      Alert.alert('Error', 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLastPunch = async () => {
    try {
      const today = moment().format('YYYY-MM-DD');
      const resp = await api.get('/attendances', {
        params: { employee_code: manager.employee_code, from: `${today} 00:00:00`, to: `${today} 23:59:59` },
      });
      const list = resp.data.data || [];
      list.sort((a, b) => new Date(b.log_time) - new Date(a.log_time));
      setLastPunchType(list.length > 0 ? list[0].type : null);
    } catch (err) {
      console.error('Fetch Last Punch Error:', err);
    }
  };

  /* ------------------------------------------
   Attendance Logic
  ------------------------------------------ */
  const decideNextPunch = () => (!lastPunchType || lastPunchType === 'CheckOut' ? 'CheckIn' : 'CheckOut');
  const canPunch = () => !!location;

  const promptBiometricAuth = async () => {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (!hasHardware) throw new Error('Biometric hardware not available.');
    if (!isEnrolled) throw new Error('No biometrics enrolled on this device.');
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to mark attendance',
    });
    if (!result.success) throw new Error(`Authentication failed: ${result.error}`);
  };

  const handlePunchBiometric = async () => {
    if (!canPunch()) {
      setAttendanceMsg('Cannot punch: Location not available.');
      return;
    }
    try {
      // await promptBiometricAuth(); // Uncomment to enable biometrics
      await handlePunch(decideNextPunch());
    } catch (err) {
      console.error('Biometric/Punch Error:', err);
      setAttendanceMsg(err.message || 'Authentication failed.');
    }
  };

  const handlePunch = async (type) => {
    try {
      const payload = {
        employee_code: manager.employee_code,
        device_stgid: 'PHONE-01',
        log_time: moment().format('YYYY-MM-DD HH:mm:ss'),
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
        setAttendanceMsg(`${type} successful at ${moment().format('hh:mm A')}.`);
        fetchLastPunch(); // Re-fetch to confirm
      } else {
        throw new Error('Server returned no confirmation ID.');
      }
    } catch (err) {
      console.error('Handle Punch Error:', err?.response?.data || err);
      const serverError = err?.response?.data?.error || 'An unknown error occurred.';
      setAttendanceMsg(serverError);
      // Optional: Add specific alert logic for common errors like 'already checked in'
    }
  };

  // Button press animations
  const handlePressIn = () => Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(buttonScale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();

  /* ------------------------------------------
   Derived Data & UI Helpers
  ------------------------------------------ */
  const latest = (arr) => [...arr].sort((a, b) => new Date(b.start_date) - new Date(a.start_date)).slice(0, 5);

  const balances = vacations.map((v) => {
    const current = +v.current_balance || 0;
    const dailyRate = getDailyAccrualRate(contractType, v.leave_type);
    const projected = current + dailyRate * daysRemainingInYear();
    return { ...v, current_balance: current, projected_balance: projected };
  });

  const toggleSection = (key) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ------------------------------------------
   Render Loading State
  ------------------------------------------ */
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.navy} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  /* ------------------------------------------
   Main Render
  ------------------------------------------ */
  return (
    <ScrollView style={styles.container}>
      {/* --- HEADER --- */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <Animated.View style={[styles.avatar, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.avatarText}>{manager?.name?.[0] || 'M'}</Text>
          </Animated.View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerGreeting}>{moment().format('dddd, MMMM D')}</Text>
            <Text style={styles.headerName} numberOfLines={1}>{manager?.name || 'Manager'}</Text>
            <Text style={styles.headerSubText} numberOfLines={1}>
              {manager?.position} {manager?.department ? `• ${manager.department}` : ''}
            </Text>
            <Text style={styles.headerSubText}>
              Service: {calculateServicePeriod(manager?.joining_date)}
            </Text>
          </View>
        </View>
      </View>

      {/* --- ATTENDANCE --- */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Attendance</Text>
        <Animated.Text style={[styles.attendanceMessage, { opacity: messageOpacity, color: attendanceMsg.includes('successful') ? COLORS.success : COLORS.danger }]}>
          {attendanceMsg}
        </Animated.Text>
        <Text style={styles.smallText}>
          {location
            ? `📍 Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
            : `🛰️ ${geoStatus || 'Waiting for location...'}`}
        </Text>
        {lastPunchType && (
          <Text style={[styles.smallText, { marginTop: 4 }]}>
            Last action: <Text style={{ fontWeight: '600' }}>{lastPunchType}</Text>
          </Text>
        )}

        {location && (
          <View style={styles.mapContainer}>
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={location} title="My Location" />
            </MapView>
          </View>
        )}

        <AnimatedTouchable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePunchBiometric}
          disabled={!canPunch()}
          style={[
            styles.punchButton,
            {
              backgroundColor: decideNextPunch() === 'CheckIn' ? COLORS.forest : COLORS.danger,
              opacity: canPunch() ? 1 : 0.6,
              transform: [{ scale: buttonScale }],
            },
          ]}
        >
          <Text style={styles.punchButtonIcon}>🔒</Text>
          <Text style={styles.punchButtonText}>
            {decideNextPunch()} with Biometrics
          </Text>
        </AnimatedTouchable>
      </View>

      {/* --- LEAVE BALANCES --- */}
      <Section title="My Leave Balances" open={openSections.balances} onToggle={() => toggleSection('balances')}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
          {balances.map((b) => (
            <BalanceCard key={b.leave_type} balance={b} />
          ))}
        </ScrollView>
      </Section>

      {/* --- MY REQUESTS --- */}
      <Section title="My Recent Requests" open={openSections.myReqs} onToggle={() => toggleSection('myReqs')}>
        <RequestList requests={latest(myReqs)} isSub={false} />
      </Section>

      {/* --- SUBORDINATE REQUESTS --- */}
      {role !== 'finance' && (
        <Section title="Subordinate Requests" open={openSections.subReqs} onToggle={() => toggleSection('subReqs')}>
          <RequestList requests={latest(subReqs)} isSub />
        </Section>
      )}

      {/* --- ANNOUNCEMENTS --- */}
      <Section title="Announcements" open={openSections.anns} onToggle={() => toggleSection('anns')}>
        <TimelineList data={anns} type="announcement" />
      </Section>

      {/* --- HOLIDAYS --- */}
      <Section title="Upcoming Holidays" open={openSections.hols} onToggle={() => toggleSection('hols')}>
        <TimelineList data={holidays} type="holiday" />
      </Section>
    </ScrollView>
  );
}

/*
================================================================================
SUB-COMPONENTS
================================================================================
*/

const Section = ({ title, open, onToggle, children }) => (
  <View style={styles.card}>
    <TouchableOpacity activeOpacity={0.8} onPress={onToggle} style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      <Text style={styles.sectionHeaderIcon}>{open ? '▲' : '▼'}</Text>
    </TouchableOpacity>
    {open && <View style={styles.sectionBody}>{children}</View>}
  </View>
);

const BalanceCard = ({ balance }) => {
  const cfg = LEAVE_TYPE_CONFIG[balance.leave_type] || {};
  const used = balance.days_taken || 0;
  const available = balance.current_balance;
  const total = used + available;
  const pct = total > 0 ? (available / total) * 100 : 0;

  return (
    <View style={styles.balanceCard}>
      <View style={styles.balanceHeader}>
        <Text style={styles.leaveIcon}>{cfg.icon || '❓'}</Text>
        <Text style={styles.leaveType}>{cfg.display || balance.leave_type}</Text>
      </View>
      <Text style={styles.balanceValue}>{available.toFixed(1)} <Text style={{fontSize: 14, fontWeight: '500'}}>days</Text></Text>
      <Text style={styles.balanceLabel}>Available</Text>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: cfg.color || COLORS.teal }]} />
      </View>
      <View style={styles.balanceFooter}>
        <Text style={styles.progressInfo}>Used: {used}</Text>
        <Text style={styles.progressInfo}>Pending: {balance.on_hold || 0}</Text>
      </View>
    </View>
  );
};

const RequestList = ({ requests, isSub }) => {
  if (requests.length === 0) return <Text style={styles.emptyState}>No requests found.</Text>;
  return (
    <View>
      {requests.map((r, index) => {
        const cfg = LEAVE_TYPE_CONFIG[r.leave_type] || {};
        return (
          <View key={r.id} style={[styles.requestRow, index === requests.length - 1 && styles.requestRowLast]}>
            <View style={{ flex: isSub ? 1.2 : 1 }}>
              {isSub && <Text style={styles.requestName}>{r.user?.name || `ID: ${r.user_id}`}</Text>}
              <Text style={[styles.requestLeaveType, { color: cfg.color }]}>{cfg.display || r.leave_type}</Text>
            </View>
            <View style={styles.requestDates}>
              <Text style={styles.requestDateText}>{moment(r.start_date).format('MMM D')}</Text>
              <Text style={styles.requestDateText}>- {moment(r.end_date).format('MMM D, YY')}</Text>
            </View>
            <StatusBadge status={r.status} />
          </View>
        );
      })}
    </View>
  );
};

const StatusBadge = ({ status }) => {
  const statusStyles = {
    Approved: { backgroundColor: COLORS.success },
    Pending: { backgroundColor: COLORS.warning },
    Rejected: { backgroundColor: COLORS.danger },
  };
  return (
    <View style={[styles.statusBadge, statusStyles[status] || { backgroundColor: COLORS.textLight }]}>
      <Text style={styles.statusBadgeText}>{status}</Text>
    </View>
  );
};

const TimelineList = ({ data, type }) => {
  if (data.length === 0) {
    return <Text style={styles.emptyState}>{type === 'holiday' ? '🎉 No holidays planned.' : '📭 No announcements yet.'}</Text>;
  }
  return (
    <View style={styles.timelineContainer}>
      {data.map((item, index) => (
        <View key={item.id} style={styles.timelineItem}>
          <View style={styles.timelineLine} />
          <View style={[styles.timelineDot, type === 'holiday' && { backgroundColor: COLORS.forest }]} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>{type === 'holiday' ? item.name : item.title}</Text>
            <Text style={styles.timelineDate}>
              {moment(type === 'holiday' ? item.holiday_date : item.created_at).format('dddd, MMM D, YYYY')}
            </Text>
            {type === 'announcement' && <Text style={styles.timelineMsg}>{item.message}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
};

/*
================================================================================
STYLESHEET
================================================================================
*/
const styles = StyleSheet.create({
  // --- Containers & General ---
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
    marginTop: 10,
    fontSize: 16,
    color: COLORS.navy,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 8,
  },
  smallText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  emptyState: {
    textAlign: 'center',
    marginVertical: 16,
    color: COLORS.textLight,
    fontSize: 14,
  },

  // --- Header ---
  headerContainer: {
    backgroundColor: COLORS.navy,
    padding: 16,
    paddingTop: 40, // Adjust for status bar
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.navy,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerGreeting: {
    fontSize: 14,
    color: COLORS.border,
  },
  headerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubText: {
    fontSize: 13,
    color: COLORS.border,
    opacity: 0.9,
  },

  // --- Attendance Section ---
  attendanceMessage: {
    marginVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  mapContainer: {
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: COLORS.border,
  },
  punchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  punchButtonIcon: {
    fontSize: 18,
    color: COLORS.white,
    marginRight: 10,
  },
  punchButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },

  // --- Collapsible Section ---
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 0, // Removed padding as it's in the card now
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.navy,
  },
  sectionHeaderIcon: {
    fontSize: 18,
    color: COLORS.textLight,
  },
  sectionBody: {
    paddingTop: 12,
  },

  // --- Balance Card (Horizontal Scroll) ---
  balanceCard: {
    width: 160,
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaveIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  leaveType: {
    fontWeight: '600',
    fontSize: 14,
    color: COLORS.textDark,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  balanceLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressInfo: {
    fontSize: 11,
    color: COLORS.textLight,
  },

  // --- Request List ---
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  requestRowLast: {
    borderBottomWidth: 0,
  },
  requestName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  requestLeaveType: {
    fontSize: 13,
    fontWeight: '500',
  },
  requestDates: {
    flex: 1.5,
    alignItems: 'center',
  },
  requestDateText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  statusBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },

  // --- Timeline (Announcements & Holidays) ---
  timelineContainer: {
    paddingLeft: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    paddingBottom: 20,
  },
  timelineLine: {
    position: 'absolute',
    left: 4,
    top: 12,
    bottom: -10, // Extend line between dots
    width: 2,
    backgroundColor: COLORS.border,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.brightBlue,
    marginTop: 5,
    zIndex: 1, // Ensure dot is above the line
  },
  timelineContent: {
    flex: 1,
    marginLeft: 16,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
    lineHeight: 20,
  },
  timelineDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginVertical: 2,
  },
  timelineMsg: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 18,
  },
});
