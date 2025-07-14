// app/screens/employee/ExitEntryRequestDetailsScreen.js
//------------------------------------------------------
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialIcons, AntDesign } from '@expo/vector-icons';
import api from '../../../../services/api';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const STORAGE_BASE =
  'https://app.morgantigcc.com/hr_system/backend/public/'.replace(/\/$/, '');

const buildUrl = (p = '') =>
  p.startsWith('http')
    ? p
    : `${STORAGE_BASE}/${p.replace(/^public\//, 'storage/')}`;

const openUrl = async (url) => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) return Linking.openURL(url);
    Alert.alert('Cannot open attachment', url);
  } catch (e) {
    Alert.alert('Error', 'Unable to open the attachment.');
  }
};

/* Optional – same colours you use in RequestsList for statuses */
export const STATUS_COLORS = {
  PENDING: '#f59e0b',
  APPROVED: '#27ae60',
  REJECTED: '#e74c3c',
  CANCELLED: '#667385',
  default: '#667385',
};

/* ------------------------------------------------------------------ */
/* Screen                                                             */
/* ------------------------------------------------------------------ */
export default function ExitEntryRequestDetailsScreen({ route, navigation }) {
  const { requestId } = route.params; // passed from the list card
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [cancelBusy, setCancelBusy] = useState(false);

  /* Fetch once ----------------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/exit-entry-requests/${requestId}`);
        setData(data);
      } catch (e) {
        Alert.alert('Error', 'Unable to load request details.');
        navigation.goBack();
      } finally {
        setBusy(false);
      }
    })();
  }, [requestId]);

  /* Cancel --------------------------------------------------------- */
  const cancelRequest = () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this request?',
      [
        { text: 'No' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            setCancelBusy(true);
            try {
              await api.post(`/exit-entry-requests/${requestId}/cancel`);
              Alert.alert('Cancelled', 'Request has been cancelled.');
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', 'Could not cancel request.');
            } finally {
              setCancelBusy(false);
            }
          },
        },
      ],
    );
  };

  /* Loading state -------------------------------------------------- */
  if (busy)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1f3d7c" />
      </View>
    );

  const {
    validity_from_date,
    validity_to_date,
    visa_type,
    period_in_days,
    reason,
    status,
    attachment_path,
    attachments = [],
  } = data;

  const showCancel = status === 'PENDING';

  /* ---------------------------------------------------------------- */
  /* Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <LinearGradient
        colors={['#1f3d7c', '#248bbc']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
          <Feather name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Request #{requestId}</Text>

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor:
                (STATUS_COLORS[status] || STATUS_COLORS.default) + '22',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: STATUS_COLORS[status] || STATUS_COLORS.default },
            ]}
          >
            {status}
          </Text>
        </View>
      </LinearGradient>

      {/* Body */}
      <View style={styles.card}>
        {[
          ['Validity From', validity_from_date],
          ['Validity To', validity_to_date],
          ['Visa Type', visa_type],
          ['Period (days)', period_in_days],
          ['Reason', reason],
        ].map(([label, value]) => (
          <InfoRow key={label} label={label} value={value} />
        ))}

        {/* Attachments */}
        {(attachment_path || attachments.length) > 0 && (
          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
            Attachments
          </Text>
        )}

        {attachment_path && (
          <AttachmentRow
            name={attachment_path.split('/').pop()}
            path={attachment_path}
          />
        )}

        {attachments.map((a) => (
          <AttachmentRow
            key={a.id}
            name={a.file_path.split('/').pop()}
            path={a.file_path}
          />
        ))}

        {/* Cancel */}
        {showCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            disabled={cancelBusy}
            onPress={cancelRequest}
          >
            {cancelBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <AntDesign name="closecircleo" size={18} color="#fff" />
                <Text style={styles.cancelTxt}>Cancel Request</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                     */
/* ------------------------------------------------------------------ */
function InfoRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  );
}

function AttachmentRow({ name, path }) {
  return (
    <TouchableOpacity
      style={styles.attachmentRow}
      onPress={() => openUrl(buildUrl(path))}
    >
      <MaterialIcons name="attach-file" size={18} color="#1c6c7c" />
      <Text style={styles.attachmentName} numberOfLines={1}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Header */
  header: {
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backBtn: { position: 'absolute', left: 20, top: 50 },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  statusText: { fontSize: 12, fontWeight: '600' },

  /* Card */
  card: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { color: '#4c6c7c', fontWeight: '600', marginBottom: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rowLabel: { color: '#4c6c7c', fontWeight: '600' },
  rowValue: { color: '#333', maxWidth: '60%', textAlign: 'right' },

  /* Attachment */
  attachmentRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  attachmentName: { color: '#1c6c7c', flex: 1 },

  /* Cancel */
  cancelBtn: {
    marginTop: 24,
    backgroundColor: '#d32f2f',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 8,
  },
  cancelTxt: { color: '#fff', fontWeight: '600' },
});

/* ------------------------------------------------------------------ */
/* Navigator snippet (for reference)                                  */
/* ------------------------------------------------------------------ */
/*
<Stack.Screen
  name="ExitEntryRequestDetails"
  component={ExitEntryRequestDetailsScreen}
  options={{ headerShown: false }}
/>

--- In RequestsList card ---
onPress={() => navigation.navigate('ExitEntryRequestDetails', { requestId: item.id })}
*/
