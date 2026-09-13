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

interface HomeScheduleTutorialProps {
  visible: boolean;
  /** 일정 영역(빈 상태 카드 또는 실제 ScheduleBoard)을 감싼 View의 ref. */
  targetRef: React.RefObject<View | null>;
  /** 실제 일정 데이터가 없어 빈 상태일 때만 모의 일정 채우기 데모를 보여준다. */
  showMockDemo: boolean;
  onFinish: () => void;
}

const PAD = 8;
const RADIUS = 20;

/**
 * 홈 화면 첫 진입 시 "오늘/내일/모레 일정" 영역을 스포트라이트로 강조하고
 * 말풍선 설명을 보여준다. 화면 아무 곳이나 탭하면 닫힌다(게임 튜토리얼처럼
 * 1회성 안내). 신규 가입자처럼 실제 일정이 없는 경우엔 그 영역 위에 예시
 * 일정 카드가 순차적으로 채워지는 데모 애니메이션을 겹쳐 보여준다 — 실제
 * 데이터(events)는 전혀 건드리지 않는, 오버레이 전용 목업이다.
 */
export default function HomeScheduleTutorial({ visible, targetRef, showMockDemo, onFinish }: HomeScheduleTutorialProps) {
  const colors = useThemeColors();
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!visible) {
      setRect(null);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const tryMeasure = () => {
      targetRef.current?.measureInWindow((x, y, width, height) => {
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
  }, [visible, targetRef]);

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

  if (!visible || !rect) return null;

  const screen = Dimensions.get('window');
  const top = Math.max(rect.y - PAD, 0);
  const bottom = Math.min(rect.y + rect.height + PAD, screen.height);
  const left = Math.max(rect.x - PAD, 0);
  const right = Math.min(rect.x + rect.width + PAD, screen.width);
  const tooltipBelow = bottom < screen.height * 0.62;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onFinish}>
        <View style={[styles.dim, { top: 0, left: 0, right: 0, height: top }]} />
        <View style={[styles.dim, { top: bottom, left: 0, right: 0, bottom: 0 }]} />
        <View style={[styles.dim, { top, left: 0, width: left, height: Math.max(bottom - top, 0) }]} />
        <View style={[styles.dim, { top, left: right, right: 0, height: Math.max(bottom - top, 0) }]} />
      </Pressable>

      <Animated.View
        pointerEvents="none"
        style={[styles.ring, ringStyle, { top, left, width: right - left, height: bottom - top, borderColor: colors.accent }]}
      />

      {showMockDemo && (
        <View pointerEvents="none" style={[styles.mockWrap, { top, left, width: right - left, height: bottom - top }]}>
          <MockScheduleDemo colors={colors} />
        </View>
      )}

      <View
        pointerEvents="box-none"
        style={[styles.tooltipWrap, tooltipBelow ? { top: bottom + 14 } : { bottom: screen.height - top + 14 }]}
      >
        <View style={[styles.tooltip, { backgroundColor: colors.cardWhite }]}>
          <Text style={[styles.tooltipTitle, { color: colors.gray900 }]}>오늘 · 내일 · 모레 일정을 한눈에</Text>
          <Text style={[styles.tooltipDesc, { color: colors.gray500 }]}>
            탭으로 날짜를 바꿔가며 일정과 준비물을 확인할 수 있어요.{'\n'}알림장을 스캔하면 여기에 자동으로 채워져요!
          </Text>
          <Pressable style={[styles.tooltipButton, { backgroundColor: colors.accent }]} onPress={onFinish}>
            <Text style={styles.tooltipButtonText}>확인했어요</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function MockScheduleDemo({ colors }: { colors: ThemeColors }) {
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
    justifyContent: 'flex-start',
  },
  mockInner: { gap: 8 },
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
  tooltipTitle: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
  tooltipDesc: { fontSize: 12.5, fontWeight: '600', lineHeight: 18, marginBottom: 14 },
  tooltipButton: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  tooltipButtonText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});
