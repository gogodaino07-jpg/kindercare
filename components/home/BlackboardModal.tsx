import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Text from '../common/AppText';
import { CHALKBOARD_THEMES } from '../../constants/chalkboardThemes';
import { FONT_OPTIONS, FONT_SIZE_OPTIONS } from '../../constants/fontOptions';
import { ThemeColors } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { useThemeColors } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
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
  const { showToast } = useToast();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    showToast('저장이 완료되었습니다.');
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
            {/* Plain <Text> here is AppText, which already multiplies by the
                global font-size setting — don't also scale fontFamily-only
                overrides here or it compounds. The TextInput below isn't
                wrapped by AppText, so it still scales manually. */}
            <Text style={[styles.date, { fontFamily }]}>{formatMD(event.date)}</Text>
            <Text style={[styles.title, { fontFamily }]}>{event.title}</Text>

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
              <Text style={[styles.note, { fontFamily }]}>
                {event.note || '준비물이 없어요'}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
      color: colors.chalkboardText,
      opacity: 0.85,
    },
    title: {
      fontSize: 28,
      color: colors.chalkboardText,
      marginTop: 8,
      marginBottom: 16,
    },
    note: {
      fontSize: 20,
      color: colors.chalkboardText,
      lineHeight: 28,
    },
    input: {
      fontSize: 20,
      color: colors.chalkboardText,
      borderBottomWidth: 1,
      borderBottomColor: colors.chalkboardText,
      paddingVertical: 4,
      minHeight: 60,
      textAlignVertical: 'top',
    },
    saveButton: {
      alignSelf: 'flex-end',
      backgroundColor: colors.chalkboardText,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginTop: 12,
    },
    saveButtonText: {
      color: colors.chalkboardSage,
      fontWeight: '700',
      fontSize: 13,
    },
  });
}
