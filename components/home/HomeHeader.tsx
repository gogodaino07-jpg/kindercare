import { MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { useNotificationCenter } from '../../context/NotificationCenterContext';
import { Child } from '../../types/models';
import Text from '../common/AppText';

interface HomeHeaderProps {
  selectedChild: Child | undefined;
  onPressChild: () => void;
}

export default function HomeHeader({
  selectedChild,
  onPressChild,
}: HomeHeaderProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { addNotification } = useNotificationCenter();

  const handleTestNotification = async () => {
    addNotification({
      title: '🔔 알림 테스트',
      body: '새로운 유치원 소식이 도착했습니다! 확인해 보세요.',
    });

    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '킨더케어 알림 테스트',
          body: '실제 알림이 이렇게 전달됩니다!',
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('Failed to fire test notification:', e);
    }
  };

  const nameLine = selectedChild
    ? [selectedChild.name, `${selectedChild.age}세`, selectedChild.className].filter(Boolean).join(' · ')
    : '등록된 아이가 없어요';

  return (
    <View style={styles.container}>
      <Pressable style={styles.profileChip} onPress={onPressChild}>
        <View style={styles.avatarContainer}>
          {selectedChild?.photoUri ? (
            <Image source={{ uri: selectedChild.photoUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarIcon}>🧒</Text>
            </View>
          )}
        </View>
        <Text style={styles.profileText} numberOfLines={1}>
          {nameLine}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={18} color={colors.gray400} />
      </Pressable>

      <View style={styles.rightActions}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.green50 }]}
          onPress={handleTestNotification}
        >
          <MaterialIcons name="science" size={20} color={colors.green500} />
        </Pressable>

        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.gray50 }]}
          onPress={() => router.push('/calendar')}
        >
          <MaterialIcons name="date-range" size={20} color={colors.gray500} />
        </Pressable>

        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.gray50 }]}
          onPress={() => router.push('/settings')}
        >
          <MaterialIcons name="settings" size={20} color={colors.gray500} />
        </Pressable>
      </View>
    </View>
  );
}

const ACTION_SIZE = 36;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
    },
    profileChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.gray50,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1.5, // Increased thickness slightly
      borderColor: colors.orangeBorder, // Pastel orange border as requested
      flexShrink: 1,
      marginRight: 8,
    },
    avatarContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#FEF9C3', // Warm yellow
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      overflow: 'hidden',
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    avatarPlaceholder: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarIcon: {
      fontSize: 16,
    },
    profileText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.gray800,
      marginRight: 4,
    },
    rightActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      width: ACTION_SIZE,
      height: ACTION_SIZE,
      borderRadius: ACTION_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.tomorrowRed,
      borderWidth: 1.5,
      borderColor: colors.cardWhite,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    unreadCountText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '800',
    },
  });
}
