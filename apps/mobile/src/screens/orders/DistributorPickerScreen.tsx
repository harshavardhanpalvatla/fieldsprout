import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Text, Searchbar, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useCatalogStore, Distributor } from '../../stores/catalogStore';
import { useAuthStore } from '../../stores/authStore';
import { DistributorCard } from '../../components/DistributorCard';
import { colors } from '../../theme';
import type { OrdersStackParamList } from './OrdersScreen';

type NavigationProp = StackNavigationProp<OrdersStackParamList, 'DistributorPickerForOrder'>;

export function DistributorPickerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { distributors } = useCatalogStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');

  const filtered = distributors.filter((d) => {
    if (!search) return true;
    return d.name.toLowerCase().includes(search.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    const aPlanned = a.assignedRepId === user?.id ? -1 : 1;
    const bPlanned = b.assignedRepId === user?.id ? -1 : 1;
    return aPlanned - bPlanned;
  });

  function handleSelect(distributor: Distributor) {
    navigation.navigate('NewOrderFromOrders', {
      distributorId: distributor.id,
      distributorName: distributor.name,
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Distributor</Text>
      <Searchbar
        placeholder="Search..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchbar}
        iconColor={colors.primary}
      />
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DistributorCard
            distributor={item}
            currentUserId={user?.id}
            onPress={() => handleSelect(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No distributors found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    padding: 16,
    paddingBottom: 0,
  },
  searchbar: {
    margin: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    elevation: 2,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
