// app/screens/employee/ExitEntryRequestScreen.js
//------------------------------------------------
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Feather, AntDesign } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';

import api from '../../../../services/api';

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                */
/* ------------------------------------------------------------------ */
const ENDPOINT  = '/exit-entry-requests';
const VISA_OPTS = ['choose', 'One Visit', 'Multiple Visits'];

/* tiny MIME helper (pure JS, fine for Expo / bare RN) */
const guessMime = (filename = '') => {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    doc: 'application/msword',
    docx:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    csv: 'text/csv',
    txt: 'text/plain',
    zip: 'application/zip',
    rar: 'application/vnd.rar',
  };
  return map[ext] || 'application/octet-stream';
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export default function ExitEntryRequestScreen({ navigation }) {
  /* form state */
  const [form, setForm] = useState({
    validity_from_date: null,
    validity_to_date: null,
    visa_type: 'choose',
    period_in_days: '',
    reason: '',
    document: null, // DocumentPicker asset
  });

  /* ui state */
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [valErrors, setValErrors] = useState([]);

  /* helpers */
  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const pickDate = (key, hide) => (e, d) => {
    hide(false);
    if (e.type !== 'dismissed' && d) setField(key, d);
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (res.assets?.length) setField('document', res.assets[0]);
  };
  const removeDocument = () => setField('document', null);

  /* submit */
  const submit = async () => {
    setBusy(true);
    setError('');
    setValErrors([]);

    try {
      const fd = new FormData();
      const toYMD = (d) => (d ? d.toISOString().split('T')[0] : '');

      fd.append('validity_from_date', toYMD(form.validity_from_date));
      fd.append('validity_to_date', toYMD(form.validity_to_date));
      fd.append('visa_type', form.visa_type);
      fd.append('period_in_days', form.period_in_days);
      fd.append('reason', form.reason);

      if (form.document) {
        const { uri, name } = form.document;
        fd.append('document', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          name: name || 'attachment',
          type: guessMime(name),
        });
      }

      await api.post(ENDPOINT, fd); // Axios sets correct headers
      Alert.alert('Success', 'Exit / Entry request created!');
      navigation.goBack();
    } catch (e) {
      if (e.response?.status === 422 && e.response.data?.errors) {
        setValErrors(Object.values(e.response.data.errors).flat());
      } else {
        setError('Failed to create request. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  /* render */
  const {
    validity_from_date: from,
    validity_to_date: to,
    visa_type,
    period_in_days,
    document,
  } = form;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <LinearGradient colors={['#1f3d7c', '#248bbc']} style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={navigation.goBack}
            >
              <Feather name="chevron-left" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Exit/Entry Request</Text>
            <Text style={styles.headerSubtitle}>
              Complete the form below to submit your request
            </Text>
          </LinearGradient>

          {/* Errors */}
          {!!error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color="#d32f2f" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {valErrors.length > 0 && (
            <View style={styles.validationErrorBox}>
              {valErrors.map((m, i) => (
                <Text key={i} style={styles.validationErrorItem}>
                  • {m}
                </Text>
              ))}
            </View>
          )}

          {/* Summary */}
          <View style={styles.summaryCard}>
            {[
              [
                'Validity From',
                from ? from.toISOString().split('T')[0] : '—',
              ],
              ['Validity To', to ? to.toISOString().split('T')[0] : '—'],
              ['Visa Type', visa_type === 'choose' ? '—' : visa_type],
              ['Period (Days)', period_in_days || '—'],
            ].map(([l, v]) => (
              <Text key={l} style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>{l}:</Text> {v}
              </Text>
            ))}
            <Text style={styles.summaryNote}>
              Review these fields before submitting your request.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* From date */}
            <Text style={styles.inputLabel}>Validity From Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowFromPicker(true)}
            >
              <Feather name="calendar" size={18} color="#1c6c7c" />
              <Text style={styles.dateText}>
                {from
                  ? from.toISOString().split('T')[0]
                  : 'Select a start date'}
              </Text>
            </TouchableOpacity>
            {showFromPicker && (
              <DateTimePicker
                mode="date"
                value={from || new Date()}
                onChange={pickDate('validity_from_date', setShowFromPicker)}
              />
            )}

            {/* To date */}
            <Text style={styles.inputLabel}>Validity To Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowToPicker(true)}
            >
              <Feather name="calendar" size={18} color="#1c6c7c" />
              <Text style={styles.dateText}>
                {to ? to.toISOString().split('T')[0] : 'Select an end date'}
              </Text>
            </TouchableOpacity>
            {showToPicker && (
              <DateTimePicker
                mode="date"
                value={to || new Date()}
                onChange={pickDate('validity_to_date', setShowToPicker)}
              />
            )}

            {/* Visa type */}
            <Text style={styles.inputLabel}>Visa Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={visa_type}
                onValueChange={(v) => setField('visa_type', v)}
                style={styles.picker}
              >
                {VISA_OPTS.map((o) => (
                  <Picker.Item
                    key={o}
                    value={o}
                    label={o}
                    style={
                      o === 'choose' ? styles.placeholderItem : styles.pickerItem
                    }
                  />
                ))}
              </Picker>
            </View>

            {/* Period */}
            <Text style={styles.inputLabel}>Period (Days)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter number of days"
              placeholderTextColor="#90a4ae"
              keyboardType="numeric"
              value={period_in_days}
              onChangeText={(v) => setField('period_in_days', v)}
            />

            {/* Reason */}
            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              multiline
              placeholder="Explain your request…"
              placeholderTextColor="#90a4ae"
              value={form.reason}
              onChangeText={(v) => setField('reason', v)}
            />

            {/* Attachment */}
            <Text style={styles.inputLabel}>Attachment (Optional)</Text>
            {!document ? (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickDocument}
              >
                <LinearGradient
                  colors={['#f5f5f5', '#fff']}
                  style={styles.uploadContent}
                >
                  <Feather name="upload" size={24} color="#1c6c7c" />
                  <Text style={styles.uploadText}>Choose File</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.fileContainer}>
                <MaterialIcons
                  name="insert-drive-file"
                  size={24}
                  color="#1c6c7c"
                />
                <Text style={styles.fileName} numberOfLines={1}>
                  {document.name}
                </Text>
                <TouchableOpacity onPress={removeDocument}>
                  <AntDesign name="closecircle" size={20} color="#d32f2f" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={styles.submitButton}
            disabled={busy}
            onPress={submit}
          >
            <LinearGradient
              colors={['#74933c', '#4c6c7c']}
              style={styles.gradientButton}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------------------ */
/* Styles – matches your existing design language                     */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  /* header */
  header: {
    paddingHorizontal: 25,
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: { position: 'absolute', left: 20, top: 50, zIndex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8 },
  headerSubtitle: { fontSize: 14, color: '#eef2f4' },

  /* error blocks */
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffebee',
    padding: 15,
    marginHorizontal: 25,
    marginTop: 20,
    borderRadius: 10,
  },
  errorText: { color: '#d32f2f', fontWeight: '500', flex: 1 },
  validationErrorBox: {
    backgroundColor: '#ffe5e5',
    borderWidth: 1,
    borderColor: 'red',
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
    marginHorizontal: 16,
  },
  validationErrorItem: { color: 'red', marginBottom: 4 },

  /* summary card */
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryLine: { marginBottom: 6, color: '#333' },
  summaryLabel: { fontWeight: '600', color: '#4c6c7c' },
  summaryNote: { marginTop: 10, fontSize: 12, color: '#666' },

  /* form card */
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 25,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputLabel: { color: '#4c6c7c', fontWeight: '600', marginBottom: 8, fontSize: 14 },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  dateText: { color: '#4c6c7c', fontWeight: '500' },

  /* picker */
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  picker: { width: '100%', color: '#4c6c7c' },
  placeholderItem: { color: '#90a4ae' },
  pickerItem: { color: '#4c6c7c' },

  /* inputs */
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#4c6c7c',
    fontSize: 14,
    marginBottom: 20,
  },
  multilineInput: { height: 100, textAlignVertical: 'top' },

  /* upload section */
  uploadButton: {
    borderWidth: 2,
    borderColor: '#1c6c7c',
    borderStyle: 'dashed',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
  },
  uploadText: { color: '#1c6c7c', fontWeight: '500' },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  fileName: { flex: 1, color: '#1c6c7c', fontWeight: '500' },

  /* submit */
  submitButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
  },
  submitButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
