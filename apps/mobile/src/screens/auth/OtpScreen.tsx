import React, { useState, useRef, useEffect } from 'react';
import {
  View, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { ds, type, font } from '../../theme';
import { PressableScale } from '../../components/PressableScale';
import type { AuthStackParamList } from './PhoneScreen';

export function OtpScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<StackNavigationProp<AuthStackParamList, 'Otp'>>();
  const route = useRoute<RouteProp<AuthStackParamList, 'Otp'>>();
  const { phone } = route.params;
  const { setTokens } = useAuthStore();

  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 300); }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  useEffect(() => { if (code.length === 6) verify(code); }, [code]);

  async function verify(c: string) {
    if (c.length !== 6) return;
    setLoading(true); setError('');
    try {
      const res = await authApi.verifyOtp(phone, c);
      const { accessToken, refreshToken, user } = res.data.data ?? res.data;

      // Best-effort push token registration
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          if (tokenData?.data) {
            await apiClient.post('/users/me/fcm-token', { token: tokenData.data });
          }
        }
      } catch {}

      setTokens(accessToken, refreshToken, user);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? 'Invalid OTP. Try again.');
      setCode('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  async function resend() {
    try {
      await authApi.requestOtp(phone);
      setResendTimer(30);
      setError('');
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch {}
  }

  const maskedPhone = phone.replace(/(\+\d{2})(\d{5})(\d+)/, '$1 XXXXX $3');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: ds.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />

      {/* Hidden real input */}
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={t => { setCode(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
        keyboardType="number-pad"
        maxLength={6}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />

      <View style={{
        flex: 1,
        paddingTop: insets.top + 16,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 32,
      }}>
        {/* Back */}
        <TouchableOpacity
          onPress={() => nav.goBack()}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}
        >
          <Ionicons name="arrow-back" size={24} color={ds.text} />
        </TouchableOpacity>

        {/* Label */}
        <Text style={[type.label, { color: ds.primary, marginBottom: 14 }]}>
          VERIFICATION
        </Text>

        {/* Heading */}
        <Text style={[type.display, { marginBottom: 8 }]}>
          Enter the code
        </Text>
        <Text style={[type.bodyMuted, { marginBottom: 40 }]}>
          Sent to {maskedPhone}
        </Text>

        {/* OTP boxes */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
          style={{ flexDirection: 'row', gap: 10, marginBottom: 32 }}
        >
          {[0, 1, 2, 3, 4, 5].map(i => {
            const active = i === code.length && !loading;
            const filled = i < code.length;
            return (
              <View key={i} style={{
                flex: 1,
                height: 60,
                borderRadius: 12,
                backgroundColor: filled ? ds.primaryLight : ds.tile,
                borderWidth: active ? 2 : 1.5,
                borderColor: filled ? ds.primary : active ? ds.primary : ds.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ fontWeight: '700', fontSize: 24, color: ds.primary }}>
                  {code[i] ?? ''}
                </Text>
              </View>
            );
          })}
        </TouchableOpacity>

        {/* Error */}
        {!!error && (
          <View style={{
            backgroundColor: ds.redLight,
            borderRadius: 10,
            padding: 12,
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <Ionicons name="alert-circle" size={16} color={ds.red} />
            <Text style={[type.small, { color: ds.red, flex: 1 }]}>{error}</Text>
          </View>
        )}

        {/* Verify button */}
        <PressableScale
          onPress={() => verify(code)}
          disabled={code.length < 6 || loading}
          haptic="success"
          scale={0.97}
          style={{
            backgroundColor: code.length === 6 ? ds.primary : ds.tile,
            borderRadius: ds.radiusFull,
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          }}
        >
          {loading
            ? <ActivityIndicator color="#FFFFFF" size="small" />
            : <Text style={[type.button, {
                color: code.length === 6 ? '#FFFFFF' : ds.textLight,
              }]}>
                Verify & Sign In
              </Text>
          }
        </PressableScale>

        {/* Resend */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 4 }}>
          <Text style={[type.small, { color: ds.textMuted }]}>Didn't receive it?</Text>
          {resendTimer > 0
            ? <Text style={[type.small, { color: ds.textLight, fontWeight: '600' }]}> Resend in {resendTimer}s</Text>
            : <PressableScale onPress={resend} haptic="light" scale={0.95}>
                <Text style={[type.small, { color: ds.primary, fontWeight: '700' }]}> Resend OTP</Text>
              </PressableScale>
          }
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
