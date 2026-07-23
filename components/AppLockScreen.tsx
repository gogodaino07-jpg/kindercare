import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import PatternGrid from './settings/PatternGrid';
import { serializePattern, useAppLock } from '../context/AppLockContext';
import { useThemeColors } from '../context/ThemeContext';
import Text from './common/AppText';

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'];

interface AppLockScreenProps {
  /** False while the boot splash is still covering the screen — the native
   * biometric prompt renders above everything (including the splash), so
   * auto-firing it early would break the required 스플래시 ➔ 잠금 화면 order. */
  autoBiometricEnabled?: boolean;
}

export default function AppLockScreen({ autoBiometricEnabled = true }: AppLockScreenProps) {
  const colors = useThemeColors();
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

  useEffect(() => {
    if (isLocked && canUseBiometric && autoBiometricEnabled) {
      authenticateWithBiometric();
    }
    // Also re-fire if canUseBiometric/autoBiometricEnabled flips true after
    // mount (e.g. on a cold app restart, biometricAvailable resolves
    // asynchronously and can land after isLocked is already true, or the
    // boot splash finishes after this screen is already mounted) —
    // otherwise this never re-runs and the auto-prompt silently never fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, canUseBiometric, autoBiometricEnabled]);

  useEffect(() => {
    if (!isLocked) {
      setInput('');
      setError(false);
    }
  }, [isLocked]);

  if (!isLocked || method === 'none') return null;

  const handlePress = (key: string) => {
    if (key === 'bio') {
      authenticateWithBiometric();
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
    if (next.length >= 4) {
      if (verifySecret(next)) {
        unlock();
      } else {
        setError(true);
        setInput('');
      }
    }
  };

  const handlePatternComplete = (path: number[]) => {
    if (path.length < 4) return;
    const serialized = serializePattern(path);
    if (verifySecret(serialized)) {
      unlock();
    } else {
      setError(true);
    }
  };

  return (
    <View style={[styles.overlay, { backgroundColor: colors.skyBackground }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {method === 'password' ? '비밀번호를 입력해주세요' : '패턴을 그려주세요'}
        </Text>
        {error ? (
          <Text style={[styles.error, { color: colors.tomorrowRed }]}>
            {method === 'password' ? '비밀번호가 일치하지 않아요' : '패턴이 일치하지 않아요'}
          </Text>
        ) : (
          <View style={styles.error} />
        )}

        {method === 'password' ? (
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
                        <Text style={[styles.keyText, { color: colors.accent, fontSize: 26 }]}>
                          👆
                        </Text>
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
        ) : (
          <>
            <PatternGrid colors={colors} showTrail={showPatternEnabled} onComplete={handlePatternComplete} />
            {canUseBiometric ? (
              <Pressable style={styles.bioButton} onPress={() => authenticateWithBiometric()}>
                <Text style={[styles.bioButtonText, { color: colors.accent }]}>지문으로 잠금 해제</Text>
              </Pressable>
            ) : null}
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
    marginBottom: 36,
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
