import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { AppState, Image, Modal, Pressable, StyleSheet, View, Dimensions } from 'react-native';
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
              // 아이가 하나도 없을 때(신규 게스트 등) — 시트에 확보해둔 최소 높이
              // 안에서 그냥 방치되던 넓은 빈 공간 대신, 가운데 정렬된 안내와
              // 눈에 띄는 채워진 버튼으로 첫 아이 등록을 유도한다.
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Text style={styles.emptyIconText}>🧒</Text>
                </View>
                <Text style={styles.emptyTitle}>아직 등록된 아이가 없어요</Text>
                <Text style={styles.emptySubtitle}>
                  아이를 등록하면 일정과 준비물을{'\n'}스마트하게 챙길 수 있어요
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
                  const label = [child.name, `${child.age}세`, child.className]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <View
                      key={child.id}
                      style={[styles.card, isSelected && styles.cardSelected, locked && styles.cardLocked]}
                    >
                      <Pressable
                        style={styles.cardMain}
                        onPress={() => {
                          if (locked) {
                            handleLockedChildPress();
                            return;
                          }
                          selectChild(child.id);
                          handleClose();
                        }}
                      >
                        {child.photoUri ? (
                          <Image source={{ uri: child.photoUri }} style={[styles.avatar, locked && styles.avatarLocked]} />
                        ) : (
                          <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarIcon}>{child.avatarEmoji ?? '🧒'}</Text>
                          </View>
                        )}
                        <Text style={[styles.cardLabel, locked && styles.cardLabelLocked]}>{label}</Text>
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
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      // 아이가 한두 명뿐이면 시트가 너무 낮아 보인다는 피드백으로 화면 높이의
      // 일정 비율만큼은 항상 확보한다. (0.42는 아이 1명일 때 하단 여백이
      // 과했다는 피드백으로 축소함)
      minHeight: SCREEN_HEIGHT * 0.32,
      padding: 22,
      paddingTop: 16,
      paddingBottom: 24 + bottomInset,
      // 다크모드에서는 시트 배경이 거의 검정이라 뒤의 딤 배경과 경계가 흐려져,
      // 위쪽 모서리에 옅은 테두리를 더해 시트 영역을 또렷하게 구분한다.
      ...(isDark && { borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }),
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
      ...(isDark && { borderWidth: 1, borderColor: colors.border }),
      ...SHADOW,
    },
    cardSelected: {
      backgroundColor: colors.lightBlueBg,
    },
    cardLocked: {
      opacity: 0.55,
    },
    cardMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 18,
    },
    avatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
      marginRight: 14,
    },
    avatarLocked: {
      opacity: 0.6,
    },
    avatarPlaceholder: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.gray100,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    avatarIcon: {
      fontSize: 28,
    },
    cardLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: colors.gray900,
    },
    cardLabelLocked: {
      color: colors.textSecondary,
    },
    lockIcon: {
      fontSize: 14,
      marginLeft: 6,
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
      paddingVertical: 17,
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
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.lightBlueBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyIconText: { fontSize: 34 },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.gray900,
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 24,
    },
    emptyAddButton: {
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingVertical: 15,
      paddingHorizontal: 32,
      ...SHADOW,
      shadowColor: colors.accent,
      shadowOpacity: 0.28,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    emptyAddButtonText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
}
