// 모든 화면 상단에 공통으로 쓰는 헤더 (왼쪽 영역 + 오른쪽 보상 카운터)
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../constants/theme';
import { useGame } from '../context/GameContext';
import BouncyPressable from './BouncyPressable';
import RewardCounter from './RewardCounter';

interface Props {
  /** 뒤로 가기 버튼 (없으면 표시하지 않음) */
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  left?: React.ReactNode;
}

export default function ScreenHeader({ onBack, title, subtitle, left }: Props) {
  const { stars, coins } = useGame();

  return (
    <View style={styles.wrap}>
      <View style={styles.leftArea}>
        {!!onBack && (
          <BouncyPressable style={[styles.backButton, shadow.card]} onPress={onBack}>
            <Text style={styles.backIcon}>◀</Text>
          </BouncyPressable>
        )}
        {left}
        {!!title && (
          <View>
            <Text style={styles.title}>{title}</Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        )}
      </View>

      <View style={styles.counters}>
        <RewardCounter emoji="⭐" value={stars} isFlyTarget tint={colors.yellow} />
        <RewardCounter emoji="🪙" value={coins} tint={colors.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  leftArea: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 20, color: colors.textSub },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 15, fontWeight: '600', color: colors.textSub, marginTop: 2 },
  counters: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
