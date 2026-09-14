import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
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

const AnimatedSvgRect = Animated.createAnimatedComponent(SvgRect);

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Highlight {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: number;
}

export interface HomeTutorialStep {
  key: string;
  /** 강조할 영역을 감싼 View의 ref. */
  targetRef: React.RefObject<View | null>;
  title: string;
  description: string;
  /** AI 스캔 버튼처럼 양 끝이 완전한 반원인 알약(pill) 모양 대상일 때 true —
   * 고정 반지름 대신 높이의 절반까지 둥글려서 실제 모양과 정확히 맞춘다. */
  fullyRounded?: boolean;
}

interface HomeTutorialOverlayProps {
  visible: boolean;
  steps: HomeTutorialStep[];
  /** 마지막 단계의 "시작하기" 또는 "건너뛰기"로 투어가 끝났을 때 호출된다. */
  onFinish: () => void;
  /** 각 단계를 측정하기 전에 호출 — 대상이 화면 밖(스크롤 아래)에 있을 수 있어,
   * 먼저 그 위치로 스크롤한 뒤(애니메이션 종료까지 기다렸다가) resolve해야 한다.
   * 실제로 스크롤이 일어났는지(true/false)를 반환해야, 스크롤이 없었던 전환은
   * 스포트라이트가 이전 위치에서 새 위치로 부드럽게 미끄러지듯 넘어가게 할 수 있다. */
  scrollIntoView?: (targetRef: React.RefObject<View | null>) => Promise<boolean>;
}

const PAD = 3;
const RADIUS = 20;
const TAIL_SIZE = 16;
const START_BUTTON_COLOR = '#7C3AED';
const NEXT_BUTTON_COLOR = '#18181B';
const SLIDE = { duration: 380, easing: Easing.inOut(Easing.ease) };

function clampHighlight(rect: Rect, screen: { width: number; height: number }, fullyRounded?: boolean): Highlight {
  const top = Math.max(rect.y - PAD, 0);
  const bottom = Math.min(rect.y + rect.height + PAD, screen.height);
  const left = Math.max(rect.x - PAD, 0);
  const right = Math.min(rect.x + rect.width + PAD, screen.width);
  const width = right - left;
  const height = Math.max(bottom - top, 0);
  // AI 스캔 버튼처럼 양 끝이 완전한 반원인 대상은 고정 RADIUS(20)보다 실제
  // 모서리가 훨씬 더 둥글어서(끝이 반원), 구멍이 버튼보다 덜 둥글면 그 사이로
  // 카드의 흰 배경이 아주 살짝 삐져나와 보였다. fullyRounded 단계는 높이의
  // 절반까지(완전한 캡슐 모양) 둥글리고, 나머지는 카드 모서리와 비슷한 고정
  // RADIUS를 쓰되 대상이 그보다 작으면(작은 아이콘 등) 자동으로 더 둥글게 한다.
  const radius = fullyRounded ? Math.min(width / 2, height / 2) : Math.min(RADIUS, width / 2, height / 2);
  return { top, left, width, height, radius };
}

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
  const isFirstShowRef = useRef(true);
  const overlayOpacity = useSharedValue(0);
  const tooltipOpacity = useSharedValue(1);

  // 스포트라이트 실제 화면 위치/크기 — 스크롤이 필요 없는 전환에서는 이 값들을
  // 이전 위치에서 새 위치로 애니메이션시켜(슬라이드) 자연스럽게 이어지고,
  // 스크롤이 낀 전환에서는 그냥 즉시 새 값으로 맞춘다(그 동안은 딤 처리로 가려짐).
  const hLeft = useSharedValue(0);
  const hTop = useSharedValue(0);
  const hWidth = useSharedValue(0);
  const hHeight = useSharedValue(0);
  const hRadius = useSharedValue(0);

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
    const screen = Dimensions.get('window');

    const measure = (onDone: (r: Rect) => void) => {
      let attempts = 0;
      const tryMeasure = () => {
        step.targetRef.current?.measureInWindow((x, y, width, height) => {
          if (cancelled) return;
          if (width > 0 && height > 0) {
            onDone({ x, y, width, height });
          } else if (attempts < 10) {
            attempts += 1;
            setTimeout(tryMeasure, 150);
          }
        });
      };
      tryMeasure();
    };

    const revealInstant = (r: Rect) => {
      if (cancelled) return;
      const h = clampHighlight(r, screen, step.fullyRounded);
      setRect(r);
      hLeft.value = h.left;
      hTop.value = h.top;
      hWidth.value = h.width;
      hHeight.value = h.height;
      hRadius.value = h.radius;
      tooltipOpacity.value = 1;
      setTransitioning(false);
      overlayOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) });
    };

    const revealSlide = (r: Rect) => {
      if (cancelled) return;
      const h = clampHighlight(r, screen, step.fullyRounded);
      setRect(r);
      hLeft.value = withTiming(h.left, SLIDE);
      hTop.value = withTiming(h.top, SLIDE);
      hWidth.value = withTiming(h.width, SLIDE);
      hHeight.value = withTiming(h.height, SLIDE);
      hRadius.value = withTiming(h.radius, SLIDE);
      tooltipOpacity.value = withSequence(withTiming(0, { duration: 90 }), withTiming(1, { duration: 180 }));
      setTransitioning(false);
    };

    const run = async () => {
      const first = isFirstShowRef.current;
      isFirstShowRef.current = false;
      setTransitioning(true);

      const scrolled = scrollIntoView ? await scrollIntoView(step.targetRef) : false;
      if (cancelled) return;

      if (first) {
        measure(revealInstant);
        return;
      }

      if (scrolled) {
        // 스크롤로 화면이 이미 크게 움직인 뒤라, 예전 위치에서 새 위치로 미끄러지듯
        // 이어봐야 의미가 없다 — 살짝 사라졌다가(스크롤은 이미 끝난 뒤) 새 자리에서
        // 다시 나타나는 편이 자연스럽다.
        overlayOpacity.value = withTiming(0, { duration: 120, easing: Easing.in(Easing.ease) }, (finished) => {
          if (finished) runOnJS(setTransitioning)(true);
        });
        await new Promise((resolve) => setTimeout(resolve, 120));
        if (cancelled) return;
        measure(revealInstant);
      } else {
        // 스크롤 없이 바로 옆/근처로 넘어가는 경우엔 화면을 가리지 않고, 스포트라이트
        // 자체가 이전 위치에서 새 위치로 부드럽게 미끄러지듯 이동한다.
        measure(revealSlide);
      }
    };
    run();

    return () => {
      cancelled = true;
    };
  }, [visible, step, scrollIntoView, overlayOpacity, hLeft, hTop, hWidth, hHeight, hRadius, tooltipOpacity]);

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

  const tooltipFadeStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
  }));

  // 스포트라이트(딤 구멍/링)의 실제 화면 위치 — 슬라이드 전환일 때는 이 값들이
  // 이전 위치에서 새 위치까지 매 프레임 애니메이션되고, 그 값 그대로 딤 마스크의
  // 구멍과 링 위치/크기에 반영된다.
  const highlightStyle = useAnimatedStyle(() => ({
    top: hTop.value,
    left: hLeft.value,
    width: hWidth.value,
    height: hHeight.value,
    borderRadius: hRadius.value,
  }));

  const maskRectProps = useAnimatedProps(() => ({
    x: hLeft.value,
    y: hTop.value,
    width: hWidth.value,
    height: hHeight.value,
    rx: hRadius.value,
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

  return (
    <Animated.View style={[StyleSheet.absoluteFill, overlayFadeStyle]} pointerEvents={transitioning ? 'none' : 'box-none'}>
      {/* 딤 배경에 하이라이트 영역만 둥근 모서리로 뚫어낸다 — 사각형 4개를 이어붙이면
          둥근 링과 딱 맞지 않아 모서리에 안 어두워진 조각이 남는 문제가 있어,
          SVG 마스크로 실제 구멍 자체를 둥글게 만든다. */}
      <Svg pointerEvents="none" width={screen.width} height={screen.height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id="tutorial-spotlight-mask">
            <SvgRect x={0} y={0} width={screen.width} height={screen.height} fill="#FFFFFF" />
            <AnimatedSvgRect animatedProps={maskRectProps} fill="#000000" />
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

      <Animated.View
        pointerEvents="none"
        style={[styles.ringBase, highlightStyle, { borderColor: colors.accent }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.ringGlow, highlightStyle, ringGlowStyle, { borderColor: colors.accent }]}
      />

      <View
        pointerEvents="box-none"
        style={[styles.tooltipWrap, tooltipBelow ? { top: bottom + 14 } : { bottom: screen.height - top + 14 }]}
      >
        <Animated.View style={[styles.tooltip, tooltipFadeStyle, { backgroundColor: colors.cardWhite }]}>
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
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ringBase: {
    position: 'absolute',
    borderWidth: 3,
  },
  ringGlow: {
    position: 'absolute',
    borderWidth: 8,
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
