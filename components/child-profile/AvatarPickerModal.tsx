import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';

export interface AvatarOption {
  id: string;
  emoji: string;
  label: string;
  bg: string;
}

interface AvatarPickerModalProps {
  visible: boolean;
  avatars: AvatarOption[];
  selectedId: string;
  onSelect: (avatar: AvatarOption) => void;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onClose: () => void;
}

export default function AvatarPickerModal({
  visible,
  avatars,
  selectedId,
  onSelect,
  onPickCamera,
  onPickGallery,
  onClose,
}: AvatarPickerModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Feather name="smile" size={18} color={colors.purple500} />
              <Text style={styles.title}>프로필 사진 설정</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="닫기">
              <Feather name="x" size={18} color={colors.gray500} />
            </Pressable>
          </View>

          <Text style={styles.hint}>귀여운 기본 캐릭터를 골라보세요</Text>
          <View style={styles.grid}>
            {avatars.map((avatar) => {
              const isSelected = avatar.id === selectedId;
              return (
                <Pressable
                  key={avatar.id}
                  onPress={() => onSelect(avatar)}
                  style={[
                    styles.avatarCell,
                    { backgroundColor: avatar.bg },
                    isSelected && styles.avatarCellSelected,
                  ]}
                >
                  <Text style={styles.avatarCellEmoji}>{avatar.emoji}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.uploadButton} onPress={onPickGallery}>
            <Feather name="upload" size={16} color={colors.purple500} />
            <Text style={styles.uploadButtonText}>내 앨범에서 사진 직접 올리기</Text>
          </Pressable>
          <Pressable style={styles.cameraButton} onPress={onPickCamera}>
            <Feather name="camera" size={16} color={colors.textSecondary} />
            <Text style={styles.cameraButtonText}>카메라로 촬영</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 18, 17, 0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.cardWhite,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 32,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    hint: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 14,
      marginBottom: 10,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    avatarCell: {
      width: 60,
      height: 60,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    avatarCellSelected: {
      borderColor: colors.purple500,
    },
    avatarCellEmoji: {
      fontSize: 26,
    },
    uploadButton: {
      marginTop: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.purple500,
      backgroundColor: colors.purpleBg,
    },
    uploadButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.purple500,
    },
    cameraButton: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.gray50,
    },
    cameraButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
  });
}
