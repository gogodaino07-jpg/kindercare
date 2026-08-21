import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface BirthdayCenterConfettiProps {
  /** 값이 바뀔 때마다(생일인 아이 새로고침 시) 화면 한가운데에 폭죽이 한 번 크게 터졌다가 사라진다. */
  triggerKey: number;
}

const CENTER_CONFETTI_EMOJIS = ['🎉', '🎊', '✨', '🎈', '🥳', '🌟', '💛', '🎁', '💫', '⭐'];
const CENTER_CONFETTI_COUNT = 42;

/** 홈 화면 전체를 덮는 절대 위치 오버레이 — 화면 정중앙에서 사방으로 크게 폭죽이 터진다. */
export default function BirthdayCenterConfetti({ triggerKey }: BirthdayCenterConfettiProps) {
  const [active, setActive] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const flashScale = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setActive(true);
    progress.setValue(0);
    flashScale.setValue(0.3);
    flashOpacity.setValue(0.9);

    const burst = Animated.timing(progress, {
      toValue: 1,
      duration: 1900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const flash = Animated.parallel([
      Animated.timing(flashScale, { toValue: 3.2, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);

    flash.start();
    burst.start(({ finished }) => {
      if (finished) setActive(false);
    });
    return () => {
      burst.stop();
      flash.stop();
    };
  }, [triggerKey, progress, flashScale, flashOpacity]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View
        style={[
          styles.flash,
          { opacity: flashOpacity, transform: [{ scale: flashScale }] },
        ]}
      />
      {Array.from({ length: CENTER_CONFETTI_COUNT }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / CENTER_CONFETTI_COUNT + (i % 2 === 0 ? 0.1 : -0.1);
        const distance = 130 + (i % 6) * 24;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        const size = 20 + (i % 5) * 5;
        const spinDeg = `${(i % 2 === 0 ? 1 : -1) * (260 + i * 15)}deg`;
        const delay = (i % 9) * 0.02;

        const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
        const translateY = progress.interpolate({
          inputRange: [0, 0.35, 1],
          outputRange: [0, dy - 10, dy + 90],
        });
        const opacity = progress.interpolate({
          inputRange: [delay, delay + 0.1, 0.7, 1],
          outputRange: [0, 1, 1, 0],
        });
        const scale = progress.interpolate({ inputRange: [0, 0.16, 1], outputRange: [0.2, 1.25, 0.85] });
        const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', spinDeg] });

        return (
          <Animated.Text
            key={i}
            style={[
              styles.piece,
              {
                fontSize: size,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }, { rotate }],
              },
            ]}
          >
            {CENTER_CONFETTI_EMOJIS[i % CENTER_CONFETTI_EMOJIS.length]}
          </Animated.Text>
        );
      })}
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
  flash: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFF7CC',
  },
  piece: {
    position: 'absolute',
  },
});
