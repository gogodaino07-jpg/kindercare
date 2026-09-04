// 스티커판 - 레벨을 클리어하면 모이는 보상 컬렉션
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../src/components/ScreenHeader';
import { LEVELS } from '../src/constants/levels';
import { colors, radius, shadow, spacing } from '../src/constants/theme';
import { useGame } from '../src/context/GameContext';

export default function StickersScreen() {
  const router = useRouter();
  const { stickers, stars } = useGame();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        onBack={() => router.back()}
        title="스티커판"
        subtitle={`모은 스티커 ${stickers.length} / ${LEVELS.length}`}
      />

      <View style={styles.board}>
        {LEVELS.map((level, i) => {
          const owned = stickers.includes(level.sticker.id);
          return (
            <Animated.View
              key={level.sticker.id}
              entering={FadeInDown.delay(i * 70).duration(320)}
              style={[
                styles.slot,
                shadow.card,
                { borderColor: owned ? level.color : colors.border },
                !owned && styles.slotEmpty,
              ]}
            >
              <Text style={[styles.emoji, !owned && styles.locked]}>
                {owned ? level.sticker.emoji : '❔'}
              </Text>
              <Text style={[styles.name, !owned && styles.lockedText]}>
                {owned ? level.sticker.name : '아직 비어 있어요'}
              </Text>
              <Text style={styles.from}>
                {level.id}단계 · {level.title}
              </Text>
            </Animated.View>
          );
        })}
      </View>

      <Text style={styles.footer}>지금까지 모은 별 ⭐ {stars}개</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  board: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'stretch',
  },
  slot: {
    flexGrow: 1,
    flexBasis: 180,
    maxWidth: 260,
    borderRadius: radius.lg,
    borderWidth: 4,
    borderStyle: 'dashed',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.md,
  },
  slotEmpty: { backgroundColor: '#F8F4EC' },
  emoji: { fontSize: 60 },
  locked: { opacity: 0.35 },
  name: { fontSize: 20, fontWeight: '900', color: colors.text },
  lockedText: { color: colors.lockedText, fontSize: 15 },
  from: { fontSize: 13, fontWeight: '700', color: colors.textSub },
  footer: {
    textAlign: 'center',
    paddingVertical: spacing.md,
    fontSize: 17,
    fontWeight: '800',
    color: colors.textSub,
  },
});
