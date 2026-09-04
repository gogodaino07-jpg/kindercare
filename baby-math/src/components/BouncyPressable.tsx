// 탭하면 살짝 작아졌다가 통통 튀며 돌아오는 버튼 (스프링 애니메이션)
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_SPRING = { damping: 14, stiffness: 320, mass: 0.6 };
const RELEASE_SPRING = { damping: 9, stiffness: 260, mass: 0.6 };

export interface BouncyPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** 눌렀을 때 줄어드는 정도 (기본 0.93) */
  pressScale?: number;
  /** 탭할 때 가벼운 진동 피드백 */
  haptic?: boolean;
  children?: React.ReactNode;
}

export default function BouncyPressable({
  style,
  pressScale = 0.93,
  haptic = true,
  onPressIn,
  onPressOut,
  onPress,
  children,
  ...rest
}: BouncyPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(pressScale, PRESS_SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, RELEASE_SPRING);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
