import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useAlert } from '../../context/AlertContext';
import { useAppData } from '../../context/AppDataContext';
import { useAppLock } from '../../context/AppLockContext';
import { useThemeColors } from '../../context/ThemeContext';
import Text from '../common/AppText';

interface ChildSwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function ChildSwitcherSheet({ visible, onClose }: ChildSwitcherSheetProps) {
  const router = useRouter();
  const { children, selectedChild, selectChild, deleteChild } = useAppData();
  const { showAlert } = useAlert();
  const { isLocked } = useAppLock();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Never let this sheet render on top of/behind the lock screen — the app
  // may background/lock while it's open (e.g. gallery picker inside the
  // child-profile edit flow reopens this sheet's parent screen).
  useEffect(() => {
    if (isLocked && visible) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked]);

  const mainChildId = children[0]?.id;

  // Selected child always leads the list; everyone else follows in
  // alphabetical (가나다) order. `mainChildId` above intentionally keeps
  // reading from the unsorted `children` array — deletion protection is
  // about creation order, not display order.
  const sortedChildren = useMemo(() => {
    const selected = children.filter((c) => c.id === selectedChild?.id);
    const rest = children
      .filter((c) => c.id !== selectedChild?.id)
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ko'));
    return [...selected, ...rest];
  }, [children, selectedChild]);

  const handleDelete = (childId: string, label: string) => {
    showAlert({
      title: '아이 프로필 삭제',
      message: `정말 이 아이 프로필을 삭제하시겠습니까?\n${label}`,
      buttons: [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => deleteChild(childId) },
      ],
    });
  };

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>아이 전환·관리</Text>
          {sortedChildren.map((child) => {
            const isSelected = child.id === selectedChild?.id;
            const isMainChild = child.id === mainChildId;
            const label = [child.name, `${child.age}세`, child.className]
              .filter(Boolean)
              .join(' · ');
            return (
              <View
                key={child.id}
                style={[styles.card, isSelected && styles.cardSelected]}
              >
                <Pressable
                  style={styles.cardMain}
                  onPress={() => {
                    selectChild(child.id);
                    onClose();
                  }}
                >
                  {child.photoUri ? (
                    <Image source={{ uri: child.photoUri }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarIcon}>🧒</Text>
                    </View>
                  )}
                  <Text style={styles.cardLabel}>{label}</Text>
                  <View style={styles.checkSlot}>
                    {isSelected ? <Text style={styles.checkIcon}>✓</Text> : null}
                  </View>
                </Pressable>
                <View style={styles.actionIcons}>
                  <Pressable
                    style={styles.actionIconButton}
                    onPress={() => {
                      onClose();
                      router.push({ pathname: '/child-profile', params: { childId: child.id } });
                    }}
                    accessibilityLabel="프로필 수정"
                  >
                    <Text style={styles.editIcon}>✏️</Text>
                  </Pressable>
                  {isMainChild ? (
                    <View style={styles.actionIconButton} />
                  ) : (
                    <Pressable
                      style={styles.actionIconButton}
                      onPress={() => handleDelete(child.id, label)}
                      accessibilityLabel="프로필 삭제"
                    >
                      <Text style={styles.deleteIcon}>🗑️</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
          <Pressable
            style={styles.addButton}
            onPress={() => {
              onClose();
              router.push('/child-profile');
            }}
          >
            <Text style={styles.addButtonText}>+ 아이 추가</Text>
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
      backgroundColor: 'rgba(20, 24, 22, 0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.skyBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 44,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 16,
      textAlign: 'center',
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      marginBottom: 10,
      paddingRight: 12,
      ...SHADOW,
    },
    cardSelected: {
      backgroundColor: '#E4F0FB',
    },
    cardMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: 12,
    },
    avatarPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#EEF2F5',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarIcon: {
      fontSize: 22,
    },
    cardLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    checkSlot: {
      width: 20,
      alignItems: 'center',
      marginLeft: 8,
    },
    checkIcon: {
      fontSize: 16,
      color: colors.accent,
      fontWeight: '700',
    },
    actionIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actionIconButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editIcon: {
      fontSize: 16,
    },
    deleteIcon: {
      fontSize: 16,
    },
    addButton: {
      marginTop: 14,
      marginBottom: 4,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.accent,
    },
  });
}
