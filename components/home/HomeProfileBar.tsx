import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useNotificationCenter } from '../../context/NotificationCenterContext';
import { useThemeColors } from '../../context/ThemeContext';
import { Child } from '../../types/models';
import { toISODate } from '../../utils/date';
import Text from '../common/AppText';
import CalendarIcon from '../common/CalendarIcon';
import MoodSparkleIcon from '../common/MoodSparkleIcon';
import SettingsIcon from '../common/SettingsIcon';
import StampIcon from '../common/StampIcon';
import NotificationCenterModal from './NotificationCenterModal';

interface HomeProfileBarProps {
  selectedChild: Child | undefined;
  onPressChild: () => void;
}

/** "햇살" -> "햇살반" / "햇살반" -> "햇살반" 그대로. */
function formatClassName(className?: string): string | undefined {
  const trimmed = className?.trim();
  if (!trimmed) return undefined;
  return trimmed.endsWith('반') ? trimmed : `${trimmed}반`;
}

/** 실제 기분 데이터가 없어 장식용으로만 하루 단위로 고정 로테이션되는 문구. */
const MOOD_LABELS = [
  '신나요! 😄',
  '즐거워요! 🥰',
  '씩씩해요! 💪',
  '상쾌해요! 😊',
  '기대돼요! ✨',
  '평온해요! 🙂',
  '반짝반짝해요! ⭐',
  '행복해요! 😆',
  '두근두근해요! 💓',
  '활기차요! 🤸',
  '뿌듯해요! 😌',
  '용감해요! 🦁',
  '포근해요! 🐻',
  '방긋방긋해요! 😁',
  '든든해요! 🥰',
  '재미있어요! 🎈',
  '따뜻해요! ☺️',
  '자신만만해요! 😎',
  '사랑스러워요! 💖',
  '기운 넘쳐요! ⚡',
  '느긋해요! 🐢',
  '호기심 가득해요! 🧐',
  '상냥해요! 🌷',
  '명랑해요! 🎶',
  '싱글벙글해요! 😊',
  '씩씩발랄해요! 🌈',
  '평화로워요! 🕊️',
  '기분 최고예요! 🌟',
  '웃음 가득해요! 😃',
  '알콩달콩해요! 🍭',
];

function pickDailyMoodLabel(): string {
  const todayKey = `${toISODate(new Date())}-mood`;
  let hash = 0;
  for (let i = 0; i < todayKey.length; i++) {
    hash = (hash * 31 + todayKey.charCodeAt(i)) >>> 0;
  }
  return MOOD_LABELS[hash % MOOD_LABELS.length];
}

const AVATAR_SMALL_SIZE = 46;
const ICON_BUTTON_SIZE = 32;

/** 홈 화면 최상단 아이 프로필 행 — 스크롤해도 화면 상단에 고정되는 헤더로 app/index.tsx에서 ScrollView 바깥에 렌더링된다. */
export default function HomeProfileBar({ selectedChild, onPressChild }: HomeProfileBarProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { unreadCount } = useNotificationCenter();
  const [notifVisible, setNotifVisible] = useState(false);
  const moodLabel = pickDailyMoodLabel();

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
          <View style={styles.moodRow}>
            <MoodSparkleIcon size={11} color={colors.gray500} />
            <Text style={styles.moodText} numberOfLines={1}> 오늘 기분: {moodLabel}</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.topIconsRow}>
        <Pressable style={styles.iconButton} onPress={() => router.push('/stamp-board')}>
          <StampIcon size={24} color={colors.gray600} />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={() => router.push('/calendar')}>
          <CalendarIcon size={24} color={colors.gray600} />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={() => router.push('/settings')}>
          <SettingsIcon size={24} color={colors.gray600} />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={() => setNotifVisible(true)}>
          <MaterialIcons name="notifications-none" size={24} color={colors.gray600} />
          {unreadCount > 0 && <View style={styles.bellDot} />}
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
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 4,
      backgroundColor: colors.skyBackground,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      gap: 10,
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
      fontSize: 22,
    },
    onlineDot: {
      position: 'absolute',
      bottom: -1,
      right: -1,
      width: 13,
      height: 13,
      borderRadius: 7,
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
      gap: 6,
    },
    profileName: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.gray900,
    },
    miniBadge: {
      alignSelf: 'center',
      backgroundColor: '#FFE066',
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 2,
    },
    miniBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#5C4A1E',
    },
    moodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    moodText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.gray500,
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
