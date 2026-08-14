import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { AppState, Image, Modal, Pressable, StyleSheet, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { SHADOW, ThemeColors } from '../../constants/theme';
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
  const insets = useSafeAreaInsets();
  const { children, selectedChild, selectChild } = useAppData();
  const { isLocked } = useAppLock();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);

  // Initial hidden position is fully below the screen
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
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
      // Swiping down to close
      if (nextY > 0) {
        translateY.value = nextY;
      }
    })
    .onEnd((event) => {
      if (event.velocityY > 500 || event.translationY > 120) {
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
      [0, 400],
      [1, 0],
      'clamp'
    );
    return { opacity };
  });

  // Never let this sheet render on top of/behind the lock screen
  useEffect(() => {
    if (isLocked && visible) onClose();
  }, [isLocked, visible, onClose]);

  // Never leave this sheet open behind the app when the user switches away.
  useEffect(() => {
    if (!visible) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') handleClose();
    });
    return () => subscription.remove();
  }, [visible]);

  const sortedChildren = useMemo(() => {
    const selected = children.filter((c) => c.id === selectedChild?.id);
    const rest = children
      .filter((c) => c.id !== selectedChild?.id)
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ko'));
    return [...selected, ...rest];
  }, [children, selectedChild]);

  return (
    <Modal
      visible={visible}
      transparent
      onRequestClose={handleClose}
      animationType="none"
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
              <Pressable onPress={handleClose} accessibilityLabel="닫기" hitSlop={8}>
                <Text style={styles.closeIcon}>✕</Text>
              </Pressable>
            </View>

            {sortedChildren.map((child) => {
              const isSelected = child.id === selectedChild?.id;
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
                  </Pressable>
                  <Pressable
                    style={styles.editButton}
                    onPress={() => {
                      handleClose();
                      router.push({ pathname: '/child-profile', params: { childId: child.id } });
                    }}
                    accessibilityLabel="프로필 수정"
                  >
                    <Text style={styles.editButtonText}>수정</Text>
                  </Pressable>
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

function createStyles(colors: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    overlayContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(20, 24, 22, 0.45)',
    },
    sheet: {
      backgroundColor: colors.skyBackground,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 22,
      paddingTop: 12,
      paddingBottom: 16 + bottomInset,
      ...SHADOW,
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
      color: colors.gray900,
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
      backgroundColor: colors.lightBlueBg,
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
      backgroundColor: colors.gray100,
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
      color: colors.gray900,
    },
    editButton: {
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: colors.gray100,
    },
    editButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.gray900,
    },
    addButton: {
      marginTop: 2,
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
