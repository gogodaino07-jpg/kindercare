import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ScreenCapture from 'expo-screen-capture';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import FingerprintIcon from './common/FingerprintIcon';
import PatternGrid from './settings/PatternGrid';
import PinPad from './settings/PinPad';
import { serializePattern, useAppLock } from '../context/AppLockContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Text from './common/AppText';

const PIN_LENGTH = 4;

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
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
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
      setPasswordInput('');
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

    if (next.length >= PIN_LENGTH) {
      if (verifySecret(next)) {
        handleSuccess();
      } else {
        // 4번째 점이 채워진 걸 보여준 다음에 틀렸다고 알려준다 — 바로 지워버리면
        // 마지막 자리를 입력했는지도 모르게 3자리까지만 보이다 사라져 보였다.
        setTimeout(() => {
          setError(true);
          setInput('');
        }, 350);
      }
    }
  };

  // 설정 화면(app-lock.tsx)에서는 비밀번호에 영문+숫자를 허용하는데, 예전엔 이
  // 실제 잠금 해제 화면이 숫자 전용 키패드만 갖고 있어서 영문이 섞인 비밀번호는
  // 아예 입력할 방법이 없어 스스로 잠기는 심각한 버그가 있었다 — 설정 화면과
  // 똑같은 텍스트 입력창으로 바꿔서 해결한다.
  const handlePasswordSubmit = () => {
    if (!passwordInput) return;
    if (verifySecret(passwordInput)) {
      handleSuccess();
    } else {
      setError(true);
      setPasswordInput('');
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
        ) : method === 'password' ? (
          <>
            <View style={styles.passwordInputWrap}>
              <TextInput
                style={[styles.passwordInput, { borderColor: error ? colors.tomorrowRed : colors.border, color: colors.textPrimary }]}
                value={passwordInput}
                onChangeText={(text) => { setPasswordInput(text); setError(false); }}
                secureTextEntry={!passwordVisible}
                placeholder="비밀번호 입력"
                placeholderTextColor={colors.textSecondary}
                autoFocus
                onSubmitEditing={handlePasswordSubmit}
                returnKeyType="done"
              />
              <Pressable onPress={() => setPasswordVisible((v) => !v)} hitSlop={10} style={styles.eyeButton}>
                <MaterialCommunityIcons
                  name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
            <Pressable style={[styles.confirmButton, { backgroundColor: colors.accent }]} onPress={handlePasswordSubmit}>
              <Text style={styles.confirmButtonText}>확인</Text>
            </Pressable>
            {canUseBiometric ? (
              <Pressable style={styles.bioButton} onPress={() => authenticateWithBiometric().then(s => s && isEmbedded && onVerified?.())}>
                <Text style={[styles.bioButtonText, { color: colors.accent }]}>지문으로 잠금 해제</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <PinPad
            colors={colors}
            value={input}
            length={PIN_LENGTH}
            error={error}
            onKeyPress={handlePress}
            bottomLeftSlot={
              <Pressable onPress={() => handlePress('bio')} disabled={!canUseBiometric}>
                {canUseBiometric ? <FingerprintIcon size={30} color={colors.accent} /> : null}
              </Pressable>
            }
          />
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
  passwordInputWrap: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    marginTop: 12,
  },
  passwordInput: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingRight: 48,
    fontSize: 17,
    textAlign: 'center',
    letterSpacing: 2,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  confirmButton: {
    width: '100%',
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
