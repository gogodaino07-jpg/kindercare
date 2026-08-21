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

  useEffect(() => {
    if (visible) {
      // Use a small delay to ensure the modal animation and focus system are ready.
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleClose = () => {
    setCode('');
    setError(false);
    onClose();
  };

  const isValidFormat = (value: string) => /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(value);

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: -100 })}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.cardShadow}>
          <View style={styles.card}>
            <Text style={styles.icon}>🔑</Text>
            <Text style={styles.title}>초대 코드로 참여</Text>
            <Text style={styles.subtitle}>가족에게 받은 코드를 입력해주세요</Text>

            <TextInput
              ref={inputRef}
              style={[styles.input, error && styles.inputError]}
              value={code}
              onChangeText={(t) => {
                setCode(t);
                setError(false);
              }}
              placeholder="초대 코드를 입력해주세요"
              placeholderTextColor={GRAY}
              autoCapitalize="characters"
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
    </Modal>
  );
}

const styles = StyleSheet.create({
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
