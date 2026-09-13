import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import Text from '../common/AppText';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HomeTutorialStep {
  key: string;
  /** 강조할 영역을 감싼 View의 ref. */
  targetRef: React.RefObject<View | null>;
  title: string;
  description: string;
  /** 있으면 강조 영역 위에 겹쳐서 보여줄 모의 데모(예: 스캔 후 채워지는 모습). */
  renderDemo?: (colors: ThemeColors) => React.ReactNode;
}

interface HomeTutorialOverlayProps {
  visible: boolean;
  steps: HomeTutorialStep[];
  onFinish: () => void;
}

const PAD = 8;
const RADIUS = 20;

/**
 * 홈 화면 첫 진입 시 여러 영역을 순서대로 스포트라이트로 강조하고 말풍선
 * 설명을 보여주는 게임 튜토리얼 스타일 코치마크. 화면 아무 곳이나 탭하면
 * 다음 단계로, 마지막 단계에서는 튜토리얼이 끝난다.
 */
export default function HomeTutorialOverlay({ visible, steps, onFinish }: HomeTutorialOverlayProps) {
  const colors = useThemeColors();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[stepIndex];

  useEffect(() => {
    if (visible) setStepIndex(0);
  }, [visible]);

  useEffect(() => {
    if (!visible || !step) {
      setRect(null);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    setRect(null);
    const tryMeasure = () => {
      step.targetRef.current?.measureInWindow((x, y, width, height) => {
        if (cancelled) return;
        if (width > 0 && height > 0) {
          setRect({ x, y, width, height });
        } else if (attempts < 10) {
          attempts += 1;
          setTimeout(tryMeasure, 150);
        }
      });
    };
    tryMeasure();
    return () => {
      cancelled = true;
    };
  }, [visible, step]);

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!rect) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [rect, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + pulse.value * 0.4,
    transform: [{ scale: 1 + pulse.value * 0.015 }],
  }));

  if (!visible || !step || !rect) return null;

  const isLastStep = stepIndex === steps.length - 1;
  const advance = () => {
    if (isLastStep) {
      onFinish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const screen = Dimensions.get('window');
  const top = Math.max(rect.y - PAD, 0);
  const bottom = Math.min(rect.y + rect.height + PAD, screen.height);
  const left = Math.max(rect.x - PAD, 0);
  const right = Math.min(rect.x + rect.width + PAD, screen.width);
  const tooltipBelow = bottom < screen.height * 0.62;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={advance}>
        <View style={[styles.dim, { top: 0, left: 0, right: 0, height: top }]} />
        <View style={[styles.dim, { top: bottom, left: 0, right: 0, bottom: 0 }]} />
        <View style={[styles.dim, { top, left: 0, width: left, height: Math.max(bottom - top, 0) }]} />
        <View style={[styles.dim, { top, left: right, right: 0, height: Math.max(bottom - top, 0) }]} />
      </Pressable>

      <Animated.View
        pointerEvents="none"
        style={[styles.ring, ringStyle, { top, left, width: right - left, height: bottom - top, borderColor: colors.accent }]}
      />

      {step.renderDemo && (
        <View pointerEvents="none" style={[styles.mockWrap, { top, left, width: right - left, height: bottom - top }]}>
          {step.renderDemo(colors)}
        </View>
      )}

      <View
        pointerEvents="box-none"
        style={[styles.tooltipWrap, tooltipBelow ? { top: bottom + 14 } : { bottom: screen.height - top + 14 }]}
      >
        <View style={[styles.tooltip, { backgroundColor: colors.cardWhite }]}>
          <View style={styles.tooltipHeaderRow}>
            <Text style={[styles.tooltipTitle, { color: colors.gray900 }]}>{step.title}</Text>
            <Text style={[styles.stepCounter, { color: colors.gray400 }]}>
              {stepIndex + 1}/{steps.length}
            </Text>
          </View>
          <Text style={[styles.tooltipDesc, { color: colors.gray500 }]}>{step.description}</Text>
          <Pressable style={[styles.tooltipButton, { backgroundColor: colors.accent }]} onPress={advance}>
            <Text style={styles.tooltipButtonText}>{isLastStep ? '확인했어요' : '다음'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** "가방에 쏙쏙"(준비물) 영역 스캔 후 모습을 보여주는 예시 체크리스트 데모. */
export function MockPrepDemo(colors: ThemeColors) {
  return (
    <View style={styles.mockInner}>
      <MockChip colors={colors} delay={100} text="예시: 물통" />
      <MockChip colors={colors} delay={280} text="예시: 여벌옷" />
      <MockChip colors={colors} delay={460} text="예시: 우산" />
    </View>
  );
}

function MockChip({ colors, delay, text }: { colors: ThemeColors; delay: number; text: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) }));
  }, [progress, delay]);
  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 10 }],
  }));
  return (
    <Animated.View style={[styles.mockChip, animStyle, { backgroundColor: colors.cardWhite, borderColor: colors.border }]}>
      <View style={[styles.mockChipCheck, { borderColor: colors.green500 }]} />
      <Text style={[styles.mockChipText, { color: colors.gray900 }]}>{text}</Text>
    </Animated.View>
  );
}

/** "앞으로의 모험"(일정) 영역 스캔 후 모습을 보여주는 예시 일정 카드 데모. */
export function MockScheduleDemo(colors: ThemeColors) {
  return (
    <View style={styles.mockInner}>
      <View style={styles.mockTabRow}>
        {['오늘', '내일', '모레'].map((label, i) => (
          <View key={label} style={[styles.mockTab, i === 0 && { backgroundColor: colors.cardWhite }]}>
            <Text style={[styles.mockTabText, { color: i === 0 ? colors.gray900 : colors.gray500 }]}>{label}</Text>
          </View>
        ))}
      </View>
      <MockCard colors={colors} delay={150} title="예시: 소풍 준비물 챙기기" meta="09:00 · 유치원" />
      <MockCard colors={colors} delay={420} title="예시: 물통 · 돗자리 준비" meta="확인 필요" />
    </View>
  );
}

function MockCard({ colors, delay, title, meta }: { colors: ThemeColors; delay: number; title: string; meta: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) }));
  }, [progress, delay]);
  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 10 }],
  }));
  return (
    <Animated.View style={[styles.mockCard, animStyle, { backgroundColor: colors.cardWhite, borderColor: colors.border }]}>
      <Text style={[styles.mockCardTitle, { color: colors.gray900 }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.mockCardMeta, { color: colors.gray500 }]}>{meta}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: 'rgba(15, 23, 42, 0.62)' },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: RADIUS,
  },
  mockWrap: {
    position: 'absolute',
    padding: 10,
    justifyContent: 'center',
  },
  mockInner: { gap: 8 },
  mockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    ...SHADOW,
    shadowOpacity: 0.08,
    elevation: 2,
  },
  mockChipCheck: { width: 16, height: 16, borderRadius: 4, borderWidth: 2 },
  mockChipText: { fontSize: 13, fontWeight: '700' },
  mockTabRow: { flexDirection: 'row', backgroundColor: 'rgba(148,163,184,0.25)', padding: 3, borderRadius: 10, gap: 3, marginBottom: 2 },
  mockTab: { flex: 1, alignItems: 'center', paddingVertical: 5, borderRadius: 7 },
  mockTabText: { fontSize: 11, fontWeight: '700' },
  mockCard: { borderRadius: 14, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, ...SHADOW, shadowOpacity: 0.08, elevation: 2 },
  mockCardTitle: { fontSize: 13, fontWeight: '800' },
  mockCardMeta: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  tooltipWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  tooltip: {
    width: '100%',
    borderRadius: 18,
    padding: 18,
    ...SHADOW,
    shadowOpacity: 0.2,
    elevation: 6,
  },
  tooltipHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 },
  tooltipTitle: { fontSize: 15, fontWeight: '800', flexShrink: 1 },
  stepCounter: { fontSize: 12, fontWeight: '700' },
  tooltipDesc: { fontSize: 12.5, fontWeight: '600', lineHeight: 18, marginBottom: 14 },
  tooltipButton: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  tooltipButtonText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});
