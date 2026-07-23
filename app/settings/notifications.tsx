import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import Text from '../../components/common/AppText';
import TimeWheelPicker, { formatTimeOfDay } from '../../components/settings/TimeWheelPicker';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { useThemeColors } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { withExternalAction } from '../../utils/externalAction';
import { scheduleEventNotifications } from '../../utils/notifications';

export default function NotificationSettingsScreen() {
  const { notificationSettings, updateNotificationSettings, events } = useAppData();
  const { showToast } = useToast();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [draft, setDraft] = useState(notificationSettings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    updateNotificationSettings(draft);
    try {
      // Requesting notification permissions can briefly blip AppState on
      // some platforms — suppress the lock/splash replay that would
      // otherwise fire the instant the permission dialog closes.
      await withExternalAction(() => scheduleEventNotifications(events, draft));
    } finally {
      setSaving(false);
      showToast('✓ 저장되었습니다.');
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
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          </View>

          {draft.enabled ? (
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
                  thumbColor="#FFFFFF"
                />
              </View>

              {draft.sameDayEnabled ? (
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: { padding: 20 },
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
    rowLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    pickerWrap: {
      marginBottom: 24,
    },
    saveButton: {
      marginHorizontal: 20,
      marginBottom: 16,
      backgroundColor: colors.accent,
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
}
