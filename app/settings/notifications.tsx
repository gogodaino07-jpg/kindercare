import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { calendarTheme as t } from '../../components/calendar/calendarTheme';
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
          headerStyle: { backgroundColor: t.bg },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBackButton}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={t.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>알림 받기</Text>
            <Switch
              value={draft.enabled}
              onValueChange={(enabled) => setDraft((prev) => ({ ...prev, enabled }))}
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor={colors.cardWhite}
            />
          </View>

          {draft.enabled && (
            <>
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
    screenBg: { flex: 1, backgroundColor: t.bg },
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
