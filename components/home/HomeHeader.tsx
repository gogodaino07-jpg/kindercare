import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { Child } from '../../types/models';
import Text from '../common/AppText';

interface HomeHeaderProps {
  selectedChild: Child | undefined;
  onPressChild: () => void;
  onPressNotifications: () => void;
  hasUnreadNotifications?: boolean;
}

export default function HomeHeader({
  selectedChild,
  onPressChild,
  onPressNotifications,
  hasUnreadNotifications,
}: HomeHeaderProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const nameLine = selectedChild
    ? [selectedChild.name, `${selectedChild.age}세`].filter(Boolean).join(' · ')
    : '등록된 아이가 없어요';

  return (
    <View style={styles.container}>
      <View style={styles.centerArea}>
        <Pressable style={styles.childButton} onPress={onPressChild}>
          <View style={styles.avatarSlot}>
            {selectedChild?.photoUri ? (
              <Image source={{ uri: selectedChild.photoUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarIcon}>🐥</Text>
              </View>
            )}
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.labelColumn}>
            <View style={styles.nameLineRow}>
              <Text style={styles.nameLineText} numberOfLines={1}>
                {nameLine}
              </Text>
              <Text style={styles.chevron}>∨</Text>
            </View>
            {selectedChild?.className ? (
              <Text style={styles.classLineText} numberOfLines={1}>
                {selectedChild.className}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </View>
      <View style={styles.rightActions}>
        <Pressable
          style={styles.iconButton}
          onPress={onPressNotifications}
          accessibilityLabel="알림 센터"
        >
          <Text style={styles.icon}>🔔</Text>
          {hasUnreadNotifications ? <View style={styles.unreadBadge} /> : null}
        </Pressable>
        <Pressable
          style={styles.iconButton}
          onPress={() => router.push('/calendar')}
          accessibilityLabel="캘린더로 이동"
        >
          <Text style={styles.icon}>📅</Text>
        </Pressable>
        <Pressable
          style={styles.iconButton}
          onPress={() => router.push('/settings')}
          accessibilityLabel="설정으로 이동"
        >
          <Text style={styles.icon}>⚙️</Text>
        </Pressable>
      </View>
    </View>
  );
}

const ICON_BUTTON_SIZE = 44;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    centerArea: {
      flex: 1,
      marginRight: 12,
    },
    childButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardWhite,
      height: ICON_BUTTON_SIZE,
      width: '100%',
      paddingHorizontal: 14,
      borderRadius: ICON_BUTTON_SIZE / 2,
      ...SHADOW,
    },
    avatarSlot: {
      marginRight: 10,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    avatarPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#FFF3E0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarIcon: {
      fontSize: 18,
    },
    onlineDot: {
      position: 'absolute',
      bottom: -1,
      right: -1,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#4CAF6D',
      borderWidth: 2,
      borderColor: colors.cardWhite,
    },
    labelColumn: {
      flexShrink: 1,
    },
    nameLineRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    nameLineText: {
      flexShrink: 1,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginRight: 4,
    },
    classLineText: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    chevron: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    rightActions: {
      flexDirection: 'row',
      gap: 8,
    },
    iconButton: {
      width: ICON_BUTTON_SIZE,
      height: ICON_BUTTON_SIZE,
      borderRadius: ICON_BUTTON_SIZE / 2,
      backgroundColor: colors.cardWhite,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
    },
    icon: {
      fontSize: 20,
    },
    unreadBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.tomorrowRed,
      borderWidth: 1.5,
      borderColor: colors.cardWhite,
    },
  });
}
