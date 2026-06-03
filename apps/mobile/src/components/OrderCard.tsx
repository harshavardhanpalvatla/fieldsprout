import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Order } from '../stores/catalogStore';
import { StatusChip } from './StatusChip';
import { colors } from '../theme';

interface OrderCardProps {
  order: Order;
  onPress?: () => void;
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.wrapper}>
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.content}>
          <View style={styles.row}>
            <Text style={styles.distributorName} numberOfLines={1}>
              {order.distributorName || 'Unknown Distributor'}
            </Text>
            <StatusChip status={order.status} size="sm" />
          </View>
          <View style={styles.row}>
            <Text style={styles.amount}>{formatCurrency(order.totalAmount)}</Text>
            <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
          </View>
          {order.status === 'rejected' && order.rejectionReason && (
            <View style={styles.rejectionRow}>
              <Text style={styles.rejectionText} numberOfLines={1}>
                Reason: {order.rejectionReason}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  content: {
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  distributorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  rejectionRow: {
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
    padding: 6,
  },
  rejectionText: {
    fontSize: 12,
    color: '#C62828',
  },
});
