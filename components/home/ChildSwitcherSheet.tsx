import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { AppState, Image, Modal, Pressable, StyleSheet, View, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ChildSwitcherSheet({ visible, onClose }: ChildSwitcherSheetProps) {
  const router = useRouter();
  const { children, selectedChild, selectChild, deleteChild } = useAppData();
  const { showAlert } = useAlert();
  const { isLocked } = useAppLock();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [editMode, setEditMode] = useState(false);

  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
    } else {
      translateY.value = SCREEN_HEIGHT;
    }
  }, [visible, translateY]);

  const handleClose = () => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
      runOnJS(onClose)();
    });
  };

  const context = useSharedValue({ startY: 0 });

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { startY: translateY.value };
    })
    .onUpdate((event) => {
      const nextY = context.value.startY + event.translationY;
      if (nextY > 0) {
        translateY.value = nextY;
      }
    })
    .onEnd((event) => {
      if (event.velocityY > 500 || event.translationY > 150) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, SCREEN_HEIGHT * 0.5],
      [1, 0],
      'clamp'
    );
    return { opacity };
  });

  // Never let this sheet render on top of/behind the lock screen — the app
  // may background/lock while it's open (e.g. gallery picker inside the
  // child-profile edit flow reopens this sheet's parent screen).
  useEffect(() => {
    if (isLocked && visible) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked]);

  useEffect(() => {
    if (!visible) setEditMode(false);
  }, [visible]);

  // Never leave this sheet open behind the app when the user switches away.
  useEffect(() => {
    if (!visible) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') handleClose();
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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
    <Modal
      visible={visible}
      transparent
      onRequestClose={handleClose}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlayContainer}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={{ flex: 1 }} onPress={handleClose} />
        </Animated.View>

        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.sheet, animatedStyle]}>
            <View style={styles.dragHandle} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>아이 전환·관리</Text>
              <View style={styles.headerActions}>
                <Pressable onPress={() => setEditMode((prev) => !prev)} hitSlop={8}>
                  <Text style={styles.headerActionText}>{editMode ? '완료' : '편집'}</Text>
                </Pressable>
                <Pressable onPress={handleClose} accessibilityLabel="닫기" hitSlop={8}>
                  <Text style={styles.closeIcon}>✕</Text>
                </Pressable>
              </View>
            </View>
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
                      if (editMode) return;
                      selectChild(child.id);
                      handleClose();
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
                    {!editMode ? (
                      <View style={styles.checkSlot}>
                        {isSelected ? <Text style={styles.checkIcon}>✓</Text> : null}
                      </View>
                    ) : null}
                  </Pressable>
                  {editMode ? (
                    <View style={styles.pillActions}>
                      <Pressable
                        style={styles.pillButton}
                        onPress={() => {
                          handleClose();
                          router.push({ pathname: '/child-profile', params: { childId: child.id } });
                        }}
                        accessibilityLabel="프로필 수정"
                      >
                        <Text style={styles.pillButtonText}>수정</Text>
                      </Pressable>
                      {isMainChild ? null : (
                        <Pressable
                          style={[styles.pillButton, styles.pillButtonDestructive]}
                          onPress={() => handleDelete(child.id, label)}
                          accessibilityLabel="프로필 삭제"
                        >
                          <Text style={styles.pillButtonDestructiveText}>삭제</Text>
                        </Pressable>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}
            <Pressable
              style={styles.addButton}
              onPress={() => {
                handleClose();
                router.push('/child-profile');
              }}
            >
              <Text style={styles.addButtonText}>+ 아이 추가</Text>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlayContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(20, 24, 22, 0.45)',
    },
    sheet: {
      backgroundColor: colors.skyBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 22,
      paddingTop: 12, // Reduced to make room for handle
      paddingBottom: 44,
    },
    dragHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.gray100,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 18,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    headerActionText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
    },
    closeIcon: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardWhite,
      borderRadius: 18,
      marginBottom: 12,
      paddingRight: 14,
      ...SHADOW,
    },
    cardSelected: {
      backgroundColor: '#E4F0FB',
    },
    cardMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      marginRight: 14,
    },
    avatarPlaceholder: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: '#EEF2F5',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    avatarIcon: {
      fontSize: 26,
    },
    cardLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    checkSlot: {
      width: 26,
      alignItems: 'center',
      marginLeft: 8,
    },
    checkIcon: {
      fontSize: 20,
      color: colors.accent,
      fontWeight: '900',
    },
    pillActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pillButton: {
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: '#EEF2F5',
    },
    pillButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    pillButtonDestructive: {
      backgroundColor: '#FDECEA',
    },
    pillButtonDestructiveText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.tomorrowRed,
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
