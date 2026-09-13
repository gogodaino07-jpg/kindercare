import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../../components/common/AppText';
import TimeWheelPicker, { formatTimeOfDay } from '../../components/settings/TimeWheelPicker';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { useThemeColors } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { withExternalAction } from '../../utils/externalAction';
import { scheduleEventNotifications, sendTestSnoozeNotification } from '../../utils/notifications';

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

  // 일반 사용자에게는 안 보이는 숨은 테스트 진입점 — 미리보기 카드를 빠르게 3번
  // 연속으로 누르면 실제 알림/스누즈 동작을 확인할 수 있는 테스트 알림을 3초 뒤에
  // 띄운다. 원래 있던 눈에 보이는 "테스트 알림 보내기" 버튼이 배포판에 그대로
  // 노출된 적이 있어, 버튼 대신 이렇게 감춰둔다. 탭 사이 간격이 700ms를 넘으면
  // (연속 탭이 아니라고 보고) 횟수를 리셋한다.
  const previewTapCountRef = useRef(0);
  const previewLastTapAtRef = useRef(0);
  const handlePreviewTap = () => {
    const now = Date.now();
    if (now - previewLastTapAtRef.current > 700) {
      previewTapCountRef.current = 0;
    }
    previewTapCountRef.current += 1;
    previewLastTapAtRef.current = now;
    if (previewTapCountRef.current >= 3) {
      previewTapCountRef.current = 0;
      sendTestSnoozeNotification().catch(() => {});
      showToast('3초 후 테스트 알림이 도착해요.');
    }
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
          <View style={styles.card}>
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
                <View style={styles.divider} />
                <Pressable style={styles.previewRow} onPress={handlePreviewTap}>
                  <View style={styles.previewIconCircle}>
                    <MaterialCommunityIcons name="school-outline" size={15} color="#FFFFFF" />
                  </View>
                  <View style={styles.previewTextArea}>
                    <View style={styles.previewTopRow}>
                      <Text style={styles.previewAppName}>kindercare</Text>
                      <Text style={styles.previewTime}>{formatTimeOfDay(draft.dayBeforeTime)}</Text>
                    </View>
                    <Text style={styles.previewTitle} numberOfLines={1}>[내일] 소풍</Text>
                    <Text style={styles.previewBody} numberOfLines={1}>준비물: 물통, 도시락</Text>
                  </View>
                </Pressable>

                <View style={styles.divider} />
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionLabel}>전날 알림 시간</Text>
                  <Text style={styles.sectionValue}>{formatTimeOfDay(draft.dayBeforeTime)}</Text>
                </View>
                <View style={styles.pickerWrap}>
                  <TimeWheelPicker
                    value={draft.dayBeforeTime}
                    onChange={(dayBeforeTime) => setDraft((prev) => ({ ...prev, dayBeforeTime }))}
                  />
                </View>

                <View style={styles.divider} />
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
                    <View style={styles.divider} />
                    <View style={styles.sectionRow}>
                      <Text style={styles.sectionLabel}>당일 알림 시간</Text>
                      <Text style={styles.sectionValue}>{formatTimeOfDay(draft.sameDayTime)}</Text>
                    </View>
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
          </View>
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
    card: {
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      overflow: 'hidden',
      ...SHADOW,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
    rowLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 8,
    },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    sectionValue: { fontSize: 13, fontWeight: '700', color: colors.accent },
    pickerWrap: { paddingHorizontal: 16, paddingBottom: 16 },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    previewIconCircle: {
      width: 30,
      height: 30,
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
