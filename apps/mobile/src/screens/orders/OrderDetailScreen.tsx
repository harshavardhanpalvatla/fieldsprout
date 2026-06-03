import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ordersApi } from '../../api/orders';
import { Order } from '../../stores/catalogStore';
import StatusChip from '../../components/StatusChip';
import { ds, type, font, STATUS_LABELS } from '../../theme';
import type { OrdersStackParamList } from './OrdersScreen';

type DetailRouteProp = RouteProp<OrdersStackParamList, 'OrderDetail'>;
type NavigationProp = StackNavigationProp<OrdersStackParamList, 'OrderDetail'>;

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type TimelineStep = {
  key: keyof Order;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const TIMELINE_STEPS: TimelineStep[] = [
  { key: 'createdAt',    label: STATUS_LABELS.draft,      icon: 'document-outline',         color: ds.textMuted },
  { key: 'submittedAt', label: STATUS_LABELS.submitted,   icon: 'send-outline',             color: ds.purple },
  { key: 'approvedAt',  label: STATUS_LABELS.approved,    icon: 'checkmark-circle-outline', color: ds.primary },
  { key: 'dispatchedAt',label: STATUS_LABELS.dispatched,  icon: 'car-outline',              color: ds.amber },
  { key: 'deliveredAt', label: STATUS_LABELS.delivered,   icon: 'checkmark-done-outline',   color: ds.green },
];

export function OrderDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailRouteProp>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  async function fetchOrder() {
    setLoading(true);
    try {
      const res = await ordersApi.getOrder(orderId);
      setOrder(res.data?.data ?? res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeliver() {
    setDelivering(true);
    setError('');
    try {
      const res = await ordersApi.deliverOrder(orderId);
      setOrder(res.data?.data ?? res.data);
      setSuccess('Order marked as delivered!');
      setTimeout(() => navigation.navigate('OrderList'), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to mark as delivered.');
    } finally {
      setDelivering(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ds.primary} />
        <Text style={[styles.loadingText, { color: ds.textMuted }]}>Loading order...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        {!!error && (
          <View style={[styles.errorBox]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <Text style={{ color: ds.red, fontSize: 16 }}>Failed to load order</Text>
        <Button onPress={fetchOrder} style={{ marginTop: 12 }}>Retry</Button>
      </View>
    );
  }

  const isRejected = order.status === 'rejected';
  const isDispatched = order.status === 'dispatched';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: ds.bg }]}
      contentContainerStyle={styles.content}
    >
      {/* Header card */}
      <View
        style={[
          styles.headerCard,
          { backgroundColor: ds.surface, borderColor: ds.border },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={[styles.distributorName, { color: ds.text }]} numberOfLines={1}>
              {order.distributor?.name ?? order.distributorName ?? 'Order'}
            </Text>
            <Text style={[styles.orderId, { color: ds.textMuted }]}>
              Order #{orderId.slice(-8).toUpperCase()}
            </Text>
          </View>
          <StatusChip status={order.status} />
        </View>
        <Divider style={[styles.divider, { backgroundColor: ds.border }]} />
        <View style={styles.amountRow}>
          <Text style={[styles.amountLabel, { color: ds.textMuted }]}>Total Amount</Text>
          <Text style={[styles.amount, { color: ds.primary }]}>
            {formatCurrency(Number(order.totalAmount ?? 0))}
          </Text>
        </View>
      </View>

      {/* Inline error */}
      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Success */}
      {!!success && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{success}</Text>
        </View>
      )}

      {/* Rejected card — Carbon error with left accent border */}
      {isRejected && order.rejectionReason && (
        <View
          style={[
            styles.rejectionCard,
            {
              backgroundColor: ds.redLight,
              borderWidth: 1,
              borderColor: ds.red,
              borderLeftWidth: 4,
              borderLeftColor: ds.red,
            },
          ]}
        >
          <View style={styles.rejectionHeader}>
            <Ionicons name="close-circle-outline" size={20} color={ds.red} />
            <Text style={[styles.rejectionTitle, { color: ds.red }]}>
              {STATUS_LABELS.rejected}
            </Text>
          </View>
          <Text style={[styles.rejectionReason, { color: ds.text }]}>
            {order.rejectionReason}
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={{ borderRadius: 0 }}
            contentStyle={styles.bigButtonContent}
            labelStyle={styles.bigButtonLabel}
            buttonColor={ds.red}
            icon="pencil"
          >
            Edit &amp; Resubmit
          </Button>
        </View>
      )}

      {/* Deliver button — only for dispatched orders */}
      {isDispatched && (
        <Button
          mode="contained"
          onPress={handleDeliver}
          loading={delivering}
          disabled={delivering}
          style={{ borderRadius: 0, marginBottom: 4 }}
          contentStyle={styles.bigButtonContent}
          labelStyle={styles.bigButtonLabel}
          buttonColor={ds.primary}
          icon="check-all"
        >
          Mark as Delivered
        </Button>
      )}

      {/* Order items */}
      {order.items && order.items.length > 0 && (
        <View>
          <Text
            style={[styles.sectionTitle, { color: ds.text }]}
          >
            Order Items
          </Text>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: ds.surface, borderColor: ds.border },
            ]}
          >
            {/* Table header */}
            <View style={[styles.tableRow, { backgroundColor: ds.surfaceAlt }]}>
              <Text style={[styles.tableCell, styles.tableCellFlex, styles.tableHeaderText, { color: ds.textMuted }]}>
                Item
              </Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { width: 40, textAlign: 'center', color: ds.textMuted }]}>
                Qty
              </Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { width: 72, textAlign: 'right', color: ds.textMuted }]}>
                Price
              </Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { width: 72, textAlign: 'right', color: ds.textMuted }]}>
                Total
              </Text>
            </View>
            <Divider style={{ backgroundColor: ds.border }} />
            {order.items.map((item, index) => (
              <View key={item.variantId ?? item.id}>
                <View style={styles.tableRow}>
                  <View style={styles.tableCellFlex}>
                    <Text style={[styles.itemName, { color: ds.text }]} numberOfLines={2}>
                      {item.variant?.product?.name ?? item.productName ?? item.variant?.sku ?? 'Product'}
                    </Text>
                    {!!(item.variant?.unit ?? item.unit) && (
                      <Text style={[styles.itemUnit, { color: ds.textMuted }]}>
                        {item.variant?.unit ?? item.unit}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.tableCell, { width: 40, textAlign: 'center', color: ds.text }]}>
                    {item.quantity}
                  </Text>
                  <Text style={[styles.tableCell, { width: 72, textAlign: 'right', color: ds.textMuted }]}>
                    {formatCurrency(Number(item.unitPrice))}
                  </Text>
                  <Text style={[styles.tableCell, { width: 72, textAlign: 'right', fontWeight: '600', color: ds.text }]}>
                    {formatCurrency(Number(item.lineTotal))}
                  </Text>
                </View>
                {index < order.items!.length - 1 && (
                  <Divider style={{ backgroundColor: ds.border }} />
                )}
              </View>
            ))}
            <Divider style={{ backgroundColor: ds.border }} />
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: ds.text }]}>Total</Text>
              <Text style={[styles.totalAmount, { color: ds.primary }]}>
                {formatCurrency(Number(order.totalAmount ?? 0))}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Status timeline — Carbon style */}
      <View>
        <Text style={[styles.sectionTitle, { color: ds.text }]}>Order Timeline</Text>
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: ds.surface, borderColor: ds.border },
          ]}
        >
          {TIMELINE_STEPS.map((step, index) => {
            const timestamp = order[step.key] as string | undefined;
            const isCompleted = !!timestamp;

            return (
              <View key={step.key} style={styles.timelineStep}>
                <View style={styles.timelineSide}>
                  <View
                    style={[
                      styles.timelineDot,
                      isCompleted
                        ? { backgroundColor: step.color }
                        : { backgroundColor: ds.borderLight, borderWidth: 1, borderColor: ds.border },
                    ]}
                  >
                    <Ionicons
                      name={step.icon}
                      size={11}
                      color={isCompleted ? '#ffffff' : ds.textLight}
                    />
                  </View>
                  {index < TIMELINE_STEPS.length - 1 && (
                    <View
                      style={[
                        styles.timelineConnector,
                        { backgroundColor: isCompleted ? step.color : ds.borderLight },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.timelineBody}>
                  <Text
                    style={[
                      styles.timelineLabel,
                      isCompleted
                        ? { color: step.color, fontWeight: '700' }
                        : { color: ds.border },
                    ]}
                  >
                    {step.label}
                  </Text>
                  <Text style={[styles.timelineTime, { color: ds.textMuted }]}>
                    {isCompleted ? formatDateTime(timestamp) : 'Pending'}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Rejected step — shown only when status is rejected; no rejectedAt field exists */}
          {isRejected && (
            <View style={styles.timelineStep}>
              <View style={styles.timelineSide}>
                <View style={[styles.timelineDot, { backgroundColor: ds.red }]}>
                  <Ionicons name="close-circle-outline" size={11} color="#ffffff" />
                </View>
              </View>
              <View style={styles.timelineBody}>
                <Text style={[styles.timelineLabel, { color: ds.red, fontWeight: '700' }]}>
                  {STATUS_LABELS.rejected}
                </Text>
                {order.rejectionReason ? (
                  <Text style={[styles.timelineTime, { color: ds.textMuted }]}>
                    {order.rejectionReason}
                  </Text>
                ) : (
                  <Text style={[styles.timelineTime, { color: ds.textMuted }]}>—</Text>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { fontSize: 14, marginTop: 12 },
  headerCard: { borderWidth: 1, padding: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  headerLeft: { flex: 1 },
  distributorName: { fontSize: 20, fontWeight: '700' },
  orderId: { fontSize: 13, marginTop: 2 },
  divider: { marginVertical: 8 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: 14 },
  amount: { fontSize: 22, fontWeight: '700' },
  errorBox: {
    backgroundColor: ds.redLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: ds.red,
  },
  errorText: { fontSize: 13, color: ds.red, fontWeight: '500' },
  successBox: {
    backgroundColor: ds.greenLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: ds.green,
  },
  successText: { fontSize: 13, color: ds.green, fontWeight: '500' },
  rejectionCard: { padding: 16 },
  rejectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  rejectionTitle: { fontSize: 15, fontWeight: '700' },
  rejectionReason: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  bigButtonContent: { height: 52, justifyContent: 'center' },
  bigButtonLabel: { fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  sectionCard: { borderWidth: 1, overflow: 'hidden' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
  },
  tableHeaderText: { fontSize: 12, fontWeight: '600' },
  tableCell: { fontSize: 13 },
  tableCellFlex: { flex: 1, marginRight: 4 },
  itemName: { fontSize: 13, fontWeight: '600' },
  itemUnit: { fontSize: 11 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  totalLabel: { fontSize: 15, fontWeight: '700' },
  totalAmount: { fontSize: 18, fontWeight: '700' },
  timelineStep: { flexDirection: 'row', paddingHorizontal: 16 },
  timelineSide: { alignItems: 'center', marginRight: 12, width: 22 },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineConnector: { width: 2, flex: 1, minHeight: 20 },
  timelineBody: { flex: 1, paddingBottom: 16, paddingTop: 2 },
  timelineLabel: { fontSize: 14 },
  timelineTime: { fontSize: 12, marginTop: 2 },
});
