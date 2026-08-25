import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../../components/common/AppText';
import TimeWheelPicker, { formatTimeOfDay } from '../../components/settings/TimeWheelPicker';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { useThemeColors } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { withExternalAction } from '../../utils/externalAction';
import { scheduleEventNotifications } from '../../utils/notifications';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { notificationSettings, updateNotificationSettings, events } = useAppData();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [draft, setDraft] = useState(notificationSettings);
  const [saving, setSaving] = useState(false);

  // "알림 받기" 마스터 스위치는 다른 세부 설정(시간 등)과 달리 저장 버튼을 기다리지 않고
  // 바로 반영한다 — 설정 홈 화면의 알림 카드 토글과 상태가 어긋나 보이지 않게 하기 위함.
  const handleToggleEnabled = (enabled: boolean) => {
    setDraft((prev) => {
      const next = { ...prev, enabled };
      updateNotificationSettings(next);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    updateNotificationSettings(draft);
    try {
      await withExternalAction(() => scheduleEventNotifications(events, draft));
    } finally {
      setSaving(false);
      showToast('✓ 저장되었습니다.');
    }
  };

  return (
    <View style={styles.screenBg}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: colors.skyBackground },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBackButton}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.introCard}>
            <View style={styles.introIconBadge}>
              <MaterialCommunityIcons name="bell-ring-outline" size={20} color={colors.accent} />
            </View>
            <Text style={styles.introText}>
              등원 준비물과 일정을 놓치지 않도록{'\n'}설정한 시간에 알려드려요
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>알림 받기</Text>
            <Switch
              value={draft.enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor={colors.cardWhite}
            />
          </View>

          {draft.enabled && (
            <>
              <Text style={styles.sectionLabel}>미리보기</Text>
              <View style={styles.previewCard}>
                <View style={styles.previewIconCircle}>
                  <MaterialCommunityIcons name="school-outline" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.previewTextArea}>
                  <View style={styles.previewTopRow}>
                    <Text style={styles.previewAppName}>kindercare</Text>
                    <Text style={styles.previewTime}>{formatTimeOfDay(draft.dayBeforeTime)}</Text>
                  </View>
                  <Text style={styles.previewTitle} numberOfLines={1}>[내일] 소풍</Text>
                  <Text style={styles.previewBody} numberOfLines={2}>준비물: 물통, 도시락</Text>
                </View>
              </View>
              <Text style={styles.previewCaption}>설정한 시간에 이런 알림이 도착해요</Text>

              <Text style={styles.sectionLabel}>
                전날 알림 시간 · {formatTimeOfDay(draft.dayBeforeTime)}
              </Text>
              <View style={styles.pickerWrap}>
                <TimeWheelPicker
                  value={draft.dayBeforeTime}
                  onChange={(dayBeforeTime) => setDraft((prev) => ({ ...prev, dayBeforeTime }))}
                />
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>당일 아침 알림 추가</Text>
                <Switch
                  value={draft.sameDayEnabled}
                  onValueChange={(sameDayEnabled) =>
                    setDraft((prev) => ({ ...prev, sameDayEnabled }))
                  }
                  trackColor={{ true: colors.accent, false: colors.border }}
                  thumbColor={colors.cardWhite}
                />
              </View>

              {draft.sameDayEnabled && (
                <>
                  <Text style={styles.sectionLabel}>
                    당일 알림 시간 · {formatTimeOfDay(draft.sameDayTime)}
                  </Text>
                  <View style={styles.pickerWrap}>
                    <TimeWheelPicker
                      value={draft.sameDayTime}
                      onChange={(sameDayTime) => setDraft((prev) => ({ ...prev, sameDayTime }))}
                    />
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>

        {/* Absolute positioned button to match Upload screen layout */}
        <View style={[styles.buttonContainer, { bottom: 24 + insets.bottom }]}>
          <Pressable
            style={[styles.saveButton, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? '저장 중...' : '저장'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screenBg: { flex: 1, backgroundColor: colors.skyBackground },
    headerBackButton: { paddingHorizontal: 4 },
    safeArea: { flex: 1 },
    content: { padding: 20, paddingBottom: 120 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardWhite,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      ...SHADOW,
    },
    rowLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
    pickerWrap: { marginBottom: 24 },
    introCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      ...SHADOW,
      shadowOpacity: 0.05,
    },
    introIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.gray100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    introText: {
      flex: 1,
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
      lineHeight: 18,
    },
    previewCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      padding: 14,
      marginBottom: 8,
      ...SHADOW,
    },
    previewIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewTextArea: { flex: 1, minWidth: 0 },
    previewTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    previewAppName: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
    previewTime: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
    previewTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 },
    previewBody: { fontSize: 12.5, fontWeight: '500', color: colors.textSecondary, lineHeight: 17 },
    previewCaption: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    buttonContainer: { position: 'absolute', left: 20, right: 20 },
    saveButton: {
      backgroundColor: colors.gray900,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      ...SHADOW,
    },
    saveButtonText: { color: colors.cardWhite, fontSize: 16, fontWeight: '700' },
  });
}
