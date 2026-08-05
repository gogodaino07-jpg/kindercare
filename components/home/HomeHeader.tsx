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

  return (
    <View style={styles.container}>
      <Pressable style={styles.profileSection} onPress={onPressChild}>
        <View style={styles.avatarContainer}>
          {selectedChild?.photoUri ? (
            <Image source={{ uri: selectedChild.photoUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarIcon}>🧒</Text>
            </View>
          )}
        </View>
        <View style={styles.infoColumn}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {selectedChild?.name ?? '아이를 등록해주세요'}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color={colors.gray400} />
          </View>
          {selectedChild && (
            <Text style={styles.subInfoText}>
              {[ `${selectedChild.age}세`, selectedChild.className].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
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
      paddingTop: 16,
      paddingBottom: 8,
    },
    profileSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    avatarContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#FEF9C3', // Warm yellow
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: colors.orangeBorder,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    avatarPlaceholder: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarIcon: {
      fontSize: 24,
    },
    infoColumn: {
      justifyContent: 'center',
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    nameText: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.gray900,
      letterSpacing: -0.5,
    },
    subInfoText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 1,
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
