import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Mask, Rect as SvgRect } from 'react-native-svg';
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
}

interface HomeTutorialOverlayProps {
  visible: boolean;
  steps: HomeTutorialStep[];
  /** 마지막 단계의 "시작하기" 또는 "건너뛰기"로 투어가 끝났을 때 호출된다. */
  onFinish: () => void;
  /** 각 단계를 측정하기 전에 호출 — 대상이 화면 밖(스크롤 아래)에 있을 수 있어,
   * 먼저 그 위치로 스크롤한 뒤(애니메이션 종료까지 기다렸다가) resolve해야 한다. */
  scrollIntoView?: (targetRef: React.RefObject<View | null>) => Promise<void>;
}

const PAD = 8;
const RADIUS = 20;
const TAIL_SIZE = 16;
const START_BUTTON_COLOR = '#7C3AED';
const NEXT_BUTTON_COLOR = '#18181B';

/**
 * 앱 첫 실행(온보딩 미완료) 시 홈 화면 주요 영역을 순서대로 스포트라이트로
 * 강조하는 코치마크 투어. 배경/하이라이트 영역을 탭해도 아무 동작이 없고,
 * 오직 툴팁 안의 "다음/시작하기"·"건너뛰기" 버튼으로만 진행/종료된다.
 */
export default function HomeTutorialOverlay({ visible, steps, onFinish, scrollIntoView }: HomeTutorialOverlayProps) {
  const colors = useThemeColors();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const step = steps[stepIndex];
  // 처음 뜰 때는 딱히 사라질 이전 내용이 없으니 바로 나타나고, 단계 이동일 때만
  // 살짝 사라졌다가(딱딱한 점프 방지) 새 위치에서 다시 나타난다.
  const isFirstShowRef = useRef(true);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setStepIndex(0);
      isFirstShowRef.current = true;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !step) {
      setRect(null);
      overlayOpacity.value = 0;
      return;
    }
    let cancelled = false;

    const measureAndReveal = () => {
      let attempts = 0;
      const tryMeasure = () => {
        step.targetRef.current?.measureInWindow((x, y, width, height) => {
          if (cancelled) return;
          if (width > 0 && height > 0) {
            setRect({ x, y, width, height });
            setTransitioning(false);
            overlayOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) });
          } else if (attempts < 10) {
            attempts += 1;
            setTimeout(tryMeasure, 150);
          }
        });
      };
      tryMeasure();
    };

    const run = async () => {
      if (isFirstShowRef.current) {
        isFirstShowRef.current = false;
      } else {
        setTransitioning(true);
        overlayOpacity.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.ease) });
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      if (cancelled) return;
      if (scrollIntoView) await scrollIntoView(step.targetRef);
      if (cancelled) return;
      measureAndReveal();
    };
    run();

    return () => {
      cancelled = true;
    };
  }, [visible, step, scrollIntoView, overlayOpacity]);

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!rect) return;
    // 이전 단계에서 진행 중이던 값(0~1 사이 임의 지점)에서 그대로 이어받아
    // withRepeat를 다시 걸면, 새 단계가 나타나는 첫 순간 그 값까지 순간
    // 이동하듯 "팍" 튀어 보였다. 매번 0으로 확실히 되돌린 뒤 시작해야 항상
    // 같은 자리에서 부드럽게 차오른다.
    pulse.value = 0;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [rect, pulse]);

  // scale로 링을 키우면 딤 배경에 뚫어둔 구멍(SVG 마스크, 크기 고정)보다 링이
  // 커지는 순간 테두리가 그 경계를 넘어가 보이는 문제가 있었다. borderWidth
  // 펄스도 시도해봤지만, 레이아웃에 영향을 주는 속성이라(transform/opacity와
  // 달리 GPU 합성만으로 처리되지 않음) 계속 반복되는 동안 버벅임이 있었다.
  // "두꺼워졌다 얇아졌다"하는 느낌은 살리되 성능 문제는 피하려고, 얇은 링
  // (고정, 항상 표시) 위에 두꺼운 링(고정, opacity만 pulse)을 겹쳐 그린다 —
  // 둘 다 바깥 경계는 같아서 두꺼운 쪽이 진해질수록 안쪽으로 굵어 보이는
  // 착시가 생기고, 실제로 바뀌는 건 opacity뿐이라 레이아웃 재계산이 없다.
  const ringGlowStyle = useAnimatedStyle(() => ({
    opacity: pulse.value * 0.9,
  }));

  const overlayFadeStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!visible || !step || !rect) return null;

  const isLastStep = stepIndex === steps.length - 1;
  const handleNext = () => {
    if (transitioning) return;
    if (isLastStep) {
      onFinish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };
  const handleSkip = () => {
    if (transitioning) return;
    onFinish();
  };

  const screen = Dimensions.get('window');
  const top = Math.max(rect.y - PAD, 0);
  const bottom = Math.min(rect.y + rect.height + PAD, screen.height);
  const left = Math.max(rect.x - PAD, 0);
  const right = Math.min(rect.x + rect.width + PAD, screen.width);
  const tooltipBelow = bottom < screen.height * 0.62;
  const targetCenterX = (left + right) / 2;
  const tooltipCardWidth = screen.width - 40;
  const tailLeft = Math.min(Math.max(targetCenterX - 20 - TAIL_SIZE / 2, 20), tooltipCardWidth - 20 - TAIL_SIZE);
  // AI 스캔 버튼처럼 좁고 완전히 둥근(pill 모양) 대상은 고정 RADIUS(20)보다
  // 실제 모서리가 더 둥글어서, 구멍 모서리가 버튼보다 덜 둥글면 그 사이로
  // 카드의 흰 배경이 삐져나와 보였다. 대상 크기의 절반을 넘지 않게 반지름을
  // 제한해서 좁은 대상일수록 자동으로 더 둥글게(최대 캡슐 모양까지) 만든다.
  const holeRadius = Math.min(RADIUS, (right - left) / 2, (bottom - top) / 2);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, overlayFadeStyle]} pointerEvents={transitioning ? 'none' : 'box-none'}>
      {/* 딤 배경에 하이라이트 영역만 둥근 모서리로 뚫어낸다 — 사각형 4개를 이어붙이면
          둥근 링과 딱 맞지 않아 모서리에 안 어두워진 조각이 남는 문제가 있어,
          SVG 마스크로 실제 구멍 자체를 둥글게 만든다. */}
      <Svg pointerEvents="none" width={screen.width} height={screen.height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id="tutorial-spotlight-mask">
            <SvgRect x={0} y={0} width={screen.width} height={screen.height} fill="#FFFFFF" />
            <SvgRect x={left} y={top} width={right - left} height={Math.max(bottom - top, 0)} rx={holeRadius} fill="#000000" />
          </Mask>
        </Defs>
        <SvgRect
          x={0}
          y={0}
          width={screen.width}
          height={screen.height}
          fill="rgba(15, 23, 42, 0.62)"
          mask="url(#tutorial-spotlight-mask)"
        />
      </Svg>
      {/* 배경/하이라이트 영역 전체의 터치를 삼켜서, 툴팁의 버튼 외에는 아무 동작도 하지 않게 한다. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />

      <View
        pointerEvents="none"
        style={[styles.ringBase, { top, left, width: right - left, height: bottom - top, borderColor: colors.accent, borderRadius: holeRadius }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.ringGlow, ringGlowStyle, { top, left, width: right - left, height: bottom - top, borderColor: colors.accent, borderRadius: holeRadius }]}
      />

      <View
        pointerEvents="box-none"
        style={[styles.tooltipWrap, tooltipBelow ? { top: bottom + 14 } : { bottom: screen.height - top + 14 }]}
      >
        <View style={[styles.tooltip, { backgroundColor: colors.cardWhite }]}>
          <View
            style={[
              styles.tail,
              tooltipBelow ? { top: -TAIL_SIZE / 2 } : { bottom: -TAIL_SIZE / 2 },
              { left: tailLeft, backgroundColor: colors.cardWhite },
            ]}
          />
          <View style={styles.tooltipHeaderRow}>
            <Text style={[styles.tooltipTitle, { color: colors.gray900 }]}>{step.title}</Text>
            <Text style={[styles.stepCounter, { color: colors.gray400 }]}>
              {stepIndex + 1}/{steps.length}
            </Text>
          </View>
          <Text style={[styles.tooltipDesc, { color: colors.gray500 }]}>{step.description}</Text>

          <View style={styles.footerRow}>
            <View style={styles.dotsRow}>
              {steps.map((s, i) => (
                <View
                  key={s.key}
                  style={[
                    styles.dot,
                    { backgroundColor: i === stepIndex ? START_BUTTON_COLOR : colors.border },
                  ]}
                />
              ))}
            </View>
            <View style={styles.footerButtonsRow}>
              <Pressable onPress={handleSkip} hitSlop={8} style={styles.skipButton}>
                <Text style={[styles.skipButtonText, { color: colors.gray400 }]}>건너뛰기</Text>
              </Pressable>
              <Pressable
                onPress={handleNext}
                style={({ pressed }) => [
                  styles.nextButton,
                  { backgroundColor: isLastStep ? START_BUTTON_COLOR : NEXT_BUTTON_COLOR },
                  pressed && styles.nextButtonPressed,
                ]}
              >
                <Text style={styles.nextButtonText}>{isLastStep ? '시작하기' : '다음'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ringBase: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: RADIUS,
  },
  ringGlow: {
    position: 'absolute',
    borderWidth: 8,
    borderRadius: RADIUS,
  },
  tail: {
    position: 'absolute',
    width: TAIL_SIZE,
    height: TAIL_SIZE,
    transform: [{ rotate: '45deg' }],
    borderRadius: 3,
  },
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
  tooltipHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 8 },
  tooltipTitle: { fontSize: 15.5, fontWeight: '800', flexShrink: 1 },
  stepCounter: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  tooltipDesc: { fontSize: 12.5, fontWeight: '600', lineHeight: 18, marginBottom: 16 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dotsRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  footerButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  skipButton: { paddingVertical: 6 },
  skipButtonText: { fontSize: 13, fontWeight: '700' },
  nextButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  nextButtonPressed: { opacity: 0.85 },
  nextButtonText: { fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' },
});
