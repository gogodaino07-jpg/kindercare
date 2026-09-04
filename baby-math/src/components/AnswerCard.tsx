// 정답 선택 카드
// - 정답: 초록색으로 반짝이며 살짝 커짐
// - 오답: 부드럽게 좌우로 흔들림(shake)
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, shadow } from '../constants/theme';
import { Point } from '../context/RewardFxContext';
import { ChoiceView } from '../lib/questions';
import BouncyPressable from './BouncyPressable';
import ObjectGroup from './ObjectGroup';

export type AnswerState = 'idle' | 'correct' | 'wrong' | 'dimmed';

interface Props {
  choice: ChoiceView;
  state: AnswerState;
  disabled?: boolean;
  onPress: (center: Point) => void;
}

export default function AnswerCard({ choice, state, disabled, onPress }: Props) {
  const flash = useSharedValue(0); // 0: 기본, 1: 정답 초록
  const shake = useSharedValue(0);
  const pop = useSharedValue(1);
  const wrapRef = useRef<View>(null);

  useEffect(() => {
    if (state === 'correct') {
      flash.value = withSequence(withTiming(1, { duration: 160 }), withTiming(0.75, { duration: 220 }));
      pop.value = withSequence(
        withSpring(1.08, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 240 }),
      );
    } else if (state === 'wrong') {
      // 좌절감을 주지 않도록 진폭은 작게, 부드럽게
      shake.value = withSequence(
        withTiming(-9, { duration: 60 }),
        withTiming(9, { duration: 70 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 70 }),
      );
    } else {
      flash.value = withTiming(0, { duration: 200 });
    }
  }, [state, flash, pop, shake]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(flash.value, [0, 1], [colors.card, colors.greenGlow]),
    borderColor: interpolateColor(flash.value, [0, 1], [colors.border, colors.green]),
    transform: [{ translateX: shake.value }, { scale: pop.value }],
  }));

  return (
    <Animated.View
      style={[styles.shell, state === 'dimmed' && styles.dimmed, shadow.card, animatedStyle]}
    >
      <View ref={wrapRef} collapsable={false} style={styles.inner}>
        <BouncyPressable
          style={styles.press}
          disabled={disabled}
          onPress={() => {
            wrapRef.current?.measureInWindow((x, y, width, height) => {
              onPress({ x: x + width / 2 - 17, y: y + height / 2 - 17 });
            });
          }}
        >
          <ChoiceContent choice={choice} />
        </BouncyPressable>
      </View>
    </Animated.View>
  );
}

function ChoiceContent({ choice }: { choice: ChoiceView }) {
  if (choice.type === 'text') return <Text style={styles.number}>{choice.text}</Text>;
  if (choice.type === 'shape') return <Text style={styles.shape}>{choice.emoji}</Text>;
  return <ObjectGroup emoji={choice.emoji} count={choice.count} size={26} maxPerRow={5} />;
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minWidth: 120,
    borderRadius: radius.lg,
    borderWidth: 3,
    overflow: 'hidden',
  },
  dimmed: { opacity: 0.45 },
  inner: { flex: 1 },
  press: {
    flex: 1,
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  number: { fontSize: 52, fontWeight: '800', color: colors.text },
  shape: { fontSize: 60 },
});
