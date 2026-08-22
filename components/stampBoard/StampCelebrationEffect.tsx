import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface StampCelebrationEffectProps {
  /** 값이 바뀔 때마다(도장을 새로 찍을 때마다) 화면 중앙에 아이콘에 맞는 연출이 한 번 재생된다. */
  triggerKey: number;
  /** 방금 찍힌 스탬프 아이콘 — 이 값으로 연출 종류(빛줄기/두둥실/팡팡)를 고른다. */
  icon: string;
}

/** 빛/마법 계열 — 사방으로 빛줄기가 쫘르르 쏟아지는 연출. */
const RAY_ICONS = new Set(['🌈', '🌟', '✨', '💫', '👑', '🪄', '🎯']);
/** 둥실 뜨는 계열 — 여러 개가 위로 두둥실 떠오르는 연출. */
const FLOAT_ICONS = new Set(['🎈', '🪁']);

type EffectKind = 'rays' | 'float' | 'pop';

function getEffectKind(icon: string): EffectKind {
  if (RAY_ICONS.has(icon)) return 'rays';
  if (FLOAT_ICONS.has(icon)) return 'float';
  return 'pop'; // 그 외 전부(별/동물/음식/탈것 등) — 여러 개가 팡팡 터지며 퍼짐
}

const RAY_COLORS = ['#F87171', '#FBBF24', '#34D399', '#38BDF8', '#A78BFA', '#F472B6', '#FB923C', '#FDE047'];
const RAY_COUNT = 10;
const FLOAT_COUNT = 7;
const POP_COUNT = 14;

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
      duration: nextKind === 'float' ? 1500 : 1000,
      easing: Easing.out(Easing.cubic),
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
      {kind === 'pop' && <PopEffect progress={progress} icon={icon} />}
    </View>
  );
}

/** 무지개/별빛 계열: 중심에서 사방으로 색색의 빛줄기가 쫘르르 뻗어나가고, 아이콘이 가운데서 팡 커진다. */
function RaysEffect({ progress, icon }: { progress: Animated.Value; icon: string }) {
  return (
    <>
      {Array.from({ length: RAY_COUNT }).map((_, i) => {
        const angle = (360 / RAY_COUNT) * i;
        const length = 130 + (i % 3) * 22;
        const color = RAY_COLORS[i % RAY_COLORS.length];
        const scale = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] });
        const opacity = progress.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 0.95, 0.85, 0] });
        return (
          <Animated.View
            key={i}
            style={[
              rayStyles.ray,
              {
                height: length,
                backgroundColor: color,
                opacity,
                transform: [{ rotate: `${angle}deg` }, { translateY: -length / 2 }, { scaleY: scale }],
              },
            ]}
          />
        );
      })}
      <Animated.View
        style={[
          rayStyles.ring,
          {
            opacity: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.9, 0.6, 0] }),
            transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.6] }) }],
          },
        ]}
      />
      <Animated.Text
        style={[
          rayStyles.icon,
          {
            opacity: progress.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { scale: progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.3, 1] }) },
            ],
          },
        ]}
      >
        {icon}
      </Animated.Text>
    </>
  );
}

/** 풍선/연 계열: 여러 개가 좌우로 살랑이며 위로 두둥실 떠올라 사라진다. */
function FloatEffect({ progress, icon }: { progress: Animated.Value; icon: string }) {
  return (
    <>
      {Array.from({ length: FLOAT_COUNT }).map((_, i) => {
        const startX = (i - (FLOAT_COUNT - 1) / 2) * 34;
        const swayDir = i % 2 === 0 ? 1 : -1;
        const size = 26 + (i % 3) * 8;
        const delay = (i % FLOAT_COUNT) * 0.06;

        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [40, -380 - (i % 3) * 30],
        });
        const translateX = progress.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [startX, startX + swayDir * 18, startX, startX + swayDir * 18, startX],
        });
        const opacity = progress.interpolate({
          inputRange: [Math.min(delay, 0.9), Math.min(delay + 0.15, 0.95), 0.8, 1],
          outputRange: [0, 1, 1, 0],
        });
        const scale = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1, 1] });

        return (
          <Animated.Text
            key={i}
            style={[
              floatStyles.piece,
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

/** 그 외 전부(별/동물/음식 등): 아이콘 여러 개가 사방으로 팡팡 터지듯 퍼진다. */
function PopEffect({ progress, icon }: { progress: Animated.Value; icon: string }) {
  return (
    <>
      {Array.from({ length: POP_COUNT }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / POP_COUNT + (i % 2 === 0 ? 0.12 : -0.12);
        const distance = 90 + (i % 5) * 22;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        const size = 22 + (i % 4) * 6;
        const spinDeg = `${(i % 2 === 0 ? 1 : -1) * (160 + i * 12)}deg`;
        const delay = (i % 8) * 0.02;

        const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
        const translateY = progress.interpolate({
          inputRange: [0, 0.4, 1],
          outputRange: [0, dy - 8, dy + 60],
        });
        const opacity = progress.interpolate({
          inputRange: [delay, delay + 0.12, 0.7, 1],
          outputRange: [0, 1, 1, 0],
        });
        const scale = progress.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.2, 1.2, 0.8] });
        const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', spinDeg] });

        return (
          <Animated.Text
            key={i}
            style={[
              popStyles.piece,
              { fontSize: size, opacity, transform: [{ translateX }, { translateY }, { scale }, { rotate }] },
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
  ray: {
    position: 'absolute',
    width: 7,
    borderRadius: 4,
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: '#FCD34D',
  },
  icon: {
    position: 'absolute',
    fontSize: 72,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
});

const floatStyles = StyleSheet.create({
  piece: {
    position: 'absolute',
  },
});

const popStyles = StyleSheet.create({
  piece: {
    position: 'absolute',
  },
});
