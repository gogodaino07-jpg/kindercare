import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import Text from '../../components/common/AppText';
import PatternGrid from '../../components/settings/PatternGrid';
import { SHADOW } from '../../constants/theme';
import { useAlert } from '../../context/AlertContext';
import { LockMethod, serializePattern, useAppLock } from '../../context/AppLockContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import AppLockScreen from '../../components/AppLockScreen';
import { stripInvalidCharacters } from '../../utils/validation';

interface LockOption {
  id: LockMethod;
  title: string;
  description: string;
}

const LOCK_OPTIONS: LockOption[] = [
  { id: 'pin', title: 'PIN(숫자)', description: '보안강도 약간 높음' },
  { id: 'password', title: '비밀번호(영문+숫자)', description: '보안강도 높음' },
  { id: 'pattern', title: '패턴', description: '보안강도 중간' },
  { id: 'none', title: '설정 안 함', description: '' },
];

type SetupStage =
  | { kind: 'idle' }
  | { kind: 'pin-first' }
  | { kind: 'pin-confirm'; first: string }
  | { kind: 'password-first' }
  | { kind: 'password-confirm'; first: string }
  | { kind: 'pattern-first' }
  | { kind: 'pattern-confirm'; first: string };

export default function AppLockSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showToast } = useToast();
  const { showAlert } = useAlert();
  const {
    method,
    hasSecret,
    biometricEnabled,
    biometricAvailable,
    showPatternEnabled,
    setLockMethod,
    setBiometricEnabled,
    setShowPatternEnabled,
    verifySecret,
    authenticateWithBiometric,
  } = useAppLock();

  const [isVerified, setIsVerified] = useState(method === 'none');
  const [stage, setStage] = useState<SetupStage>({ kind: 'idle' });
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState(false);
  const [pendingAction, setPendingAction] = useState<'none' | null>(null);

  type Strength = 'low' | 'medium' | 'high';

  const getStrength = (text: string, type: 'pin' | 'password'): Strength => {
    if (text.length < 4) return 'low';

    if (type === 'pin') {
      const isSequential = /^(0123|1234|2345|3456|4567|5678|6789)$/.test(text);
      const isRepeated = /^(.)\1{3}$/.test(text);
      return (isSequential || isRepeated) ? 'low' : 'medium';
    } else {
      const hasLetter = /[a-zA-Z]/.test(text);
      const hasNumber = /[0-9]/.test(text);
      const hasSpecial = /[^a-zA-Z0-9]/.test(text);

      if (hasLetter && hasNumber && hasSpecial) return 'high';
      if (hasLetter && hasNumber) return 'medium';
      return 'low';
    }
  };

  const getStrengthColor = (strength: Strength) => {
    switch (strength) {
      case 'low': return colors.statusGreen; // Green
      case 'medium': return colors.accent;    // Blue
      case 'high': return colors.tomorrowRed; // Red
      default: return colors.textSecondary;
    }
  };

  const getStrengthLabel = (strength: Strength) => {
    switch (strength) {
      case 'low': return '보안강도: 낮음 (취약해요)';
      case 'medium': return '보안강도: 보통 (안전해요)';
      case 'high': return '보안강도: 높음 (매우 강력해요)';
    }
  };

  // Requirement 4: Verify existing lock before entering settings
  if (!isVerified) {
    return (
      <AppLockScreen
        autoBiometricEnabled={true}
        onVerified={() => {
          setIsVerified(true);
          if (pendingAction === 'none') {
            setLockMethod('none');
            setPendingAction(null);
            showToast('잠금이 해제되었습니다.');
          }
        }}
        isEmbedded={true}
      />
    );
  }

  const startSetup = (target: LockMethod) => {
    if (target === method) return;

    if (target === 'none') {
      showAlert({
        title: '잠금 해제',
        message: '잠금화면 설정을 해제할까요?\n기존 비밀번호 재확인이 필요합니다.',
        buttons: [
          { text: '취소', style: 'cancel' },
          {
            text: '해제',
            style: 'destructive',
            onPress: () => {
              setPendingAction('none');
              setIsVerified(false);
            },
          },
        ],
      });
      return;
    }

    setInputText('');
    if (target === 'pin') setStage({ kind: 'pin-first' });
    else if (target === 'password') setStage({ kind: 'password-first' });
    else if (target === 'pattern') setStage({ kind: 'pattern-first' });
  };

  const handleNext = () => {
    if (stage.kind === 'pin-first' || stage.kind === 'pin-confirm') {
      if (inputText.length < 4) {
        showToast('4자리 이상 입력해주세요.');
        return;
      }
      if (stage.kind === 'pin-first') {
        setStage({ kind: 'pin-confirm', first: inputText });
        setInputText('');
      } else {
        if (inputText === stage.first) {
          setLockMethod('pin', inputText);
          setStage({ kind: 'idle' });
          setInputText('');
          showToast('잠금 설정이 완료되었습니다.');
        } else {
          setError(true);
          setTimeout(() => {
            setError(false);
            setInputText('');
            setStage({ kind: 'pin-first' });
          }, 1500);
        }
      }
    } else if (stage.kind === 'password-first' || stage.kind === 'password-confirm') {
      if (inputText.length < 4) {
        showToast('4자 이상 입력해주세요.');
        return;
      }
      if (stage.kind === 'password-first') {
        setStage({ kind: 'password-confirm', first: inputText });
        setInputText('');
      } else {
        if (inputText === stage.first) {
          setLockMethod('password', inputText);
          setStage({ kind: 'idle' });
          showToast('잠금 설정이 완료되었습니다.');
        } else {
          setError(true);
          setTimeout(() => {
            setError(false);
            setInputText('');
            setStage({ kind: 'password-first' });
          }, 1500);
        }
      }
    }
  };

  const handlePatternComplete = (path: number[]) => {
    if (path.length < 4) {
      showToast('4개 이상의 점을 연결해주세요.');
      return;
    }
    const serialized = serializePattern(path);
    if (stage.kind === 'pattern-first') {
      setStage({ kind: 'pattern-confirm', first: serialized });
    } else if (stage.kind === 'pattern-confirm') {
      if (serialized === stage.first) {
        setLockMethod('pattern', serialized);
        setStage({ kind: 'idle' });
        showToast('잠금 설정이 완료되었습니다.');
      } else {
        setError(true);
        setTimeout(() => {
          setError(false);
          setStage({ kind: 'pattern-first' });
        }, 1500);
      }
    }
  };

  const cancelSetup = () => {
    setStage({ kind: 'idle' });
    setInputText('');
  };

  const handleToggleBiometric = async (enabled: boolean) => {
    if (enabled) {
      const success = await authenticateWithBiometric();
      if (success) {
        setBiometricEnabled(true);
        showToast('✓ 지문 설정이 활성화되었습니다.');
      }
    } else {
      setBiometricEnabled(false);
    }
  };

  const renderSetupUI = () => {
    const isPassword = stage.kind.includes('password');
    const isPin = stage.kind.includes('pin');
    const isPattern = stage.kind.includes('pattern');

    const strength = (isPin || isPassword) ? getStrength(inputText, isPin ? 'pin' : 'password') : null;
    const strengthColor = strength ? getStrengthColor(strength) : colors.textSecondary;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.setupContainer}
      >
        <View style={[styles.card, { backgroundColor: colors.cardWhite, padding: 24 }]}>
          <Text style={[
            styles.cardTitle,
            { color: error ? colors.tomorrowRed : colors.textPrimary }
          ]}>
            {error ? '입력한 정보가 일치하지 않습니다' : (stage.kind.includes('first') ? '새로운 잠금 설정' : '한 번 더 입력해주세요')}
          </Text>
          <Text style={[
            styles.cardSubtitle,
            { color: error ? colors.tomorrowRed : colors.textSecondary }
          ]}>
            {error ? '다시 시도해주세요' : (isPin ? '숫자 PIN 4자리를 입력해주세요' : isPassword ? '영문+숫자 조합으로 입력해주세요' : '패턴을 그려주세요')}
          </Text>

          {(isPin || isPassword) && (
            <>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: error ? colors.tomorrowRed : colors.border, color: colors.textPrimary }
                ]}
                value={inputText}
                onChangeText={(text) => setInputText(stripInvalidCharacters(text))}
                secureTextEntry
                keyboardType={isPin ? 'number-pad' : 'default'}
                maxLength={isPin ? 4 : 12}
                autoFocus
              />
              {inputText.length > 0 && !error && stage.kind.includes('first') && (
                <Text style={[styles.strengthText, { color: strengthColor }]}>
                  {getStrengthLabel(strength!)}
                </Text>
              )}
            </>
          )}

          {isPattern && (
            <View style={{ marginVertical: 20 }}>
              <PatternGrid
                colors={{...colors, accent: error ? colors.tomorrowRed : colors.accent}}
                showTrail
                onComplete={handlePatternComplete}
              />
            </View>
          )}

          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelBtn} onPress={cancelSetup}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </Pressable>
            {isPattern && (
              <Pressable
                style={styles.retryBtn}
                onPress={() => {
                  setStage({ kind: 'pattern-first' });
                  showToast('첫 번째 단계부터 다시 시작합니다.');
                }}
              >
                <Text style={styles.retryBtnText}>🔄 다시 그리기</Text>
              </Pressable>
            )}
            {(isPin || isPassword) && (
              <Pressable style={styles.nextBtn} onPress={handleNext}>
                <Text style={styles.nextBtnText}>{stage.kind.includes('first') ? '다음' : '완료'}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {stage.kind !== 'idle' ? (
          renderSetupUI()
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.card, { backgroundColor: colors.cardWhite }]}>
              {LOCK_OPTIONS.map((option, idx) => {
                const isSelected = option.id === method;
                return (
                  <View key={option.id}>
                    <Pressable
                      style={styles.row}
                      onPress={() => startSetup(option.id)}
                    >
                      <View style={styles.rowInfo}>
                        <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{option.title}</Text>
                        {option.description ? (
                          <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{option.description}</Text>
                        ) : null}
                      </View>
                      <View style={[styles.radioOuter, { borderColor: isSelected ? colors.accent : colors.border }]}>
                        {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.accent }]} />}
                      </View>
                    </Pressable>
                    {idx < LOCK_OPTIONS.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  </View>
                );
              })}
            </View>

            {method !== 'none' && (
              <View style={[styles.card, { backgroundColor: colors.cardWhite, marginTop: 16 }]}>
                <View style={styles.row}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary, flex: 1 }]}>지문 사용</Text>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleToggleBiometric}
                    disabled={!biometricAvailable}
                    trackColor={{ true: colors.accent, false: colors.border }}
                    thumbColor={colors.cardWhite}
                  />
                </View>
                {method === 'pattern' && (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.row}>
                      <Text style={[styles.rowTitle, { color: colors.textPrimary, flex: 1 }]}>패턴 가이드 표시</Text>
                      <Switch
                        value={showPatternEnabled}
                        onValueChange={setShowPatternEnabled}
                        trackColor={{ true: colors.accent, false: colors.border }}
                        thumbColor={colors.cardWhite}
                      />
                    </View>
                  </>
                )}
              </View>
            )}

            <View style={[styles.warningBox, { backgroundColor: colors.tomorrowRed + '10' }]}>
              <Text style={[styles.warningText, { color: colors.tomorrowRed }]}>
                ❗ 잠금 정보를 잊어버린 경우 앱을 재설치해야 하며, 이 경우 기존 데이터는 모두 삭제되니 주의해주세요.
              </Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: { padding: 20 },
    setupContainer: { flex: 1, padding: 20, justifyContent: 'center' },
    card: {
      borderRadius: 20,
      ...SHADOW,
      overflow: 'hidden',
    },
    cardTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
    cardSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 24 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 18,
      paddingHorizontal: 20,
    },
    rowInfo: { flex: 1 },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    rowTitle: { fontSize: 16, fontWeight: '700' },
    rowDesc: { fontSize: 12, marginTop: 2 },
    divider: { height: 1, marginHorizontal: 20 },
    input: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 14,
      fontSize: 18,
      textAlign: 'center',
      marginBottom: 24,
      letterSpacing: 2,
    },
    strengthText: {
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: -16,
      marginBottom: 20,
    },
    buttonRow: { flexDirection: 'row', gap: 12 },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.gray100,
      alignItems: 'center',
    },
    cancelBtnText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
    nextBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.gray900,
      alignItems: 'center',
    },
    nextBtnText: { fontSize: 15, fontWeight: '700', color: colors.cardWhite },
    retryBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.green50,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.green500,
    },
    retryBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.green500,
    },
    warningBox: {
      marginTop: 24,
      padding: 16,
      borderRadius: 16,
    },
    warningText: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '500',
    },
  });
}
