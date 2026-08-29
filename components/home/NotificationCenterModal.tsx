import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { AppState, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useAppLock } from '../../context/AppLockContext';
import { useAppData } from '../../context/AppDataContext';
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
  const { children, selectChild } = useAppData();
  const { isLocked } = useAppLock();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const [activeChildId, setActiveChildId] = useState<string>('all');

  // Reset the filter back to "전체" every time the modal is reopened.
  useEffect(() => {
    if (visible) setActiveChildId('all');
  }, [visible]);

  const filteredNotifications = useMemo(() => {
    if (activeChildId === 'all') return notifications;
    return notifications.filter((item) => item.childId === activeChildId);
  }, [notifications, activeChildId]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { [date: string]: NotificationCenterItem[] } = {};
    filteredNotifications.forEach((item) => {
      const dateStr = formatDate(item.createdAt);
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(item);
    });
    return Object.entries(groups).map(([date, items]) => ({ date, items }));
  }, [filteredNotifications]);

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

  // Tapping a notification marks it as read, switches the active child
  // profile to match the notification (so a second child's item doesn't
  // land you on the first child's calendar), and jumps to the related
  // schedule if there is one.
  const handleItemPress = (item: NotificationCenterItem) => {
    markRead(item.id);
    if (item.childId) selectChild(item.childId);
    if (item.date) {
      onClose();
      router.push({ pathname: '/calendar', params: { date: item.date } });
    } else if (item.childId) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.titleIconBadge}>
                <Feather name="bell" size={16} color={colors.purple500} />
              </View>
              <Text style={styles.title}>알림 센터</Text>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="닫기" hitSlop={8} style={styles.closeButton}>
              <Feather name="x" size={18} color={colors.gray500} />
            </Pressable>
          </View>
          <View style={styles.headerDivider} />

          {children.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.childTabRow}
              contentContainerStyle={styles.childTabContent}
            >
              <Pressable
                style={[styles.childTab, activeChildId === 'all' && styles.childTabActive]}
                onPress={() => setActiveChildId('all')}
              >
                <Text
                  style={[styles.childTabText, activeChildId === 'all' && styles.childTabTextActive]}
                >
                  전체
                </Text>
              </Pressable>
              {children.map((child) => (
                <Pressable
                  key={child.id}
                  style={[styles.childTab, activeChildId === child.id && styles.childTabActive]}
                  onPress={() => setActiveChildId(child.id)}
                >
                  <Text
                    style={[
                      styles.childTabText,
                      activeChildId === child.id && styles.childTabTextActive,
                    ]}
                  >
                    {child.name || '아이'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {filteredNotifications.length === 0 ? (
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
                      childName={
                        children.length > 1
                          ? children.find((c) => c.id === item.childId)?.name
                          : undefined
                      }
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
  childName,
  colors,
  styles,
  onPress,
}: {
  item: NotificationCenterItem;
  childName?: string;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
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
          {childName && (
            <View style={styles.childBadge}>
              <Text style={styles.childBadgeText}>{childName}</Text>
            </View>
          )}
          <View style={styles.cardMessageRow}>
            {!item.read && <View style={styles.unreadDot} />}
            <Text
              style={[styles.cardMessage, !item.read && styles.cardMessageUnread]}
              numberOfLines={3}
            >
              {item.body}
            </Text>
          </View>
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
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheet: {
      width: 360,
      maxWidth: '92%',
      height: '62%',
      maxHeight: '72%',
      backgroundColor: colors.cardWhite,
      borderRadius: 28,
      padding: 20,
      ...SHADOW,
      shadowOpacity: 0.18,
      shadowRadius: 24,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    titleIconBadge: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: colors.purpleBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    closeButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.gray50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginTop: 16,
      marginBottom: 14,
      marginHorizontal: -20,
    },
    childTabRow: {
      flexGrow: 0,
      marginBottom: 10,
    },
    childTabContent: {
      gap: 8,
    },
    childTab: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: colors.gray50,
    },
    childTabActive: {
      backgroundColor: colors.purple500,
    },
    childTabText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    childTabTextActive: {
      color: '#FFFFFF',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 60,
    },
    emptyImage: {
      width: 160,
      height: 160,
      marginBottom: 4,
      opacity: 0.9,
    },
    emptyText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    list: {
      flex: 1,
    },
    dateGroup: {
      marginBottom: 18,
    },
    groupDateText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.gray400,
      marginBottom: 10,
      marginLeft: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    card: {
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.gray50,
    },
    cardContentRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    logoCropContainer: {
      width: 42,
      height: 32,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    cardLogoOnly: {
      width: 42,
      height: 51,
      marginTop: -4,
    },
    cardBody: {
      flex: 1,
    },
    childBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.purpleBg,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2,
      marginBottom: 4,
    },
    childBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.purple500,
    },
    cardMessageRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },
    unreadDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.purple500,
      marginTop: 6,
    },
    cardMessage: {
      flex: 1,
      fontSize: 13.5,
      fontWeight: '500',
      color: colors.textSecondary,
      lineHeight: 19,
    },
    cardMessageUnread: {
      fontWeight: '700',
      color: colors.textPrimary,
    },
    cardTimeOnly: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.gray400,
      marginTop: 3,
    },
  });
}
