import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChildSwitcherSheet from '../../components/home/ChildSwitcherSheet';
import ScreenBackground from '../../components/ScreenBackground';
import { COLORS, SHADOW } from '../../constants/theme';

interface SettingsRow {
  label: string;
  onPress: () => void;
}

export default function SettingsScreen() {
  const router = useRouter();
  const [childManagerOpen, setChildManagerOpen] = useState(false);

  const comingSoon = (label: string) => () =>
    Alert.alert(label, '추후 지원 예정이에요.');

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
        { label: '테마 (라이트/다크)', onPress: comingSoon('테마') },
        { label: '앱 잠금', onPress: comingSoon('앱 잠금') },
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
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {groups.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <View style={styles.card}>
                {group.rows.map((row, idx) => (
                  <Pressable
                    key={row.label}
                    style={[styles.row, idx < group.rows.length - 1 && styles.rowDivider]}
                    onPress={row.onPress}
                  >
                    <Text style={styles.rowLabel}>{row.label}</Text>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
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
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.cardWhite,
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
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
});
