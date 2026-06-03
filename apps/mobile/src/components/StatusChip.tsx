import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { ds } from '../theme';

const S: Record<string, { bg: string; text: string; label: string }> = { ...ds.status };

export function StatusChip({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const k = (status ?? 'draft').toLowerCase();
  const cfg = S[k] ?? S.draft;
  return (
    <View style={[st.chip, { backgroundColor: cfg.bg }, size === 'md' && st.md]}>
      <Text style={[st.label, { color: cfg.text }, size === 'md' && st.labelMd]}>{cfg.label}</Text>
    </View>
  );
}

export default StatusChip;

const st = StyleSheet.create({
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  md: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  labelMd: { fontSize: 13 },
});
