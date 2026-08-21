import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import TextInput from '../common/ClearableTextInput';
import { useAlert } from '../../context/AlertContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import { getDisplayItems } from '../../hooks/useLocalChecklist';
import { Event, EventItem } from '../../types/models';
import { parseISODate, toISODate, WEEKDAY_KO } from '../../utils/date';
import { stripInvalidCharacters } from '../../utils/validation';
import { calendarTheme as t } from './calendarTheme';

interface EditEventModalProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
}

let itemIdCounter = 0;
function newItemId(): string {
  return `manual-${Date.now()}-${itemIdCounter++}`;
}

export default function EditEventModal({ visible, event, onClose }: EditEventModalProps) {
  const { updateEvent, deleteEvent } = useAppData();
  const { showToast } = useToast();
  const { showAlert } = useAlert();

  const [date, setDate] = useState(() => new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [itemsText, setItemsText] = useState('');

  useEffect(() => {
    if (visible && event) {
      setDate(parseISODate(event.date));
      setTitle(event.title);
      setNoticeText(event.noticeText ?? '');
      setItemsText(getDisplayItems(event).map((i) => i.name).join('\n'));
      setShowPicker(false);
    }
  }, [visible, event]);

  if (!event) return null;

  const handleSave = () => {
    if (!title.trim()) {
      showToast('일정 제목을 입력해 주세요.');
      return;
    }

    const items: EventItem[] = itemsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => {
        const existing = getDisplayItems(event).find((i) => i.name === name);
        return existing ?? { id: newItemId(), name, completed: false };
      });

    updateEvent(event.id, {
      date: toISODate(date),
      title: title.trim(),
      note: items.length > 0 ? items.map((i) => i.name).join('\n') : undefined,
      items: items.length > 0 ? items : undefined,
      noticeText: noticeText.trim() || undefined,
    });
    showToast('일정을 수정했어요.');
    onClose();
  };

  const handleDelete = () => {
    showAlert({
      title: '일정 삭제',
      message: '정말 이 일정을 삭제하시겠습니까?',
      buttons: [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            deleteEvent(event.id);
            showToast('일정이 삭제되었습니다.');
            onClose();
          },
        },
      ],
    });
  };

  const weekdayLabel = WEEKDAY_KO[date.getDay()];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>일정 수정</Text>
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
            <Text style={styles.saveButtonText}>저장하기</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>일정 삭제</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  deleteButton: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: t.rose,
  },
});
