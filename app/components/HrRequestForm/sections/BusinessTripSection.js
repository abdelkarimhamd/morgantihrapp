// app/components/HrRequestForm/sections/BusinessTripSection.js
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import SectionHeader from '../SectionHeader';
import FieldWithIcon from '../FieldWithIcon';

/* ---------- UI COLORS ---------- */
const COLORS = {
  primary: '#7E57C2',
  card: '#FFFFFF',
  border: '#CFD8DC',
  text: '#263238',
};

/* ---------- FILE RULES ---------- */
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

// Images + PDF + Word + Excel
const ALLOWED_MIMES = [
  // images (wildcard and explicit)
  'image/*',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/gif',
  'image/bmp',
  'image/webp',
  // pdf
  'application/pdf',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/* ---------- HELPERS ---------- */
const asDate = (v) => (v instanceof Date ? v : v ? new Date(v) : new Date());

/** Convert Expo DocumentPicker asset → FormData-ready file object */
const toFile = (asset) => {
  const ext = (asset.name || '').split('.').pop()?.toLowerCase();
  const mimeGuess =
    asset.mimeType ||
    asset.type ||
    {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }[ext] ||
    'application/octet-stream';

  return {
    uri: asset.uri,
    name: asset.name || `file-${Date.now()}`,
    type: mimeGuess,
    size: asset.size ?? 0,
  };
};

export default function BusinessTripSection({ formValues = {}, setFormValues }) {
  const [picker, setPicker] = useState({ field: null, mode: 'date' });

  const setField = (field, value) =>
    setFormValues((p) => ({ ...p, [field]: value }));

  /* ----- Attachments picker ----- */
  const addFiles = async () => {
    try {
      // No "type" filter => nothing disabled in the native chooser
      const res = await DocumentPicker.getDocumentAsync({
        multiple: Platform.OS !== 'ios', // iOS: single-select
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;

      const picked = 'assets' in res ? res.assets : [res];
      const mapped = picked.map(toFile);

      const { valid, rejected } = mapped.reduce(
        (acc, f) => {
          const tooBig  = f.size > MAX_FILE_SIZE;
          const badMime =
            !ALLOWED_MIMES.some((m) =>
              m.endsWith('/*')
                ? f.type.startsWith(m.split('/')[0])
                : f.type === m
            );
          (tooBig || badMime ? acc.rejected : acc.valid).push(f);
          return acc;
        },
        { valid: [], rejected: [] },
      );

      if (rejected.length) {
        Alert.alert(
          'Some files skipped',
          rejected
            .map((f) =>
              f.size > MAX_FILE_SIZE
                ? `${f.name} (> 8 MB)`
                : `${f.name} (type ${f.type})`,
            )
            .join('\n'),
        );
      }
      if (!valid.length) return;

      // deduplicate on URI, then add to form state
      setFormValues((prev) => ({
        ...prev,
        businessTripAttachments: [
          ...(prev.businessTripAttachments ?? []),
          ...valid,
        ].filter(
          (v, i, arr) => i === arr.findIndex((x) => x.uri === v.uri),
        ),
      }));
    } catch (e) {
      if (e?.code !== 'DOCUMENT_PICKER_CANCELED') {
        console.warn('[BusinessTrip/addFiles]', e);
        Alert.alert('Unexpected error', 'Could not pick the file. Try again.');
      }
    }
  };

  const removeFile = (idx) =>
    setFormValues((prev) => {
      const clone = [...(prev.businessTripAttachments ?? [])];
      clone.splice(idx, 1);
      return { ...prev, businessTripAttachments: clone };
    });

  /* ----- Date / Time picker helpers ----- */
  const openPicker = (field, mode) => setPicker({ field, mode });
  const onPick = (_e, date) => {
    if (date instanceof Date) setField(picker.field, date);
    setPicker({ field: null, mode: 'date' });
  };

  /* ----- Formatters ----- */
  const fmtDate = (d) =>
    d
      ? asDate(d).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'Select date';
  const fmtTime = (d) =>
    d
      ? asDate(d).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Select time';

  /* ----- UI ----- */
  return (
    <View style={styles.card}>
      <SectionHeader icon="flight-takeoff" title="Business Trip" />

      {/* region */}
      <FieldWithIcon
        icon="earth"
        label="Region"
        placeholder="gcc / non_gcc"
        value={formValues.busTripRegion}
        onChangeText={(v) => setField('busTripRegion', v)}
      />

      {/* purpose */}
      <FieldWithIcon
        icon="briefcase"
        label="Purpose of Trip"
        placeholder="e.g. Client meeting"
        multiline
        numberOfLines={2}
        value={formValues.busTripReason}
        onChangeText={(v) => setField('busTripReason', v)}
      />

      {/* destination / notes */}
      <FieldWithIcon
        icon="map-marker"
        label="Destination / Notes"
        placeholder="List cities, extra info…"
        multiline
        numberOfLines={2}
        value={formValues.busTripNotes}
        onChangeText={(v) => setField('busTripNotes', v)}
      />

      {/* Departure date / time */}
      <TouchableOpacity
        style={styles.dateTimeInput}
        onPress={() => openPicker('fromDate', 'date')}
      >
        <MaterialCommunityIcons name="calendar-arrow-right" size={20} color={COLORS.primary} />
        <Text style={styles.dateTimeText}>{fmtDate(formValues.fromDate)}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.dateTimeInput}
        onPress={() => openPicker('fromTime', 'time')}
      >
        <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.primary} />
        <Text style={styles.dateTimeText}>{fmtTime(formValues.fromTime)}</Text>
      </TouchableOpacity>

      {/* Return date / time */}
      <TouchableOpacity
        style={styles.dateTimeInput}
        onPress={() => openPicker('toDate', 'date')}
      >
        <MaterialCommunityIcons name="calendar-arrow-left" size={20} color={COLORS.primary} />
        <Text style={styles.dateTimeText}>{fmtDate(formValues.toDate)}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.dateTimeInput}
        onPress={() => openPicker('toTime', 'time')}
      >
        <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.primary} />
        <Text style={styles.dateTimeText}>{fmtTime(formValues.toTime)}</Text>
      </TouchableOpacity>

      {/* Attachments */}
      <SectionHeader icon="paperclip" title="Travel Documents" />

      <TouchableOpacity style={styles.fileBtn} onPress={addFiles}>
        <MaterialCommunityIcons name="attachment" size={20} color={COLORS.primary} />
        <Text style={styles.fileBtnText}>Add files</Text>
      </TouchableOpacity>

      {(formValues.businessTripAttachments ?? []).map((f, i) => (
        <View key={f.uri ?? i} style={styles.fileRow}>
          <MaterialCommunityIcons name="file-document-outline" size={20} color={COLORS.primary} />
          <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
          <TouchableOpacity onPress={() => removeFile(i)} hitSlop={10}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#E53935" />
          </TouchableOpacity>
        </View>
      ))}

      {/* DateTimePicker modal (only when picker.field not null) */}
      {picker.field && (
        <DateTimePicker
          value={asDate(formValues[picker.field])}
          mode={picker.mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPick}
        />
      )}
    </View>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateTimeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  dateTimeText: { marginLeft: 10, fontSize: 14, color: COLORS.text },
  fileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  fileBtnText: { marginLeft: 8, fontSize: 14, color: COLORS.text },
  fileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  fileName: { flex: 1, marginHorizontal: 6, fontSize: 13, color: COLORS.text },
});
