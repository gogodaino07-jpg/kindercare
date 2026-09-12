import React, { useMemo } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { Child } from '../../types/models';
import Text from '../common/AppText';

interface ScanChildPickerModalProps {
  visible: boolean;
  children: Child[];
  onSelect: (childId: string) => void;
  onClose: () => void;
}

/**
 * AI 스캔/급식 스캔 버튼을 누르면 "지금 선택된 아이" 기준으로 바로 스캔 화면에
 * 들어가버려서, 아이가 2명 이상인데 다른 아이 걸 스캔하려던 경우 실수로 엉뚱한
 * 아이 앞으로 등록될 수 있었다. 그래서 아이가 2명 이상일 때만(호출부에서 조건
 * 확인) 스캔 화면으로 넘어가기 전에 이 작은 팝업으로 대상 아이를 먼저 고르게 한다.
 */
export default function ScanChildPickerModal({
  visible,
  children: kids,
  onSelect,
  onClose,
}: ScanChildPickerModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>누구 준비물을 스캔할까요?</Text>
          <View style={styles.list}>
            {kids.map((child) => {
              const label = child.givenName?.trim() || child.name || '아이';
              return (
                <Pressable key={child.id} style={styles.row} onPress={() => onSelect(child.id)}>
                  {child.photoUri ? (
                    <Image source={{ uri: child.photoUri }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarEmoji}>{child.avatarEmoji ?? '🧒'}</Text>
                    </View>
                  )}
                  <Text style={styles.rowLabel}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.cardWhite,
      borderRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 14,
      ...SHADOW,
      shadowOpacity: 0.18,
      shadowRadius: 24,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.gray900,
      textAlign: 'center',
      marginBottom: 16,
    },
    list: {},
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.gray50,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
    },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.purpleBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEmoji: { fontSize: 20 },
    rowLabel: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
  });
}
