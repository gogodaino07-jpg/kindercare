import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface BirthdayCenterConfettiProps {
  /** 값이 바뀔 때마다(생일인 아이 새로고침 시) 화면에 폭죽이 여러 발 터졌다가 사라진다. */
  triggerKey: number;
}

/** 불꽃놀이다운 색감 — 금빛 스파크 위주에 포인트 컬러를 섞는다. */
const SPARK_COLORS = ['#FFD54A', '#FFFFFF', '#FF7A5C', '#7ED6FF', '#FF8FD6', '#B892FF'];

interface BurstConfig {
  /** 화면 중앙(0,0) 기준 이 폭죽이 터지는 위치 오프셋. */
  originX: number;
  originY: number;
  /** 이 폭죽이 터지기까지의 지연(ms). */
  delay: number;
  /** 파편이 퍼지는 최대 반경. */
  radius: number;
  sparkCount: number;
}

const BURSTS: BurstConfig[] = [
  { originX: 0, originY: -20, delay: 0, radius: 150, sparkCount: 34 },
  { originX: -95, originY: -70, delay: 160, radius: 95, sparkCount: 20 },
  { originX: 100, originY: -40, delay: 260, radius: 100, sparkCount: 20 },
];

const DURATION = 1450;

/** 폭죽 한 발 — 중심에서 사방으로 스파크(점/선)가 튀어나갔다가 중력에 끌려 떨어지며 사라진다. */
function FireworkBurst({ config, playKey }: { config: BurstConfig; playKey: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    pop.setValue(0);

    const timer = setTimeout(() => {
      Animated.timing(pop, {
        toValue: 1,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      Animated.timing(progress, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, config.delay);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey]);

  const flashOpacity = pop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] });
  const flashScale = progress.interpolate({ inputRange: [0, 0.4], outputRange: [0.2, 2.4], extrapolate: 'clamp' });

  return (
    <View pointerEvents="none" style={[styles.burstWrap, { transform: [{ translateX: config.originX }, { translateY: config.originY }] }]}>
      <Animated.View
        style={[
          styles.flash,
          {
            opacity: Animated.multiply(flashOpacity, progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 0.4, 0] })),
            transform: [{ scale: flashScale }],
          },
        ]}
      />
      {Array.from({ length: config.sparkCount }).map((_, i) => {
        // 방사형으로 고르게 뿌리되, 살짝 무작위성을 줘서 진짜 불꽃 파편처럼 흩어지게 한다.
        const jitter = ((i * 37) % 23) / 23 - 0.5; // -0.5~0.5
        const angle = (Math.PI * 2 * i) / config.sparkCount + jitter * 0.35;
        const speed = 0.72 + ((i * 13) % 10) / 10 * 0.5; // 파편마다 속도(도달 거리) 다르게
        const dist = config.radius * speed;
        const dx = Math.cos(angle) * dist;
        const dyOut = Math.sin(angle) * dist;
        const isStreak = i % 3 !== 0; // 대부분은 길쭉한 스파크, 일부는 동그란 점
        const color = SPARK_COLORS[i % SPARK_COLORS.length];
        const streakLen = 9 + ((i * 7) % 6);

        // 뻗어나가다가 중력으로 아래로 꺾이며 떨어지는 궤적.
        const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
        const translateY = progress.interpolate({
          inputRange: [0, 0.4, 1],
          outputRange: [0, dyOut, dyOut + 70 + speed * 40],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.05, 0.55, 1],
          outputRange: [0, 1, 0.9, 0],
        });
        const scale = progress.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0.3, 1, 0.55] });
        const rotate = `${(angle * 180) / Math.PI + 90}deg`;

        return (
          <Animated.View
            key={i}
            style={[
              isStreak ? styles.streak : styles.dot,
              {
                backgroundColor: color,
                width: isStreak ? streakLen : 6,
                height: isStreak ? 2.4 : 6,
                borderRadius: isStreak ? 1.2 : 3,
                shadowColor: color,
                opacity,
                transform: [
                  { translateX },
                  { translateY },
                  { rotate },
                  { scale },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/** 홈 화면 전체를 덮는 절대 위치 오버레이 — 폭죽이 화면 위쪽에서 몇 발 연달아 터진다. */
export default function BirthdayCenterConfetti({ triggerKey }: BirthdayCenterConfettiProps) {
  const [active, setActive] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setActive(true);
    const maxDelay = Math.max(...BURSTS.map((b) => b.delay));
    const timer = setTimeout(() => setActive(false), maxDelay + DURATION);
    return () => clearTimeout(timer);
  }, [triggerKey]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {BURSTS.map((config, i) => (
        <FireworkBurst key={`${triggerKey}-${i}`} config={config} playKey={triggerKey} />
      ))}
    </View>
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
    zIndex: 999,
    elevation: 999,
  },
  burstWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF7CC',
  },
  dot: {
    position: 'absolute',
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  streak: {
    position: 'absolute',
    shadowOpacity: 0.9,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
});
