import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { NotificationCenterItem, useNotificationCenter } from '../../context/NotificationCenterContext';
import { openCoupangSearch } from '../../utils/coupang';
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
  const { notifications, clearNotifications } = useNotificationCenter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>알림 센터</Text>
            {notifications.length > 0 ? (
              <Pressable onPress={clearNotifications}>
                <Text style={styles.clearText}>전체 삭제</Text>
              </Pressable>
            ) : null}
          </View>

          {notifications.length === 0 ? (
            <Text style={styles.emptyText}>아직 받은 알림이 없어요</Text>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {notifications.map((item) => (
                <NotificationRow key={item.id} item={item} colors={colors} styles={styles} />
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
}: {
  item: NotificationCenterItem;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardIcon}>📄</Text>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMessage}>{item.body}</Text>
        <Text style={styles.cardTime}>{formatTimestamp(item.createdAt)}</Text>
        {item.keyword ? (
          <Pressable
            style={styles.coupangButton}
            onPress={() => openCoupangSearch(item.keyword!)}
          >
            <Text style={styles.coupangButtonText}>🛒 쿠팡에서 구매</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(20, 24, 22, 0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.skyBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 40,
      maxHeight: '75%',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    clearText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 24,
    },
    list: {
      flexGrow: 0,
    },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      ...SHADOW,
    },
    cardIcon: {
      fontSize: 22,
      marginRight: 12,
    },
    cardBody: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 14,
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
