// 상단 보상 카운터 (별 / 코인)
// 값이 늘어나면 통통 튀는 팝 애니메이션. 별 카운터는 fly-to 애니메이션의 도착 지점으로 등록된다.
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { colors, radius, shadow } from '../constants/theme';
import { useRewardFx } from '../context/RewardFxContext';

interface Props {
  emoji: string;
  value: number;
  /** 별처럼 날아오는 보상의 도착 지점으로 쓸지 여부 */
  isFlyTarget?: boolean;
  tint?: string;
}

export default function RewardCounter({ emoji, value, isFlyTarget = false, tint = colors.yellow }: Props) {
  const { setStarTarget } = useRewardFx();
  const scale = useSharedValue(1);
  const prevValue = useRef(value);
  const viewRef = useRef<View>(null);

  useEffect(() => {
    if (value > prevValue.current) {
      scale.value = withSequence(
        withSpring(1.25, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 240 }),
      );
    }
    prevValue.current = value;
  }, [value, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View
      ref={viewRef}
      collapsable={false}
      onLayout={() => {
        if (!isFlyTarget) return;
        // 화면 좌표를 등록해 두면 문제 화면에서 별이 이 위치로 날아온다
        requestAnimationFrame(() => {
          viewRef.current?.measureInWindow((x, y, width, height) => {
            setStarTarget({ x: x + width / 2 - 17, y: y + height / 2 - 17 });
          });
        });
      }}
    >
      <Animated.View style={[styles.wrap, { borderColor: tint }, shadow.card, animatedStyle]}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.value}>{value}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 3,
    backgroundColor: colors.card,
  },
  emoji: { fontSize: 22 },
  value: { fontSize: 22, fontWeight: '800', color: colors.text, minWidth: 28, textAlign: 'center' },
});
