// app/components/HrRequestForm/FileUploadField.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

/* theme */
const COLORS = {
  primary: '#00796B',
  accent : '#4CAF50',
  error  : '#E53935',
  border : '#CFD8DC',
  bg     : '#FAFAFA',
  text   : '#263238',
};

/* limits */
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export default function FileUploadField({
  file,
  onPickFile,
  onRemoveFile,
  label = 'Choose file',
}) {
  /* open picker */
  const pick = async () => {
    try {
      // 👉 no `type` key → allow EVERYTHING
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;

      const asset = 'assets' in res ? res.assets[0] : res;

      if (asset.size && asset.size > MAX_BYTES) {
        Alert.alert('File too large', 'Maximum size is 8 MB.');
        return;
      }

      const normalized = {
        uri : Platform.OS === 'ios'
          ? asset.uri.replace('file://', '')
          : asset.uri,
        name: asset.name || asset.uri.split('/').pop(),
        type: asset.mimeType || 'application/octet-stream',
        size: asset.size ?? 0,
      };
      onPickFile?.(normalized);
    } catch (e) {
      if (e?.code !== 'DOCUMENT_PICKER_CANCELED') {
        console.warn('[FileUploadField]', e);
        Alert.alert('Error', 'Could not pick the file.');
      }
    }
  };

  /* render */
  return (
    <View style={styles.wrapper}>
      {!file ? (
        <TouchableOpacity style={styles.uploadBtn} onPress={pick}>
          <MaterialCommunityIcons name="paperclip" size={20} color={COLORS.primary} />
          <Text style={styles.uploadTxt}>{label}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.row}>
          <MaterialCommunityIcons name="file" size={20} color={COLORS.accent} />
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
          <TouchableOpacity onPress={onRemoveFile} hitSlop={10}>
            <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* styles */
const styles = StyleSheet.create({
  wrapper: { marginBottom: 15 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems   : 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    paddingVertical: 12,
    borderRadius  : 8,
    borderWidth   : 1,
    borderStyle   : 'dashed',
    borderColor   : COLORS.primary,
  },
  uploadTxt: {
    marginLeft: 8,
    fontSize  : 15,
    color     : COLORS.primary,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems   : 'center',
    backgroundColor: COLORS.bg,
    padding      : 12,
    borderRadius : 8,
    borderWidth  : 1,
    borderColor  : COLORS.border,
  },
  fileName: {
    flex        : 1,
    marginLeft  : 8,
    fontSize    : 14,
    color       : COLORS.text,
  },
});
