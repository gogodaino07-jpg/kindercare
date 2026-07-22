import React, { useMemo, useState } from 'react';
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
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';

interface JoinCodeModalProps {
  visible: boolean;
  onClose: () => void;
  onJoin: (code: string) => void;
}

export default function JoinCodeModal({ visible, onClose, onJoin }: JoinCodeModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.card}>
          <Text style={styles.icon}>🔑</Text>
          <Text style={styles.title}>초대 코드로 참여</Text>
          <Text style={styles.subtitle}>가족에게 받은 코드를 입력해주세요</Text>

          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={code}
            onChangeText={(t) => {
              setCode(t);
              setError(false);
            }}
            placeholder="초대 코드를 입력해주세요"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
            autoFocus
          />
          {error ? <Text style={styles.errorText}>올바른 초대 코드를 입력해 주세요</Text> : null}

          <Pressable
            style={[styles.joinButton, !code.trim() && styles.joinButtonDisabled]}
            onPress={handleJoin}
            disabled={!code.trim()}
          >
            <Text style={styles.joinButtonText}>참여하기</Text>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.creamBeigeCard,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      ...SHADOW,
    },
    icon: { fontSize: 32, marginBottom: 8 },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
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
      color: colors.textPrimary,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    inputError: {
      borderColor: colors.tomorrowRed,
    },
    errorText: {
      alignSelf: 'flex-start',
      color: colors.tomorrowRed,
      fontSize: 12,
      marginTop: 6,
    },
    joinButton: {
      width: '100%',
      marginTop: 16,
      backgroundColor: colors.peachOrange,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    joinButtonDisabled: {
      opacity: 0.4,
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
      color: colors.textSecondary,
      fontWeight: '600',
    },
  });
}
