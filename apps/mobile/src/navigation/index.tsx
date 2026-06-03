import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { ds, font } from '../theme';

// Auth screens
import { PhoneScreen } from '../screens/auth/PhoneScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';

// Main screens
import { HomeScreen } from '../screens/home/HomeScreen';
import { VisitsScreen } from '../screens/visits/VisitsScreen';
import { DistributorDetailScreen } from '../screens/visits/DistributorDetailScreen';
import { CheckInScreen } from '../screens/visits/CheckInScreen';
import { OrdersScreen } from '../screens/orders/OrdersScreen';
import { OrderDetailScreen } from '../screens/orders/OrderDetailScreen';
import { NewOrderScreen } from '../screens/orders/NewOrderScreen';
import { DistributorPickerScreen } from '../screens/orders/DistributorPickerScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { WalkthroughScreen } from '../screens/onboarding/WalkthroughScreen';

const ONBOARDING_KEY = 'onboarding_done';

// Stack navigators
const AuthStack = createStackNavigator();
const HomeStack = createStackNavigator();
const VisitsStack = createStackNavigator();
const OrdersStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const Tab = createBottomTabNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Phone" component={PhoneScreen} />
      <AuthStack.Screen name="Otp" component={OtpScreen} />
    </AuthStack.Navigator>
  );
}

function HomeNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: ds.surface },
        headerTintColor: ds.primary,
        headerTitleStyle: { fontWeight: '600', fontSize: 17, color: ds.text },
        headerBackTitleVisible: false,
        headerShadowVisible: true,
        headerBackTitle: '',
      }}
    >
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

function VisitsNavigator() {
  return (
    <VisitsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: ds.surface },
        headerTintColor: ds.primary,
        headerTitleStyle: { fontWeight: '600', fontSize: 17, color: ds.text },
        headerBackTitleVisible: false,
        headerShadowVisible: true,
        headerBackTitle: '',
      }}
    >
      <VisitsStack.Screen
        name="DistributorList"
        component={VisitsScreen}
        options={{ headerShown: false }}
      />
      <VisitsStack.Screen
        name="DistributorDetail"
        component={DistributorDetailScreen}
        options={{ headerShown: false }}
      />
      <VisitsStack.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{ headerShown: false }}
      />
      <VisitsStack.Screen
        name="NewOrder"
        component={NewOrderScreen as any}
        options={{ title: 'New Order' }}
      />
    </VisitsStack.Navigator>
  );
}

function OrdersNavigator() {
  return (
    <OrdersStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: ds.surface },
        headerTintColor: ds.primary,
        headerTitleStyle: { fontWeight: '600', fontSize: 17, color: ds.text },
        headerBackTitleVisible: false,
        headerShadowVisible: true,
        headerBackTitle: '',
      }}
    >
      <OrdersStack.Screen
        name="OrderList"
        component={OrdersScreen}
        options={{ headerShown: false }}
      />
      <OrdersStack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: 'Order Details' }}
      />
      <OrdersStack.Screen
        name="DistributorPickerForOrder"
        component={DistributorPickerScreen}
        options={{ title: 'Select Distributor' }}
      />
      <OrdersStack.Screen
        name="NewOrderFromOrders"
        component={NewOrderScreen}
        options={{ title: 'New Order' }}
      />
    </OrdersStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: ds.surface },
        headerTintColor: ds.primary,
        headerTitleStyle: { fontWeight: '600', fontSize: 17, color: ds.text },
        headerBackTitleVisible: false,
        headerShadowVisible: true,
        headerBackTitle: '',
      }}
    >
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: '#00A693',
        tabBarInactiveTintColor: '#AEAEB2',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.1,
        },
        tabBarIcon: ({ focused, color }) => {
          const map: Record<string, [string, string]> = {
            HomeTab:    ['home', 'home-outline'],
            VisitsTab:  ['location', 'location-outline'],
            OrdersTab:  ['receipt', 'receipt-outline'],
            ProfileTab: ['person', 'person-outline'],
          };
          const [active, inactive] = map[route.name] ?? ['apps', 'apps-outline'];
          return (
            <Ionicons
              name={(focused ? active : inactive) as any}
              size={22}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{ tabBarLabel: 'Today' }}
      />
      <Tab.Screen
        name="VisitsTab"
        component={VisitsNavigator}
        options={{ tabBarLabel: 'Route' }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersNavigator}
        options={{ tabBarLabel: 'Orders' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{ tabBarLabel: 'Me' }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated } = useAuthStore();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  if (onboardingDone === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ds.primary} />
      </View>
    );
  }

  if (!onboardingDone) {
    return <WalkthroughScreen onComplete={() => setOnboardingDone(true)} />;
  }

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  return <MainTabs />;
}
