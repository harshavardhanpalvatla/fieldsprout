import React, { useState, useRef } from 'react';
import {
  View, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { authApi } from '../../api/auth';
import { ds, type, font } from '../../theme';
import { PressableScale } from '../../components/PressableScale';

export type AuthStackParamList = {
  Phone: undefined;
  Otp: { phone: string };
};

export function PhoneScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<StackNavigationProp<AuthStackParamList, 'Phone'>>();
  const inputRef = useRef<TextInput>(null);
  const [digits, setDigits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = digits.length === 10;

  async function handleSend() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError('');
    try {
      const phone = `+91${digits}`;
      await authApi.requestOtp(phone);
      nav.navigate('Otp', { phone });
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: ds.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{
          flex: 1,
          paddingTop: insets.top + 48,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
          minHeight: '100%',
        }}>

          {/* Teal label */}
          <Text style={[type.label, { color: ds.primary, marginBottom: 14 }]}>
            SALES REP APP
          </Text>

          {/* Heading */}
          <Text style={[type.display, { marginBottom: 8 }]}>
            {'Sign in to\nFieldSprout'}
          </Text>
          <Text style={[type.bodyMuted, { marginBottom: 48 }]}>
            Enter your registered mobile number to continue
          </Text>

          {/* Phone input label */}
          <Text style={[type.label, { color: ds.textMuted, marginBottom: 10 }]}>
            MOBILE NUMBER
          </Text>

          {/* Phone input — UC bottom-border style */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: digits.length > 0 ? ds.primary : ds.border,
              paddingBottom: 12,
              marginBottom: 8,
            }}
          >
            <Text style={{ fontWeight: '700', fontSize: 20, color: ds.primary, marginRight: 10 }}>+91</Text>
            <View style={{ width: 1, height: 24, backgroundColor: ds.border, marginRight: 10 }} />
            <TextInput
              ref={inputRef}
              value={digits}
              onChangeText={t => { setDigits(t.replace(/\D/g, '').slice(0, 10)); setError(''); }}
              keyboardType="number-pad"
              placeholder="98765 43210"
              placeholderTextColor={ds.textLight}
              style={{ flex: 1, fontWeight: '600', fontSize: 22, color: ds.text }}
              maxLength={10}
              returnKeyType="done"
              onSubmitEditing={handleSend}
            />
            {canSubmit && (
              <Text style={{ fontSize: 20, color: ds.primary }}>✓</Text>
            )}
          </TouchableOpacity>

          {/* Error */}
          {!!error && (
            <Text style={[type.small, { color: ds.red, marginBottom: 16 }]}>{error}</Text>
          )}

          {/* Spacer */}
          <View style={{ marginTop: 'auto' }}>
            {/* CTA */}
            <PressableScale
              onPress={handleSend}
              disabled={!canSubmit || loading}
              haptic="success"
              scale={0.97}
              style={{
                backgroundColor: canSubmit ? ds.primary : ds.tile,
                borderRadius: ds.radiusFull,
                height: 54,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                marginBottom: 16,
              }}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={[type.button, {
                    color: canSubmit ? '#FFFFFF' : ds.textLight,
                  }]}>
                    Continue →
                  </Text>
              }
            </PressableScale>

            <Text style={[type.small, { textAlign: 'center', lineHeight: 18 }]}>
              {'By continuing, you agree to our\nTerms of Service & Privacy Policy'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
