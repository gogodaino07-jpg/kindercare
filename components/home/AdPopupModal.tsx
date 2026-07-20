import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, SHADOW } from '../../constants/theme';

interface AdPopupModalProps {
  visible: boolean;
  onClose: (dismissForToday: boolean) => void;
}

export default function AdPopupModal({ visible, onClose }: AdPopupModalProps) {
  const [dontShowToday, setDontShowToday] = useState(false);

  return (
    <Modal visible={visible} transparent onRequestClose={() => onClose(dontShowToday)}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.adArea}>
            <Text style={styles.adIcon}>🎁</Text>
            <Text style={styles.adTitle}>오늘의 육아템 추천</Text>
            <Text style={styles.adSubtitle}>광고 영역이에요 (자리 표시자)</Text>
          </View>

          <Pressable
            style={styles.checkboxRow}
            onPress={() => setDontShowToday((prev) => !prev)}
          >
            <View style={[styles.checkbox, dontShowToday && styles.checkboxChecked]}>
              {dontShowToday ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxLabel}>오늘 다시 보지 않기</Text>
          </Pressable>

          <Pressable style={styles.closeButton} onPress={() => onClose(dontShowToday)}>
            <Text style={styles.closeButtonText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.cardWhite,
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
  adTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  adSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  checkboxMark: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  checkboxLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  closeButton: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
