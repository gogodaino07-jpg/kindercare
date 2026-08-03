import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { AppState, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useAppLock } from '../../context/AppLockContext';
import { useThemeColors } from '../../context/ThemeContext';
import { NotificationCenterItem, useNotificationCenter } from '../../context/NotificationCenterContext';
import { openCoupangSearch } from '../../utils/coupang';
import { isValidCoupangKeyword } from '../../utils/validation';
import Text from '../common/AppText';

interface NotificationCenterModalProps {
  visible: boolean;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dateStr = `${month}월 ${day}일`;

  return isToday ? `오늘 ${dateStr}` : dateStr;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

export default function NotificationCenterModal({ visible, onClose }: NotificationCenterModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { notifications, markRead, clearNotifications } = useNotificationCenter();
  const { isLocked } = useAppLock();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { [date: string]: NotificationCenterItem[] } = {};
    notifications.forEach((item) => {
      const dateStr = formatDate(item.createdAt);
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(item);
    });
    return Object.entries(groups).map(([date, items]) => ({ date, items }));
  }, [notifications]);

  useEffect(() => {
    if (isLocked && visible) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked]);

  // Never leave this popover open behind the app when the user switches
  // away — closes on both 'background' and 'inactive' (iOS briefly reports
  // 'inactive' for the app-switcher/control-center transition too).
  useEffect(() => {
    if (!visible) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') onClose();
    });
    return () => subscription.remove();
  }, [visible, onClose]);

  // Tapping a notification marks it as read and jumps straight to the
  // related schedule on the calendar.
  const handleItemPress = (item: NotificationCenterItem) => {
    markRead(item.id);
    // Tapping now marks as read but doesn't immediately close if the user
    // wants to see the visual change. However, deep-linking still happens.
    if (item.date) {
      onClose();
      router.push({ pathname: '/calendar', params: { date: item.date } });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>알림 센터</Text>
            <View style={styles.headerActions}>
              <Pressable onPress={onClose} accessibilityLabel="닫기" hitSlop={8}>
                <Text style={styles.closeIcon}>✕</Text>
              </Pressable>
            </View>
          </View>

          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Image
                source={require('../../assets/mailbox_empty.png')}
                style={styles.emptyImage}
                resizeMode="contain"
              />
              <Text style={styles.emptyText}>놓친 소식이 없어요.{"\n"}오늘 하루도 파이팅! 💛</Text>
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {groupedNotifications.map((group) => (
                <View key={group.date} style={styles.dateGroup}>
                  <Text style={styles.groupDateText}>{group.date}</Text>
                  {group.items.map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      colors={colors}
                      styles={styles}
                      onPress={() => handleItemPress(item)}
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function NotificationRow({
  item,
  colors,
  styles,
  onPress,
}: {
  item: NotificationCenterItem;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.card, !item.read && styles.unreadCard]} onPress={onPress}>
      <View style={styles.cardContentRow}>
        <View style={styles.logoCircle}>
          <View style={styles.logoCropContainer}>
            <Image
              source={require('../../assets/logo_notif.jpg')}
              style={styles.cardLogoOnly}
              resizeMode="cover"
            />
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardMessage} numberOfLines={3}>
            {item.body}
          </Text>
          <Text style={styles.cardTimeOnly}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors, topInset: number) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(20, 24, 22, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheet: {
      width: 360,
      maxWidth: '92%',
      height: '60%',
      maxHeight: '70%',
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: 20,
      ...SHADOW,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    closeIcon: {
      fontSize: 18,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 60,
    },
    emptyImage: {
      width: 220,
      height: 220,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 28,
    },
    list: {
      flex: 1,
    },
    dateGroup: {
      marginBottom: 20,
    },
    groupDateText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 12,
      marginLeft: 4,
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 10,
      marginBottom: 4,
    },
    unreadCard: {
      backgroundColor: '#F0F9FF',
    },
    cardContentRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: '#F1F5F9',
      overflow: 'hidden',
    },
    logoCropContainer: {
      width: 44,
      height: 34,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    cardLogoOnly: {
      width: 44,
      height: 54,
      marginTop: -4,
    },
    cardBody: {
      flex: 1,
    },
    cardMessage: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      lineHeight: 18,
    },
    cardTimeOnly: {
      fontSize: 11,
      fontWeight: '500',
      color: '#94A3B8',
      marginTop: 2,
    },
  });
}
