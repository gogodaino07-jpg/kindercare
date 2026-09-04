// 홈 화면 배경 - 하늘 그라데이션 + 천천히 떠다니는 구름 + 아래쪽 언덕
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface CloudProps {
  top: number;
  left: number;
  scale: number;
  /** 왕복에 걸리는 시간(ms) - 구름마다 다르게 줘서 자연스럽게 */
  duration: number;
  distance: number;
}

function Cloud({ top, left, scale, duration, distance }: CloudProps) {
  const drift = useSharedValue(0);

  React.useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [drift, duration]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: drift.value * distance }, { scale }],
  }));

  return (
    <Animated.View style={[styles.cloud, { top, left }, style]} pointerEvents="none">
      <View style={[styles.puff, styles.puffLeft]} />
      <View style={[styles.puff, styles.puffCenter]} />
      <View style={[styles.puff, styles.puffRight]} />
      <View style={styles.cloudBase} />
    </Animated.View>
  );
}

export default function SkyBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#BFE7FF', '#E7F6FF', '#FFF7E6']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Cloud top={26} left={140} scale={1} duration={9000} distance={40} />
      <Cloud top={96} left={520} scale={0.72} duration={11000} distance={-32} />
      <Cloud top={40} left={840} scale={0.9} duration={13000} distance={28} />

      {/* 아래쪽 초록 언덕 */}
      <View style={styles.hill} />
      <View style={styles.hillFront} />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1 },
  cloud: { position: 'absolute', width: 150, height: 54 },
  puff: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 999, opacity: 0.92 },
  puffLeft: { width: 56, height: 56, left: 0, top: 2 },
  puffCenter: { width: 74, height: 74, left: 36, top: -16 },
  puffRight: { width: 52, height: 52, right: 0, top: 6 },
  cloudBase: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 4,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    opacity: 0.92,
  },
  hill: {
    position: 'absolute',
    left: -160,
    right: -160,
    bottom: -190,
    height: 300,
    borderRadius: 999,
    backgroundColor: '#CFEFB6',
    opacity: 0.85,
  },
  hillFront: {
    position: 'absolute',
    left: -220,
    right: -220,
    bottom: -230,
    height: 300,
    borderRadius: 999,
    backgroundColor: '#B7E59A',
    opacity: 0.9,
  },
});
