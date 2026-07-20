import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import { COLORS, SHADOW } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { formatMD, toISODate } from '../utils/date';

export default function AddEventScreen() {
  const router = useRouter();
  const { selectedChild, addEvent } = useAppData();

  const [date, setDate] = useState(new Date());
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
    router.back();
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.content}>
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
            placeholderTextColor={COLORS.textSecondary}
          />
          {titleError ? <Text style={styles.errorText}>제목을 입력해주세요</Text> : null}

          <Text style={styles.label}>준비물/메모</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={note}
            onChangeText={setNote}
            placeholder="선택 입력"
            placeholderTextColor={COLORS.textSecondary}
            multiline
          />

          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>저장</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  dateButton: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...SHADOW,
  },
  dateButtonText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    ...SHADOW,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: COLORS.tomorrowRed,
    fontSize: 12,
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
    ...SHADOW,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
