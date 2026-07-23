import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import Text from '../common/AppText';

interface IdentityVerifyModalProps {
  visible: boolean;
  onClose: () => void;
  onVerified: () => void;
}

/**
 * Mock SMS-based identity verification used to let a locked-out user reset
 * their forgotten password/pattern (real telecom SDK integration is deferred
 * to a future contract) — same simulated-code convention as verify-phone.tsx:
 * a fresh code is generated and shown on-screen instead of actually texted.
 */
const FAILURE_CODE = '000000';
const CODE_VALID_SECONDS = 180;

function generateFakeCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function IdentityVerifyModal({
  visible,
  onClose,
  onVerified,
}: IdentityVerifyModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [issuedCode, setIssuedCode] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CODE_VALID_SECONDS);

  const expired = secondsLeft === 0;

  // A fresh code + timer starts the instant the popup opens.
  useEffect(() => {
    if (!visible) return;
    setIssuedCode(generateFakeCode());
    setCode('');
    setCodeError(false);
    setSecondsLeft(CODE_VALID_SECONDS);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [visible, issuedCode]);

  const handleResend = () => {
    setIssuedCode(generateFakeCode());
    setCode('');
    setCodeError(false);
    setSecondsLeft(CODE_VALID_SECONDS);
  };

  const handleVerify = () => {
    if (expired || !code.trim() || code.trim() === FAILURE_CODE || code.trim() !== issuedCode) {
      setCodeError(true);
      return;
    }
    setCodeError(false);
    onVerified();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>본인인증</Text>
          <Text style={styles.subtitle}>휴대폰 인증으로 잠금을 재설정할 수 있어요</Text>

          <View style={styles.codeAnnounceBox}>
            <Text style={styles.codeAnnounceLabel}>발급된 인증번호</Text>
            <Text style={styles.codeAnnounceValue}>{issuedCode}</Text>
            <Text style={styles.codeAnnounceHint}>
              실제 서비스에서는 문자로 오는 번호예요. 아래 칸에 입력해주세요
            </Text>
          </View>

          <View style={styles.codeLabelRow}>
            <Text style={styles.label}>인증번호</Text>
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
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            editable={!expired}
            autoFocus
          />
          {expired ? (
            <Pressable style={styles.resendButton} onPress={handleResend}>
              <Text style={styles.resendButtonText}>인증번호 재발송</Text>
            </Pressable>
          ) : codeError ? (
            <Text style={styles.errorText}>인증번호가 일치하지 않아요. 다시 확인해주세요</Text>
          ) : null}

          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <Pressable
              style={[styles.verifyButton, expired && styles.verifyButtonDisabled]}
              onPress={handleVerify}
              disabled={expired}
            >
              <Text style={styles.verifyButtonText}>인증 확인</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(30, 41, 59, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.cardWhite,
      borderRadius: 22,
      padding: 22,
      ...SHADOW,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 18,
    },
    codeAnnounceBox: {
      backgroundColor: '#FFF3E9',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginBottom: 16,
    },
    codeAnnounceLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    codeAnnounceValue: {
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: 4,
      color: colors.coralPink,
      marginTop: 4,
    },
    codeAnnounceHint: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 6,
      textAlign: 'center',
    },
    codeLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    timerText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.coralPink,
    },
    timerTextExpired: {
      color: colors.tomorrowRed,
    },
    input: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    errorText: {
      color: colors.tomorrowRed,
      fontSize: 12,
      marginTop: 8,
    },
    resendButton: {
      marginTop: 10,
      alignSelf: 'center',
    },
    resendButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: '#F1F3F5',
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#495057',
    },
    verifyButton: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: '#4A90E2',
    },
    verifyButtonDisabled: {
      opacity: 0.4,
    },
    verifyButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}
