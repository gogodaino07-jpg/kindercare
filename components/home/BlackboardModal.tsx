import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Text from '../common/AppText';
import { CHALKBOARD_THEMES } from '../../constants/chalkboardThemes';
import { FONT_OPTIONS, FONT_SIZE_OPTIONS } from '../../constants/fontOptions';
import { ThemeColors } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { useAppLock } from '../../context/AppLockContext';
import { useThemeColors } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { Event } from '../../types/models';
import { openCoupangSearch } from '../../utils/coupang';
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
  const { isLocked } = useAppLock();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [editing, setEditing] = useState(false);
  const [draftNote, setDraftNote] = useState('');

  useEffect(() => {
    if (isLocked && event) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked]);

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
              <>
                <Text style={[styles.note, { fontFamily }]}>
                  {event.note || '준비물이 없어요'}
                </Text>
                {event.note ? (
                  <Pressable
                    style={styles.coupangButton}
                    onPress={() => openCoupangSearch(event.note!)}
                  >
                    <Text style={styles.coupangButtonText}>🛒 쿠팡에서 구매</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>

          {!readOnly && !editing ? (
            <Pressable
              style={styles.editButton}
              onPress={() => setEditing(true)}
              accessibilityLabel="일정 수정"
            >
              <Text style={styles.editButtonText}>✏️ 일정 수정</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(30, 41, 59, 0.6)',
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
    coupangButton: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginTop: 10,
    },
    coupangButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.chalkboardText,
    },
    editButton: {
      alignSelf: 'center',
      marginTop: 14,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.chalkboardText,
    },
  });
}
