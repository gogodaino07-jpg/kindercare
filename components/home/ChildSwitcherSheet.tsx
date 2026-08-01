import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { AppState, Image, Modal, Pressable, StyleSheet, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
const DROPDOWN_HIDE_OFFSET = -600; // Starting position (above the screen)
const HEADER_HEIGHT_ESTIMATE = 60; // Estimated height of HomeHeader

export default function ChildSwitcherSheet({ visible, onClose }: ChildSwitcherSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { children, selectedChild, selectChild, deleteChild } = useAppData();
  const { showAlert } = useAlert();
  const { isLocked } = useAppLock();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const [editMode, setEditMode] = useState(false);

  // Initial hidden position is above the clipping boundary
  const translateY = useSharedValue(-600);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
    } else {
      translateY.value = -600;
    }
  }, [visible, translateY]);

  const handleClose = () => {
    translateY.value = withTiming(-600, { duration: 250 }, () => {
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
      // Swiping up to close
      if (nextY < 20) {
        translateY.value = nextY;
      }
    })
    .onEnd((event) => {
      if (event.velocityY < -500 || event.translationY < -100) {
        handleClose();
      } else {
        translateY.value = withTiming(0, { duration: 250 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [-400, 0],
      [0, 1],
      'clamp'
    );
    return { opacity };
  });

  // Never let this sheet render on top of/behind the lock screen
  useEffect(() => {
    if (isLocked && visible) onClose();
  }, [isLocked, visible, onClose]);

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
  }, [visible]);

  const mainChildId = children[0]?.id;

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
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlayContainer}>
        {/* Header area tap to close */}
        <Pressable
          style={styles.headerAreaClose}
          onPress={handleClose}
          accessibilityLabel="헤더 영역 클릭하여 닫기"
        />
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={{ flex: 1 }} onPress={handleClose} />
        </Animated.View>

        <View style={styles.clippingContainer} pointerEvents="box-none">
          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.sheet, animatedStyle]}>
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
              <View style={styles.bottomHandle} />
            </Animated.View>
          </GestureDetector>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, topInset: number) {
  const HEADER_OFFSET = topInset + 60; // Start point exactly below the HomeHeader

  return StyleSheet.create({
    overlayContainer: {
      flex: 1,
      justifyContent: 'flex-start',
    },
    headerAreaClose: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: HEADER_OFFSET,
      zIndex: 10,
    },
    overlay: {
      position: 'absolute',
      top: HEADER_OFFSET,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(20, 24, 22, 0.45)',
    },
    clippingContainer: {
      marginTop: HEADER_OFFSET,
      overflow: 'hidden', // Clips the menu so it unrolls from the header line
      paddingBottom: 20, // Buffer for shadows
    },
    sheet: {
      backgroundColor: colors.skyBackground,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      padding: 22,
      paddingTop: 16,
      paddingBottom: 16,
      ...SHADOW,
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
    bottomHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.gray100,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 16,
    },
  });
}

