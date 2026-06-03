import React, { useState, useRef } from 'react';
import {
  View, FlatList, Dimensions,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W, height: H } = Dimensions.get('window');
// Must match the key checked in navigation/index.tsx
const KEY = 'onboarding_done';

const SLIDES = [
  {
    id: '1',
    bg: ['#1B5E3B', '#0D3D24'] as [string, string],
    icon: 'navigate' as const,
    label: 'PLAN',
    title: 'Your Beat,\nMapped Out',
    body: 'Every morning, your distributor route is ready. No guesswork — just visit, check in, and grow.',
  },
  {
    id: '2',
    bg: ['#92400E', '#78350F'] as [string, string],
    icon: 'cart' as const,
    label: 'ORDER',
    title: 'Take Orders\nAnywhere',
    body: 'Browse products, set quantities, and submit — even offline. Orders sync the moment you reconnect.',
  },
  {
    id: '3',
    bg: ['#1E3A5F', '#0F2744'] as [string, string],
    icon: 'bar-chart' as const,
    label: 'GROW',
    title: 'Track Every\nRupee',
    body: 'See your visits, order value, and distributor dues in one place. Know exactly how your day went.',
  },
];

export function WalkthroughScreen({ onComplete }: { onComplete: () => void }) {
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const ref = useRef<FlatList>(null);

  async function finish() {
    await AsyncStorage.setItem(KEY, 'true');
    onComplete();
  }

  function next() {
    if (idx < SLIDES.length - 1) {
      ref.current?.scrollToIndex({ index: idx + 1, animated: true });
      setIdx(idx + 1);
    } else {
      finish();
    }
  }

  const slide = SLIDES[idx];

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <FlatList
        ref={ref}
        data={SLIDES}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={i => i.id}
        renderItem={({ item: s }) => (
          <LinearGradient colors={s.bg} style={{ width: W, height: H }}>
            <View style={{ paddingTop: insets.top + 24, paddingHorizontal: 32, flex: 1 }}>
              {/* Label pill */}
              <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 40 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>{s.label}</Text>
              </View>

              {/* Icon */}
              <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 48 }}>
                <Ionicons name={s.icon} size={42} color="#FFFFFF" />
              </View>

              {/* Title */}
              <Text style={{ fontSize: 42, fontWeight: '800', color: '#FFFFFF', lineHeight: 48, letterSpacing: -1, marginBottom: 20 }}>{s.title}</Text>

              {/* Body */}
              <Text style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', lineHeight: 26, fontWeight: '400' }}>{s.body}</Text>
            </View>
          </LinearGradient>
        )}
      />

      {/* Bottom overlay */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: insets.bottom + 32, paddingHorizontal: 24 }}>
        {/* Dots */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32 }}>
          {SLIDES.map((_, i) => (
            <View key={i} style={{ height: 4, borderRadius: 2, backgroundColor: i === idx ? '#FFFFFF' : 'rgba(255,255,255,0.35)', width: i === idx ? 32 : 8 }} />
          ))}
        </View>

        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {idx < SLIDES.length - 1 && (
            <TouchableOpacity onPress={finish} style={{ paddingHorizontal: 20, paddingVertical: 16, justifyContent: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontWeight: '600', fontSize: 15 }}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={next} activeOpacity={0.85} style={{ flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 17, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: slide.bg[0] }}>
              {idx === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={slide.bg[0]} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
