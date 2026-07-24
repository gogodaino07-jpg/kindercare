import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import Text from '../components/common/AppText';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { formatMD, parseISODate, toISODate } from '../utils/date';

const TITLE_MAX_LENGTH = 20;
const NOTE_MAX_LENGTH = 50;
const MEMO_MAX_LENGTH = 200;

export default function AddEventScreen() {
  const router = useRouter();
  const { selectedChild, addEvent } = useAppData();
  const { showToast } = useToast();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Pre-fill with the date the user had selected on the calendar (if any) —
  // parsed via parseISODate (local Y/M/D components) rather than `new
  // Date(dateParam)` to avoid the UTC-string-parsing day-shift pitfall.
  const [date, setDate] = useState(() => (dateParam ? parseISODate(dateParam) : new Date()));
  const [showPicker, setShowPicker] = useState(Platform.OS === 'web');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [memo, setMemo] = useState('');
  const [notifyDayBefore, setNotifyDayBefore] = useState(true);
  const [titleError, setTitleError] = useState(false);

  const handleSave = () => {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    if (!selectedChild) return;
    addEvent({
      date: toISODate(date),
      title: title.trim(),
      note: note.trim() || undefined,
      memo: memo.trim() || undefined,
      notifyDayBefore,
      childId: selectedChild.id,
      source: 'manual',
      icon: '📌',
    });
    showToast('저장이 완료되었습니다.');
    router.back();
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, styles.dateLabel]}>날짜 *</Text>
          {Platform.OS === 'web' ? (
            <DateTimePicker
              value={date}
              mode="date"
              themeVariant="light"
              accentColor={colors.accent}
              onChange={(_, selected) => selected && setDate(selected)}
            />
          ) : (
            <>
              <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
                <Text style={styles.dateButtonText}>{formatMD(toISODate(date))}</Text>
              </Pressable>
              {showPicker ? (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  themeVariant="light"
                  accentColor={colors.accent}
                  onChange={(event, selected) => {
                    setShowPicker(Platform.OS === 'ios');
                    if (selected) setDate(selected);
                  }}
                />
              ) : null}
            </>
          )}

          <View style={styles.labelRow}>
            <Text style={styles.label}>제목 *</Text>
            <Text style={styles.counterText}>{title.length}/{TITLE_MAX_LENGTH}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setTitleError(false);
            }}
            maxLength={TITLE_MAX_LENGTH}
            placeholder="예: 병원 예약"
            placeholderTextColor={colors.textSecondary}
          />
          {titleError ? <Text style={styles.errorText}>제목을 입력해주세요</Text> : null}

          <View style={[styles.labelRow, styles.labelRowSpaced]}>
            <Text style={styles.label}>🎒 준비물</Text>
            <Text style={styles.counterText}>{note.length}/{NOTE_MAX_LENGTH}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            maxLength={NOTE_MAX_LENGTH}
            placeholder="예: 물통, 편한 신발, 여벌 옷"
            placeholderTextColor={colors.textSecondary}
          />

          <View style={[styles.labelRow, styles.labelRowSpaced]}>
            <Text style={styles.label}>📝 메모</Text>
            <Text style={styles.counterText}>{memo.length}/{MEMO_MAX_LENGTH}</Text>
          </View>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={memo}
            onChangeText={setMemo}
            maxLength={MEMO_MAX_LENGTH}
            placeholder="상세 주의사항 등 (선택 입력)"
            placeholderTextColor={colors.textSecondary}
            multiline
          />

          <View style={styles.notifyRow}>
            <Text style={styles.notifyLabel}>🔔 등원 전날 저녁 8시 알림 받기</Text>
            <Switch
              value={notifyDayBefore}
              onValueChange={setNotifyDayBefore}
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          </View>
        </ScrollView>

        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>저장</Text>
        </Pressable>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: { padding: 20 },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    dateLabel: {
      marginBottom: 8,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
      marginBottom: 8,
    },
    labelRowSpaced: {
      marginTop: 20,
    },
    counterText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    dateButton: {
      backgroundColor: colors.cardWhite,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      ...SHADOW,
    },
    dateButtonText: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    input: {
      backgroundColor: '#F5F7FA',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
    },
    multilineInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    notifyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardWhite,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginTop: 20,
      ...SHADOW,
    },
    notifyLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      marginRight: 12,
    },
    errorText: {
      color: colors.tomorrowRed,
      fontSize: 12,
      marginTop: 6,
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
