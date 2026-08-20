import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Text from '../../../components/common/AppText';
import { Event, EventItem } from '../../../types/models';
import { stripInvalidCharacters } from '../../../utils/validation';
import { SCAN_COLORS as C } from '../uiColors';
import { DraftEvent } from '../types';
import { ReviewBadgeAccordion } from './ReviewBadgeAccordion';

let localItemIdCounter = 0;
function newItemId(): string {
  return `local-${Date.now()}-${localItemIdCounter++}`;
}

type BadgeKind = 'review' | 'overlap' | null;

interface EventReviewCardProps {
  event: DraftEvent;
  overlaps: Event[];
  resolution: 'add' | 'overwrite';
  onResolutionChange: (resolution: 'add' | 'overwrite') => void;
  expandedBadge: BadgeKind;
  onToggleBadge: (which: Exclude<BadgeKind, null>) => void;
  onUpdate: (patch: Partial<DraftEvent>) => void;
  onDelete: () => void;
  onDatePress: () => void;
}

export const EventReviewCard = ({
  event,
  overlaps,
  resolution,
  onResolutionChange,
  expandedBadge,
  onToggleBadge,
  onUpdate,
  onDelete,
  onDatePress,
}: EventReviewCardProps) => {
  const items = event.items ?? [];
  const [noticeText, setNoticeText] = useState(
    () => [event.noticeText, event.memo].filter(Boolean).join('\n')
  );
  const [newItemText, setNewItemText] = useState('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // 새 디자인은 memo를 별도로 노출하지 않으므로, 진입 시 한 번 noticeText로 합쳐서
  // 다른 화면(홈 카드/일별 상세 등)에서 memo와 noticeText가 중복 노출되지 않게 정리한다.
  useEffect(() => {
    if (event.memo) {
      onUpdate({ noticeText: noticeText || undefined, memo: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateItems = (nextItems: EventItem[]) => {
    onUpdate({ items: nextItems, note: nextItems.map((i) => i.name).join('\n') || undefined });
  };

  const removeItem = (id: string) => {
    updateItems(items.filter((i) => i.id !== id));
  };

  const handleAddItem = () => {
    const name = stripInvalidCharacters(newItemText).trim();
    if (!name) return;
    updateItems([...items, { id: newItemId(), name }]);
    setNewItemText('');
  };

  const handleNoticeChange = (text: string) => {
    const cleaned = stripInvalidCharacters(text, '.,!?~()\n');
    setNoticeText(cleaned);
    onUpdate({ noticeText: cleaned || undefined, memo: undefined });
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
        <ReviewBadgeAccordion
          label="확인필요"
          expanded={expandedBadge === 'review'}
          onToggle={() => onToggleBadge('review')}
        >
          <Text style={styles.reviewReasonText}>
            {event.reviewReason ?? '내용을 다시 한 번 확인해주세요.'}
          </Text>
        </ReviewBadgeAccordion>
      )}

      {overlaps.length > 0 && (
        <ReviewBadgeAccordion
          label="기존 일정과 겹쳐요"
          expanded={expandedBadge === 'overlap'}
          onToggle={() => onToggleBadge('overlap')}
        >
          <Text style={styles.overlapListText}>
            {overlaps.map((o) => o.title).join(', ')}와(과) 같은 날짜예요
          </Text>
          <View style={styles.overlapButtonRow}>
            <Pressable
              onPress={() => onResolutionChange('overwrite')}
              style={[styles.overlapButton, resolution === 'overwrite' && styles.overlapButtonActive]}
            >
              <Text
                style={[styles.overlapButtonText, resolution === 'overwrite' && styles.overlapButtonTextActive]}
              >
                기존 일정 덮어쓰기
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onResolutionChange('add')}
              style={[styles.overlapButton, resolution === 'add' && styles.overlapButtonActive]}
            >
              <Text style={[styles.overlapButtonText, resolution === 'add' && styles.overlapButtonTextActive]}>
                새 일정으로 추가
              </Text>
            </Pressable>
          </View>
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

      <View style={styles.checklistBlock}>
        <View style={styles.rowHeader}>
          <View style={styles.rowHeaderLeft}>
            <Text style={styles.checklistTitle}>추출된 준비물 목록</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{items.length}개</Text>
            </View>
          </View>
          <Text style={styles.editableHint}>직접 추가/삭제 가능</Text>
        </View>

        <View style={styles.itemList}>
          {items.map((item) => (
            <View key={item.id} style={styles.itemBlock}>
              <View style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <View style={[styles.checkBox, item.needsReview && styles.checkBoxReview]}>
                    <Feather name="check" size={11} color={item.needsReview ? C.amber700 : C.white} />
                  </View>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                <Pressable onPress={() => removeItem(item.id)} style={styles.itemDeleteButton} hitSlop={8}>
                  <Feather name="trash-2" size={14} color={C.slate400} />
                </Pressable>
              </View>
              {item.needsReview && (
                <ReviewBadgeAccordion
                  label="확인필요"
                  expanded={expandedItemId === item.id}
                  onToggle={() => setExpandedItemId((prev) => (prev === item.id ? null : item.id))}
                >
                  <Text style={styles.reviewReasonText}>
                    {item.reviewReason ?? '내용을 다시 한 번 확인해주세요.'}
                  </Text>
                </ReviewBadgeAccordion>
              )}
            </View>
          ))}
        </View>

        <View style={styles.addItemRow}>
          <TextInput
            style={styles.addItemInput}
            placeholder="놓친 준비물 직접 추가..."
            placeholderTextColor={C.slate400}
            value={newItemText}
            onChangeText={setNewItemText}
            onSubmitEditing={handleAddItem}
            returnKeyType="done"
            maxLength={30}
          />
          <Pressable onPress={handleAddItem} style={styles.addItemButton}>
            <Feather name="plus" size={13} color={C.white} />
            <Text style={styles.addItemButtonText}>추가</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.white,
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
  overlapListText: { fontSize: 11, color: C.amber700, fontWeight: '700', marginBottom: 8 },
  overlapButtonRow: { flexDirection: 'row', gap: 8 },
  overlapButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.amber200,
  },
  overlapButtonActive: { backgroundColor: C.slate900, borderColor: C.slate900 },
  overlapButtonText: { fontSize: 11, fontWeight: '800', color: C.amber700 },
  overlapButtonTextActive: { color: C.white },
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
  checklistBlock: { gap: 10 },
  checklistTitle: { fontSize: 12, fontWeight: '800', color: C.slate900 },
  countBadge: { backgroundColor: C.slate100, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  countBadgeText: { fontSize: 10, fontWeight: '700', color: C.slate700 },
  itemList: { gap: 6 },
  itemBlock: { gap: 6 },
  itemRow: {
    backgroundColor: C.slate50,
    borderWidth: 1,
    borderColor: C.slate200,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  checkBox: { width: 16, height: 16, borderRadius: 4, backgroundColor: C.slate900, alignItems: 'center', justifyContent: 'center' },
  checkBoxReview: { backgroundColor: C.amber100 },
  itemName: { fontSize: 12, fontWeight: '700', color: C.slate800, flexShrink: 1 },
  itemDeleteButton: { padding: 4 },
  addItemRow: { flexDirection: 'row', gap: 6 },
  addItemInput: {
    flex: 1,
    backgroundColor: C.slate50,
    borderWidth: 1,
    borderColor: C.slate200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: C.slate800,
  },
  addItemButton: {
    backgroundColor: C.slate900,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addItemButtonText: { fontSize: 12, fontWeight: '700', color: C.white },
});
