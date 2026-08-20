import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import { calendarTheme as t } from './calendarTheme';

interface SmartBannerProps {
  incompleteCount: number;
  totalCount: number;
  hasNotice: boolean;
  onPressToday: () => void;
}

function bannerMessage(incompleteCount: number, totalCount: number, hasNotice: boolean): string {
  if (incompleteCount > 0 && hasNotice) return `오늘 챙겨야 할 준비물 ${incompleteCount}개 / 알림 1건 🔔`;
  if (incompleteCount > 0 && !hasNotice) return `오늘 챙겨야 할 준비물 ${incompleteCount}개 남음`;
  if (incompleteCount === 0 && hasNotice) return '오늘 준비물은 없고 알림 1건이 있어요 🔔';
  if (incompleteCount === 0 && !hasNotice && totalCount > 0) return '오늘 준비물을 모두 다 챙겼어요! 🎉';
  return '등록된 준비물과 알림이 없어요 ✨';
}

export default function SmartBanner({ incompleteCount, totalCount, hasNotice, onPressToday }: SmartBannerProps) {
  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <View style={styles.iconBadge}>
          <Text style={styles.icon}>🎒</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {bannerMessage(incompleteCount, totalCount, hasNotice)}
        </Text>
      </View>
      <Pressable style={styles.todayButton} onPress={onPressToday}>
        <Text style={styles.todayButtonText}>오늘 이동</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.cardWhite,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.border,
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.amberBgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: t.textPrimary,
  },
  todayButton: {
    backgroundColor: t.skyBg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: t.sky,
  },
});
