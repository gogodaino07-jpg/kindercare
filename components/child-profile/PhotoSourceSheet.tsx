import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';

interface PhotoSourceSheetProps {
  visible: boolean;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onCancel: () => void;
}

export default function PhotoSourceSheet({
  visible,
  onPickCamera,
  onPickGallery,
  onCancel,
}: PhotoSourceSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <View style={styles.sheet}>
          <Text style={styles.title}>사진 등록</Text>
          <Pressable style={styles.option} onPress={onPickCamera}>
            <Text style={styles.optionText}>카메라로 촬영</Text>
          </Pressable>
          <Pressable style={styles.option} onPress={onPickGallery}>
            <Text style={styles.optionText}>갤러리에서 선택</Text>
          </Pressable>
          <Pressable style={[styles.option, styles.cancelOption]} onPress={onCancel}>
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(20, 24, 22, 0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.cardWhite,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 32,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 12,
    },
    option: {
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: 'center',
    },
    optionText: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    cancelOption: {
      marginTop: 8,
      borderTopWidth: 0,
    },
    cancelText: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: '600',
    },
  });
}
