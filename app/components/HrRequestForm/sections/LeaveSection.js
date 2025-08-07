import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';          // ⬅️ NEW

const LeaveSection = ({ formValues, setFormValues }) => {
  const [errors, setErrors] = useState({});
  const [picker, setPicker] = useState({ field: null, mode: 'date' });
  const [attachments, setAttachments] = useState(formValues.attachments || []);   // ⬅️ NEW

  /* ---------- constants ---------- */
  const leaveTypes = [
    { id: 'personal', name: 'Personal Leave', icon: 'account-heart', color: '#4CAF50' },
    { id: 'unpaid',   name: 'Unpaid Leave',   icon: 'cash-remove',   color: '#FF9800' },
    { id: 'work_leave', name: 'Work Leave',   icon: 'briefcase',     color: '#2196F3' },
  ];

  /* ---------- helpers ---------- */
  const getDuration = () => {
    const from = formValues.fromDate instanceof Date ? formValues.fromDate : null;
    const to   = formValues.toDate   instanceof Date ? formValues.toDate   : null;
    if (!from || !to) return '';
    const diff = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
    return diff >= 1 ? `${diff} day(s)` : 'Less than a day';
  };

  const formatDate = (date) =>
    date instanceof Date
      ? date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Select date';

  const formatTime = (date) =>
    date instanceof Date
      ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : 'Select time';

  const handleSetValue = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  const handleOpenPicker = (field, mode) => setPicker({ field, mode });

  const handlePickerChange = (event, selectedDate) => {
    if (event.type === 'set' && selectedDate) handleSetValue(picker.field, selectedDate);
    setPicker({ field: null, mode: 'date' });
  };

  /* ---------- attachments ---------- */
  const pickFiles = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
      type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    });
    if (res.assets?.length) {
      const merged = [...attachments, ...res.assets].filter(
        (v, i, arr) => i === arr.findIndex((x) => x.uri === v.uri)
      );
      setAttachments(merged);
      handleSetValue('attachments', merged);
    }
  };

  const removeFile = (uri) => {
    const filtered = attachments.filter((f) => f.uri !== uri);
    setAttachments(filtered);
    handleSetValue('attachments', filtered);
  };

  /* ---------- UI ---------- */
  return (
    <View style={styles.sectionCard}>
      {/* Leave Type */}
      <Text style={styles.sectionTitle}>
        Leave Type <Text style={styles.required}>*</Text>
      </Text>
      {errors.leaveType && <Text style={styles.errorText}>{errors.leaveType}</Text>}

      <View style={styles.leaveTypeGrid}>
        {leaveTypes.map((type) => {
          const selected = formValues.leaveType === type.id;
          return (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.leaveTypeItem,
                {
                  borderColor: type.color,
                  backgroundColor: selected ? type.color : '#f5f5f5',
                },
              ]}
              onPress={() => handleSetValue('leaveType', type.id)}
            >
              <MaterialCommunityIcons
                name={type.icon}
                size={24}
                color={selected ? '#fff' : type.color}
              />
              <Text
                style={[
                  styles.leaveTypeText,
                  selected && { color: '#fff', fontWeight: '600' },
                ]}
              >
                {type.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Dates */}
      <Text style={styles.sectionTitle}>From - To Dates</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => handleOpenPicker('fromDate', 'date')}
        >
          <MaterialIcons name="date-range" size={20} color="#555" />
          <Text style={styles.dateText}>{formatDate(formValues.fromDate)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => handleOpenPicker('toDate', 'date')}
        >
          <MaterialIcons name="date-range" size={20} color="#555" />
          <Text style={styles.dateText}>{formatDate(formValues.toDate)}</Text>
        </TouchableOpacity>
      </View>

      {/* Times */}
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => handleOpenPicker('fromTime', 'time')}
        >
          <MaterialIcons name="access-time" size={20} color="#555" />
          <Text style={styles.dateText}>{formatTime(formValues.fromTime)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => handleOpenPicker('toTime', 'time')}
        >
          <MaterialIcons name="access-time" size={20} color="#555" />
          <Text style={styles.dateText}>{formatTime(formValues.toTime)}</Text>
        </TouchableOpacity>
      </View>

      {/* Native picker */}
      {picker.field && (
        <DateTimePicker
          value={formValues[picker.field] || new Date()}
          mode={picker.mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handlePickerChange}
        />
      )}

      {/* Duration */}
      <View style={styles.durationBox}>
        <MaterialIcons name="timelapse" size={20} color="#2E7D32" />
        <Text style={styles.durationText}>Duration: {getDuration()}</Text>
      </View>

      {/* Attachments */}
      <Text style={styles.sectionTitle}>Attachments</Text>
      <TouchableOpacity style={styles.fileBtn} onPress={pickFiles}>
        <MaterialIcons name="attach-file" size={22} color="#555" />
        <Text style={styles.fileBtnText}>Add files</Text>
      </TouchableOpacity>

      {attachments.map((f) => (
        <View key={f.uri} style={styles.fileRow}>
          <Text style={styles.fileName} numberOfLines={1}>
            {f.name}
          </Text>
          <TouchableOpacity onPress={() => removeFile(f.uri)}>
            <MaterialIcons name="close" size={20} color="#248bbc" />
          </TouchableOpacity>
        </View>
      ))}

      {/* Reason */}
      <Text style={styles.sectionTitle}>
        Reason <Text style={styles.required}>*</Text>
      </Text>
      {errors.reason && <Text style={styles.errorText}>{errors.reason}</Text>}
      <TextInput
        style={styles.reasonInput}
        placeholder="Brief explanation"
        placeholderTextColor="#aaa"
        value={formValues.reason}
        onChangeText={(text) => handleSetValue('reason', text)}
        multiline
        numberOfLines={4}
      />
    </View>
  );
};

export default LeaveSection;

/* --------------------------------------------
   STYLES
-------------------------------------------- */
const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 5,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  required: { color: '#248bbc' },
  errorText: {
    fontSize: 13,
    color: '#248bbc',
    marginBottom: 6,
  },
  leaveTypeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  leaveTypeItem: {
    width: '31%',
    padding: 12,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveTypeText: {
    fontSize: 13,
    color: '#333',
    marginTop: 6,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f6',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  dateText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#2c3e50',
  },
  durationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    marginBottom: 16,
  },
  durationText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
    color: '#2E7D32',
  },

  /* -------- attachments -------- */
  fileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f6',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
  },
  fileBtnText: { marginLeft: 6, color: '#333', fontSize: 14 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fafafa',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 6,
  },
  fileName: { flex: 1, fontSize: 13, color: '#555' },

  /* -------- reason -------- */
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#f8f9fa',
    textAlignVertical: 'top',
  },
});
