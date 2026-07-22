import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';

interface AdPopupModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AdPopupModal({ visible, onClose }: AdPopupModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.adArea}>
            <Text style={styles.adIcon}>🎁</Text>
            <Text style={styles.adTitle}>오늘의 육아템 추천</Text>
            <Text style={styles.adSubtitle}>광고 영역이에요 (자리 표시자)</Text>
          </View>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(20, 24, 22, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.cardWhite,
      borderRadius: 20,
      padding: 20,
      ...SHADOW,
    },
    adArea: {
      backgroundColor: '#F5F8FA',
      borderRadius: 16,
      paddingVertical: 36,
      alignItems: 'center',
      marginBottom: 16,
    },
    adIcon: { fontSize: 40, marginBottom: 10 },
    adTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    adSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    closeButton: {
      backgroundColor: colors.textPrimary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    closeButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  });
}
