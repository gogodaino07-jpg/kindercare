import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChildSwitcherSheet from '../../components/home/ChildSwitcherSheet';
import ScreenBackground from '../../components/ScreenBackground';
import Text from '../../components/common/AppText';
import { SHADOW } from '../../constants/theme';
import { useAlert } from '../../context/AlertContext';
import { useAppData } from '../../context/AppDataContext';
import { useAppLock } from '../../context/AppLockContext';
import { useNotificationCenter } from '../../context/NotificationCenterContext';
import { THEME_MODE_LABELS, useTheme } from '../../context/ThemeContext';

interface SettingsRow {
  label: string;
  subtitle?: string;
  onPress: () => void;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { mode, colors, setMode } = useTheme();
  const { showAlert } = useAlert();
  const { resetAllData } = useAppData();
  const { resetLock } = useAppLock();
  const { clearNotifications } = useNotificationCenter();
  const [childManagerOpen, setChildManagerOpen] = useState(false);

  const handleWithdraw = () => {
    showAlert({
      title: '회원탈퇴',
      message:
        '정말 탈퇴하시겠습니까?\n등록된 아이 프로필, 일정, 가족키, 앱 잠금 설정 등 모든 데이터가 완전히 삭제되며 복구할 수 없습니다.',
      buttons: [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            await resetLock();
            clearNotifications();
            setMode('system');
            router.dismissAll();
            router.replace('/');
          },
        },
      ],
    });
  };

  const groups: { title: string; rows: SettingsRow[] }[] = [
    {
      title: '아이',
      rows: [
        { label: '아이 프로필 관리', onPress: () => setChildManagerOpen(true) },
        { label: '알림 설정', onPress: () => router.push('/settings/notifications') },
      ],
    },
    {
      title: '가족 계정',
      rows: [
        { label: '구성원 관리', onPress: () => router.push('/settings/family') },
        { label: '키 재발급', onPress: () => router.push('/settings/family') },
      ],
    },
    {
      title: '화면 및 보안',
      rows: [
        {
          label: '테마',
          subtitle: THEME_MODE_LABELS[mode],
          onPress: () => router.push('/settings/theme'),
        },
        { label: '앱 잠금', onPress: () => router.push('/settings/app-lock') },
        { label: '글씨체', onPress: () => router.push('/settings/font') },
        { label: '글자 크기 설정', onPress: () => router.push('/settings/font-size') },
        { label: '칠판 테마 색상', onPress: () => router.push('/settings/chalkboard-theme') },
      ],
    },
    {
      title: '기타',
      rows: [{ label: '지난 일정 모아보기', onPress: () => router.push('/past-events') }],
    },
  ];

  return (
    <ScreenBackground style={{ backgroundColor: colors.skyBackground }}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {groups.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>{group.title}</Text>
              <View style={[styles.card, { backgroundColor: colors.cardWhite }]}>
                {group.rows.map((row, idx) => (
                  <Pressable
                    key={row.label}
                    style={[
                      styles.row,
                      idx < group.rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                    onPress={row.onPress}
                  >
                    <View style={styles.rowTextGroup}>
                      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{row.label}</Text>
                      {row.subtitle ? (
                        <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>{row.subtitle}</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <Pressable style={styles.withdrawButton} onPress={handleWithdraw}>
            <Text style={[styles.withdrawText, { color: colors.tomorrowRed }]}>회원탈퇴</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      <ChildSwitcherSheet visible={childManagerOpen} onClose={() => setChildManagerOpen(false)} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20 },
  group: { marginBottom: 20 },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  card: {
    borderRadius: 14,
    ...SHADOW,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowTextGroup: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    fontSize: 18,
  },
  withdrawButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  withdrawText: {
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
