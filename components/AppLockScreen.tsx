import * as ScreenCapture from 'expo-screen-capture';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import FingerprintIcon from './common/FingerprintIcon';
import PatternGrid from './settings/PatternGrid';
import { serializePattern, useAppLock } from '../context/AppLockContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Text from './common/AppText';

// Standard phone-keypad order: del sits bottom-left, 0 center, fingerprint
// bottom-right — directly to the right of 0, within easy thumb reach.
const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'bio'];

interface AppLockScreenProps {
  /** False while the boot splash is still covering the screen — the native
   * biometric prompt renders above everything (including the splash), so
   * auto-firing it early would break the required 스플래시 ➔ 잠금 화면 order. */
  autoBiometricEnabled?: boolean;
  /** Callback for when the user successfully authenticates (used for settings entry). */
  onVerified?: () => void;
  /** If true, this screen is being used as a gate within another screen. */
  isEmbedded?: boolean;
}

export default function AppLockScreen({
  autoBiometricEnabled = true,
  onVerified,
  isEmbedded = false
}: AppLockScreenProps) {
  const colors = useThemeColors();
  const { showToast } = useToast();
  const {
    method,
    isLocked,
    verifySecret,
    unlock,
    biometricEnabled,
    biometricAvailable,
    authenticateWithBiometric,
    showPatternEnabled,
  } = useAppLock();
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const canUseBiometric = biometricEnabled && biometricAvailable;

  const effectiveLocked = isEmbedded || isLocked;

  useEffect(() => {
    if (effectiveLocked) {
      ScreenCapture.preventScreenCaptureAsync();
      const subscription = ScreenCapture.addScreenshotListener(() => {
        showToast('이 앱에서는 화면 캡처를 사용 할 수 없어요.');
      });
      return () => {
        subscription.remove();
        ScreenCapture.allowScreenCaptureAsync();
      };
    }
  }, [effectiveLocked]);

  useEffect(() => {
    if (effectiveLocked && canUseBiometric && autoBiometricEnabled) {
      authenticateWithBiometric().then(success => {
        if (success && isEmbedded) onVerified?.();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveLocked, canUseBiometric, autoBiometricEnabled]);

  useEffect(() => {
    if (!effectiveLocked) {
      setInput('');
      setError(false);
    }
  }, [effectiveLocked]);

  if (!effectiveLocked || method === 'none') return null;

  const handleSuccess = () => {
    if (isEmbedded) {
      onVerified?.();
    } else {
      unlock();
    }
  };

  const handlePress = (key: string) => {
    if (key === 'bio') {
      authenticateWithBiometric().then(success => {
        if (success && isEmbedded) onVerified?.();
      });
      return;
    }
    if (key === 'del') {
      setInput((prev) => prev.slice(0, -1));
      setError(false);
      return;
    }
    const next = input + key;
    setInput(next);
    setError(false);

    // For 'password' method, we might want to use the handleNext instead of auto-submit
    // but for PIN (4 digits) we keep auto-submit.
    if (method === 'pin' && next.length >= 4) {
      if (verifySecret(next)) {
        handleSuccess();
      } else {
        setError(true);
        setInput('');
      }
    } else if (method === 'password') {
      // Password uses system keyboard usually, but this keypad is for PIN/Gate.
      // If method is password, verifySecret still works.
      if (next.length >= 4 && verifySecret(next)) {
        handleSuccess();
      }
    }
  };

  const handlePatternComplete = (path: number[]) => {
    if (path.length < 4) return;
    const serialized = serializePattern(path);
    if (verifySecret(serialized)) {
      handleSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <View style={[
      styles.overlay,
      { backgroundColor: colors.skyBackground },
      isEmbedded && { position: 'relative', flex: 1, zIndex: 1 }
    ]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {isEmbedded ? '현재 잠금을 해제해주세요' :
            (method === 'pattern' ? '패턴을 그려주세요' : '비밀번호를 입력해주세요')}
        </Text>
        {error ? (
          <Text style={[styles.error, { color: colors.tomorrowRed }]}>
            잠금 정보가 일치하지 않아요
          </Text>
        ) : (
          <View style={styles.error} />
        )}

        {method === 'pattern' ? (
          <>
            <PatternGrid colors={colors} showTrail={showPatternEnabled} onComplete={handlePatternComplete} />
            {canUseBiometric ? (
              <Pressable style={styles.bioButton} onPress={() => authenticateWithBiometric().then(s => s && isEmbedded && onVerified?.())}>
                <Text style={[styles.bioButtonText, { color: colors.accent }]}>지문으로 잠금 해제</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.dotsRow}>
              {Array.from({ length: 4 }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    { borderColor: colors.accent },
                    i < input.length && { backgroundColor: colors.accent },
                  ]}
                />
              ))}
            </View>

            {/* Password method in AppLockScreen usually means a gate/pin for quick entry.
                If it's full password, we might need a text input, but for quick entry PIN is better.
                We'll keep the keypad for both pin/password in the gate screen. */}
            <View style={styles.keypad}>
              {KEYPAD_KEYS.map((key, idx) => {
                if (key === 'bio') {
                  return (
                    <Pressable
                      key={idx}
                      style={styles.key}
                      onPress={() => handlePress('bio')}
                      disabled={!canUseBiometric}
                    >
                      {canUseBiometric ? (
                        <FingerprintIcon size={30} color={colors.accent} />
                      ) : null}
                    </Pressable>
                  );
                }
                return (
                  <Pressable key={idx} style={styles.key} onPress={() => handlePress(key)}>
                    <Text style={[styles.keyText, { color: colors.textPrimary }]}>
                      {key === 'del' ? '⌫' : key}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </View>
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
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  error: {
    fontSize: 13,
    height: 20,
    marginBottom: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    marginBottom: 44,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginHorizontal: 12,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    justifyContent: 'center',
    marginTop: 64,
  },
  key: {
    width: '33.33%',
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
  },
  bioButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bioButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
