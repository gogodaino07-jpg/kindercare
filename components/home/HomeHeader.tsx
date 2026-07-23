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

  const childLabel = selectedChild
    ? [selectedChild.name, `${selectedChild.age}세`, selectedChild.className]
        .filter(Boolean)
        .join(' · ')
    : '등록된 아이가 없어요';

  return (
    <View style={styles.container}>
      <View style={styles.centerArea}>
        <Pressable style={styles.childButton} onPress={onPressChild}>
          {selectedChild?.photoUri ? (
            <Image source={{ uri: selectedChild.photoUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarIcon}>🧒</Text>
            </View>
          )}
          <Text style={styles.childLabel} numberOfLines={1}>
            {childLabel}
          </Text>
          <Text style={styles.chevron}>▾</Text>
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
      justifyContent: 'center',
      backgroundColor: colors.cardWhite,
      paddingVertical: 14,
      paddingHorizontal: 22,
      borderRadius: 20,
      ...SHADOW,
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      marginRight: 10,
    },
    avatarPlaceholder: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#EEF2F5',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    avatarIcon: {
      fontSize: 18,
    },
    childLabel: {
      flexShrink: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginRight: 6,
    },
    chevron: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    rightActions: {
      flexDirection: 'row',
      gap: 8,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
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
