import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Animated,
  TextInput,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { distributorsApi } from '../../api/distributors';
import { useCatalogStore, Distributor } from '../../stores/catalogStore';
import { useAuthStore } from '../../stores/authStore';
import { ds, type, font } from '../../theme';
import { PressableScale } from '../../components/PressableScale';

export type VisitsStackParamList = {
  DistributorList: undefined;
  DistributorDetail: { distributorId: string };
  CheckIn: { distributorId: string; distributorName: string };
  NewOrder: { distributorId: string; distributorName: string };
};

type Nav = StackNavigationProp<VisitsStackParamList, 'DistributorList'>;

function initials(name: string) {
  const p = name.trim().split(' ');
  return p.length > 1
    ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const ROW_COLORS = ['#00A693', '#5B4EE8', '#FF9500', '#007AFF', '#FF3B30', '#34C759'];

function DistributorRow({
  item,
  index,
  currentUserId,
  onPress,
}: {
  item: Distributor;
  index: number;
  currentUserId?: string;
  onPress: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const color = ROW_COLORS[index % ROW_COLORS.length];

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
      delay: Math.min(index * 40, 300),
    }).start();
  }, []);

  const isPlanned = item.assignedRepId === currentUserId;

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      }}
    >
      <PressableScale
        onPress={onPress}
        haptic="light"
        scale={0.99}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: ds.surface,
          borderBottomWidth: 1,
          borderBottomColor: ds.borderLight,
        }}
      >
        {/* Colored initial circle */}
        <View style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: color + '18',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
          flexShrink: 0,
        }}>
          <Text style={{ fontWeight: '700', fontSize: 16, color }}>{initials(item.name)}</Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={type.subtitle} numberOfLines={1}>
            {item.name}
          </Text>
          {!!(item.address || item.state) && (
            <Text style={[type.small, { marginTop: 2 }]} numberOfLines={1}>
              {item.address ?? item.state}
            </Text>
          )}
          {(isPlanned || (item.totalDues ?? 0) > 0) && (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              {isPlanned && (
                <View style={{
                  backgroundColor: ds.primaryLight,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: ds.radiusFull,
                }}>
                  <Text style={{ fontWeight: '700', fontSize: 10, color: ds.primary }}>Planned</Text>
                </View>
              )}
              {(item.totalDues ?? 0) > 0 && (
                <View style={{
                  backgroundColor: ds.amberLight,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: ds.radiusFull,
                }}>
                  <Text style={{ fontWeight: '700', fontSize: 10, color: ds.amber }}>
                    ₹{(((item.totalDues ?? 0) as number) / 1000).toFixed(0)}K due
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={18} color={ds.textLight} />
      </PressableScale>
    </Animated.View>
  );
}

export function VisitsScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { distributors, setDistributors } = useCatalogStore();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(distributors.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await distributorsApi.getDistributors({ limit: 200 });
      const data = res.data?.data ?? res.data ?? [];
      setDistributors(Array.isArray(data) ? data : []);
    } catch {
      // Use cached data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (distributors.length === 0) {
      load();
    } else {
      setLoading(false);
    }
  }, []);

  const sorted = [...distributors].sort((a, b) => {
    const aP = a.assignedRepId === user?.id ? 0 : 1;
    const bP = b.assignedRepId === user?.id ? 0 : 1;
    return aP - bP;
  });

  const filtered = sorted.filter(
    (d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.address?.toLowerCase().includes(search.toLowerCase()) ||
      d.phone?.includes(search)
  );

  return (
    <View style={{ flex: 1, backgroundColor: ds.bg }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{
        backgroundColor: ds.surface,
        paddingTop: insets.top + 12,
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: ds.borderLight,
      }}>
        <Text style={type.display}>
          Your Route
        </Text>
        <Text style={[type.small, { marginTop: 2 }]}>
          {distributors.length} stop{distributors.length !== 1 ? 's' : ''} today
        </Text>

        {/* Gray pill search */}
        <View style={{
          marginTop: 12,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: ds.tile,
          borderRadius: ds.radiusFull,
          paddingHorizontal: 14,
          height: 42,
          gap: 8,
        }}>
          <Ionicons name="search" size={15} color={ds.textLight} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: ds.text, fontWeight: '400' }}
            placeholder="Search distributors..."
            placeholderTextColor={ds.textLight}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={ds.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={ds.primary} />
          <Text style={[type.small, { marginTop: 10 }]}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              tintColor={ds.primary}
            />
          }
          renderItem={({ item, index }) => (
            <DistributorRow
              item={item}
              index={index}
              currentUserId={user?.id}
              onPress={() => nav.navigate('DistributorDetail', { distributorId: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="storefront-outline" size={48} color={ds.textLight} />
              <Text style={[type.subtitle, { color: ds.textMuted, marginTop: 12 }]}>
                No distributors found
              </Text>
              <Text style={[type.small, { marginTop: 4 }]}>
                {search ? 'Try a different search term' : 'Pull down to refresh'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
