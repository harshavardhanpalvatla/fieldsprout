import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Distributor } from '../stores/catalogStore';
import { colors } from '../theme';

interface DistributorCardProps {
  distributor: Distributor;
  currentUserId?: string;
  onPress?: () => void;
  showDues?: boolean;
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function DistributorCard({
  distributor,
  currentUserId,
  onPress,
  showDues = false,
}: DistributorCardProps) {
  const isAssigned = distributor.assignedRepId === currentUserId;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.wrapper}>
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.nameContainer}>
              <Text style={styles.name} numberOfLines={1}>
                {distributor.name}
              </Text>
              {distributor.address && (
                <Text style={styles.address} numberOfLines={1}>
                  {distributor.address}
                </Text>
              )}
            </View>
            {isAssigned && (
              <Chip
                icon="star"
                style={styles.plannedChip}
                textStyle={styles.plannedChipText}
                compact
              >
                Planned
              </Chip>
            )}
          </View>

          <View style={styles.footerRow}>
            {distributor.phone && (
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.phone}>{distributor.phone}</Text>
              </View>
            )}
            {showDues && distributor.totalDues !== undefined && distributor.totalDues > 0 && (
              <Chip
                icon="alert-circle-outline"
                style={styles.duesChip}
                textStyle={styles.duesChipText}
                compact
              >
                {formatCurrency(distributor.totalDues)} dues
              </Chip>
            )}
          </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  address: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  plannedChip: {
    backgroundColor: '#E8F5E9',
    height: 28,
  },
  plannedChipText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phone: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  duesChip: {
    backgroundColor: '#FFF8E1',
    height: 28,
  },
  duesChipText: {
    color: '#F57F17',
    fontSize: 11,
    fontWeight: '600',
  },
});
