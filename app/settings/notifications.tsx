import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import TimeWheelPicker, { formatTimeOfDay } from '../../components/settings/TimeWheelPicker';
import { COLORS, SHADOW } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { scheduleEventNotifications } from '../../utils/notifications';

export default function NotificationSettingsScreen() {
  const { notificationSettings, updateNotificationSettings, events } = useAppData();
  const [draft, setDraft] = useState(notificationSettings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    updateNotificationSettings(draft);
    try {
      await scheduleEventNotifications(events, draft);
      Alert.alert('저장됐어요', '설정한 시간에 알림을 보내드릴게요.');
    } catch {
      Alert.alert('저장됐어요', '알림 예약 중 문제가 있었지만 설정은 저장됐어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>알림 받기</Text>
            <Switch
              value={draft.enabled}
              onValueChange={(enabled) => setDraft((prev) => ({ ...prev, enabled }))}
            />
          </View>

          {draft.enabled ? (
            <>
              <Text style={styles.sectionLabel}>
                전날 알림 시간 · {formatTimeOfDay(draft.dayBeforeTime)}
              </Text>
              <TimeWheelPicker
                value={draft.dayBeforeTime}
                onChange={(dayBeforeTime) => setDraft((prev) => ({ ...prev, dayBeforeTime }))}
              />

              <View style={styles.row}>
                <Text style={styles.rowLabel}>당일 아침 알림 추가</Text>
                <Switch
                  value={draft.sameDayEnabled}
                  onValueChange={(sameDayEnabled) =>
                    setDraft((prev) => ({ ...prev, sameDayEnabled }))
                  }
                />
              </View>

              {draft.sameDayEnabled ? (
                <>
                  <Text style={styles.sectionLabel}>
                    당일 알림 시간 · {formatTimeOfDay(draft.sameDayTime)}
                  </Text>
                  <TimeWheelPicker
                    value={draft.sameDayTime}
                    onChange={(sameDayTime) => setDraft((prev) => ({ ...prev, sameDayTime }))}
                  />
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? '저장 중...' : '저장'}</Text>
        </Pressable>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardWhite,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    ...SHADOW,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  saveButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOW,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
