import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Text from '../components/common/AppText';

const VISIBLE_MS = 2000;
const FADE_MS = 250;

interface ToastContextValue {
  showToast: (message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (text: string, durationMs: number = VISIBLE_MS) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setMessage(text);
      opacity.stopAnimation();
      translateY.stopAnimation();
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
      ]).start();

      hideTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 12, duration: FADE_MS, useNativeDriver: true }),
        ]).start(() => setMessage(null));
      }, durationMs);
    },
    [opacity, translateY]
  );

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.container, { opacity, transform: [{ translateY }] }]}
        >
          <Text style={styles.text}>{message}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 110,
    // 라이트/다크 어느 화면 위에 떠도 똑같이 잘 보여야 하는 스낵바라, 화면이
    // 시스템 테마를 따르는지(홈 등) 라이트로 고정돼 있는지(온보딩/로그인 등)와
    // 무관하게 항상 같은 톤을 쓴다. 예전엔 useThemeColors()를 따라갔는데,
    // 라이트로 고정된 로그인 화면에서 다크모드 상태로 보면 토스트만 밝은 톤이
    // 돼서 배경과 거의 구분이 안 되고 붕 떠 보였다.
    backgroundColor: '#1F2937',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    zIndex: 1000,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
