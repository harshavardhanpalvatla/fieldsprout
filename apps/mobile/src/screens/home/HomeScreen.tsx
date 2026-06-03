import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Animated,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useAttendanceStore } from '../../stores/attendanceStore';
import { useQueueStore } from '../../stores/queueStore';
import { useCatalogStore } from '../../stores/catalogStore';
import { attendanceApi } from '../../api/attendance';
import { ordersApi } from '../../api/orders';
import { distributorsApi } from '../../api/distributors';
import { useGpsTracking } from '../../hooks/useGpsTracking';
import { ds, type, font } from '../../theme';
import { PressableScale } from '../../components/PressableScale';

function initials(name = '') {
  const p = name.trim().split(' ').filter(Boolean);
  return p.length > 1
    ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function currency(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

const ROW_COLORS = ['#00A693', '#5B4EE8', '#FF9500', '#007AFF', '#FF3B30', '#34C759'];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { user } = useAuthStore();
  const { attendance, isCheckedIn, setAttendance, clearAttendance, setCheckoutAt } =
    useAttendanceStore();
  const { queue } = useQueueStore();
  const { distributors, setDistributors } = useCatalogStore();
  const { start: startGps, stop: stopGps } = useGpsTracking();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ visits: 0, orders: 0, value: 0 });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const statAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    Animated.stagger(80, statAnims.map(a =>
      Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 })
    )).start();
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [distRes, ordersRes] = await Promise.allSettled([
        distributorsApi.getDistributors({ limit: 200 }),
        ordersApi.getOrders({ pageSize: 100 } as any),
      ]);
      if (distRes.status === 'fulfilled') {
        const data = (distRes.value as any).data?.data ?? [];
        setDistributors(Array.isArray(data) ? data : []);
      }
      if (ordersRes.status === 'fulfilled') {
        const orders: any[] = (ordersRes.value as any).data?.data ?? [];
        const today = new Date().toDateString();
        const todays = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
        setStats((prev) => ({
          ...prev,
          orders: todays.length,
          value: todays.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0),
        }));
      }
      try {
        const { apiClient } = await import('../../api/client');
        const today = new Date().toISOString().split('T')[0];
        const vRes = await apiClient.get(`/visits?date=${today}&pageSize=100`);
        setStats((prev) => ({ ...prev, visits: (vRes.data?.data ?? []).length }));
      } catch {}
    } catch {}
  }, []);

  useEffect(() => {
    loadAll();
  }, []);

  async function checkin() {
    setLoading(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location required to check in');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const res = await attendanceApi.checkin(loc.coords.latitude, loc.coords.longitude);
      const a = res.data?.data ?? res.data;
      setAttendance({ id: a.id, checkinAt: a.checkinAt ?? new Date().toISOString() });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await startGps();
    } catch (e: any) {
      const code = e?.response?.data?.error?.code;
      if (code === 'DUPLICATE_CHECKIN') {
        const ex = e?.response?.data?.error?.details?.attendance;
        if (ex) {
          setAttendance({ id: ex.id, checkinAt: ex.checkinAt });
          await startGps();
          setLoading(false);
          return;
        }
      }
      setError(e?.response?.data?.error?.message ?? 'Check-in failed');
    } finally {
      setLoading(false);
    }
  }

  async function checkout() {
    setLoading(true);
    setError('');
    try {
      const res = await attendanceApi.checkout();
      setCheckoutAt(res.data?.data?.checkoutAt ?? new Date().toISOString());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      stopGps();
      clearAttendance();
    } catch {
      setError('Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
  const checkinTime = attendance?.checkinAt
    ? new Date(attendance.checkinAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const statItems = [
    { label: 'Visits', value: stats.visits },
    { label: 'Orders', value: stats.orders },
    { label: 'Value', value: currency(stats.value) },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: ds.bg }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadAll();
              setRefreshing(false);
            }}
            tintColor={ds.primary}
          />
        }
      >
        {/* HEADER */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            paddingBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={[type.small, { color: ds.textMuted }]}>
                {greeting()}
              </Text>
              <Text style={[type.heading, { marginTop: 2 }]}>
                {user?.name?.split(' ')[0] ?? 'there'} 👋
              </Text>
              <Text style={[type.small, { marginTop: 2 }]}>{today}</Text>
            </View>
            <PressableScale
              onPress={() => nav.navigate('ProfileTab')}
              haptic="light"
              scale={0.92}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: ds.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {initials(user?.name)}
              </Text>
            </PressableScale>
          </View>

          {/* CHECK-IN CARD */}
          <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
            {!isCheckedIn ? (
              <View style={{
                backgroundColor: ds.surface,
                borderRadius: ds.radiusLG,
                borderWidth: 1,
                borderColor: ds.border,
                padding: 20,
              }}>
                <Text style={[type.label, { color: ds.primary, marginBottom: 8 }]}>
                  READY TO START
                </Text>
                <Text style={[type.title, { marginBottom: 4 }]}>
                  Tap to begin your day
                </Text>
                <Text style={[type.small, { marginBottom: 20 }]}>
                  {distributors.length} distributor{distributors.length !== 1 ? 's' : ''} on your route
                </Text>
                <PressableScale
                  onPress={checkin}
                  disabled={loading}
                  haptic="success"
                  scale={0.97}
                  style={{
                    backgroundColor: ds.primary,
                    borderRadius: ds.radiusFull,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={[type.button, { color: '#fff' }]}>Start Day</Text>
                  }
                </PressableScale>
              </View>
            ) : (
              <View style={{
                backgroundColor: ds.surface,
                borderRadius: ds.radiusLG,
                borderWidth: 1,
                borderColor: ds.border,
                padding: 20,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: ds.green,
                  }} />
                  <Text style={[type.label, { color: ds.green }]}>
                    ACTIVE SINCE {checkinTime}
                  </Text>
                </View>
                <Text style={[type.title, { marginBottom: 16 }]}>
                  Day in Progress
                </Text>

                {/* Stats row inside card */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  {statItems.map((s, i) => (
                    <Animated.View
                      key={s.label}
                      style={{
                        flex: 1,
                        backgroundColor: ds.tile,
                        borderRadius: ds.radiusMD,
                        padding: 12,
                        alignItems: 'center',
                        opacity: statAnims[i],
                        transform: [{ scale: statAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                      }}
                    >
                      <Text style={[type.numberSM, { color: ds.text }]}>{s.value}</Text>
                      <Text style={[type.small, { marginTop: 2 }]}>{s.label}</Text>
                    </Animated.View>
                  ))}
                </View>

                <PressableScale
                  onPress={checkout}
                  disabled={loading}
                  haptic="warning"
                  scale={0.97}
                >
                  {loading
                    ? <ActivityIndicator color={ds.red} size="small" />
                    : <Text style={[type.buttonSM, { color: ds.red }]}>End Day →</Text>
                  }
                </PressableScale>
              </View>
            )}
          </View>

          {/* ERROR */}
          {!!error && (
            <View style={{
              marginHorizontal: 20,
              marginBottom: 16,
              backgroundColor: ds.redLight,
              borderRadius: ds.radiusMD,
              padding: 12,
              flexDirection: 'row',
              gap: 8,
              alignItems: 'center',
            }}>
              <Ionicons name="alert-circle" size={16} color={ds.red} />
              <Text style={[type.small, { flex: 1, color: ds.red }]}>{error}</Text>
              <Pressable onPress={() => setError('')}>
                <Ionicons name="close" size={16} color={ds.red} />
              </Pressable>
            </View>
          )}

          {/* QUEUE NOTICE */}
          {queue.length > 0 && (
            <View style={{
              marginHorizontal: 20,
              marginBottom: 16,
              backgroundColor: ds.amberLight,
              borderRadius: ds.radiusMD,
              padding: 13,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
              <Ionicons name="cloud-upload-outline" size={18} color={ds.amber} />
              <View style={{ flex: 1 }}>
                <Text style={[type.buttonSM, { color: '#92400E' }]}>
                  {queue.length} action{queue.length > 1 ? 's' : ''} pending sync
                </Text>
                <Text style={[type.small, { color: '#B45309', marginTop: 1 }]}>
                  Will send when connected
                </Text>
              </View>
            </View>
          )}

          {/* TODAY'S STOPS */}
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={[type.label, { color: ds.primary }]}>TODAY'S STOPS</Text>
              <TouchableOpacity
                onPress={() => nav.navigate('VisitsTab')}
                activeOpacity={0.6}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}
              >
                <Text style={[type.buttonSM, { color: ds.primary }]}>View all</Text>
                <Ionicons name="chevron-forward" size={14} color={ds.primary} />
              </TouchableOpacity>
            </View>

            {distributors.length === 0 ? (
              <View style={{
                backgroundColor: ds.tile,
                borderRadius: ds.radiusLG,
                padding: 28,
                alignItems: 'center',
              }}>
                <Ionicons name="storefront-outline" size={32} color={ds.textLight} />
                <Text style={[type.subtitle, { color: ds.textMuted, marginTop: 10 }]}>
                  No stops today
                </Text>
                <Text style={[type.small, { marginTop: 4, textAlign: 'center' }]}>
                  Your assigned distributors will appear here
                </Text>
              </View>
            ) : (
              distributors.slice(0, 5).map((d, index) => {
                const color = ROW_COLORS[index % ROW_COLORS.length];
                return (
                  <PressableScale
                    key={d.id}
                    onPress={() => nav.navigate('VisitsTab', {
                      screen: 'DistributorDetail',
                      params: { distributorId: d.id },
                    })}
                    haptic="light"
                    scale={0.97}
                    style={{
                      backgroundColor: ds.surface,
                      borderRadius: ds.radiusMD,
                      borderWidth: 1,
                      borderColor: ds.border,
                      padding: 16,
                      marginBottom: 10,
                    }}
                  >
                    {/* Top row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={[type.small, { color: ds.textMuted }]}>
                        Stop {index + 1}
                      </Text>
                      {(d.totalDues ?? 0) > 0 && (
                        <View style={{ backgroundColor: ds.amberLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="alert-circle" size={10} color={ds.amber} />
                          <Text style={[type.small, { color: ds.amber }]}>Dues</Text>
                        </View>
                      )}
                    </View>

                    {/* Name */}
                    <Text style={[type.subtitle, { marginBottom: 4 }]} numberOfLines={1}>
                      {d.name}
                    </Text>

                    {/* Address */}
                    {!!(d.address || d.state) && (
                      <Text style={type.small} numberOfLines={1}>
                        {d.address ?? d.state}
                      </Text>
                    )}

                    {/* Divider */}
                    <View style={{ height: 1, backgroundColor: ds.borderLight, marginVertical: 12 }} />

                    {/* Info tiles row */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                      <View style={{ flex: 1, backgroundColor: ds.tile, borderRadius: 8, padding: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                          <Ionicons name="location-outline" size={12} color={ds.textLight} />
                          <Text style={[type.small, { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }]}>Location</Text>
                        </View>
                        <Text style={[type.buttonSM, { color: ds.text }]} numberOfLines={1}>
                          {d.state ?? d.address ?? '—'}
                        </Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: ds.tile, borderRadius: 8, padding: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                          <Ionicons name="wallet-outline" size={12} color={ds.textLight} />
                          <Text style={[type.small, { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }]}>Outstanding</Text>
                        </View>
                        <Text style={[type.buttonSM, { color: (d.totalDues ?? 0) > 0 ? ds.amber : ds.green }]}>
                          {(d.totalDues ?? 0) > 0 ? `₹${((d.totalDues as number) / 1000).toFixed(1)}K` : 'Clear'}
                        </Text>
                      </View>
                    </View>

                    {/* Action */}
                    <Text style={[type.buttonSM, { color: ds.primary, textAlign: 'right' }]}>
                      Start Visit →
                    </Text>
                  </PressableScale>
                );
              })
            )}

            {distributors.length > 5 && (
              <PressableScale
                onPress={() => nav.navigate('VisitsTab')}
                haptic="light"
                scale={0.97}
                style={{ alignItems: 'center', paddingVertical: 14 }}
              >
                <Text style={[type.buttonSM, { color: ds.primary }]}>
                  +{distributors.length - 5} more stops
                </Text>
              </PressableScale>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
