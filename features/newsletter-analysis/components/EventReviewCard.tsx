import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Text from '../../../components/common/AppText';
import { getDisplayItems } from '../../../hooks/useLocalChecklist';
import { EventItem } from '../../../types/models';
import { stripInvalidCharacters } from '../../../utils/validation';
import { ScanColors, useScanColors } from '../uiColors';
import { DraftEvent } from '../types';
import { ReviewBadgeAccordion } from './ReviewBadgeAccordion';

let itemIdCounter = 0;
function newItemId(): string {
  return `draft-item-${Date.now()}-${itemIdCounter++}`;
}

interface EventReviewCardProps {
  event: DraftEvent;
  reviewExpanded: boolean;
  onToggleReview: () => void;
  onUpdate: (patch: Partial<DraftEvent>) => void;
  onDelete: () => void;
  onDatePress: () => void;
}

export const EventReviewCard = ({
  event,
  reviewExpanded,
  onToggleReview,
  onUpdate,
  onDelete,
  onDatePress,
}: EventReviewCardProps) => {
  const C = useScanColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const [noticeText, setNoticeText] = useState(
    () => [event.noticeText, event.memo].filter(Boolean).join('\n')
  );
  const [itemsText, setItemsText] = useState(() => getDisplayItems(event).map((i) => i.name).join('\n'));

  // 새 디자인은 memo를 별도로 노출하지 않으므로, 진입 시 한 번 noticeText로 합쳐서
  // 다른 화면(홈 카드/일별 상세 등)에서 memo와 noticeText가 중복 노출되지 않게 정리한다.
  useEffect(() => {
    if (event.memo) {
      onUpdate({ noticeText: noticeText || undefined, memo: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNoticeChange = (text: string) => {
    const cleaned = stripInvalidCharacters(text, '.,!?~()\n');
    setNoticeText(cleaned);
    onUpdate({ noticeText: cleaned || undefined, memo: undefined });
  };

  const handleItemsChange = (text: string) => {
    const cleaned = stripInvalidCharacters(text, '\n');
    setItemsText(cleaned);
    const items: EventItem[] = cleaned
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => {
        const existing = (event.items ?? []).find((i) => i.name === name);
        return existing ?? { id: newItemId(), name, completed: false };
      });
    onUpdate({
      items: items.length > 0 ? items : undefined,
      note: items.length > 0 ? items.map((i) => i.name).join('\n') : undefined,
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryTagText}>{event.category ?? '일정'}</Text>
        </View>
        <View style={styles.topRowRight}>
          <Pressable onPress={onDatePress} style={styles.dateButton} hitSlop={4}>
            <Feather name="calendar" size={13} color={C.slate400} />
            <Text style={styles.dateButtonText}>{event.date}</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={styles.cardDeleteButton} hitSlop={8}>
            <Feather name="trash-2" size={14} color={C.slate400} />
          </Pressable>
        </View>
      </View>

      {event.needsReview && (
        <ReviewBadgeAccordion label="확인필요" expanded={reviewExpanded} onToggle={onToggleReview}>
          <Text style={styles.reviewReasonText}>
            {event.reviewReason ?? '내용을 다시 한 번 확인해주세요.'}
          </Text>
        </ReviewBadgeAccordion>
      )}

      <View style={styles.titleBlock}>
        <Text style={styles.fieldLabel}>행사명 (AI 자동 추출)</Text>
        <View style={styles.titleInputRow}>
          {!!event.icon && <Text style={styles.titleIcon}>{event.icon}</Text>}
          <TextInput
            style={styles.titleInput}
            value={event.title}
            onChangeText={(text) => onUpdate({ title: stripInvalidCharacters(text) })}
            maxLength={20}
          />
        </View>
      </View>

      <View style={styles.noticeBlock}>
        <View style={styles.rowHeader}>
          <View style={styles.rowHeaderLeft}>
            <Feather name="shopping-bag" size={14} color={C.slate700} />
            <Text style={styles.noticeLabel}>준비물 (AI 자동 추출)</Text>
          </View>
          <Text style={styles.editableHint}>줄바꿈으로 구분 · 수정 가능</Text>
        </View>
        <TextInput
          style={styles.noticeInput}
          multiline
          numberOfLines={3}
          value={itemsText}
          onChangeText={handleItemsChange}
          placeholder={'예:\n수건\n갈아입을 옷'}
          placeholderTextColor={C.slate400}
          maxLength={200}
        />
      </View>

      <View style={styles.noticeBlock}>
        <View style={styles.rowHeader}>
          <View style={styles.rowHeaderLeft}>
            <Feather name="bell" size={14} color={C.slate700} />
            <Text style={styles.noticeLabel}>선생님 전달사항 메모</Text>
          </View>
          <Text style={styles.editableHint}>수정 가능</Text>
        </View>
        <TextInput
          style={styles.noticeInput}
          multiline
          numberOfLines={4}
          value={noticeText}
          onChangeText={handleNoticeChange}
          maxLength={200}
        />
      </View>
    </View>
  );
};

function createStyles(C: ScanColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: C.slate100,
    gap: 12,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryTag: {
    backgroundColor: C.slate100,
    borderWidth: 1,
    borderColor: C.slate200,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryTagText: { fontSize: 10, fontWeight: '700', color: C.slate700 },
  topRowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6 },
  dateButtonText: { fontSize: 12, fontWeight: '700', color: C.slate600 },
  cardDeleteButton: { padding: 4 },
  reviewReasonText: { fontSize: 11, color: C.amber700, lineHeight: 16, fontWeight: '600' },
  titleBlock: { gap: 4 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: C.slate400 },
  titleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.slate50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.slate200,
    paddingHorizontal: 10,
  },
  titleIcon: { fontSize: 16 },
  titleInput: { flex: 1, fontSize: 16, fontWeight: '800', color: C.slate900, paddingVertical: 10 },
  noticeBlock: { gap: 6 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noticeLabel: { fontSize: 12, fontWeight: '800', color: C.slate800 },
  editableHint: { fontSize: 10, color: C.slate400, fontWeight: '500' },
  noticeInput: {
    fontSize: 12,
    color: C.slate700,
    backgroundColor: C.slate50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.slate200,
    padding: 10,
    lineHeight: 17,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  });
}
