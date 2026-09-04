// 문제 진행 상황 표시 (점 + 진행 바)
// 진행 바는 정답을 맞힐 때마다 애니메이션으로 채워진다.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors, radius, TRANSITION_MS } from '../constants/theme';

interface Props {
  total: number;
  /** 지금까지 푼 문제 수 */
  solved: number;
  /** 현재 풀고 있는 문제 인덱스 (0부터) */
  current: number;
  label?: string;
}

export default function ProgressTrack({ total, solved, current, label }: Props) {
  const ratio = total > 0 ? solved / total : 0;

  const barStyle = useAnimatedStyle(() => ({
    width: withTiming(`${Math.round(ratio * 100)}%`, { duration: TRANSITION_MS + 200 }),
  }));

  return (
    <View style={styles.wrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.dots}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < solved && styles.dotDone,
              i === current && solved <= i && styles.dotCurrent,
            ]}
          />
        ))}
      </View>

      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 16, fontWeight: '700', color: colors.textSub },
  dots: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.border,
  },
  dotDone: { backgroundColor: colors.green },
  dotCurrent: { backgroundColor: colors.primary, transform: [{ scale: 1.25 }] },
  barTrack: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.green },
});
