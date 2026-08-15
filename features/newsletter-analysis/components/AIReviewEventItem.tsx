import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Text from '../../../components/common/AppText';
import { ThemeColors } from '../../../constants/theme';
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
const NOTE_MAX_LENGTH = 50;
const MEMO_MAX_LENGTH = 200;

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
          <TextInput
            style={styles.noteInput}
            value={event.note ?? ''}
            onChangeText={(text) => onUpdate({ note: stripInvalidCharacters(text) })}
            maxLength={NOTE_MAX_LENGTH}
            placeholder="🎒 준비물을 적어주세요"
            placeholderTextColor={colors.textSecondary}
          />
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
          {event.note ? (
            <View style={styles.noteTag}>
              <Text style={styles.noteTagText}>🎒 {event.note}</Text>
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
    noteTag: { alignSelf: 'flex-start', backgroundColor: colors.green50, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
    noteTagText: { fontSize: 12, color: colors.green500, fontWeight: '700' },
    memoTag: { alignSelf: 'flex-start', backgroundColor: colors.gray100, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
    memoTagText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    noteInput: { fontSize: 13, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginTop: 8, backgroundColor: colors.gray50 },
    reviewBadgeRow: { marginTop: 8, padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
    reviewBadge: { fontSize: 11, fontWeight: '900', color: colors.tomorrowRed, marginBottom: 2 },
    reviewReason: { fontSize: 11, color: colors.textSecondary },
  });
}
