import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import {
  Text,
  Button,
  ActivityIndicator,
  Searchbar,
  Divider,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { apiClient } from '../../api/client';
import { ordersApi } from '../../api/orders';
import { stockApi } from '../../api/stock';
import { useQueueStore } from '../../stores/queueStore';
import { colors, type, font } from '../../theme';
import { PressableScale } from '../../components/PressableScale';
import type { OrdersStackParamList } from './OrdersScreen';

type RouteProps = RouteProp<OrdersStackParamList, 'NewOrderFromOrders'>;
type NavProps = StackNavigationProp<OrdersStackParamList, 'NewOrderFromOrders'>;

interface Variant {
  id: string;       // variantId for the API
  sku: string;
  unit: string;
  price: number;
  productName: string;
  productId: string;
  available: number;
}

interface CartLine {
  variant: Variant;
  quantity: number;
}

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

export function NewOrderScreen() {
  const navigation = useNavigation<NavProps>();
  const route = useRoute<RouteProps>();
  const { distributorId = '', distributorName = 'Distributor' } = route.params ?? {};

  const { enqueue } = useQueueStore();

  const cartBounce = useRef(new Animated.Value(1)).current;

  const [step, setStep] = useState<'catalogue' | 'review'>('catalogue');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stockUnavailable, setStockUnavailable] = useState(false);

  useEffect(() => { loadCatalogue(); }, []);

  function bounceCart() {
    Animated.sequence([
      Animated.spring(cartBounce, { toValue: 1.3, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.spring(cartBounce, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
    ]).start();
  }

  async function loadCatalogue() {
    setLoading(true);
    try {
      const [productsRes, stockRes] = await Promise.allSettled([
        apiClient.get('/products'),
        stockApi.getAvailableStock(),
      ]);

      // Build a variantId → available map from stock
      const availMap: Record<string, number> = {};
      if (stockRes.status === 'fulfilled') {
        const stockData: { variantId: string; available: number }[] =
          stockRes.value.data?.data ?? [];
        stockData.forEach((s) => { availMap[s.variantId] = s.available; });
      } else {
        setStockUnavailable(true);
      }

      // Flatten products → variants into a single list
      if (productsRes.status === 'fulfilled') {
        const products: { id: string; name: string; variants: { id: string; sku: string; unit: string; price: number }[] }[] =
          productsRes.value.data?.data ?? [];

        const flat: Variant[] = [];
        products.forEach((p) => {
          (p.variants ?? []).forEach((v) => {
            flat.push({
              id: v.id,
              sku: v.sku,
              unit: v.unit,
              price: Number(v.price),
              productName: p.name,
              productId: p.id,
              available: availMap[v.id] ?? 0,
            });
          });
        });
        setVariants(flat);
      }
    } catch (e) {
      setError('Failed to load products. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  function updateCart(variant: Variant, delta: number) {
    setCart((prev) => {
      const existing = prev.find((l) => l.variant.id === variant.id);
      if (!existing) {
        if (delta <= 0) return prev;
        bounceCart();
        return [...prev, { variant, quantity: delta }];
      }
      const newQty = existing.quantity + delta;
      if (newQty <= 0) return prev.filter((l) => l.variant.id !== variant.id);
      if (delta > 0 && existing.quantity === 0) bounceCart();
      return prev.map((l) => l.variant.id === variant.id ? { ...l, quantity: newQty } : l);
    });
  }

  const getQty = (variantId: string) =>
    cart.find((l) => l.variant.id === variantId)?.quantity ?? 0;

  const totalItems = cart.reduce((s, l) => s + l.quantity, 0);
  const totalAmount = cart.reduce((s, l) => s + l.quantity * l.variant.price, 0);

  const filtered = variants.filter((v) =>
    !search ||
    v.productName.toLowerCase().includes(search.toLowerCase()) ||
    v.sku.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSendOrder() {
    if (!distributorId) {
      setError('No distributor selected. Please go back and select a distributor.');
      return;
    }
    if (cart.length === 0) return;
    setSubmitting(true);
    setError('');

    const payload = {
      distributorId,
      items: cart.map((l) => ({ variantId: l.variant.id, quantity: l.quantity })),
    };

    try {
      const net = await NetInfo.fetch();
      const online = net.isConnected && net.isInternetReachable;

      if (!online) throw new Error('OFFLINE');

      const res = await ordersApi.createOrder(payload);
      const orderId = res.data?.data?.id;
      if (orderId) await ordersApi.submitOrder(orderId);

      Alert.alert('Order Sent', 'Your order has been submitted successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      if (err?.message === 'OFFLINE' || !err?.response) {
        enqueue({
          id: `order_${distributorId}_${Date.now()}`,
          type: 'create_order',
          payload: { ...payload, shouldSubmit: true },
          capturedAt: new Date().toISOString(),
        });
        Alert.alert(
          'Saved Offline',
          'Your order has been saved and will be sent automatically when you reconnect.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        const msg = err?.response?.data?.error?.message ?? 'Failed to submit order';
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── REVIEW STEP ──────────────────────────────────────────────────────────────
  if (step === 'review') {
    return (
      <View style={s.container}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          <Text style={s.reviewTitle}>Review Order</Text>
          <Text style={s.reviewSub}>Distributor: {distributorName}</Text>

          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={s.errorText}> {error}</Text>
            </View>
          ) : null}

          <View style={s.card}>
            {cart.map((line, i) => (
              <View key={line.variant.id}>
                <View style={s.reviewRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.reviewName}>{line.variant.productName}</Text>
                    <Text style={s.reviewMeta}>
                      {line.variant.sku} · {line.quantity} {line.variant.unit} × {fmt(line.variant.price)}
                    </Text>
                  </View>
                  <Text style={s.reviewTotal}>{fmt(line.quantity * line.variant.price)}</Text>
                </View>
                {i < cart.length - 1 && <Divider style={{ marginVertical: 8 }} />}
              </View>
            ))}
          </View>

          <View style={[s.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primaryContainer }]}>
            <Text style={{ fontWeight: '600', fontSize: 15, color: colors.onPrimaryContainer }}>Total</Text>
            <Text style={{ fontWeight: '700', fontSize: 22, color: colors.primary }}>{fmt(totalAmount)}</Text>
          </View>
        </ScrollView>

        <View style={s.bottomBar}>
          <Button mode="outlined" onPress={() => setStep('catalogue')} style={s.editBtn} disabled={submitting}>
            Edit
          </Button>
          <Button
            mode="contained" onPress={handleSendOrder} loading={submitting} disabled={submitting}
            style={s.sendBtn} icon="send"
            contentStyle={{ height: 52 }} labelStyle={{ fontWeight: '700', fontSize: 16 }}
          >
            Send Order
          </Button>
        </View>
      </View>
    );
  }

  // ── CATALOGUE STEP ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.onSurfaceVariant, marginTop: 12 }}>Loading products...</Text>
      </View>
    );
  }

  if (error && variants.length === 0) {
    return (
      <View style={s.center}>
        <Ionicons name="wifi-outline" size={48} color={colors.outline} />
        <Text style={{ color: colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }}>{error}</Text>
        <Button mode="outlined" onPress={loadCatalogue} style={{ marginTop: 16 }}>Retry</Button>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Searchbar
        placeholder="Search by product or SKU..."
        value={search}
        onChangeText={setSearch}
        style={s.searchbar}
        iconColor={colors.primary}
      />

      {stockUnavailable && (
        <View style={{ backgroundColor: '#fdf6dd', padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Ionicons name="warning-outline" size={16} color="#8a3800" />
          <Text style={{ fontWeight: '400', fontSize: 13, color: '#8a3800', flex: 1 }}>Stock data unavailable — quantities may be inaccurate</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={s.center}>
            <Ionicons name="search-outline" size={40} color={colors.outline} />
            <Text style={{ color: colors.onSurfaceVariant, marginTop: 8 }}>No products found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const qty = getQty(item.id);
          return (
            <View style={s.productRow}>
              {/* Icon */}
              <View style={s.productIcon}>
                <Text style={{ fontSize: 22 }}>🌱</Text>
              </View>

              {/* Info */}
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={s.productName}>{item.productName}</Text>
                <Text style={s.productMeta}>{item.sku} · {item.unit}</Text>
                <Text style={s.productPrice}>{fmt(item.price)}</Text>
                {item.available < 20 && item.available > 0 && (
                  <Text style={s.lowStock}>Only {item.available} left</Text>
                )}
                {item.available === 0 && (
                  <Text style={s.outOfStock}>Out of stock</Text>
                )}
              </View>

              {/* Qty controls */}
              <View style={s.qtyRow}>
                <PressableScale
                  style={[s.qtyBtn, qty === 0 && s.qtyBtnOff]}
                  onPress={() => updateCart(item, -1)}
                  disabled={qty === 0}
                  haptic="light"
                  scale={0.85}
                >
                  <Ionicons name="remove" size={18} color={qty === 0 ? colors.outline : colors.error} />
                </PressableScale>
                <Animated.View style={{ transform: [{ scale: cartBounce }] }}>
                  <Text style={s.qtyNum}>{qty}</Text>
                </Animated.View>
                <PressableScale
                  style={[s.qtyBtn, item.available === 0 && s.qtyBtnOff]}
                  onPress={() => updateCart(item, 1)}
                  disabled={item.available === 0}
                  haptic="light"
                  scale={0.85}
                >
                  <Ionicons name="add" size={18} color={item.available === 0 ? colors.outline : colors.primary} />
                </PressableScale>
              </View>
            </View>
          );
        }}
      />

      {/* Cart bar */}
      {totalItems > 0 && (
        <View style={s.cartBar}>
          <View>
            <Text style={s.cartItems}>{totalItems} item{totalItems > 1 ? 's' : ''}</Text>
            <Animated.View style={{ transform: [{ scale: cartBounce }] }}>
              <Text style={s.cartTotal}>{fmt(totalAmount)}</Text>
            </Animated.View>
          </View>
          <Button
            mode="contained" onPress={() => setStep('review')}
            style={{ borderRadius: 10 }} labelStyle={{ fontWeight: '700' }}
            icon="arrow-right"
          >
            Review Order
          </Button>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  searchbar: { margin: 12, borderRadius: 12, backgroundColor: colors.surface, elevation: 0, borderWidth: 1, borderColor: colors.outlineVariant },
  productRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  productIcon: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  productName: { fontWeight: '600', fontSize: 14, color: colors.onSurface },
  productMeta: { fontWeight: '400', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  productPrice: { fontWeight: '700', fontSize: 14, color: colors.primary, marginTop: 2 },
  lowStock: { fontWeight: '400', fontSize: 11, color: colors.secondary, marginTop: 2 },
  outOfStock: { fontWeight: '400', fontSize: 11, color: colors.error, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  qtyBtnOff: { opacity: 0.35 },
  qtyNum: { fontWeight: '700', fontSize: 16, color: colors.onSurface, minWidth: 22, textAlign: 'center' },
  cartBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.outlineVariant,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, elevation: 8,
  },
  cartItems: { fontWeight: '400', fontSize: 13, color: colors.onSurfaceVariant },
  cartTotal: { fontWeight: '700', fontSize: 18, color: colors.primary },
  // Review
  reviewTitle: { fontWeight: '700', fontSize: 20, color: colors.onSurface, marginBottom: 4 },
  reviewSub: { fontWeight: '400', fontSize: 14, color: colors.onSurfaceVariant, marginBottom: 16 },
  card: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.outlineVariant,
    padding: 16, marginBottom: 12,
  },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  reviewName: { fontWeight: '600', fontSize: 14, color: colors.onSurface },
  reviewMeta: { fontWeight: '400', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  reviewTotal: { fontWeight: '700', fontSize: 15, color: colors.onSurface, marginLeft: 12 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.outlineVariant,
    flexDirection: 'row', gap: 12, padding: 14, elevation: 8,
  },
  editBtn: { flex: 1, borderRadius: 10, borderColor: colors.outline },
  sendBtn: { flex: 2, borderRadius: 10 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.errorContainer, borderRadius: 10,
    padding: 12, marginBottom: 12,
  },
  errorText: { fontWeight: '400', color: colors.onErrorContainer, fontSize: 13, flex: 1 },
});
