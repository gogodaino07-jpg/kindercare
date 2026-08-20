import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { Child } from '../../types/models';
import Text from '../common/AppText';
import CalendarIcon from '../common/CalendarIcon';
import SettingsIcon from '../common/SettingsIcon';
import StampIcon from '../common/StampIcon';

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

const AVATAR_SMALL_SIZE = 56;
const ICON_BUTTON_SIZE = 32;

/** 홈 화면 최상단 아이 프로필 행 — 스크롤해도 화면 상단에 고정되는 헤더로 app/index.tsx에서 ScrollView 바깥에 렌더링된다. */
export default function HomeProfileBar({ selectedChild, onPressChild }: HomeProfileBarProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
        </View>
      </Pressable>

      <View style={styles.topIconsRow}>
        <Pressable style={styles.iconButton} onPress={() => router.push('/calendar')}>
          <CalendarIcon size={24} color={colors.gray600} />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={() => router.push('/stamp-board')}>
          <StampIcon size={24} color={colors.gray600} />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={() => router.push('/settings')}>
          <SettingsIcon size={24} color={colors.gray600} />
        </Pressable>
      </View>
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
  });
}
