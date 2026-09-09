import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import TextInput from '../common/ClearableTextInput';
import { useAlert } from '../../context/AlertContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import { useCalendarAddEventInterstitialAd } from '../../hooks/useCalendarAddEventInterstitialAd';
import { EventItem } from '../../types/models';
import { parseISODate, toISODate, WEEKDAY_KO } from '../../utils/date';
import { stripInvalidCharacters } from '../../utils/validation';
import { useCalendarTheme } from './useCalendarTheme';

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
  const { showAlert } = useAlert();
  const { showIfEligible: showAddEventAd } = useCalendarAddEventInterstitialAd();
  const t = useCalendarTheme();
  const styles = useMemo(() => createStyles(t), [t]);

  const [date, setDate] = useState(() => parseISODate(initialDateISO));
  const [showPicker, setShowPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [itemsText, setItemsText] = useState('');
  // 저장 광고가 실제로 뜬 경우엔 광고를 다 보고 돌아왔을 때 바로 등록하지 않고
  // 입력한 내용을 그대로 남겨둔 채 "저장"을 한 번 더 눌러야 진짜 등록되게 한다.
  const [pendingAdReview, setPendingAdReview] = useState(false);

  useEffect(() => {
    if (visible) {
      setDate(parseISODate(initialDateISO));
      setTitle('');
      setNoticeText('');
      setItemsText('');
      setShowPicker(false);
      setPendingAdReview(false);
    }
  }, [visible, initialDateISO]);

  const handleSave = async () => {
    // 이 모달이 열려있는 동안 안드로이드에서는 Modal이 앱 루트와 별도의
    // 네이티브 창에 그려져서, 루트에 뜨는 토스트가 이 모달 뒤로 가려져
    // 안 보인다(모달을 닫지 않고 검증 실패로 여기서 멈추는 경우). 모달과
    // 같은 방식(별도 Modal)으로 뜨는 alert를 대신 써서 항상 위에 보이게 한다.
    if (!title.trim()) {
      showAlert({ title: '알림', message: '일정 제목을 입력해 주세요.' });
      return;
    }
    if (!selectedChild) {
      showAlert({ title: '알림', message: '등록된 아이 정보가 없습니다.' });
      return;
    }

    if (!pendingAdReview) {
      const adShown = await showAddEventAd();
      if (adShown) {
        setPendingAdReview(true);
        showToast('내용을 확인하고 저장을 한 번 더 눌러주세요.');
        return;
      }
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

  const isDirty =
    title.trim() !== '' ||
    noticeText.trim() !== '' ||
    itemsText.trim() !== '' ||
    toISODate(date) !== initialDateISO;

  const handleRequestClose = () => {
    if (!isDirty) {
      onClose();
      return;
    }
    showAlert({
      title: '작성 중인 내용이 있어요',
      message: '지금 나가면 입력한 내용이 사라져요. 그래도 나가시겠어요?',
      buttons: [
        { text: '계속 작성', style: 'cancel' },
        { text: '나가기', style: 'destructive', onPress: onClose },
      ],
    });
  };

  const weekdayLabel = WEEKDAY_KO[date.getDay()];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleRequestClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleRequestClose} />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>새 일정 등록</Text>
            <Pressable onPress={handleRequestClose} hitSlop={8}>
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
              <View style={styles.labelRow}>
                <Text style={styles.label}>일정명</Text>
                <Text style={styles.charCount}>{title.length}/30자</Text>
              </View>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
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

          <Pressable
            style={[styles.saveButton, !title.trim() && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!title.trim()}
          >
            <Text style={styles.saveButtonText}>등록하기</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(t: import('./calendarTheme').CalendarTheme) {
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charCount: {
    fontSize: 11.5,
    fontWeight: '600',
    color: t.textMuted,
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
  saveButtonDisabled: {
    backgroundColor: t.gray200,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  });
}
