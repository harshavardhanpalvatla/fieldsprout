import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ordersApi } from '../../api/orders';
import { Order } from '../../stores/catalogStore';
import { StatusChip } from '../../components/StatusChip';
import { ds, type, font } from '../../theme';
import { PressableScale } from '../../components/PressableScale';

export type OrdersStackParamList = {
  OrderList: undefined;
  OrderDetail: { orderId: string };
  NewOrderFromOrders: { distributorId?: string; distributorName?: string };
  DistributorPickerForOrder: undefined;
};

type NavigationProp = StackNavigationProp<OrdersStackParamList, 'OrderList'>;
type FilterType = 'All' | 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Dispatched' | 'Delivered';

const FILTERS: FilterType[] = [
  'All',
  'Draft',
  'Submitted',
  'Approved',
  'Rejected',
  'Dispatched',
  'Delivered',
];

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function OrdersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ordersApi.getOrders({ pageSize: 100 } as any);
      const data = res.data?.data ?? res.data ?? [];
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      // Use cached data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'All') return true;
    return o.status?.toLowerCase() === activeFilter.toLowerCase();
  });

  const renderOrderCard = ({ item }: { item: Order }) => {
    return (
      <PressableScale
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
        haptic="light"
        scale={0.99}
        style={{
          backgroundColor: ds.surface,
          borderRadius: ds.radiusMD,
          borderWidth: 1,
          borderColor: ds.border,
          marginBottom: 10,
          padding: 16,
        }}
      >
        {/* Top row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text
            style={[type.subtitle, { flex: 1, paddingRight: 8 }]}
            numberOfLines={1}
          >
            {item.distributor?.name ?? item.distributorName ?? 'Order'}
          </Text>
          <StatusChip status={item.status ?? 'draft'} />
        </View>

        {/* Meta */}
        <Text style={[type.small, { marginTop: 4 }]}>
          {item._count?.items ?? item.items?.length ?? 0} item{(item._count?.items ?? item.items?.length ?? 0) !== 1 ? 's' : ''}
        </Text>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: ds.borderLight, marginVertical: 12 }} />

        {/* Bottom row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[type.numberSM, { color: ds.primary }]}>
            {formatCurrency(Number(item.totalAmount ?? 0))}
          </Text>
          <Text style={type.small}>
            {timeAgo(item.createdAt)}
          </Text>
        </View>
      </PressableScale>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: ds.bg }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{
        backgroundColor: ds.surface,
        paddingTop: insets.top + 12,
        borderBottomWidth: 1,
        borderBottomColor: ds.borderLight,
      }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingBottom: 12,
        }}>
          <View>
            <Text style={type.display}>
              Orders
            </Text>
            <Text style={[type.small, { marginTop: 2 }]}>
              {orders.length} total
            </Text>
          </View>
          {/* FAB-style new order button */}
          <PressableScale
            onPress={() => navigation.navigate('DistributorPickerForOrder')}
            haptic="medium"
            scale={0.93}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: ds.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </PressableScale>
        </View>

        {/* Filter chips — pill shaped, no border */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
        >
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <PressableScale
                key={filter}
                onPress={() => setActiveFilter(filter)}
                haptic="light"
                scale={0.95}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: ds.radiusFull,
                  backgroundColor: isActive ? ds.primary + '1A' : ds.tile,
                }}
              >
                <Text style={[type.buttonSM, {
                  color: isActive ? ds.primary : ds.textMuted,
                }]}>
                  {filter}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      {loading && orders.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={ds.primary} />
          <Text style={[type.small, { marginTop: 12 }]}>Loading orders...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={ds.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="receipt-outline" size={60} color={ds.textLight} />
              <Text style={[type.subtitle, { color: ds.textMuted, marginTop: 16 }]}>
                No orders yet
              </Text>
              <Text style={[type.small, {
                textAlign: 'center',
                marginTop: 4,
                paddingHorizontal: 32,
              }]}>
                Create your first order from a distributor
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
