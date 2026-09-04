// 정답/오답 시 등장하는 캐릭터 리액션 말풍선
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { colors, radius, shadow } from '../constants/theme';

interface Props {
  tone: 'correct' | 'wrong';
  message: string;
}

const FACES = {
  correct: ['🐣', '🐻', '🦄', '🐸'],
  wrong: ['🐨', '🐼', '🐧'],
};

export default function CharacterReaction({ tone, message }: Props) {
  // 매번 다른 친구가 나오도록 (렌더 시점에 한 번만 고른다)
  const face = React.useMemo(() => {
    const list = FACES[tone];
    return list[Math.floor(Math.random() * list.length)];
  }, [tone]);

  return (
    <Animated.View
      entering={ZoomIn.springify().damping(12).stiffness(220)}
      exiting={FadeOut.duration(180)}
      style={[styles.wrap, tone === 'correct' ? styles.correct : styles.wrong, shadow.float]}
      pointerEvents="none"
    >
      <Text style={styles.face}>{face}</Text>
      <View style={styles.bubble}>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 3,
    backgroundColor: colors.card,
  },
  correct: { borderColor: colors.green },
  wrong: { borderColor: colors.primary },
  face: { fontSize: 40 },
  bubble: { paddingHorizontal: 4 },
  message: { fontSize: 20, fontWeight: '800', color: colors.text },
});
