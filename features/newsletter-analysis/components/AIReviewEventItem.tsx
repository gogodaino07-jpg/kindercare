import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Text from '../../../components/common/AppText';
import { ThemeColors } from '../../../constants/theme';
import { EventItem } from '../../../types/models';
import { DraftEvent } from '../types';
import { stripInvalidCharacters } from '../../../utils/validation';

interface AIReviewEventItemProps {
  event: DraftEvent;
  isEditing: boolean;
  onEditToggle: () => void;
  onUpdate: (patch: Partial<DraftEvent>) => void;
  onDelete: () => void;
  colors: ThemeColors;
}

const TITLE_MAX_LENGTH = 20;
const NOTICE_MAX_LENGTH = 100;
const MEMO_MAX_LENGTH = 200;
const ITEM_MAX_LENGTH = 30;

const CATEGORY_OPTIONS = ['준비물', '특별활동', '행사', '공지'];

let localItemIdCounter = 0;
function newItemId(): string {
  return `local-${Date.now()}-${localItemIdCounter++}`;
}

export const AIReviewEventItem = ({
  event,
  isEditing,
  onEditToggle,
  onUpdate,
  onDelete,
  colors,
}: AIReviewEventItemProps) => {
  const styles = createStyles(colors);
  const hasReviewHint = event.needsReview;
  const items = event.items ?? [];

  const updateItems = (nextItems: EventItem[]) => {
    onUpdate({ items: nextItems, note: nextItems.map((i) => i.name).join('\n') || undefined });
  };

  const updateItemName = (id: string, name: string) => {
    updateItems(items.map((i) => (i.id === id ? { ...i, name: stripInvalidCharacters(name) } : i)));
  };

  const removeItem = (id: string) => {
    updateItems(items.filter((i) => i.id !== id));
  };

  const addItem = () => {
    updateItems([...items, { id: newItemId(), name: '' }]);
  };

  return (
    <View style={[styles.eventRow, hasReviewHint && styles.reviewHighlight]}>
      <View style={styles.eventRowTop}>
        <Pressable style={styles.eventTitleArea} onPress={onEditToggle}>
          {isEditing ? (
            <TextInput
              style={styles.titleInput}
              value={event.title}
              onChangeText={(text) => onUpdate({ title: stripInvalidCharacters(text) })}
              maxLength={TITLE_MAX_LENGTH}
              autoFocus
            />
          ) : (
            <Text style={styles.eventTitle}>
              {event.icon ? `${event.icon} ` : ''}
              {event.title}
              {hasReviewHint && <Text style={{ color: colors.tomorrowRed }}> 🔴</Text>}
            </Text>
          )}
        </Pressable>
        <Pressable onPress={onDelete} style={styles.trashButton}>
          <Text style={styles.trashIcon}>🗑️</Text>
        </Pressable>
      </View>

      {isEditing ? (
        <>
          <View style={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.categoryChip, event.category === cat && styles.categoryChipActive]}
                onPress={() => onUpdate({ category: event.category === cat ? undefined : cat })}
              >
                <Text style={[styles.categoryChipText, event.category === cat && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.inlineRow}>
            <TextInput
              style={[styles.noteInput, styles.inlineInput]}
              value={event.location ?? ''}
              onChangeText={(text) => onUpdate({ location: stripInvalidCharacters(text) || undefined })}
              placeholder="📍 장소 (선택)"
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              style={[styles.noteInput, styles.inlineInput]}
              value={event.time ?? ''}
              onChangeText={(text) => onUpdate({ time: stripInvalidCharacters(text) || undefined })}
              placeholder="🕐 시간 (선택)"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <TextInput
            style={styles.noteInput}
            value={event.noticeText ?? ''}
            onChangeText={(text) => onUpdate({ noticeText: stripInvalidCharacters(text) || undefined })}
            maxLength={NOTICE_MAX_LENGTH}
            placeholder="📢 안내 요약 (선택)"
            placeholderTextColor={colors.textSecondary}
            multiline
          />

          <Text style={styles.sectionLabel}>🎒 준비물</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.itemEditRow}>
              <TextInput
                style={styles.itemInput}
                value={item.name}
                onChangeText={(text) => updateItemName(item.id, text)}
                maxLength={ITEM_MAX_LENGTH}
                placeholder="준비물 이름"
                placeholderTextColor={colors.textSecondary}
              />
              <Pressable onPress={() => removeItem(item.id)} style={styles.itemRemoveButton}>
                <Text style={styles.itemRemoveIcon}>✕</Text>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={addItem} style={styles.addItemButton}>
            <Text style={styles.addItemButtonText}>+ 준비물 추가</Text>
          </Pressable>

          <TextInput
            style={styles.noteInput}
            value={event.memo ?? ''}
            onChangeText={(text) => onUpdate({ memo: stripInvalidCharacters(text) })}
            maxLength={MEMO_MAX_LENGTH}
            placeholder="📝 메모 (선택 입력)"
            placeholderTextColor={colors.textSecondary}
          />
        </>
      ) : (
        <>
          {(event.category || event.location || event.time) && (
            <View style={styles.metaRow}>
              {event.category && (
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>{event.category}</Text>
                </View>
              )}
              {event.time && <Text style={styles.metaText}>🕐 {event.time}</Text>}
              {event.location && <Text style={styles.metaText}>📍 {event.location}</Text>}
            </View>
          )}
          {event.noticeText ? (
            <Text style={styles.noticeText}>{event.noticeText}</Text>
          ) : null}
          {items.length > 0 ? (
            <View style={styles.itemsWrap}>
              {items.map((item) => (
                <View key={item.id} style={styles.itemChip}>
                  <Text style={styles.itemChipText}>🎒 {item.name}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {event.memo ? (
            <View style={styles.memoTag}>
              <Text style={styles.memoTagText}>📝 {event.memo}</Text>
            </View>
          ) : null}
          {hasReviewHint && (
            <View style={styles.reviewBadgeRow}>
              <Text style={styles.reviewBadge}>⚠️ 확인 필요</Text>
              {event.reviewReason && <Text style={styles.reviewReason}>{event.reviewReason}</Text>}
            </View>
          )}
        </>
      )}
    </View>
  );
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    eventRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 12 },
    reviewHighlight: { backgroundColor: '#FFFBEB', borderRadius: 12, paddingHorizontal: 8, marginHorizontal: -8 },
    eventRowTop: { flexDirection: 'row', alignItems: 'center' },
    eventTitleArea: { flex: 1 },
    eventTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    titleInput: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, borderWidth: 1, borderColor: colors.accent, borderRadius: 8, padding: 8 },
    trashButton: { padding: 8 },
    trashIcon: { fontSize: 16 },
    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    categoryTag: { backgroundColor: colors.accent + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    categoryTagText: { fontSize: 11, fontWeight: '800', color: colors.accent },
    metaText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    noticeText: { fontSize: 12, color: colors.textPrimary, marginTop: 6, lineHeight: 17 },
    itemsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    itemChip: { backgroundColor: colors.green50, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    itemChipText: { fontSize: 12, color: colors.green500, fontWeight: '700' },
    memoTag: { alignSelf: 'flex-start', backgroundColor: colors.gray100, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
    memoTagText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    noteInput: { fontSize: 13, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginTop: 8, backgroundColor: colors.gray50 },
    inlineRow: { flexDirection: 'row', gap: 8 },
    inlineInput: { flex: 1, marginTop: 8 },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    categoryChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    categoryChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    categoryChipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    categoryChipTextActive: { color: '#FFFFFF' },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 10, marginBottom: 2 },
    itemEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    itemInput: { flex: 1, fontSize: 13, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, backgroundColor: colors.gray50 },
    itemRemoveButton: { padding: 8 },
    itemRemoveIcon: { fontSize: 14, color: colors.textSecondary },
    addItemButton: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.accent, borderStyle: 'dashed' },
    addItemButtonText: { fontSize: 12, fontWeight: '700', color: colors.accent },
    reviewBadgeRow: { marginTop: 8, padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
    reviewBadge: { fontSize: 11, fontWeight: '900', color: colors.tomorrowRed, marginBottom: 2 },
    reviewReason: { fontSize: 11, color: colors.textSecondary },
  });
}
