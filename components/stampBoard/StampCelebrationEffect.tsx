import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface StampCelebrationEffectProps {
  /** 값이 바뀔 때마다(도장을 새로 찍을 때마다) 화면 중앙에 아이콘에 맞는 연출이 한 번 재생된다. */
  triggerKey: number;
  /** 방금 찍힌 스탬프 아이콘 — 이 값으로 연출 종류(빛/두둥실/팡팡)를 고른다. 글자 자체는
   *  화면에 다시 그리지 않고, 종류를 고르는 용도로만 쓴다(도장 모양은 슬롯에서 이미 보임). */
  icon: string;
}

/** 빛/마법 계열 — 부드러운 빛 무리가 사방으로 은은하게 퍼지는 연출. */
const RAY_ICONS = new Set(['🌈', '🌟', '✨', '💫', '👑', '🪄', '🎯', '🎉']);
/** 둥실 뜨는 계열 — 방울들이 위로 두둥실 떠오르는 연출. */
const FLOAT_ICONS = new Set(['🎈', '🪁', '🦋', '🐣', '🐥']);
/** 탈것/바다 계열 — 시원한 파란 톤으로 팡 퍼짐. */
const SPLASH_ICONS = new Set(['🚀', '🛸', '🌊', '🐳', '⚓', '⚽', '🏀', '🚗', '🦕', '🦖']);
/** 달콤한 계열(간식/꽃/사랑) — 따뜻한 핑크 톤으로 팡 퍼짐. */
const BLOOM_ICONS = new Set(['🍓', '🧁', '🍭', '💖', '🍩', '🍬', '🍉', '🎀', '🌸', '🌷', '🌻', '🦄', '🐰', '🧸']);

type EffectKind = 'rays' | 'float' | 'splash' | 'bloom' | 'pop';

function getEffectKind(icon: string): EffectKind {
  if (RAY_ICONS.has(icon)) return 'rays';
  if (FLOAT_ICONS.has(icon)) return 'float';
  if (SPLASH_ICONS.has(icon)) return 'splash';
  if (BLOOM_ICONS.has(icon)) return 'bloom';
  return 'pop'; // 그 외(😊🍀🎁 등) — 기본 다색 알갱이가 부드럽게 팡 퍼짐
}

const RAY_COLORS = ['#F87171', '#FBBF24', '#34D399', '#38BDF8', '#A78BFA', '#F472B6', '#FB923C', '#FDE047'];
const FLOAT_COLORS = ['#93C5FD', '#FBCFE8', '#FDE68A', '#A7F3D0', '#C4B5FD'];
const SPLASH_COLORS = ['#38BDF8', '#0EA5E9', '#22D3EE', '#60A5FA', '#7DD3FC'];
const BLOOM_COLORS = ['#F472B6', '#FB7185', '#FBCFE8', '#F9A8D4', '#FDBA74'];
const POP_COLORS = ['#FBBF24', '#F87171', '#60A5FA', '#34D399', '#F472B6', '#A78BFA'];

const RAY_COUNT = 12;
const FLOAT_COUNT = 7;
const BURST_COUNT = 16;

// 전 구간에서 급하게 꺾이지 않고 끝까지 매끄럽게 감속하는 곡선 — "딱딱해 보이는" 느낌을 줄인다.
const SMOOTH_EASE = Easing.bezier(0.16, 1, 0.3, 1);

export default function StampCelebrationEffect({ triggerKey, icon }: StampCelebrationEffectProps) {
  const [active, setActive] = useState(false);
  const [kind, setKind] = useState<EffectKind>('pop');
  const progress = useRef(new Animated.Value(0)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const nextKind = getEffectKind(icon);
    setKind(nextKind);
    setActive(true);
    progress.setValue(0);

    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: nextKind === 'float' ? 1700 : 1200,
      easing: SMOOTH_EASE,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setActive(false);
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {kind === 'rays' && <RaysEffect progress={progress} />}
      {kind === 'float' && <FloatEffect progress={progress} />}
      {kind === 'splash' && <BurstEffect progress={progress} colors={SPLASH_COLORS} />}
      {kind === 'bloom' && <BurstEffect progress={progress} colors={BLOOM_COLORS} />}
      {kind === 'pop' && <BurstEffect progress={progress} colors={POP_COLORS} />}
    </View>
  );
}

/** 무지개/별빛/마법 계열: 부드러운 빛 무리 여러 개가 은은하게 커지며 사방으로 번지고,
 *  중심에 옅은 링이 잔물결처럼 퍼져나간다. 딱딱한 직선 광선 대신 둥근 빛 덩어리로 표현. */
function RaysEffect({ progress }: { progress: Animated.Value }) {
  return (
    <>
      <Animated.View
        style={[
          rayStyles.ring,
          {
            opacity: progress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.8, 0.4, 0] }),
            transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.8] }) }],
          },
        ]}
      />
      {Array.from({ length: RAY_COUNT }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / RAY_COUNT;
        const distance = 70 + (i % 3) * 26;
        const size = 22 + (i % 4) * 10;
        const color = RAY_COLORS[i % RAY_COLORS.length];
        const stagger = (i % 6) * 0.03;

        const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * distance] });
        const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * distance] });
        const scale = progress.interpolate({
          inputRange: [stagger, Math.min(stagger + 0.35, 1), 1],
          outputRange: [0, 1, 0.8],
        });
        const opacity = progress.interpolate({
          inputRange: [stagger, Math.min(stagger + 0.2, 1), 0.75, 1],
          outputRange: [0, 0.9, 0.7, 0],
        });

        return (
          <Animated.View
            key={i}
            style={[
              rayStyles.glow,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          />
        );
      })}
    </>
  );
}

/** 풍선/연 계열: 부드러운 색의 방울 여러 개가 좌우로 느긋하게 살랑이며 위로 두둥실 떠오른다. */
function FloatEffect({ progress }: { progress: Animated.Value }) {
  return (
    <>
      {Array.from({ length: FLOAT_COUNT }).map((_, i) => {
        const startX = (i - (FLOAT_COUNT - 1) / 2) * 36;
        const swayDir = i % 2 === 0 ? 1 : -1;
        const size = 20 + (i % 3) * 10;
        const delay = (i % FLOAT_COUNT) * 0.07;
        const color = FLOAT_COLORS[i % FLOAT_COLORS.length];

        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [50, -360 - (i % 3) * 30],
        });
        const translateX = progress.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [startX, startX + swayDir * 20, startX, startX + swayDir * 20, startX],
        });
        const opacity = progress.interpolate({
          inputRange: [Math.min(delay, 0.85), Math.min(delay + 0.2, 0.95), 0.8, 1],
          outputRange: [0, 0.9, 0.9, 0],
        });
        const scale = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1, 1] });

        return (
          <Animated.View
            key={i}
            style={[
              floatStyles.bubble,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          />
        );
      })}
    </>
  );
}

/** 탈것/바다(splash), 달콤한 계열(bloom), 그 외 전부(pop) 공통: 작고 둥근 알갱이들이
 *  팡 퍼졌다가 사르르 사라진다 — 전달된 색 팔레트로 아이콘 종류별 느낌을 구분한다. */
function BurstEffect({ progress, colors }: { progress: Animated.Value; colors: string[] }) {
  return (
    <>
      {Array.from({ length: BURST_COUNT }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / BURST_COUNT + (i % 2 === 0 ? 0.12 : -0.12);
        const distance = 85 + (i % 5) * 20;
        const size = 14 + (i % 4) * 6;
        const color = colors[i % colors.length];
        const delay = (i % 8) * 0.03;

        const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * distance] });
        const translateY = progress.interpolate({
          inputRange: [0, 0.45, 1],
          outputRange: [0, Math.sin(angle) * distance - 6, Math.sin(angle) * distance + 46],
        });
        const opacity = progress.interpolate({
          inputRange: [delay, Math.min(delay + 0.15, 1), 0.75, 1],
          outputRange: [0, 0.95, 0.8, 0],
        });
        const scale = progress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.2, 1, 0.7] });

        return (
          <Animated.View
            key={i}
            style={[
              popStyles.dot,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
});

const rayStyles = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 5,
    borderColor: '#FDE68A',
  },
  glow: {
    position: 'absolute',
  },
});

const floatStyles = StyleSheet.create({
  bubble: {
    position: 'absolute',
  },
});

const popStyles = StyleSheet.create({
  dot: {
    position: 'absolute',
  },
});
