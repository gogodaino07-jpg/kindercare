import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import TextInput from '../common/ClearableTextInput';
import { useAlert } from '../../context/AlertContext';
import { useAppData } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
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
  const router = useRouter();
  const { selectedChild, addEvent } = useAppData();
  const { showToast } = useToast();
  const { showAlert } = useAlert();
  const { showIfEligible: showAddEventAd } = useCalendarAddEventInterstitialAd();
  const t = useCalendarTheme();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';
  const styles = useMemo(() => createStyles(t, isDark), [t, isDark]);

  const [date, setDate] = useState(() => parseISODate(initialDateISO));
  const [showPicker, setShowPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [itemsText, setItemsText] = useState('');
  // 등록 버튼을 누른 뒤 광고 노출 여부에 따라 완료까지 몇 초 걸릴 수 있어,
  // 멈춘 것처럼 보이지 않도록 그동안 버튼에 로딩 상태를 표시한다.
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // 이 모달은 화면 중앙에 뜨는 카드라, KeyboardAvoidingView만으로는(특히 안드로이드에서)
  // 키보드가 올라와도 카드 위치가 그대로라 맨 아래 "준비물" 입력창이 키보드에 가려졌다.
  // (app-lock 화면에서도 같은 이유로 실제 키보드 높이를 직접 받아 처리한 전례가 있음)
  // 실제 키보드 높이만큼 카드를 아래쪽에 붙여서 항상 키보드 위에 보이게 한다.
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setDate(parseISODate(initialDateISO));
      setTitle('');
      setNoticeText('');
      setItemsText('');
      setShowPicker(false);
      setIsSaving(false);
    }
  }, [visible, initialDateISO]);

  // 저장 버튼을 누르면 광고 노출 여부와 상관없이 등록과 동시에 토스트를 띄우고
  // 모달을 닫는다. 예전엔 광고가 뜬 경우에만 모달을 안 닫고 폼을 비워뒀었는데,
  // 사용자가 등록이 안 된 줄 알고 버튼을 다시 눌러 일정이 중복 등록되는 문제가
  // 있어서 광고 유무 상관없이 동작을 통일했다.
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
      showAlert({
        title: '알림',
        message: '등록된 아이 정보가 없습니다.',
        buttons: [
          { text: '취소', style: 'cancel' },
          {
            text: '아이 정보 등록하러가기',
            onPress: () => {
              onClose();
              router.push('/child-profile');
            },
          },
        ],
      });
      return;
    }

    setIsSaving(true);
    await showAddEventAd();

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

    setIsSaving(false);
    showToast('✓ 일정을 등록했어요.');
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
      <View
        style={[
          styles.overlay,
          keyboardHeight > 0 && { justifyContent: 'flex-end', paddingBottom: keyboardHeight + 16 },
        ]}
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
                <Text style={styles.label}>일정명 <Text style={styles.requiredMark}>*필수</Text></Text>
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
              <Text style={styles.label}>선생님 전언 · 알림 메모 <Text style={styles.optionalMark}>(선택)</Text></Text>
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
              <Text style={styles.label}>준비물 <Text style={styles.optionalMark}>(선택, 줄바꿈으로 구분)</Text></Text>
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
            style={[styles.saveButton, (!title.trim() || isSaving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!title.trim() || isSaving}
          >
            {isSaving ? (
              <View style={styles.savingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.saveButtonText}>등록 중...</Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>등록하기</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(t: import('./calendarTheme').CalendarTheme, isDark: boolean) {
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
    // 다크모드에서는 카드 배경이 거의 검정이라 딤 배경과 구분이 흐려져 옅은 테두리로 경계를 준다.
    ...(isDark && { borderWidth: 1, borderColor: t.border }),
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
  requiredMark: {
    fontSize: 11,
    fontWeight: '800',
    color: t.rose,
  },
  optionalMark: {
    fontSize: 11,
    fontWeight: '600',
    color: t.textMuted,
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
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  });
}
