import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import Text from '../components/common/AppText';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { formatMD, parseISODate, toISODate } from '../utils/date';

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
          <Text style={styles.label}>날짜 *</Text>
          {Platform.OS === 'web' ? (
            <DateTimePicker
              value={date}
              mode="date"
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
                  onChange={(event, selected) => {
                    setShowPicker(Platform.OS === 'ios');
                    if (selected) setDate(selected);
                  }}
                />
              ) : null}
            </>
          )}

          <Text style={styles.label}>제목 *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setTitleError(false);
            }}
            placeholder="예: 병원 예약"
            placeholderTextColor={colors.textSecondary}
          />
          {titleError ? <Text style={styles.errorText}>제목을 입력해주세요</Text> : null}

          <Text style={styles.label}>준비물/메모</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={note}
            onChangeText={setNote}
            placeholder="선택 입력"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
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
      marginBottom: 8,
      marginTop: 16,
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
      backgroundColor: colors.cardWhite,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
      ...SHADOW,
    },
    multilineInput: {
      minHeight: 80,
      textAlignVertical: 'top',
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
