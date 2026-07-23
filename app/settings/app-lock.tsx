import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../../components/common/AppText';
import PatternGrid from '../../components/settings/PatternGrid';
import ScreenBackground from '../../components/ScreenBackground';
import { SHADOW } from '../../constants/theme';
import { LockMethod, serializePattern, useAppLock } from '../../context/AppLockContext';
import { useTheme } from '../../context/ThemeContext';

const METHOD_OPTIONS: { id: LockMethod; label: string }[] = [
  { id: 'none', label: '사용 안 함' },
  { id: 'password', label: '비밀번호' },
  { id: 'pattern', label: '패턴' },
];

type SetupStage =
  | { kind: 'idle' }
  | { kind: 'password-first' }
  | { kind: 'password-confirm'; first: string }
  | { kind: 'pattern-first' }
  | { kind: 'pattern-confirm'; first: string };

export default function AppLockSettingsScreen() {
  const { colors } = useTheme();
  const {
    method,
    hasSecret,
    biometricEnabled,
    biometricAvailable,
    showPatternEnabled,
    setLockMethod,
    setBiometricEnabled,
    setShowPatternEnabled,
  } = useAppLock();

  const [stage, setStage] = useState<SetupStage>({ kind: 'idle' });
  const [pinInput, setPinInput] = useState('');

  const startSetup = (target: LockMethod) => {
    if (target === 'none') {
      if (method === 'none') return;
      Alert.alert('앱 잠금 해제', '앱 잠금을 사용 안 함으로 변경할까요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          style: 'destructive',
          onPress: () => setLockMethod('none'),
        },
      ]);
      return;
    }
    if (target === 'password') {
      setPinInput('');
      setStage({ kind: 'password-first' });
    } else {
      setStage({ kind: 'pattern-first' });
    }
  };

  const submitPin = () => {
    if (pinInput.length !== 4) {
      Alert.alert('비밀번호 설정', '4자리 숫자를 입력해주세요.');
      return;
    }
    if (stage.kind === 'password-first') {
      setStage({ kind: 'password-confirm', first: pinInput });
      setPinInput('');
    } else if (stage.kind === 'password-confirm') {
      if (pinInput === stage.first) {
        setLockMethod('password', pinInput);
        setStage({ kind: 'idle' });
        setPinInput('');
        Alert.alert('저장됐어요', '비밀번호로 앱 잠금이 설정됐어요.');
      } else {
        Alert.alert('비밀번호 불일치', '다시 입력해주세요.');
        setPinInput('');
        setStage({ kind: 'password-first' });
      }
    }
  };

  const handlePatternComplete = (path: number[]) => {
    if (path.length < 4) {
      Alert.alert('패턴 설정', '4개 이상의 점을 연결해주세요.');
      return;
    }
    const serialized = serializePattern(path);
    if (stage.kind === 'pattern-first') {
      setStage({ kind: 'pattern-confirm', first: serialized });
    } else if (stage.kind === 'pattern-confirm') {
      if (serialized === stage.first) {
        setLockMethod('pattern', serialized);
        setStage({ kind: 'idle' });
        Alert.alert('저장됐어요', '패턴으로 앱 잠금이 설정됐어요.');
      } else {
        Alert.alert('패턴 불일치', '다시 그려주세요.');
        setStage({ kind: 'pattern-first' });
      }
    }
  };

  const cancelSetup = () => {
    setStage({ kind: 'idle' });
    setPinInput('');
  };

  const isSettingUp = stage.kind !== 'idle';

  return (
    <ScreenBackground style={{ backgroundColor: colors.skyBackground }}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {isSettingUp ? (
            <View style={[styles.card, { backgroundColor: colors.cardWhite }]}>
              {stage.kind === 'password-first' || stage.kind === 'password-confirm' ? (
                <>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {stage.kind === 'password-first' ? '새 비밀번호 입력' : '비밀번호 확인'}
                  </Text>
                  <TextInput
                    style={[styles.pinInput, { borderColor: colors.border, color: colors.textPrimary }]}
                    value={pinInput}
                    onChangeText={setPinInput}
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={4}
                    autoFocus
                    placeholder="4자리 숫자 입력"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <View style={styles.cardButtonRow}>
                    <Pressable style={styles.cardButtonCancel} onPress={cancelSetup}>
                      <Text style={styles.cardButtonCancelText}>취소</Text>
                    </Pressable>
                    <Pressable style={styles.cardButtonPrimary} onPress={submitPin}>
                      <Text style={styles.cardButtonPrimaryText}>
                        {stage.kind === 'password-first' ? '다음' : '확인'}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {stage.kind === 'pattern-first' ? '새 패턴 그리기' : '패턴 다시 그리기'}
                  </Text>
                  <PatternGrid colors={colors} showTrail onComplete={handlePatternComplete} />
                  <View style={styles.cardButtonRow}>
                    <Pressable style={styles.cardButtonCancel} onPress={cancelSetup}>
                      <Text style={styles.cardButtonCancelText}>취소</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          ) : (
            <>
              <View style={[styles.card, { backgroundColor: colors.cardWhite }]}>
                {METHOD_OPTIONS.map((option, idx) => {
                  const isSelected = option.id === method;
                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.row, idx < METHOD_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                      onPress={() => startSetup(option.id)}
                    >
                      <View style={[styles.radio, { borderColor: isSelected ? colors.accent : colors.border }]}>
                        {isSelected ? <View style={[styles.radioDot, { backgroundColor: colors.accent }]} /> : null}
                      </View>
                      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {method !== 'none' ? (
                <View style={[styles.card, { backgroundColor: colors.cardWhite }]}>
                  <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <Text style={[styles.rowLabel, { color: colors.textPrimary, flex: 1 }]}>지문</Text>
                    <Switch
                      value={biometricEnabled}
                      onValueChange={setBiometricEnabled}
                      disabled={!biometricAvailable || !hasSecret}
                      trackColor={{ true: colors.accent, false: colors.border }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {method === 'pattern' ? (
                    <>
                      <Pressable
                        style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                        onPress={() => setStage({ kind: 'pattern-first' })}
                      >
                        <Text style={[styles.rowLabel, { color: colors.textPrimary, flex: 1 }]}>패턴 변경</Text>
                        <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
                      </Pressable>
                      <View style={styles.row}>
                        <Text style={[styles.rowLabel, { color: colors.textPrimary, flex: 1 }]}>패턴 표시</Text>
                        <Switch
                          value={showPatternEnabled}
                          onValueChange={setShowPatternEnabled}
                          trackColor={{ true: colors.accent, false: colors.border }}
                          thumbColor="#FFFFFF"
                        />
                      </View>
                    </>
                  ) : null}

                  {method === 'password' ? (
                    <Pressable style={styles.row} onPress={() => setStage({ kind: 'password-first' })}>
                      <Text style={[styles.rowLabel, { color: colors.textPrimary, flex: 1 }]}>비밀번호 변경</Text>
                      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
                    </Pressable>
                  ) : null}

                  {!biometricAvailable ? (
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                      이 기기에서는 지문 인식을 사용할 수 없어요.
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <Text style={[styles.warning, { color: colors.tomorrowRed, backgroundColor: colors.tomorrowRedBg }]}>
                ❗ 비밀번호 또는 패턴을 잊어버린 경우 앱을 삭제하고 재설치 해야하며, 재설치 시 기존 대화 내용은
                삭제됩니다.
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20 },
  card: {
    borderRadius: 14,
    marginBottom: 16,
    ...SHADOW,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 18,
  },
  hint: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  warning: {
    fontSize: 12,
    lineHeight: 18,
    padding: 14,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    padding: 16,
    paddingBottom: 8,
  },
  pinInput: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    letterSpacing: 4,
  },
  cardButtonRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  cardButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F3F5',
  },
  cardButtonCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#495057',
  },
  cardButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#4A90E2',
  },
  cardButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
