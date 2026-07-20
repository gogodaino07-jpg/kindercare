import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CHALKBOARD_THEMES } from '../../constants/chalkboardThemes';
import { FONT_OPTIONS, FONT_SIZE_OPTIONS } from '../../constants/fontOptions';
import { COLORS } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { Event } from '../../types/models';
import { formatMD } from '../../utils/date';

interface BlackboardModalProps {
  event: Event | null;
  onClose: () => void;
  /** Read-only variant used by the past-events screen: no edit icon, close (X) only. */
  readOnly?: boolean;
}

export default function BlackboardModal({ event, onClose, readOnly }: BlackboardModalProps) {
  const { updateEventNote, fontChoiceId, fontSizeChoice, chalkboardThemeId } = useAppData();
  const [editing, setEditing] = useState(false);
  const [draftNote, setDraftNote] = useState('');

  const theme =
    CHALKBOARD_THEMES.find((t) => t.id === chalkboardThemeId) ?? CHALKBOARD_THEMES[0];
  const fontFamily = FONT_OPTIONS.find((f) => f.id === fontChoiceId)?.fontFamily;
  const fontScale = FONT_SIZE_OPTIONS.find((f) => f.id === fontSizeChoice)?.scale ?? 1;

  useEffect(() => {
    if (event) {
      setDraftNote(event.note ?? '');
      setEditing(false);
    }
  }, [event]);

  if (!event) return null;

  const handleSave = () => {
    updateEventNote(event.id, draftNote.trim());
    setEditing(false);
  };

  return (
    <Modal visible={!!event} transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.frame, { backgroundColor: theme.frame }]}>
          <View style={styles.iconRow}>
            {readOnly ? null : (
              <Pressable
                onPress={() => setEditing((prev) => !prev)}
                accessibilityLabel="준비물 수정"
                style={styles.iconButton}
              >
                <Text style={styles.icon}>✏️</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} accessibilityLabel="닫기" style={styles.iconButton}>
              <Text style={styles.icon}>✕</Text>
            </Pressable>
          </View>

          <View style={[styles.board, { backgroundColor: theme.board }]}>
            <Text style={[styles.date, { fontFamily, fontSize: 18 * fontScale }]}>
              {formatMD(event.date)}
            </Text>
            <Text style={[styles.title, { fontFamily, fontSize: 28 * fontScale }]}>
              {event.icon ? `${event.icon} ` : ''}
              {event.title}
            </Text>

            {editing ? (
              <>
                <TextInput
                  style={[styles.input, { fontFamily, fontSize: 20 * fontScale }]}
                  value={draftNote}
                  onChangeText={setDraftNote}
                  multiline
                  placeholder="준비물을 적어주세요"
                  placeholderTextColor="#D8E0DA"
                />
                <Pressable style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>저장</Text>
                </Pressable>
              </>
            ) : (
              <Text style={[styles.note, { fontFamily, fontSize: 20 * fontScale }]}>
                {event.note || '준비물이 없어요'}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 24, 22, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  frame: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 14,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  iconButton: {
    padding: 6,
    marginLeft: 4,
  },
  icon: {
    fontSize: 16,
  },
  board: {
    borderRadius: 12,
    padding: 24,
    minHeight: 200,
  },
  date: {
    fontSize: 18,
    color: COLORS.chalkboardText,
    opacity: 0.85,
  },
  title: {
    fontSize: 28,
    color: COLORS.chalkboardText,
    marginTop: 8,
    marginBottom: 16,
  },
  note: {
    fontSize: 20,
    color: COLORS.chalkboardText,
    lineHeight: 28,
  },
  input: {
    fontSize: 20,
    color: COLORS.chalkboardText,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.chalkboardText,
    paddingVertical: 4,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  saveButton: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.chalkboardText,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
  },
  saveButtonText: {
    color: COLORS.chalkboardSage,
    fontWeight: '700',
    fontSize: 13,
  },
});
