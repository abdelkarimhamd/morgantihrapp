import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  useWindowDimensions, // <-- For dynamic screen sizing
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
// Icons
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * NotificationHeader
 * @param {object} props
 * @param {object} props.navigation - The navigation object (so we can toggleDrawer, navigate, etc.)
 * @param {string} [props.title='HR System'] - Optional title to display in center
 */
function NotificationHeader({ navigation, title = 'HR System' }) {
  const dispatch = useDispatch();
  // If announcements/holidays are stored in Redux:
  const announcements = useSelector((state) => state.announcements?.announcements) || [];
  const holidays = useSelector((state) => state.announcements?.holidays) || [];

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  // If you have an avatar menu:
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);

  // We'll store the computed "unread" in state
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch dimension & orientation info
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width >= 768; // e.g., tablet threshold
  const isLandscape = width > height;
  const isIOS = Platform.OS === 'ios';

  // Generate dynamic styles
  const dynamicStyles = useMemo(
    () => getDynamicStyles(isLargeScreen, isLandscape, isIOS),
    [isLargeScreen, isLandscape, isIOS]
  );

  useEffect(() => {
    fetchNotifications();
  }, []);

  /**
   * Fetch notifications from API
   * Convert IDs to strings so we can safely use .startsWith()
   */
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      // Normalize IDs to strings:
      const normalized = (res.data || []).map((item) => ({
        ...item,
        id: String(item.id),
      }));
      setNotifications(normalized);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const now = new Date();

  // Filter announcements based on active date range
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      if (!ann.is_active) return false;
      const startOK = ann.start_date ? new Date(ann.start_date) <= now : true;
      const endOK = ann.end_date ? new Date(ann.end_date) >= now : true;
      return startOK && endOK;
    });
  }, [announcements]);

  // Filter holidays that are in the future (or same day)
  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      if (!h.holiday_date) return false;
      return new Date(h.holiday_date) >= now;
    });
  }, [holidays]);

  // Convert announcements & holidays into same shape as notifications
  const announcementItems = useMemo(() => {
    return filteredAnnouncements.map((ann) => ({
      id: `ann-${ann.id}`,
      type: 'Announcement',
      message: ann.title + (ann.message ? `\n${ann.message}` : ''),
      created_at: ann.start_date || null,
      read: false,
    }));
  }, [filteredAnnouncements]);

  const holidayItems = useMemo(() => {
    return filteredHolidays.map((h) => ({
      id: `hol-${h.id}`,
      type: 'Holiday',
      message: h.name + (h.holiday_date ? `\n${h.holiday_date}` : ''),
      created_at: h.holiday_date || null,
      read: false,
    }));
  }, [filteredHolidays]);

  /**
   * Merge everything into one list & sort descending by created_at
   */
  const mergedList = useMemo(() => {
    const merged = [...notifications, ...announcementItems, ...holidayItems];
    return merged.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [notifications, announcementItems, holidayItems]);

  /**
   * Calculate unread count
   */
  useEffect(() => {
    const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
    const unreadAnnouncementsCount = filteredAnnouncements.length;
    const unreadHolidaysCount = filteredHolidays.length;

    setUnreadCount(unreadNotificationsCount + unreadAnnouncementsCount + unreadHolidaysCount);
  }, [notifications, filteredAnnouncements, filteredHolidays]);

  /**
   * Mark a single notification as read
   */
  async function handleMarkAsRead(notifId) {
    try {
      await api.post(`/notifications/${notifId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }

  function getNotificationIcon(type) {
    if (!type) {
      return <MaterialCommunityIcons name="information-outline" size={24} color="#555" />;
    }
    const lower = type.toLowerCase();
    if (lower.includes('approved') || lower.includes('created')) {
      return <MaterialCommunityIcons name="check-circle" size={24} color="green" />;
    }
    if (lower.includes('rejected') || lower.includes('error')) {
      return <MaterialCommunityIcons name="alert-circle" size={24} color="red" />;
    }
    if (lower.includes('holiday')) {
      return <MaterialCommunityIcons name="calendar" size={24} color="#1f3d7c" />;
    }
    if (lower.includes('announcement')) {
      return <MaterialCommunityIcons name="bullhorn" size={24} color="#1f3d7c" />;
    }
    return <MaterialCommunityIcons name="information-outline" size={24} color="#555" />;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return '';
    }
  }

  // Minimal avatar menu
  function handleLogout() {
    navigation.replace('Login');
  }

  function renderAvatarMenu() {
    if (!avatarMenuVisible) return null;
    return (
      <View style={dynamicStyles.avatarMenu}>
        <TouchableOpacity
          onPress={() => {
            setAvatarMenuVisible(false);
            navigation.navigate('Profile');
          }}
        >
          <Text style={dynamicStyles.menuItem}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setAvatarMenuVisible(false);
            handleLogout();
          }}
        >
          <Text style={dynamicStyles.menuItem}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderNotificationItem({ item }) {
    const isRead = !!item.read;
    return (
      <TouchableOpacity
        style={[
          dynamicStyles.notifItem,
          !isRead && { backgroundColor: 'rgba(25,118,210,0.08)' },
        ]}
        onPress={() => {
          // Mark real notifications as read (i.e., ID not starting with ann- / hol-)
          if (!item.id.startsWith('ann-') && !item.id.startsWith('hol-')) {
            handleMarkAsRead(item.id);
          }
        }}
      >
        {getNotificationIcon(item.type)}
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text style={{ fontWeight: isRead ? 'normal' : 'bold', marginBottom: 2 }}>
            {item.type || 'Notification'}
          </Text>
          <Text style={{ color: '#555', marginBottom: 2 }}>{item.message}</Text>
          <Text style={{ fontSize: 12, color: '#999' }}>{formatDate(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: '#1f3d7c' }}>
      <View style={dynamicStyles.headerInner}>
        {/* Hamburger: toggles drawer */}
        <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={dynamicStyles.leftIcon}>
          <Icon name="menu" size={dynamicStyles.iconSize} color="#fff" />
        </TouchableOpacity>

        {/* Title in the center */}
        <Text style={dynamicStyles.headerTitle}>{title}</Text>

        <View style={dynamicStyles.rightSection}>
          {/* Notifications Icon w/ Badge */}
          <TouchableOpacity onPress={() => setNotifModalVisible(true)}>
            <View style={{ position: 'relative' }}>
              <Icon name="notifications" size={dynamicStyles.iconSize - 2} color="#fff" />
              {unreadCount > 0 && (
                <View style={dynamicStyles.badgeContainer}>
                  <Text style={dynamicStyles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Avatar */}
          <TouchableOpacity
            style={{ marginLeft: 18 }}
            onPress={() => setAvatarMenuVisible(!avatarMenuVisible)}
          >
            <Icon name="account-circle" size={dynamicStyles.iconSize + 2} color="#fff" />
          </TouchableOpacity>
        </View>

        {renderAvatarMenu()}
      </View>

      {/* Notifications Modal */}
      {notifModalVisible && (
        <Modal
          animationType="fade"
          transparent
          visible={notifModalVisible}
          onRequestClose={() => setNotifModalVisible(false)}
        >
          <View style={dynamicStyles.modalOverlay}>
            <View style={dynamicStyles.modalContainer}>
              <Text style={dynamicStyles.modalTitle}>Notifications</Text>
              {loading ? (
                <ActivityIndicator style={{ marginVertical: 20 }} />
              ) : (
                <FlatList
                  data={mergedList}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={renderNotificationItem}
                  style={{ maxHeight: 400, marginTop: 10 }}
                />
              )}

              <TouchableOpacity
                style={[dynamicStyles.closeBtn, { marginTop: 16 }]}
                onPress={() => setNotifModalVisible(false)}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

/**
 * Returns StyleSheet that adapts to large vs. small screens,
 * portrait vs. landscape, and iOS vs. Android.
 * @param {boolean} isLargeScreen
 * @param {boolean} isLandscape
 * @param {boolean} isIOS
 */
function getDynamicStyles(isLargeScreen, isLandscape, isIOS) {
  // Adjust your logic below as you please.
  // Examples: bigger text or icons on large screens,
  // extra top padding on iOS, maybe less padding if in landscape, etc.
  const baseFontSize = isLargeScreen ? 20 : 16;
  const baseIconSize = isLargeScreen ? 32 : 26;

  return StyleSheet.create({
    headerInner: {
      flexDirection: 'row',
      alignItems: 'center',
      // More horizontal padding if large or landscape
      paddingHorizontal: isLargeScreen ? 16 : 12,
      paddingVertical: isLandscape ? 6 : isIOS ? 10 : 25,
      justifyContent: 'space-between',
    },
    leftIcon: {
      marginRight: 12,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: '#fff',
      fontSize: baseFontSize,
      fontWeight: 'bold',
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconSize: baseIconSize,
    badgeContainer: {
      position: 'absolute',
      right: -6,
      top: -4,
      backgroundColor: 'red',
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 2,
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
    },
    avatarMenu: {
      position: 'absolute',
      top: isLandscape ? 40 : 56, // if in landscape, push it up a bit
      right: isLargeScreen ? 20 : 12,
      backgroundColor: '#fff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ccc',
      padding: 8,
      zIndex: 9999,
    },
    menuItem: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      color: '#333',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: '#fff',
      borderRadius: 10,
      padding: isLargeScreen ? 24 : 16,
      width: isLargeScreen ? '60%' : '80%',
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: isLargeScreen ? 18 : 16,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    closeBtn: {
      backgroundColor: '#1c6c7c',
      paddingVertical: 10,
      borderRadius: 6,
      alignItems: 'center',
    },
    notifItem: {
      flexDirection: 'row',
      padding: isLargeScreen ? 12 : 8,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
  });
}

export default NotificationHeader;
