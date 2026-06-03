import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface Props extends PressableProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  scale?: number;
  haptic?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'none';
}

export function PressableScale({ children, style, scale = 0.96, haptic = 'light', onPress, disabled, ...props }: Props) {
  const anim = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(anim, { toValue: scale, useNativeDriver: true, tension: 300, friction: 20 }).start();
  }

  function onPressOut() {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 20 }).start();
  }

  async function handlePress(e: any) {
    if (disabled) return;
    if (haptic !== 'none') {
      try {
        if (haptic === 'success') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else if (haptic === 'error') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        else if (haptic === 'warning') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        else if (haptic === 'medium') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (haptic === 'heavy') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        else await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onPress?.(e);
  }

  return (
    <Animated.View style={[{ transform: [{ scale: anim }] }, style as ViewStyle]}>
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={handlePress} disabled={disabled} {...props}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
