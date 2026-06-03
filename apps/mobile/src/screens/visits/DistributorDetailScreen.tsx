import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { distributorsApi } from '../../api/distributors';
import { apiClient } from '../../api/client';
import { StatusChip } from '../../components/StatusChip';
import { ds, type, font } from '../../theme';
import { PressableScale } from '../../components/PressableScale';
import type { VisitsStackParamList } from './VisitsScreen';

type DetailRouteProp = RouteProp<VisitsStackParamList, 'DistributorDetail'>;
type NavigationProp = StackNavigationProp<VisitsStackParamList, 'DistributorDetail'>;

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function DistributorDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailRouteProp>();
  const insets = useSafeAreaInsets();
  const { distributorId } = route.params;

  const [distributor, setDistributor] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDistributor();
  }, [distributorId]);

  async function fetchDistributor() {
    setLoading(true);
    try {
      const res = await distributorsApi.getDistributor(distributorId);
      setDistributor(res.data?.data ?? res.data);
      try {
        const ordersRes = await apiClient.get(
          `/orders?distributorId=${distributorId}&pageSize=3`
        );
        setRecentOrders(ordersRes.data?.data ?? []);
      } catch {}
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Failed to load distributor');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: ds.bg }}>
        <ActivityIndicator size="large" color={ds.primary} />
        <Text style={[type.small, { marginTop: 12 }]}>Loading...</Text>
      </View>
    );
  }

  if (!distributor) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: ds.bg, padding: 24 }}>
        <Ionicons name="alert-circle-outline" size={48} color={ds.red} />
        <Text style={[type.body, { color: ds.red, textAlign: 'center', marginTop: 12 }]}>
          {error || 'Failed to load distributor'}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: ds.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: ds.radiusFull,
            marginTop: 16,
          }}
          onPress={fetchDistributor}
        >
          <Text style={[type.button, { color: '#fff' }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const orders: any[] = recentOrders.length > 0 ? recentOrders : (distributor.lastOrders ?? []);
  const totalDues = distributor.totalDues ?? 0;

  function handleCall() {
    if (distributor.phone) {
      Linking.openURL(`tel:${distributor.phone}`);
    }
  }

  async function handleCheckin() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('CheckIn', {
      distributorId: distributor.id,
      distributorName: distributor.name,
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: ds.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>

        {/* Back button */}
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-back" size={24} color={ds.text} />
          </TouchableOpacity>
        </View>

        {/* Top section — white, clean */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          {/* Label */}
          <Text style={[type.label, { color: ds.primary, marginBottom: 10 }]}>
            DISTRIBUTOR
          </Text>

          {/* Shop name */}
          <Text style={type.display}>
            {distributor.name}
          </Text>

          {/* Address */}
          {!!(distributor.address || distributor.state) && (
            <Text style={[type.bodyMuted, { marginTop: 6 }]} numberOfLines={2}>
              {distributor.address ?? distributor.state}
            </Text>
          )}

          {/* Verified tag */}
          {distributor.status === 'active' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <View style={{ backgroundColor: ds.greenLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="checkmark-circle" size={12} color={ds.green} />
                <Text style={{ fontWeight: '700', fontSize: 11, color: ds.green }}>Verified Address</Text>
              </View>
            </View>
          )}

          {/* Phone */}
          {!!distributor.phone && (
            <PressableScale
              onPress={handleCall}
              haptic="light"
              scale={0.95}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 14,
                alignSelf: 'flex-start',
                backgroundColor: ds.primaryLight,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: ds.radiusFull,
              }}
            >
              <Ionicons name="call-outline" size={14} color={ds.primary} />
              <Text style={[type.buttonSM, { color: ds.primary }]}>
                {distributor.phone}
              </Text>
            </PressableScale>
          )}
        </View>

        {/* Info tiles */}
        <View style={{ flexDirection: 'row', marginHorizontal: 20, gap: 12, marginBottom: 28 }}>
          <View style={{
            flex: 1,
            backgroundColor: ds.tile,
            borderRadius: 12,
            padding: 14,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Ionicons name="receipt-outline" size={16} color={ds.textMuted} />
              <Text style={[type.small, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>Last Order</Text>
            </View>
            <Text style={[type.subtitle, { marginTop: 4 }]}>
              {orders[0] ? formatCurrency(Number(orders[0].totalAmount ?? 0)) : 'None'}
            </Text>
          </View>
          <View style={{
            flex: 1,
            backgroundColor: ds.tile,
            borderRadius: 12,
            padding: 14,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Ionicons name="wallet-outline" size={16} color={ds.textMuted} />
              <Text style={[type.small, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>Outstanding</Text>
            </View>
            <Text style={[type.subtitle, {
              color: totalDues > 0 ? ds.amber : ds.green,
              marginTop: 4,
            }]}>
              {formatCurrency(totalDues)}
            </Text>
          </View>
        </View>

        {/* Recent Orders section */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={[type.label, { color: ds.primary, marginBottom: 12 }]}>
            RECENT ORDERS
          </Text>

          {orders.length === 0 ? (
            <View style={{
              backgroundColor: ds.tile,
              borderRadius: ds.radiusMD,
              padding: 24,
              alignItems: 'center',
            }}>
              <Ionicons name="receipt-outline" size={28} color={ds.textLight} />
              <Text style={[type.small, { marginTop: 8 }]}>No orders yet</Text>
            </View>
          ) : (
            orders.slice(0, 5).map((order: any) => (
              <PressableScale
                key={order.id}
                haptic="light"
                scale={0.98}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: ds.borderLight,
                }}
              >
                <View style={{ flex: 1 }}>
                  <StatusChip status={order.status} />
                  <Text style={[type.small, { marginTop: 4 }]}>
                    {formatDate(order.createdAt)}
                  </Text>
                </View>
                <Text style={type.subtitle}>
                  {formatCurrency(Number(order.totalAmount ?? 0))}
                </Text>
              </PressableScale>
            ))
          )}
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: ds.surface,
        borderTopWidth: 1,
        borderTopColor: ds.border,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: insets.bottom + 14,
      }}>
        {/* I'm Here — filled teal */}
        <PressableScale
          onPress={handleCheckin}
          haptic="success"
          scale={0.97}
          style={{
            backgroundColor: ds.primary,
            height: 52,
            borderRadius: ds.radiusFull,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <Ionicons name="location" size={18} color="#fff" />
          <Text style={[type.button, { color: '#fff' }]}>I'm Here</Text>
        </PressableScale>

        {/* New Order — outlined */}
        <PressableScale
          onPress={() =>
            navigation.navigate('NewOrder', {
              distributorId: distributor.id,
              distributorName: distributor.name,
            })
          }
          haptic="medium"
          scale={0.97}
          style={{
            height: 48,
            borderRadius: ds.radiusFull,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderWidth: 1.5,
            borderColor: ds.primary,
            backgroundColor: ds.surface,
          }}
        >
          <Ionicons name="cart-outline" size={18} color={ds.primary} />
          <Text style={[type.button, { color: ds.primary, fontSize: 15 }]}>New Order</Text>
        </PressableScale>
      </View>
    </View>
  );
}
