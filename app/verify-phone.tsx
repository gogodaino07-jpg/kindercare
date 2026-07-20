import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import { COLORS, SHADOW } from '../constants/theme';

/** Mock verification: any code works except "000000", which is reserved to demo the failure state. */
const FAILURE_CODE = '000000';

export default function VerifyPhoneScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState(false);

  const [codeRequested, setCodeRequested] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [verified, setVerified] = useState(false);

  const [termsAgreed, setTermsAgreed] = useState(false);

  const handleRequestCode = () => {
    if (!name.trim() || !phone.trim()) {
      setFormError(true);
      return;
    }
    setFormError(false);
    setCodeRequested(true);
    setVerified(false);
    setCode('');
    setCodeError(false);
  };

  const handleVerifyCode = () => {
    if (!code.trim()) {
      setCodeError(true);
      setVerified(false);
      return;
    }
    if (code.trim() === FAILURE_CODE) {
      setCodeError(true);
      setVerified(false);
      return;
    }
    setCodeError(false);
    setVerified(true);
  };

  const canComplete = verified && termsAgreed;

  const handleComplete = () => {
    if (!canComplete) return;
    router.push('/onboarding-child-setup');
  };

  return (
    <OnboardingBackground>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>본인인증</Text>
        <Text style={styles.subtitle}>안전한 서비스 이용을 위해 본인 확인이 필요해요</Text>

        <View style={styles.card}>
          <Text style={styles.label}>이름</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="이름을 입력해주세요"
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.label}>전화번호</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="010-0000-0000"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="phone-pad"
          />

          {formError ? (
            <Text style={styles.errorText}>이름과 전화번호를 모두 입력해주세요</Text>
          ) : null}

          <Pressable style={styles.requestButton} onPress={handleRequestCode}>
            <Text style={styles.requestButtonText}>
              {codeRequested ? '인증번호 재요청' : '인증번호 요청'}
            </Text>
          </Pressable>

          {codeRequested ? (
            <>
              <Text style={styles.hint}>
                테스트용 안내: 000000을 입력하면 인증 실패 상황을 볼 수 있어요
              </Text>
              <Text style={styles.label}>인증번호</Text>
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
              />
              {codeError ? (
                <Text style={styles.errorText}>인증번호가 일치하지 않아요. 다시 확인해주세요</Text>
              ) : null}
              {verified ? <Text style={styles.successText}>✓ 인증이 완료됐어요</Text> : null}

              <Pressable style={styles.verifyButton} onPress={handleVerifyCode}>
                <Text style={styles.verifyButtonText}>인증번호 확인</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        <Pressable
          style={styles.termsRow}
          onPress={() => setTermsAgreed((prev) => !prev)}
        >
          <View style={[styles.checkbox, termsAgreed && styles.checkboxChecked]}>
            {termsAgreed ? <Text style={styles.checkboxMark}>✓</Text> : null}
          </View>
          <Text style={styles.termsText}>전체약관에 동의합니다</Text>
        </Pressable>

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
  content: { padding: 24, paddingBottom: 40 },
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
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
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
  verifyButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: COLORS.coralPink,
    borderColor: COLORS.coralPink,
  },
  checkboxMark: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  termsText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
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
