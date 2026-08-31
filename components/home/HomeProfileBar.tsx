import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useNotificationCenter } from '../../context/NotificationCenterContext';
import { useThemeColors } from '../../context/ThemeContext';
import { Child } from '../../types/models';
import Text from '../common/AppText';
import CalendarIcon from '../common/CalendarIcon';
import SettingsIcon from '../common/SettingsIcon';
import StampIcon from '../common/StampIcon';
import NotificationCenterModal from './NotificationCenterModal';

/** 구글 스토어 심사 기간 동안 임시로 숨김 — 심사 끝나고 도장판 재디자인하면서 다시 true로. */
const SHOW_STAMP_BOARD_ICON = false;

/** 과거 알림 기록을 다시 훑어보는 인앱 팝업 — 실제 확인하는 사용자가 적어 보여서 숨김. 실제 푸시 알림 발송과는 무관. */
const SHOW_NOTIFICATION_BELL = false;

interface HomeProfileBarProps {
  selectedChild: Child | undefined;
  onPressChild: () => void;
  /** 생일인 아이 새로고침 시 값이 바뀔 때마다 프로필 영역에 폭죽 애니메이션을 재생. */
  birthdayBurstKey?: number;
}

/** "햇살" -> "햇살반" / "햇살반" -> "햇살반" 그대로. */
function formatClassName(className?: string): string | undefined {
  const trimmed = className?.trim();
  if (!trimmed) return undefined;
  return trimmed.endsWith('반') ? trimmed : `${trimmed}반`;
}

const AVATAR_SMALL_SIZE = 56;
const ICON_BUTTON_SIZE = 32;

const CONFETTI_EMOJIS = ['🎉', '🎊', '✨', '🎈', '⭐'];
const CONFETTI_COUNT = 14;

/** 생일 새로고침 신호(triggerKey)가 바뀔 때마다 아바타 주변으로 폭죽이 한 번 터졌다가 사라진다. */
function BirthdayBurst({ triggerKey }: { triggerKey: number }) {
  const [active, setActive] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setActive(true);
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 1300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) setActive(false);
    });
    return () => animation.stop();
  }, [triggerKey, progress]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={confettiStyles.confettiLayer}>
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / CONFETTI_COUNT + (i % 2 === 0 ? 0.15 : -0.15);
        const distance = 42 + (i % 4) * 13;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance - 18;
        const spinDeg = `${(i % 2 === 0 ? 1 : -1) * (180 + i * 22)}deg`;

        const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
        const translateY = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, dy, dy + 62] });
        const opacity = progress.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 1, 0] });
        const scale = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.3, 1, 0.75] });
        const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', spinDeg] });

        return (
          <Animated.Text
            key={i}
            style={[
              confettiStyles.confettiPiece,
              { opacity, transform: [{ translateX }, { translateY }, { scale }, { rotate }] },
            ]}
          >
            {CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length]}
          </Animated.Text>
        );
      })}
    </View>
  );
}

const confettiStyles = StyleSheet.create({
  confettiLayer: {
    position: 'absolute',
    top: AVATAR_SMALL_SIZE / 2,
    left: AVATAR_SMALL_SIZE / 2,
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confettiPiece: {
    position: 'absolute',
    fontSize: 15,
  },
});

/** 홈 화면 최상단 아이 프로필 행 — 스크롤해도 화면 상단에 고정되는 헤더로 app/index.tsx에서 ScrollView 바깥에 렌더링된다. */
export default function HomeProfileBar({ selectedChild, onPressChild, birthdayBurstKey }: HomeProfileBarProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { unreadCount } = useNotificationCenter();
  const [notifVisible, setNotifVisible] = useState(false);

  return (
    <View style={styles.topRow}>
      <Pressable style={styles.profileRow} onPress={onPressChild}>
        <View style={styles.avatarSmallContainer}>
          {selectedChild?.photoUri ? (
            <Image source={{ uri: selectedChild.photoUri }} style={styles.avatarSmall} />
          ) : (
            <View style={styles.avatarSmallPlaceholder}>
              <Text style={styles.avatarSmallIcon}>🧒</Text>
            </View>
          )}
          <View style={styles.onlineDot} />
          {birthdayBurstKey !== undefined && <BirthdayBurst triggerKey={birthdayBurstKey} />}
        </View>
        <View style={styles.profileTextBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.profileName} numberOfLines={1}>{selectedChild?.name ?? '우리 아이'}</Text>
            {selectedChild && (
              <View style={styles.miniBadge}>
                <Text style={styles.miniBadgeText}>
                  {[`${selectedChild.age}세`, formatClassName(selectedChild.className)].filter(Boolean).join(' ')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>

      <View style={styles.topIconsRow}>
        {SHOW_NOTIFICATION_BELL && (
          <Pressable style={styles.iconButton} onPress={() => setNotifVisible(true)}>
            <MaterialIcons name="notifications-none" size={24} color={colors.gray600} />
            {unreadCount > 0 && <View style={styles.bellDot} />}
          </Pressable>
        )}
        <Pressable style={styles.iconButton} onPress={() => router.push('/calendar')}>
          <CalendarIcon size={24} color={colors.gray600} />
        </Pressable>
        {SHOW_STAMP_BOARD_ICON && (
          <Pressable style={styles.iconButton} onPress={() => router.push('/stamp-board')}>
            <StampIcon size={24} color={colors.gray600} />
          </Pressable>
        )}
        <Pressable style={styles.iconButton} onPress={() => router.push('/settings')}>
          <SettingsIcon size={24} color={colors.gray600} />
        </Pressable>
      </View>

      <NotificationCenterModal visible={notifVisible} onClose={() => setNotifVisible(false)} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 4,
      backgroundColor: 'transparent',
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      gap: 12,
    },
    avatarSmallContainer: {
      width: AVATAR_SMALL_SIZE,
      height: AVATAR_SMALL_SIZE,
      position: 'relative',
    },
    avatarSmall: {
      width: AVATAR_SMALL_SIZE,
      height: AVATAR_SMALL_SIZE,
      borderRadius: AVATAR_SMALL_SIZE / 2,
      borderWidth: 2,
      borderColor: colors.orangeBorder,
    },
    avatarSmallPlaceholder: {
      width: AVATAR_SMALL_SIZE,
      height: AVATAR_SMALL_SIZE,
      borderRadius: AVATAR_SMALL_SIZE / 2,
      backgroundColor: colors.orangeLight2,
      borderWidth: 2,
      borderColor: colors.orangeBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarSmallIcon: {
      fontSize: 27,
    },
    onlineDot: {
      position: 'absolute',
      bottom: -1,
      right: -1,
      width: 15,
      height: 15,
      borderRadius: 8,
      backgroundColor: colors.statusGreen,
      borderWidth: 2,
      borderColor: colors.skyBackground,
    },
    profileTextBlock: {
      flexShrink: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    profileName: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.gray900,
    },
    miniBadge: {
      alignSelf: 'center',
      backgroundColor: '#FFE066',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    miniBadgeText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#5C4A1E',
    },
    topIconsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    iconButton: {
      width: ICON_BUTTON_SIZE,
      height: ICON_BUTTON_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellDot: {
      position: 'absolute',
      top: 4,
      right: 5,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.tomorrowRed,
      borderWidth: 1.5,
      borderColor: colors.skyBackground,
    },
  });
}
