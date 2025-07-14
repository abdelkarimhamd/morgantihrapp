// components/AttachmentRow.js
import React from 'react';
import { Text, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

import { toAbsoluteUrl } from '../utils/url';        // ← helper from step 1
import { COLORS }       from '../screens/RequestsList'; // reuse your palette

export default function AttachmentRow({ name, uri, small = false }) {
  const url = toAbsoluteUrl(uri);
  const displayName =
    name || (url ? decodeURI(url.split('/').pop()) : 'Unknown file');

  const open = async () => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error('cant-open');
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open attachment.');
    }
  };

  return (
    <TouchableOpacity
      onPress={open}
      style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
    >
      <MaterialIcons
        name="attach-file"
        size={small ? 16 : 20}
        color={COLORS.primary}
      />
      {/* Cast to string so <Text> never receives undefined/objects */}
      <Text
        style={{ color: COLORS.textDark, fontSize: small ? 12 : 14 }}
        numberOfLines={1}
      >
        {String(displayName)}
      </Text>
    </TouchableOpacity>
  );
}
