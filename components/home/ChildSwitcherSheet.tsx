import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { AppState, Modal, Pressable, StyleSheet, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useAlert } from '../../context/AlertContext';
import { FREE_CHILD_LIMIT, isChildLocked, useAppData } from '../../context/AppDataContext';
import { useAppLock } from '../../context/AppLockContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme } from '../../context/ThemeContext';
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
  const { isSubscribed } = useSubscription();
  const { showAlert } = useAlert();
  const { colors, resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';
  const styles = useMemo(() => createStyles(colors, insets.bottom, isDark), [colors, insets.bottom, isDark]);

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

  const showPremiumRequiredAlert = (title: string, message: string) => {
    handleClose();
    showAlert({
      title,
      message,
      icon: '💎',
      buttons: [
        { text: '확인', style: 'cancel' },
        { text: '프리미엄 구독 안내', onPress: () => router.push('/settings/subscription') },
      ],
    });
  };

  // 2번째 아이부터는 등록 한도를 프리미엄 안내로 막지 않고, child-profile.tsx의
  // 리워드 광고 게이트(useAddChildRewardedAd)를 거쳐 추가하도록 넘긴다.
  const handleAddChild = () => {
    handleClose();
    router.push('/child-profile');
  };

  const handleLockedChildPress = () => {
    showPremiumRequiredAlert(
      '잠긴 아이 프로필이에요',
      `무료 이용 시 아이는 최대 ${FREE_CHILD_LIMIT}명까지 이용할 수 있어요. 구독이 종료되면서 나중에 추가한 아이의 정보가 잠겼어요. 프리미엄으로 구독하시면 다시 이용하실 수 있습니다.`
    );
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
        runOnJS(handleClose)();
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
      {/* RN Modal은 안드로이드에서 별도 네이티브 윈도우에 렌더링돼 앱 루트의
          GestureHandlerRootView 밖에 놓이면서 스와이프 제스처가 먹지 않는다 —
          Modal 내부에 별도로 하나 더 씌워줘야 제스처가 정상 동작한다. */}
      <GestureHandlerRootView style={styles.overlayContainer}>
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

            {sortedChildren.length === 0 ? (
              // 아이가 하나도 없을 때(신규 게스트 등) — 장식용 이미지 없이 짧은 안내와
              // 첫 아이 등록 버튼만 담백하게 보여준다.
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>아직 등록된 아이가 없어요</Text>
                <Text style={styles.emptySubtitle}>
                  아이를 등록하면 일정과 준비물을 스마트하게 챙길 수 있어요
                </Text>
                <Pressable style={styles.emptyAddButton} onPress={handleAddChild}>
                  <Text style={styles.emptyAddButtonText}>+ 아이 추가하기</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {sortedChildren.map((child) => {
                  const isSelected = child.id === selectedChild?.id;
                  const locked = isChildLocked(children, child.id, isSubscribed);
                  const subLabel = [
                    child.age !== undefined && child.age !== null ? `${child.age}세` : undefined,
                    child.className,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <View
                      key={child.id}
                      style={[styles.row, isSelected && styles.rowSelected, locked && styles.rowLocked]}
                    >
                      <Pressable
                        style={styles.rowMain}
                        onPress={() => {
                          if (locked) {
                            handleLockedChildPress();
                            return;
                          }
                          selectChild(child.id);
                          handleClose();
                        }}
                      >
                        <View style={[styles.radio, isSelected && styles.radioSelected]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <View style={styles.rowTextBlock}>
                          <Text style={[styles.rowName, locked && styles.rowNameLocked]} numberOfLines={1}>
                            {child.name || '이름 없음'}
                          </Text>
                          {!!subLabel && (
                            <Text style={styles.rowSub} numberOfLines={1}>
                              {subLabel}
                            </Text>
                          )}
                        </View>
                        {locked && <Text style={styles.lockIcon}>🔒</Text>}
                      </Pressable>
                      <Pressable
                        style={styles.editButton}
                        onPress={() => {
                          if (locked) {
                            handleLockedChildPress();
                            return;
                          }
                          handleClose();
                          router.push({ pathname: '/child-profile', params: { childId: child.id } });
                        }}
                        accessibilityLabel={locked ? '잠긴 프로필' : '프로필 수정'}
                      >
                        <Text style={styles.editButtonText}>{locked ? '잠김' : '수정'}</Text>
                      </Pressable>
                    </View>
                  );
                })}
                <Pressable style={styles.addButton} onPress={handleAddChild}>
                  <Text style={styles.addButtonText}>+ 아이 추가</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, bottomInset: number, isDark: boolean) {
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
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    sheet: {
      backgroundColor: colors.skyBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingTop: 12,
      paddingBottom: 20 + bottomInset,
      // 다크모드에서는 시트 배경이 거의 검정이라 뒤의 딤 배경과 경계가 흐려져,
      // 위쪽 모서리에 옅은 테두리를 더해 시트 영역을 또렷하게 구분한다.
      ...(isDark && { borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }),
      ...SHADOW,
    },
    dragHandle: {
      width: 36,
      height: 4,
      backgroundColor: colors.gray100,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 12,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    title: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.gray900,
    },
    closeIcon: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardWhite,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? colors.border : 'transparent',
      marginBottom: 8,
      paddingRight: 10,
      ...SHADOW,
      shadowOpacity: 0.06,
      elevation: 1,
    },
    rowSelected: {
      backgroundColor: colors.lightBlueBg,
      borderColor: colors.accent,
    },
    rowLocked: {
      opacity: 0.55,
    },
    rowMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
      paddingHorizontal: 14,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    radioSelected: {
      borderColor: colors.accent,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
    },
    rowTextBlock: {
      flex: 1,
    },
    rowName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.gray900,
    },
    rowNameLocked: {
      color: colors.textSecondary,
    },
    rowSub: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
      marginTop: 2,
    },
    lockIcon: {
      fontSize: 13,
      marginLeft: 6,
    },
    editButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
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
      paddingVertical: 13,
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    addButtonText: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.accent,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 4,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.gray900,
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 12.5,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 18,
    },
    emptyAddButton: {
      alignSelf: 'stretch',
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 13,
    },
    emptyAddButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
}
