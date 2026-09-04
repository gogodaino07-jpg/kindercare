// 레벨맵 화면 - 5단계 학습 코스를 가로로 펼쳐서 보여준다.
// 이전 레벨을 모두 클리어해야 다음 레벨이 열린다.
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import BouncyPressable from '../src/components/BouncyPressable';
import ScreenHeader from '../src/components/ScreenHeader';
import { LEVELS, LevelDef } from '../src/constants/levels';
import { colors, radius, shadow, spacing } from '../src/constants/theme';
import { useGame } from '../src/context/GameContext';

export default function LevelMapScreen() {
  const router = useRouter();
  const { isLevelUnlocked, isLevelCleared, clearedStages, currentLevelId } = useGame();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader onBack={() => router.back()} title="레벨맵" subtitle="한 단계씩 차근차근!" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
      >
        {LEVELS.map((level, index) => {
          const unlocked = isLevelUnlocked(level.id);
          const cleared = isLevelCleared(level.id);
          const done = clearedStages[level.id] ?? 0;

          return (
            <React.Fragment key={level.id}>
              {index > 0 && <View style={[styles.link, unlocked && styles.linkOn]} />}
              <Animated.View entering={FadeInDown.delay(index * 70).duration(320)}>
                <LevelNode
                  level={level}
                  unlocked={unlocked}
                  cleared={cleared}
                  done={done}
                  isCurrent={level.id === currentLevelId}
                  onPress={() =>
                    router.push({ pathname: '/quiz', params: { level: String(level.id) } })
                  }
                />
              </Animated.View>
            </React.Fragment>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function LevelNode({
  level,
  unlocked,
  cleared,
  done,
  isCurrent,
  onPress,
}: {
  level: LevelDef;
  unlocked: boolean;
  cleared: boolean;
  done: number;
  isCurrent: boolean;
  onPress: () => void;
}) {
  return (
    <BouncyPressable disabled={!unlocked} onPress={onPress} pressScale={0.95}>
      <View
        style={[
          styles.node,
          shadow.card,
          { borderColor: unlocked ? level.color : colors.locked },
          !unlocked && styles.nodeLocked,
          isCurrent && styles.nodeCurrent,
        ]}
      >
        <View style={[styles.nodeBadge, { backgroundColor: unlocked ? level.color : colors.locked }]}>
          <Text style={styles.nodeBadgeText}>{level.id}단계</Text>
        </View>

        <Text style={[styles.nodeEmoji, !unlocked && styles.dim]}>
          {unlocked ? level.emoji : '🔒'}
        </Text>
        <Text style={[styles.nodeTitle, !unlocked && styles.lockedText]}>{level.title}</Text>
        <Text style={styles.nodeSubtitle}>{level.subtitle}</Text>

        <View style={styles.stagePips}>
          {Array.from({ length: level.stages }, (_, i) => (
            <View
              key={i}
              style={[
                styles.pip,
                i < done && { backgroundColor: level.color },
                !unlocked && styles.pipLocked,
              ]}
            />
          ))}
        </View>

        <Text style={styles.nodeStatus}>
          {cleared ? `클리어! ${level.sticker.emoji}` : unlocked ? `${done} / ${level.stages} 스테이지` : '잠금'}
        </Text>
      </View>
    </BouncyPressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  track: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: 0,
  },
  link: {
    width: 34,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  linkOn: { backgroundColor: colors.primary },
  node: {
    width: 210,
    borderRadius: radius.lg,
    borderWidth: 4,
    backgroundColor: colors.card,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  nodeLocked: { backgroundColor: '#F6F2EA' },
  nodeCurrent: { transform: [{ scale: 1.06 }] },
  nodeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  nodeBadgeText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  nodeEmoji: { fontSize: 52, marginTop: 4 },
  dim: { opacity: 0.5 },
  nodeTitle: { fontSize: 21, fontWeight: '900', color: colors.text },
  lockedText: { color: colors.lockedText },
  nodeSubtitle: { fontSize: 13, fontWeight: '700', color: colors.textSub, textAlign: 'center' },
  stagePips: { flexDirection: 'row', gap: 6, marginTop: 8 },
  pip: { width: 26, height: 9, borderRadius: radius.pill, backgroundColor: colors.border },
  pipLocked: { backgroundColor: colors.locked },
  nodeStatus: { fontSize: 14, fontWeight: '800', color: colors.textSub, marginTop: 6 },
});
