import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface StampCelebrationEffectProps {
  /** 값이 바뀔 때마다(도장을 새로 찍을 때마다) 화면 중앙에 아이콘에 맞는 연출이 한 번 재생된다. */
  triggerKey: number;
  /** 방금 찍힌 스탬프 아이콘 — 연출 종류(빛/두둥실/솟구침/팡팡)를 고르는 데 쓰이고,
   *  연출 안에서도 이 아이콘 자체가 여러 개 등장해 날아다닌다. */
  icon: string;
}

/** 빛/마법 계열 — 아이콘이 가운데서 스스로 반짝반짝 빙글 도는 연출. */
const RAY_ICONS = new Set(['🌈', '🌟', '⭐', '✨', '💫', '👑', '🪄', '🎯', '🎉']);
/** 둥실 뜨는 계열 — 아이콘 여러 개가 좌우로 살랑이며 위로 두둥실 떠오르는 연출. */
const FLOAT_ICONS = new Set(['🎈', '🪁', '🦋', '🐣', '🐥']);
/** 탈것/동물/스포츠 계열 — 아이콘이 위로 솟구쳐 오르는 연출(로켓 발사 느낌). */
const LAUNCH_ICONS = new Set(['🚀', '🛸', '🌊', '🐳', '⚓', '⚽', '🏀', '🚗', '🦕', '🦖']);
/** 달콤한 계열(간식/꽃/사랑) — 아이콘이 사방으로 팡 퍼졌다가 꽃잎처럼 사르르 떨어짐. */
const BLOOM_ICONS = new Set(['🍓', '🧁', '🍭', '💖', '🍩', '🍬', '🍉', '🎀', '🌸', '🌷', '🌻', '🦄', '🐰', '🧸']);

type EffectKind = 'rays' | 'float' | 'launch' | 'bloom' | 'pop';

function getEffectKind(icon: string): EffectKind {
  if (RAY_ICONS.has(icon)) return 'rays';
  if (FLOAT_ICONS.has(icon)) return 'float';
  if (LAUNCH_ICONS.has(icon)) return 'launch';
  if (BLOOM_ICONS.has(icon)) return 'bloom';
  return 'pop'; // 그 외(😊🍀🎁 등) — 기본으로 사방에 팡 퍼짐
}

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
      {kind === 'rays' && <RaysEffect progress={progress} icon={icon} />}
      {kind === 'float' && <FloatEffect progress={progress} icon={icon} />}
      {kind === 'launch' && <BurstEffect progress={progress} icon={icon} upward />}
      {kind === 'bloom' && <BurstEffect progress={progress} icon={icon} />}
      {kind === 'pop' && <BurstEffect progress={progress} icon={icon} />}
    </View>
  );
}

/** 무지개/별빛/마법 계열: 찍힌 아이콘 자체가 가운데서 커지며 반짝반짝 빙글 돌고,
 *  그 뒤로 옅은 빛 무리와 링이 은은하게 퍼진다. */
function RaysEffect({ progress, icon }: { progress: Animated.Value; icon: string }) {
  const heroScale = progress.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0.2, 1.3, 1.1, 0.9] });
  const heroSpin = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const heroOpacity = progress.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] });

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
        const size = 12 + (i % 3) * 5;
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
          <Animated.Text
            key={i}
            style={[
              rayStyles.sparkle,
              { fontSize: size, opacity, transform: [{ translateX }, { translateY }, { scale }] },
            ]}
          >
            ✨
          </Animated.Text>
        );
      })}
      <Animated.Text
        style={[rayStyles.hero, { opacity: heroOpacity, transform: [{ scale: heroScale }, { rotate: heroSpin }] }]}
      >
        {icon}
      </Animated.Text>
    </>
  );
}

/** 풍선/연 계열: 찍힌 아이콘 여러 개가 좌우로 느긋하게 살랑이며 위로 두둥실 떠오른다. */
function FloatEffect({ progress, icon }: { progress: Animated.Value; icon: string }) {
  return (
    <>
      {Array.from({ length: FLOAT_COUNT }).map((_, i) => {
        const startX = (i - (FLOAT_COUNT - 1) / 2) * 40;
        const swayDir = i % 2 === 0 ? 1 : -1;
        const size = 22 + (i % 3) * 8;
        const delay = (i % FLOAT_COUNT) * 0.07;

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
          <Animated.Text
            key={i}
            style={[
              floatStyles.icon,
              { fontSize: size, opacity, transform: [{ translateX }, { translateY }, { scale }] },
            ]}
          >
            {icon}
          </Animated.Text>
        );
      })}
    </>
  );
}

/** launch(탈것/동물/스포츠): 찍힌 아이콘이 위쪽 부채꼴로 솟구쳐 오른다(로켓 발사 느낌).
 *  bloom(달콤한 계열)/pop(그 외): 아이콘이 사방으로 팡 퍼졌다가 사르르 떨어진다. */
function BurstEffect({
  progress,
  icon,
  upward = false,
}: {
  progress: Animated.Value;
  icon: string;
  upward?: boolean;
}) {
  return (
    <>
      {Array.from({ length: BURST_COUNT }).map((_, i) => {
        // upward: -90°(정위) 기준 좌우 ±70° 부채꼴 안에서만 튀어 올라 "솟구치는" 느낌을 준다.
        // 그 외에는 기존처럼 360도 전방향으로 퍼진다.
        const angle = upward
          ? -Math.PI / 2 + ((i / (BURST_COUNT - 1)) * 2 - 1) * ((Math.PI * 70) / 180)
          : (Math.PI * 2 * i) / BURST_COUNT + (i % 2 === 0 ? 0.12 : -0.12);
        const distance = upward ? 110 + (i % 5) * 24 : 85 + (i % 5) * 20;
        const size = 16 + (i % 4) * 6;
        const delay = (i % 8) * 0.03;

        const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * distance] });
        const translateY = progress.interpolate({
          inputRange: [0, 0.45, 1],
          outputRange: upward
            ? [0, Math.sin(angle) * distance, Math.sin(angle) * distance + 20]
            : [0, Math.sin(angle) * distance - 6, Math.sin(angle) * distance + 46],
        });
        const opacity = progress.interpolate({
          inputRange: [delay, Math.min(delay + 0.15, 1), 0.75, 1],
          outputRange: [0, 0.95, 0.8, 0],
        });
        const scale = progress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.2, 1, 0.7] });
        const spin = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', upward ? '20deg' : '90deg'] });

        return (
          <Animated.Text
            key={i}
            style={[
              popStyles.icon,
              {
                fontSize: size,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }, { rotate: spin }],
              },
            ]}
          >
            {icon}
          </Animated.Text>
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
  sparkle: {
    position: 'absolute',
  },
  hero: {
    position: 'absolute',
    fontSize: 64,
  },
});

const floatStyles = StyleSheet.create({
  icon: {
    position: 'absolute',
  },
});

const popStyles = StyleSheet.create({
  icon: {
    position: 'absolute',
  },
});
