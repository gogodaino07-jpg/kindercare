import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useRef, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SHADOW } from '../../constants/theme';
import { STAMP_BOARD_THEMES } from '../../constants/stampBoardThemes';
import ClearableTextInput from '../common/ClearableTextInput';

interface JoinCodeModalProps {
  visible: boolean;
  onClose: () => void;
  onJoin: (code: string) => void;
}

const CTA_GRADIENT = STAMP_BOARD_THEMES.blue.stampButtonGradient;
const INK = '#1E293B';
const GRAY = '#64748B';
const BORDER = '#BAE6FD';
const ERROR_RED = '#E4574C';

export default function JoinCodeModal({ visible, onClose, onJoin }: JoinCodeModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (focusTimer.current) clearTimeout(focusTimer.current);
    };
  }, []);

  // 모달의 페이드인 애니메이션이 끝나기 전에 키보드가 같이 올라오면 두 애니메이션이
  // 겹쳐서 버벅여 보이므로, 네이티브 표시가 완전히 끝난 뒤(onShow)에만 포커스를 준다.
  const handleShow = () => {
    focusTimer.current = setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  };

  const handleClose = () => {
    setCode('');
    setError(false);
    onClose();
  };

  const isValidFormat = (value: string) => /^\d{8}$/.test(value);

  const handleJoin = () => {
    if (!isValidFormat(code.trim())) {
      setError(true);
      return;
    }
    setError(false);
    onJoin(code.trim());
    setCode('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onShow={handleShow} onRequestClose={handleClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.select({ ios: 0, android: -100 })}
          pointerEvents="box-none"
        >
          <View style={styles.cardShadow}>
            <View style={styles.card}>
              <Text style={styles.icon}>🔑</Text>
              <Text style={styles.title}>초대 코드로 참여</Text>
              <Text style={styles.subtitle}>가족에게 받은 코드를 입력해주세요</Text>

              <ClearableTextInput
                ref={inputRef}
                style={[styles.input, error && styles.inputError]}
                value={code}
                onChangeText={(t) => {
                  setCode(t.replace(/\D/g, '').slice(0, 8));
                  setError(false);
                }}
                placeholder="숫자 8자리를 입력해주세요"
                placeholderTextColor={GRAY}
                keyboardType="number-pad"
                maxLength={8}
              />
              {error ? <Text style={styles.errorText}>올바른 초대 코드를 입력해 주세요</Text> : null}

              <View style={[styles.joinButtonShadow, !code.trim() && styles.joinButtonDisabled]}>
                <Pressable onPress={handleJoin} disabled={!code.trim()}>
                  <LinearGradient
                    colors={CTA_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.joinButton}
                  >
                    <Text style={styles.joinButtonText}>참여하기</Text>
                  </LinearGradient>
                </Pressable>
              </View>
              <Pressable style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20, 24, 22, 0.5)',
  },
  cardShadow: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    ...SHADOW,
    shadowOpacity: 0.08,
    elevation: 0,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2,
    borderColor: BORDER,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  icon: { fontSize: 32, marginBottom: 8 },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: INK,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: GRAY,
    marginBottom: 18,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: INK,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  inputError: {
    borderColor: ERROR_RED,
  },
  errorText: {
    alignSelf: 'flex-start',
    color: ERROR_RED,
    fontSize: 12,
    marginTop: 6,
  },
  joinButtonShadow: {
    width: '100%',
    marginTop: 16,
    borderRadius: 12,
    ...SHADOW,
    shadowOpacity: 0.16,
    elevation: 0,
  },
  joinButtonDisabled: {
    opacity: 0.4,
  },
  joinButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 6,
  },
  cancelButtonText: {
    fontSize: 13,
    color: GRAY,
    fontWeight: '600',
  },
});
