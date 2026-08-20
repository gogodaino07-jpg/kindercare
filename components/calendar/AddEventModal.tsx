import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Text from '../common/AppText';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import { EventItem } from '../../types/models';
import { parseISODate, toISODate, WEEKDAY_KO } from '../../utils/date';
import { stripInvalidCharacters } from '../../utils/validation';
import { calendarTheme as t } from './calendarTheme';

interface AddEventModalProps {
  visible: boolean;
  initialDateISO: string;
  onClose: () => void;
}

let itemIdCounter = 0;
function newItemId(): string {
  return `manual-${Date.now()}-${itemIdCounter++}`;
}

export default function AddEventModal({ visible, initialDateISO, onClose }: AddEventModalProps) {
  const { selectedChild, addEvent } = useAppData();
  const { showToast } = useToast();

  const [date, setDate] = useState(() => parseISODate(initialDateISO));
  const [showPicker, setShowPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [itemsText, setItemsText] = useState('');

  useEffect(() => {
    if (visible) {
      setDate(parseISODate(initialDateISO));
      setTitle('');
      setNoticeText('');
      setItemsText('');
      setShowPicker(false);
    }
  }, [visible, initialDateISO]);

  const handleSave = () => {
    if (!title.trim()) {
      showToast('일정 제목을 입력해 주세요.');
      return;
    }
    if (!selectedChild) {
      showToast('등록된 아이 정보가 없습니다.');
      return;
    }

    const items: EventItem[] = itemsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ id: newItemId(), name, completed: false }));

    addEvent({
      date: toISODate(date),
      title: title.trim(),
      note: items.length > 0 ? items.map((i) => i.name).join('\n') : undefined,
      items: items.length > 0 ? items : undefined,
      noticeText: noticeText.trim() || undefined,
      category: '원내 활동',
      notifyDayBefore: true,
      childId: selectedChild.id,
      source: 'manual',
      icon: '📌',
    });
    showToast('일정을 등록했어요.');
    onClose();
  };

  const weekdayLabel = WEEKDAY_KO[date.getDay()];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>새 일정 등록</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color={t.textSecondary} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.field}>
              <Text style={styles.label}>날짜</Text>
              <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
                <Text style={styles.dateButtonText}>
                  {date.getFullYear()}.{String(date.getMonth() + 1).padStart(2, '0')}.{String(date.getDate()).padStart(2, '0')} ({weekdayLabel})
                </Text>
                <MaterialCommunityIcons name="calendar-blank-outline" size={16} color={t.textSecondary} />
              </Pressable>
              {showPicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  onChange={(_, selected) => {
                    setShowPicker(Platform.OS === 'ios');
                    if (selected) setDate(selected);
                  }}
                />
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>일정명</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={(text) => setTitle(stripInvalidCharacters(text))}
                placeholder="예: 여름 물놀이 행사"
                placeholderTextColor={t.textMuted}
                maxLength={30}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>선생님 전언 · 알림 메모</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={noticeText}
                onChangeText={setNoticeText}
                placeholder="선생님께 전달받은 안내 내용을 적어주세요"
                placeholderTextColor={t.textMuted}
                multiline
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>준비물 (줄바꿈으로 구분)</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={itemsText}
                onChangeText={(text) => setItemsText(stripInvalidCharacters(text))}
                placeholder={'예:\n물통\n여벌 옷'}
                placeholderTextColor={t.textMuted}
                multiline
              />
            </View>
          </ScrollView>

          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>등록하기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 46, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '82%',
    backgroundColor: t.cardWhite,
    borderRadius: 24,
    padding: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: t.textPrimary,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: t.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: t.gray50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: t.textPrimary,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.gray50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: t.textPrimary,
  },
  saveButton: {
    marginTop: 4,
    backgroundColor: t.amber,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
