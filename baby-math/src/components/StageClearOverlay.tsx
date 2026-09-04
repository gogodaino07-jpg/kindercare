// 스테이지/레벨 클리어 화면
// 진행 바가 애니메이션으로 채워지고, 레벨을 모두 깨면 스티커를 획득한다.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { colors, radius, shadow, spacing } from '../constants/theme';
import BouncyPressable from './BouncyPressable';

interface Props {
  title: string;
  /** 이번 스테이지에서 모은 별 */
  earnedStars: number;
  /** 레벨 진행률 (0~1) */
  progress: number;
  /** 레벨 클리어로 새로 얻은 스티커 (없으면 undefined) */
  sticker?: { emoji: string; name: string };
  primaryLabel: string;
  onPrimary: () => void;
  onHome: () => void;
}

export default function StageClearOverlay({
  title,
  earnedStars,
  progress,
  sticker,
  primaryLabel,
  onPrimary,
  onHome,
}: Props) {
  const fill = useSharedValue(0);
  const stickerScale = useSharedValue(0);

  useEffect(() => {
    fill.value = withDelay(180, withTiming(progress, { duration: 700 }));
    if (sticker) {
      stickerScale.value = withDelay(700, withSpring(1, { damping: 9, stiffness: 220 }));
    }
  }, [fill, progress, sticker, stickerScale]);

  const barStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const stickerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: stickerScale.value }],
    opacity: stickerScale.value,
  }));

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.backdrop}>
      <Animated.View entering={ZoomIn.springify().damping(13)} style={[styles.card, shadow.float]}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.stars}>⭐ × {earnedStars}</Text>

        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, barStyle]} />
        </View>

        {!!sticker && (
          <Animated.View style={[styles.sticker, stickerStyle]}>
            <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
            <Text style={styles.stickerText}>«{sticker.name}» 스티커 획득!</Text>
          </Animated.View>
        )}

        <View style={styles.buttons}>
          <BouncyPressable style={[styles.button, styles.homeButton]} onPress={onHome}>
            <Text style={styles.homeText}>홈으로</Text>
          </BouncyPressable>
          <BouncyPressable style={[styles.button, styles.primaryButton]} onPress={onPrimary}>
            <Text style={styles.primaryText}>{primaryLabel}</Text>
          </BouncyPressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(59,42,26,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 520,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emoji: { fontSize: 56 },
  title: { fontSize: 30, fontWeight: '900', color: colors.text, textAlign: 'center' },
  stars: { fontSize: 22, fontWeight: '800', color: colors.primaryDeep },
  barTrack: {
    width: '100%',
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  barFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.green },
  sticker: { alignItems: 'center', gap: 4, marginTop: spacing.sm },
  stickerEmoji: { fontSize: 64 },
  stickerText: { fontSize: 19, fontWeight: '900', color: colors.pinkDeep },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignSelf: 'stretch' },
  button: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  homeButton: { backgroundColor: colors.border },
  homeText: { fontSize: 19, fontWeight: '800', color: colors.textSub },
  primaryButton: { backgroundColor: colors.primary },
  primaryText: { fontSize: 19, fontWeight: '800', color: colors.textOnPrimary },
});
