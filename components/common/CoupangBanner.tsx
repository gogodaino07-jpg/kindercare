import React, { useEffect, useMemo } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { SHADOW } from '../../constants/theme';
import Text from './AppText';

const COUPANG_LINK = 'https://link.coupang.com/a/fHdMU98clE';

interface BannerVariant {
  backgroundColor: string;
  emoji: string;
  subText: string;
  mainText: string;
  buttonColor: string;
  buttonTextColor: string;
}

const VARIANTS: BannerVariant[] = [
  {
    backgroundColor: '#297FCA',
    emoji: '🎁',
    subText: '놓치면 후회하는 특가!',
    mainText: '국민 육아템 세일전',
    buttonColor: '#FFFFFF',
    buttonTextColor: '#297FCA',
  },
  {
    backgroundColor: '#F97316',
    emoji: '🔥',
    subText: '오늘만 이 가격!',
    mainText: '기저귀·분유 최저가',
    buttonColor: '#FFFFFF',
    buttonTextColor: '#F97316',
  },
  {
    backgroundColor: '#22C55E',
    emoji: '🌱',
    subText: '우리 아이 건강 간식',
    mainText: '유기농 간식 모음전',
    buttonColor: '#FFFFFF',
    buttonTextColor: '#22C55E',
  },
  {
    backgroundColor: '#EC4899',
    emoji: '✨',
    subText: '센스있는 부모님의 선택',
    mainText: '인기 등원룩 컬렉션',
    buttonColor: '#FFFFFF',
    buttonTextColor: '#EC4899',
  },
  {
    backgroundColor: '#8B5CF6',
    emoji: '🧸',
    subText: '상상력이 쑥쑥!',
    mainText: '장난감 브랜드 특가',
    buttonColor: '#FFFFFF',
    buttonTextColor: '#8B5CF6',
  },
];

interface CoupangBannerProps {
  style?: ViewStyle;
}

export default function CoupangBanner({ style }: CoupangBannerProps) {
  const variant = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * VARIANTS.length);
    return VARIANTS[randomIndex];
  }, []);

  // Animation values
  const floatAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    // Floating emoji: up and down
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      true
    );

    // Pulsing button: scale up and down
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, [floatAnim, pulseAnim]);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const handlePress = () => {
    Linking.openURL(COUPANG_LINK).catch((err) =>
      console.error('Failed to open Coupang link:', err)
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: variant.backgroundColor }, style]}
      activeOpacity={0.9}
      onPress={handlePress}
    >
      <StarBackground />

      <View style={styles.content}>
        <View style={styles.leftContent}>
          <Animated.View style={emojiStyle}>
            <Text style={styles.iconEmoji}>{variant.emoji}</Text>
          </Animated.View>
          <View style={styles.textGroup}>
            <Text style={styles.subText}>{variant.subText}</Text>
            <Text style={styles.mainText}>{variant.mainText}</Text>
          </View>
        </View>
        <Animated.View style={[styles.buttonContainer, buttonStyle]}>
          <View style={[styles.button, { backgroundColor: variant.buttonColor }]}>
            <Text style={[styles.buttonText, { color: variant.buttonTextColor }]}>
              보러가기 🚀
            </Text>
          </View>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

function StarBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Star x="10%" y="20%" size={14} delay={0} />
      <Star x="85%" y="15%" size={18} delay={400} />
      <Star x="45%" y="70%" size={12} delay={800} />
      <Star x="75%" y="75%" size={16} delay={1200} />
      <Star x="25%" y="80%" size={10} delay={1600} />
      <Star x="60%" y="25%" size={8} delay={2000} />
      {/* Sparkles */}
      <Sparkle x="35%" y="15%" delay={200} />
      <Sparkle x="90%" y="60%" delay={700} />
      <Sparkle x="15%" y="65%" delay={1500} />
    </View>
  );
}

function Star({ x, y, size, delay }: { x: string; y: string; size: number; delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 })
        ),
        -1,
        true
      )
    );
  }, [opacity, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.Text
      style={[
        { position: 'absolute', left: x, top: y, fontSize: size, color: '#FFFFFF' },
        animatedStyle,
      ]}
    >
      ✦
    </Animated.Text>
  );
}

function Sparkle({ x, y, delay }: { x: string; y: string; delay: number }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0, { duration: 500 }),
          withTiming(0, { duration: 1000 }) // Stay invisible for a bit
        ),
        -1,
        false
      )
    );
  }, [scale, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: '#FFFFFF',
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOW,
    elevation: 6,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 32,
    marginRight: 14,
  },
  textGroup: {
    flexDirection: 'column',
  },
  subText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FDE047',
    marginBottom: 4,
  },
  mainText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  buttonContainer: {
    // Wrapper for scale animation
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '900',
  },
});
