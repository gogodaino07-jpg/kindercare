import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../../components/common/AppText';
import PatternGrid from '../../components/settings/PatternGrid';
import PinPad from '../../components/settings/PinPad';
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
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const PIN_MAX_LENGTH = 4;
const PASSWORD_MAX_LENGTH = 12;

const LOCK_OPTIONS: LockOption[] = [
  { id: 'pin', title: 'PIN(숫자)', description: '보안강도 약간 높음', icon: 'dialpad' },
  { id: 'password', title: '비밀번호(영문+숫자)', description: '보안강도 높음', icon: 'lock-outline' },
  { id: 'pattern', title: '패턴', description: '보안강도 중간', icon: 'grid' },
  { id: 'none', title: '설정 안 함', description: '', icon: 'shield-check-outline' },
];

/** 선택 안 된 상태일 때 방식별 아이콘 뱃지 색 — 선택되면 전부 accent 파랑으로 통일된다. */
const OPTION_BADGE_COLORS: Record<LockMethod, { bg: (colors: any) => string; fg: (colors: any) => string }> = {
  pin: { bg: (c) => c.lightBlueBg, fg: (c) => c.accent },
  password: { bg: (c) => c.green50, fg: (c) => c.green500 },
  pattern: { bg: (c) => c.orangeLight1, fg: (c) => c.orange500 },
  none: { bg: (c) => c.gray100, fg: (c) => c.gray500 },
};

type SetupStage =
  | { kind: 'idle' }
  | { kind: 'pin-first' }
  | { kind: 'pin-confirm'; first: string }
  | { kind: 'password-first' }
  | { kind: 'password-confirm'; first: string }
  | { kind: 'pattern-first' }
  | { kind: 'pattern-confirm'; first: string };

export default function AppLockSettingsScreen() {
  const router = useRouter();
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
  const [secureVisible, setSecureVisible] = useState(false);
  // 패턴은 손을 뗀 뒤에도 화면에 남아있다가, "다음"을 눌러야 다음 단계로 확정된다.
  const [drawnPattern, setDrawnPattern] = useState<string | null>(null);
  const [patternResetKey, setPatternResetKey] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // KeyboardAvoidingView(behavior="height")로 여러 번 시도했지만 이 화면에서는
  // 실제로 컨테이너 높이를 줄여주지 않는 것으로 확인됐다 — 입력창이 늘 보였던
  // 건 키보드 회피가 작동해서가 아니라, 내용이 화면 가운데 정렬돼 있어 우연히
  // 키보드 위쪽에 위치했을 뿐이었다(취소/다음 버튼처럼 화면 하단에 있는 요소는
  // 어떤 방식으로 배치해도 키보드에 그대로 가려짐). 그래서 OS가 알려주는 실제
  // 키보드 높이를 직접 받아 그만큼 paddingBottom으로 밀어내는 방식으로 대체한다.
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
    setDrawnPattern(null);
    setSecureVisible(false);
    if (target === 'pin') setStage({ kind: 'pin-first' });
    else if (target === 'password') setStage({ kind: 'password-first' });
    else if (target === 'pattern') setStage({ kind: 'pattern-first' });
  };

  // 실제 잠금 해제 화면(PinPad)과 똑같이, 마지막 자리를 누르면 자동으로 다음
  // 단계로 넘어간다 — "다음" 버튼을 따로 누르지 않아도 되게 해서 설정할 때
  // 연습한 동작이 실제로 잠금을 풀 때와 일치하도록 맞춘다.
  const submitPin = (value: string) => {
    if (stage.kind === 'pin-first') {
      setStage({ kind: 'pin-confirm', first: value });
      setInputText('');
    } else if (stage.kind === 'pin-confirm') {
      if (value === stage.first) {
        setLockMethod('pin', value);
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
  };

  const handlePinKeyPress = (key: string) => {
    if (error) return;
    if (key === 'del') {
      setInputText((prev) => prev.slice(0, -1));
      return;
    }
    setInputText((prev) => {
      if (prev.length >= PIN_MAX_LENGTH) return prev;
      const next = prev + key;
      if (next.length >= PIN_MAX_LENGTH) {
        setTimeout(() => submitPin(next), 350);
      }
      return next;
    });
  };

  const handleNext = () => {
    if (stage.kind === 'password-first' || stage.kind === 'password-confirm') {
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

  // 패턴을 그리고 손을 떼면 여기로 들어오는데, 바로 다음 단계로 넘기지 않고
  // 화면에 그린 패턴을 남겨둔 채 "다음"을 눌러야 확정되도록 보류만 해둔다.
  const handlePatternComplete = (path: number[]) => {
    if (path.length < 4) {
      showToast('4개 이상의 점을 연결해주세요.');
      return;
    }
    setDrawnPattern(serializePattern(path));
  };

  const confirmPattern = () => {
    if (!drawnPattern) return;
    if (stage.kind === 'pattern-first') {
      setStage({ kind: 'pattern-confirm', first: drawnPattern });
      setDrawnPattern(null);
      setPatternResetKey((k) => k + 1);
    } else if (stage.kind === 'pattern-confirm') {
      if (drawnPattern === stage.first) {
        setLockMethod('pattern', drawnPattern);
        setStage({ kind: 'idle' });
        setDrawnPattern(null);
        showToast('잠금 설정이 완료되었습니다.');
      } else {
        setError(true);
        setDrawnPattern(null);
        setPatternResetKey((k) => k + 1);
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
    setDrawnPattern(null);
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

    // KeyboardAvoidingView는 이 화면에서 실제로 아무 효과가 없는 것으로 확인돼
    // (컨테이너 높이를 줄여주지 않음), 대신 keyboardDidShow/Hide로 받은 실제
    // 키보드 높이(keyboardHeight)만큼 paddingBottom을 직접 줘서 취소/다음 버튼을
    // 포함한 전체 내용이 키보드 위로 밀려 올라오게 한다. 헤더/입력창처럼 넘칠 수
    // 있는 내용만 ScrollView로 감싸 필요할 때만 스크롤되게 한다.
    return (
      <View style={{ flex: 1, backgroundColor: colors.cardWhite, paddingBottom: keyboardHeight }}>
        <View style={styles.setupScrollArea}>
          <ScrollView
            contentContainerStyle={styles.setupScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.setupHeader}>
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
                {error
                  ? '다시 시도해주세요'
                  : isPin
                    ? `숫자 PIN ${PIN_MAX_LENGTH}자리를 입력해주세요`
                    : isPassword
                      ? `영문+숫자 조합으로 4~${PASSWORD_MAX_LENGTH}자 입력해주세요`
                      : '패턴을 그려주세요'}
              </Text>
            </View>

            <View style={styles.setupBottomGroup}>
              {isPin && (
                <>
                  {/* 실제 잠금 해제 화면과 똑같은 키패드로 연습하게 해서, 설정할 때 본
                      화면과 실제로 잠금을 풀 때 화면이 달라 보이지 않게 한다. */}
                  <PinPad
                    colors={colors}
                    value={inputText}
                    length={PIN_MAX_LENGTH}
                    error={error}
                    onKeyPress={handlePinKeyPress}
                    bottomLeftSlot={
                      <Pressable onPress={cancelSetup} hitSlop={12}>
                        <Text style={[styles.setupCancelText, { color: colors.textSecondary }]}>취소</Text>
                      </Pressable>
                    }
                  />
                  {inputText.length > 0 && !error && stage.kind.includes('first') && (
                    <Text style={[styles.strengthText, { color: strengthColor }]}>
                      {getStrengthLabel(strength!)}
                    </Text>
                  )}
                </>
              )}

              {isPassword && (
                <>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={[
                        styles.input,
                        { borderColor: error ? colors.tomorrowRed : colors.border, color: colors.textPrimary }
                      ]}
                      value={inputText}
                      onChangeText={(text) => setInputText(stripInvalidCharacters(text))}
                      secureTextEntry={!secureVisible}
                      placeholder="비밀번호 입력"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="default"
                      maxLength={PASSWORD_MAX_LENGTH}
                      autoFocus
                    />
                    <Pressable
                      onPress={() => setSecureVisible((v) => !v)}
                      hitSlop={10}
                      style={styles.eyeButton}
                    >
                      <MaterialCommunityIcons
                        name={secureVisible ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  </View>
                  <Text style={[styles.charCountText, { color: colors.textSecondary }]}>
                    {inputText.length} / {PASSWORD_MAX_LENGTH}
                  </Text>
                  {inputText.length > 0 && !error && stage.kind.includes('first') && (
                    <Text style={[styles.strengthText, { color: strengthColor }]}>
                      {getStrengthLabel(strength!)}
                    </Text>
                  )}
                </>
              )}

              {isPattern && (
                <View style={styles.patternPanel}>
                  <PatternGrid
                    key={patternResetKey}
                    colors={{...colors, accent: error ? colors.tomorrowRed : colors.accent}}
                    showTrail
                    keepTrailAfterComplete
                    onComplete={handlePatternComplete}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* PIN 화면은 취소를 숫자 0 옆(bottomLeftSlot)에 넣어서 실제 잠금 해제
            화면과 같은 위치가 되므로, 이 하단 버튼 행 자체가 필요 없다. ScrollView
            밖에 둬서 키보드가 떠도 항상 화면 하단에 고정으로 보인다. */}
        {!isPin && (
          <View style={styles.setupFooterRow}>
            <Pressable onPress={cancelSetup} hitSlop={12}>
              <Text style={[styles.setupCancelText, { color: colors.textSecondary }]}>취소</Text>
            </Pressable>
            <View style={styles.setupFooterRight}>
              {isPattern && (
                <Pressable
                  style={styles.retryBtn}
                  onPress={() => {
                    setStage({ kind: 'pattern-first' });
                    setDrawnPattern(null);
                    setPatternResetKey((k) => k + 1);
                    showToast('첫 번째 단계부터 다시 그려주세요.');
                  }}
                >
                  <MaterialCommunityIcons name="refresh" size={14} color={colors.green500} />
                  <Text style={styles.retryBtnText}>다시 그리기</Text>
                </Pressable>
              )}
              {isPattern && (
                <Pressable
                  style={[styles.nextBtn, !drawnPattern && styles.nextBtnDisabled]}
                  onPress={confirmPattern}
                  disabled={!drawnPattern}
                >
                  <Text style={styles.nextBtnText}>{stage.kind.includes('first') ? '다음' : '완료'}</Text>
                </Pressable>
              )}
              {isPassword && (
                <Pressable style={styles.nextBtn} onPress={handleNext}>
                  <Text style={styles.nextBtnText}>{stage.kind.includes('first') ? '다음' : '완료'}</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screenBg}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: colors.skyBackground },
          headerShadowVisible: false,
          // 설정 화면(PIN/비밀번호/패턴 입력) 안에서는 그 화면 자체에 "새로운 잠금
          // 설정" 등 제목이 이미 있어서, 상단 네비게이션 타이틀까지 "잠금화면
          // 설정"으로 겹쳐 보일 필요가 없다 — 목록 화면일 때만 보여준다.
          title: stage.kind === 'idle' ? '잠금화면 설정' : '',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBackButton}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {stage.kind !== 'idle' ? (
          renderSetupUI()
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.card, { backgroundColor: colors.cardWhite }]}>
              {LOCK_OPTIONS.map((option, idx) => {
                const isSelected = option.id === method;
                const unselectedColors = OPTION_BADGE_COLORS[option.id];
                return (
                  <View key={option.id}>
                    <Pressable
                      style={[styles.row, isSelected && { backgroundColor: colors.lightBlueBg }]}
                      onPress={() => startSetup(option.id)}
                    >
                      <View
                        style={[
                          styles.rowIconBadge,
                          isSelected
                            ? { backgroundColor: colors.accent }
                            : { backgroundColor: unselectedColors.bg(colors) },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={option.icon}
                          size={19}
                          color={isSelected ? '#FFFFFF' : unselectedColors.fg(colors)}
                        />
                      </View>
                      <View style={styles.rowInfo}>
                        <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{option.title}</Text>
                        {option.description ? (
                          <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{option.description}</Text>
                        ) : null}
                      </View>
                      <View style={[styles.radioOuter, { borderColor: isSelected ? colors.accent : colors.border, backgroundColor: isSelected ? colors.accent : 'transparent' }]}>
                        {isSelected && <MaterialCommunityIcons name="check" size={13} color="#FFFFFF" />}
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

            <View style={[styles.warningBox, { backgroundColor: colors.tomorrowRedBg }]}>
              <View style={[styles.warningIconBadge, { backgroundColor: colors.tomorrowRed }]}>
                <MaterialCommunityIcons name="alert" size={15} color="#FFFFFF" />
              </View>
              <View style={styles.warningTextBlock}>
                <Text style={[styles.warningTitle, { color: colors.tomorrowRed }]}>주의사항</Text>
                <Text style={[styles.warningText, { color: colors.textPrimary }]}>
                  잠금 정보를 잊어버린 경우 앱을 재설치해야 하며, 이 경우 기존 데이터는 모두 삭제되니 주의해주세요.
                </Text>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    screenBg: { flex: 1, backgroundColor: colors.skyBackground },
    headerBackButton: { paddingHorizontal: 4 },
    safeArea: { flex: 1 },
    content: { padding: 20 },
    // 취소/다음 버튼(setupFooterRow)은 이 ScrollView 밖에 별도 고정 영역으로
    // 렌더링된다 — 헤더/입력창처럼 넘칠 수 있는 내용만 여기서 스크롤되고,
    // 버튼은 항상 화면(키보드 위, paddingBottom:keyboardHeight로 밀어냄) 맨 아래에 보인다.
    setupScrollArea: { flex: 1 },
    setupScrollContent: { paddingHorizontal: 28, paddingTop: 32, flexGrow: 1 },
    setupHeader: { alignItems: 'center' },
    setupBottomGroup: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
    setupFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 28,
      paddingTop: 16,
      paddingBottom: 28,
    },
    setupFooterRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    setupCancelText: { fontSize: 15.5, fontWeight: '700' },
    card: {
      borderRadius: 20,
      ...SHADOW,
      overflow: 'hidden',
    },
    cardTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
    cardSubtitle: { fontSize: 14, textAlign: 'center' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 16,
    },
    rowIconBadge: {
      width: 38,
      height: 38,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
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
    rowTitle: { fontSize: 15.5, fontWeight: '700' },
    rowDesc: { fontSize: 12, marginTop: 2 },
    divider: { height: 1, marginHorizontal: 20 },
    inputWrap: { position: 'relative', justifyContent: 'center', marginBottom: 6 },
    charCountText: { alignSelf: 'flex-end', fontSize: 11, fontWeight: '600', marginBottom: 8 },
    input: {
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
    strengthText: {
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 20,
    },
    patternPanel: {
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginVertical: 20,
    },
    nextBtn: {
      paddingVertical: 12,
      paddingHorizontal: 26,
      borderRadius: 999,
      backgroundColor: colors.gray900,
      alignItems: 'center',
    },
    nextBtnDisabled: { opacity: 0.35 },
    nextBtnText: { fontSize: 14.5, fontWeight: '700', color: colors.cardWhite },
    retryBtn: {
      flexDirection: 'row',
      gap: 5,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: colors.green50,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.green500,
    },
    retryBtnText: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.green500,
    },
    warningBox: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
      marginTop: 24,
      padding: 16,
      borderRadius: 20,
    },
    warningIconBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    warningTextBlock: { flex: 1 },
    warningTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 4,
    },
    warningText: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '500',
    },
  });
}
