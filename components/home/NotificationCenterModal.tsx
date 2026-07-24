import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { AppState, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hour}:${minute}`;
}

export default function NotificationCenterModal({ visible, onClose }: NotificationCenterModalProps) {
  const router = useRouter();
  const { notifications, removeNotification, clearNotifications } = useNotificationCenter();
  const { isLocked } = useAppLock();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  // Tapping a notification immediately removes it and jumps straight to the
  // related schedule on the calendar — there's no separate "read" resting
  // state to preserve once the user has acted on it.
  const handleItemPress = (item: NotificationCenterItem) => {
    removeNotification(item.id);
    onClose();
    if (item.date) {
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
              {notifications.length > 0 ? (
                <Pressable onPress={clearNotifications} hitSlop={8}>
                  <Text style={styles.clearText}>전체 삭제</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} accessibilityLabel="닫기" hitSlop={8}>
                <Text style={styles.closeIcon}>✕</Text>
              </Pressable>
            </View>
          </View>

          {notifications.length === 0 ? (
            <Text style={styles.emptyText}>모든 유치원 소식을 확인했어요! 🐣</Text>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {notifications.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  colors={colors}
                  styles={styles}
                  onPress={() => handleItemPress(item)}
                />
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
    <Pressable style={styles.card} onPress={onPress}>
      {!item.read ? <View style={styles.unreadDot} /> : null}
      <Text style={styles.cardIcon}>📄</Text>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMessage}>{item.body}</Text>
        <Text style={styles.cardTime}>{formatTimestamp(item.createdAt)}</Text>
        {isValidCoupangKeyword(item.keyword) ? (
          <Pressable
            style={styles.coupangButton}
            onPress={(e) => {
              e.stopPropagation?.();
              openCoupangSearch(item.keyword!);
            }}
          >
            <Text style={styles.coupangButtonText}>🛒 Coupang에서 바로 구매</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(20, 24, 22, 0.15)',
      alignItems: 'flex-end',
      paddingTop: 68,
      paddingRight: 16,
    },
    sheet: {
      width: 380,
      maxWidth: '92%',
      height: '68%',
      maxHeight: '70%',
      backgroundColor: colors.skyBackground,
      borderRadius: 20,
      padding: 18,
      ...SHADOW,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    clearText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    closeIcon: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 24,
    },
    list: {
      flex: 1,
    },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      padding: 15,
      marginBottom: 10,
      ...SHADOW,
    },
    unreadDot: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.tomorrowRed,
    },
    cardIcon: {
      fontSize: 24,
      marginRight: 12,
    },
    cardBody: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    cardMessage: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 18,
    },
    cardTime: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 6,
      opacity: 0.8,
    },
    coupangButton: {
      alignSelf: 'flex-start',
      backgroundColor: '#FFF1EE',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 8,
    },
    coupangButtonText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.coralPink,
    },
  });
}
