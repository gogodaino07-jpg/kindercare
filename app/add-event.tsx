import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View, KeyboardAvoidingView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import Text from '../components/common/AppText';
import { SHADOW, type ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { formatMD, parseISODate, toISODate, WEEKDAY_KO } from '../utils/date';
import { stripInvalidCharacters } from '../utils/validation';

const COUPANG_LINK = 'https://link.coupang.com/a/fHdMU98clE';
const TITLE_MAX_LENGTH = 20;
const NOTE_MAX_LENGTH = 50;
const MEMO_MAX_LENGTH = 200;

function createStyles(colors: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.skyBackground,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 160, // Increased to allow negative margin without clipping
      paddingBottom: 120 + bottomInset,
    },
    headerSection: {
      marginTop: -192, // Adjusted to exactly match the -32 starting point of calendarCard (160 - 192 = -32)
      marginBottom: 12,
      paddingLeft: 4,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    formCard: {
      backgroundColor: colors.cardWhite,
      borderRadius: 24,
      marginTop: -10, // Adjusted to match the visual height of calendarCard
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
      shadowOpacity: 0.04,
    },
    inputGroup: {
      marginBottom: 20,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginLeft: 2,
    },
    counterText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    dateButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.gray50,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dateText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginRight: 8,
    },
    dayBadge: {
      backgroundColor: colors.gray100,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    dayBadgeText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: colors.textSecondary,
    },
    editIcon: {
      fontSize: 18,
    },
    input: {
      backgroundColor: colors.gray50,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputError: {
      borderColor: colors.tomorrowRed,
    },
    itemInputRow: {
      flexDirection: 'row',
      gap: 8,
    },
    addButton: {
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
    },
    chipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.lightBlueBg,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipText: {
      fontSize: 14,
      color: colors.accent,
      fontWeight: '600',
      marginRight: 6,
    },
    chipClose: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: 'bold',
    },
    multilineInput: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    errorText: {
      color: colors.tomorrowRed,
      fontSize: 12,
      marginTop: 6,
      marginLeft: 4,
    },
    fabContainer: {
      position: 'absolute',
      bottom: 24 + bottomInset, // Moved to match notifications.tsx
      left: 20,
      right: 20,
      zIndex: 100,
    },
    saveButton: {
      backgroundColor: '#000000', // Changed to Black
      paddingVertical: 18,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
      shadowColor: '#000000',
      shadowOpacity: 0.3,
      elevation: 5,
    },
    saveButtonDisabled: {
      backgroundColor: '#94A3B8',
      opacity: 0.6,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
}

export default function AddEventScreen() {
  const router = useRouter();
  const { selectedChild, addEvent } = useAppData();
  const { showToast } = useToast();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);

  const [date, setDate] = useState(() => {
    const dateStr = Array.isArray(dateParam) ? dateParam[0] : dateParam;
    return dateStr ? parseISODate(dateStr) : new Date();
  });
  const [showPicker, setShowPicker] = useState(Platform.OS === 'web');
  const [title, setTitle] = useState('');
  const [itemInput, setItemInput] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const [titleError, setTitleError] = useState(false);

  const addItem = () => {
    const trimmed = itemInput.trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) {
      showToast('이미 추가된 항목입니다.');
      return;
    }
    setItems([...items, trimmed]);
    setItemInput('');
  };

  const removeItem = (target: string) => {
    setItems(items.filter((i) => i !== target));
  };

  const handleSave = () => {
    if (!title.trim()) {
      setTitleError(true);
      showToast('일정 제목을 입력해 주세요.');
      return;
    }

    if (!selectedChild) {
      showToast('등록된 아이 정보가 없습니다. 아이 프로필을 먼저 설정해 주세요.');
      console.warn('Attempted to save event without selectedChild');
      return;
    }

    const noteString = items.join(', ');

    try {
      const eventData = {
        date: toISODate(date),
        title: title.trim(),
        note: noteString || undefined,
        memo: memo.trim() || undefined,
        notifyDayBefore: true,
        childId: selectedChild.id,
        source: 'manual' as const,
        icon: '📌',
      };
      console.log('[AddEvent] Saving event:', eventData);
      addEvent(eventData);
      showToast('저장이 완료되었습니다.');
      router.back();
    } catch (error) {
      console.error('[AddEvent] Failed to save event:', error);
      showToast('일정 저장 중 오류가 발생했습니다.');
    }
  };

  const handleCoupangPress = () => {
    Linking.openURL(COUPANG_LINK).catch((err) => console.error('Failed to open Coupang link:', err));
  };

  const isSaveDisabled = !title.trim();
  const weekdayLabel = WEEKDAY_KO[date.getDay()];

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            style={{ overflow: 'visible' }}
          >
            <View style={styles.headerSection}>
              <Text style={styles.headerSubtitle}>아이의 소중한 일정을 기록해 주세요 🐥</Text>
            </View>

          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { marginBottom: 8 }]}>날짜 선택</Text>
              <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
                <View style={styles.dateInfo}>
                  <Text style={styles.dateText}>{`${date.getMonth() + 1}.${date.getDate()} (${WEEKDAY_KO[date.getDay()]})`}</Text>
                </View>
                <Text style={styles.editIcon}>🗓️</Text>
              </Pressable>
              {showPicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  onChange={(event, selected) => {
                    setShowPicker(Platform.OS === 'ios');
                    if (selected) setDate(selected);
                  }}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>일정 제목 <Text style={{ color: '#E11D48' }}>*</Text></Text>
                <Text style={styles.counterText}>{title.length}/{TITLE_MAX_LENGTH}</Text>
              </View>
              <TextInput
                style={[styles.input, titleError && styles.inputError]}
                value={title}
                onChangeText={(t) => {
                  setTitle(t);
                  setTitleError(false);
                }}
                maxLength={TITLE_MAX_LENGTH}
                placeholder="예: 어린이집 현장학습"
                placeholderTextColor={colors.textSecondary}
              />
              {titleError && <Text style={styles.errorText}>제목을 입력해주세요</Text>}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>🎒 준비물 추가</Text>
                <Text style={styles.counterText}>{items.length}개 추가됨</Text>
              </View>
              <View style={styles.itemInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={itemInput}
                  onChangeText={(t) => setItemInput(stripInvalidCharacters(t))}
                  placeholder="예: 물통, 수건 (하나씩 입력)"
                  placeholderTextColor={colors.textSecondary}
                  onSubmitEditing={addItem}
                  blurOnSubmit={false}
                />
                <TouchableOpacity style={styles.addButton} onPress={addItem}>
                  <Text style={styles.addButtonText}>추가</Text>
                </TouchableOpacity>
              </View>
              {items.length > 0 && (
                <View style={styles.chipsContainer}>
                  {items.map((item, idx) => (
                    <View key={idx} style={styles.chip}>
                      <Text style={styles.chipText}>{item}</Text>
                      <TouchableOpacity onPress={() => removeItem(item)} hitSlop={8}>
                        <Text style={styles.chipClose}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>📝 상세 메모</Text>
                <Text style={styles.counterText}>{memo.length}/{MEMO_MAX_LENGTH}</Text>
              </View>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={memo}
                onChangeText={(t) => setMemo(t)}
                maxLength={MEMO_MAX_LENGTH}
                placeholder="추가로 기억해야 할 내용을 적어주세요"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Action Button (Save) - Outside KeyboardAvoidingView for exact sync with calendar.tsx */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaveDisabled && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaveDisabled}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>일정 저장하기</Text>
        </TouchableOpacity>
      </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}
