import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import TermsAccordion from '../components/onboarding/TermsAccordion';
import { COLORS, SHADOW } from '../constants/theme';

/**
 * Mock verification (real telecom SDK integration is deferred to a future contract).
 * "인증번호 요청" generates a fresh random code and displays it on-screen — the user
 * reads it and types it into the 인증번호 field themselves, same as they would with a
 * real SMS. Entering "000000" is reserved to demo the failure state on purpose.
 */
const FAILURE_CODE = '000000';
/** 인증번호 유효 시간(초). 만료되면 재요청해야 새 코드/타이머가 발급된다. */
const CODE_VALID_SECONDS = 180;

function generateFakeCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const CARRIERS = ['SKT', 'KT', 'LG U+', '알뜰폰'];

export default function VerifyPhoneScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [carrier, setCarrier] = useState<string | null>(null);
  const [formError, setFormError] = useState(false);

  const [codeRequested, setCodeRequested] = useState(false);
  const [issuedCode, setIssuedCode] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [verified, setVerified] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [termsAgreed, setTermsAgreed] = useState(false);

  const expired = codeRequested && secondsLeft === 0;

  // Ticks the 3-minute countdown down every second while a code is outstanding.
  // Keyed on issuedCode so requesting/re-requesting a code cleanly restarts it.
  useEffect(() => {
    if (!codeRequested) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [codeRequested, issuedCode]);

  const handleRequestCode = () => {
    if (!name.trim() || !phone.trim() || !carrier) {
      setFormError(true);
      return;
    }
    setFormError(false);
    setCodeRequested(true);
    setVerified(false);
    setCode('');
    setCodeError(false);
    setIssuedCode(generateFakeCode());
    setSecondsLeft(CODE_VALID_SECONDS);
  };

  const handleVerifyCode = () => {
    if (expired) {
      setCodeError(true);
      setVerified(false);
      return;
    }
    if (!code.trim()) {
      setCodeError(true);
      setVerified(false);
      return;
    }
    if (code.trim() === FAILURE_CODE || code.trim() !== issuedCode) {
      setCodeError(true);
      setVerified(false);
      return;
    }
    setCodeError(false);
    setVerified(true);
  };

  const nameInvalid = formError && !name.trim();
  const phoneInvalid = formError && !phone.trim();
  const carrierInvalid = formError && !carrier;

  const canComplete = verified && termsAgreed;

  const handleComplete = () => {
    if (!canComplete) return;
    router.push('/onboarding-child-setup');
  };

  return (
    <OnboardingBackground>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>본인인증</Text>
        <Text style={styles.subtitle}>안전한 서비스 이용을 위해 본인 확인이 필요해요</Text>

        <View style={styles.card}>
          <Text style={styles.label}>이름</Text>
          <TextInput
            style={[styles.input, nameInvalid && styles.inputInvalid]}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setFormError(false);
            }}
            placeholder="이름을 입력해주세요"
            placeholderTextColor={COLORS.textSecondary}
          />
          {nameInvalid ? <Text style={styles.errorText}>이름을 입력해주세요</Text> : null}

          <Text style={styles.label}>통신사</Text>
          <View style={[styles.carrierRow, carrierInvalid && styles.carrierRowInvalid]}>
            {CARRIERS.map((c) => (
              <Pressable
                key={c}
                style={[styles.carrierChip, carrier === c && styles.carrierChipSelected]}
                onPress={() => {
                  setCarrier(c);
                  setFormError(false);
                }}
              >
                <Text
                  style={[
                    styles.carrierChipText,
                    carrier === c && styles.carrierChipTextSelected,
                  ]}
                >
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>
          {carrierInvalid ? <Text style={styles.errorText}>통신사를 선택해주세요</Text> : null}

          <Text style={styles.label}>전화번호</Text>
          <TextInput
            style={[styles.input, phoneInvalid && styles.inputInvalid]}
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              setFormError(false);
            }}
            placeholder="010-0000-0000"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="phone-pad"
          />
          {phoneInvalid ? <Text style={styles.errorText}>전화번호를 입력해주세요</Text> : null}

          <Pressable style={styles.requestButton} onPress={handleRequestCode}>
            <Text style={styles.requestButtonText}>
              {codeRequested ? '인증번호 재요청' : '인증번호 요청'}
            </Text>
          </Pressable>

          {codeRequested ? (
            <>
              <Text style={styles.successText}>📩 {carrier} 번호로 인증번호가 발송됐어요</Text>
              <View style={styles.codeAnnounceBox}>
                <Text style={styles.codeAnnounceLabel}>발급된 인증번호</Text>
                <Text style={styles.codeAnnounceValue}>{issuedCode}</Text>
                <Text style={styles.codeAnnounceHint}>
                  실제 서비스에서는 문자로 오는 번호예요. 아래 칸에 직접 입력해주세요
                </Text>
              </View>
              <Text style={styles.hint}>
                테스트용 안내: 000000을 입력하면 인증 실패 상황을 볼 수 있어요
              </Text>
              <View style={styles.codeLabelRow}>
                <Text style={[styles.label, styles.codeLabelInRow]}>인증번호</Text>
                <Text style={[styles.timerText, expired && styles.timerTextExpired]}>
                  {expired ? '만료됨' : formatCountdown(secondsLeft)}
                </Text>
              </View>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={(t) => {
                  setCode(t);
                  setCodeError(false);
                }}
                placeholder="6자리 숫자"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                editable={!expired}
              />
              {expired ? (
                <Text style={styles.errorText}>
                  인증번호 유효 시간이 지났어요. 다시 요청해주세요
                </Text>
              ) : codeError ? (
                <Text style={styles.errorText}>인증번호가 일치하지 않아요. 다시 확인해주세요</Text>
              ) : null}
              {verified ? <Text style={styles.successText}>✓ 인증이 완료됐어요</Text> : null}

              <Pressable
                style={[styles.verifyButton, expired && styles.verifyButtonDisabled]}
                onPress={handleVerifyCode}
                disabled={expired}
              >
                <Text style={styles.verifyButtonText}>인증번호 확인</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        <TermsAccordion onChangeAllAgreed={setTermsAgreed} />

        <Pressable
          style={[styles.completeButton, !canComplete && styles.completeButtonDisabled]}
          onPress={handleComplete}
          disabled={!canComplete}
        >
          <Text style={styles.completeButtonText}>완료</Text>
        </Pressable>
      </ScrollView>
    </OnboardingBackground>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  card: {
    backgroundColor: COLORS.creamBeigeCard,
    borderRadius: 18,
    padding: 20,
    ...SHADOW,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 14,
  },
  codeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeLabelInRow: {
    marginBottom: 6,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.coralPink,
  },
  timerTextExpired: {
    color: COLORS.tomorrowRed,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputInvalid: {
    borderColor: COLORS.tomorrowRed,
  },
  carrierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderRadius: 12,
  },
  carrierRowInvalid: {
    borderWidth: 1.5,
    borderColor: COLORS.tomorrowRed,
    padding: 6,
    margin: -6,
  },
  carrierChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  carrierChipSelected: {
    backgroundColor: COLORS.coralPink,
    borderColor: COLORS.coralPink,
  },
  carrierChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  carrierChipTextSelected: {
    color: '#FFFFFF',
  },
  errorText: {
    color: COLORS.tomorrowRed,
    fontSize: 12,
    marginTop: 8,
  },
  successText: {
    color: '#3A8455',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  hint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 14,
  },
  codeAnnounceBox: {
    backgroundColor: '#FFF3E9',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  codeAnnounceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  codeAnnounceValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 4,
    color: COLORS.coralPink,
    marginTop: 4,
  },
  codeAnnounceHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  requestButton: {
    marginTop: 18,
    backgroundColor: COLORS.peachOrange,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  requestButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  verifyButton: {
    marginTop: 14,
    backgroundColor: COLORS.coralPink,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    opacity: 0.4,
  },
  verifyButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  completeButton: {
    marginTop: 24,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.4,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
