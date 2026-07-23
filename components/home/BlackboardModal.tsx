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
import { isValidCoupangKeyword } from '../../utils/validation';

interface BlackboardModalProps {
  event: Event | null;
  onClose: () => void;
  /** Read-only variant used by the past-events screen: no edit icon, close (X) only. */
  readOnly?: boolean;
}

const TITLE_MAX_LENGTH = 20;
const NOTE_MAX_LENGTH = 50;
const MEMO_MAX_LENGTH = 200;

export default function BlackboardModal({ event, onClose, readOnly }: BlackboardModalProps) {
  const { updateEvent, fontChoiceId, fontSizeChoice, chalkboardThemeId } = useAppData();
  const { showToast } = useToast();
  const { isLocked } = useAppLock();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [draftMemo, setDraftMemo] = useState('');

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
      setDraftTitle(event.title);
      setDraftNote(event.note ?? '');
      setDraftMemo(event.memo ?? '');
      setEditing(false);
    }
  }, [event]);

  if (!event) return null;

  const handleSave = () => {
    if (!draftTitle.trim()) return;
    updateEvent(event.id, {
      title: draftTitle.trim(),
      note: draftNote.trim() || undefined,
      memo: draftMemo.trim() || undefined,
    });
    setEditing(false);
    showToast('저장이 완료되었습니다.');
  };

  return (
    <Modal visible={!!event} transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.frame, { backgroundColor: theme.frame }]} onPress={() => {}}>
          <View style={styles.iconRow}>
            <Pressable onPress={onClose} accessibilityLabel="닫기" style={styles.iconButton}>
              <Text style={[styles.icon, { color: theme.text }]}>✕</Text>
            </Pressable>
          </View>

          <View style={[styles.board, { backgroundColor: theme.board }]}>
            {/* Plain <Text> here is AppText, which already multiplies by the
                global font-size setting — don't also scale fontFamily-only
                overrides here or it compounds. The TextInput below isn't
                wrapped by AppText, so it still scales manually. */}
            <Text style={[styles.sectionLabel, { color: theme.text, fontFamily }]}>📌 일정</Text>
            <Text style={[styles.date, { color: theme.text, fontFamily }]}>
              {formatMD(event.date)}
            </Text>
            {editing ? (
              <>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.text, fontFamily, fontSize: 20 * fontScale }]}
                  value={draftTitle}
                  onChangeText={setDraftTitle}
                  maxLength={TITLE_MAX_LENGTH}
                  placeholder="제목을 입력해주세요"
                  placeholderTextColor={`${theme.text}80`}
                />
                <Text style={[styles.counterText, { color: theme.text }]}>
                  {draftTitle.length}/{TITLE_MAX_LENGTH}
                </Text>
              </>
            ) : (
              <Text style={[styles.title, { color: theme.text, fontFamily }]}>{event.title}</Text>
            )}

            <View style={[styles.divider, { borderColor: theme.text }]} />

            <Text style={[styles.sectionLabel, { color: theme.text, fontFamily }]}>
              🎒 준비물
            </Text>
            {editing ? (
              <>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.text, fontFamily, fontSize: 16 * fontScale }]}
                  value={draftNote}
                  onChangeText={setDraftNote}
                  maxLength={NOTE_MAX_LENGTH}
                  placeholder="준비물을 적어주세요"
                  placeholderTextColor={`${theme.text}80`}
                />
                <Text style={[styles.counterText, { color: theme.text }]}>
                  {draftNote.length}/{NOTE_MAX_LENGTH}
                </Text>
              </>
            ) : (
              <Text style={[styles.note, { color: theme.text, fontFamily }]}>
                {event.note || '준비물이 없어요'}
              </Text>
            )}
            {!editing && isValidCoupangKeyword(event.note) ? (
              <Pressable
                style={styles.coupangButton}
                onPress={() => openCoupangSearch(event.note!)}
              >
                <Text style={styles.coupangButtonText}>🛒 Coupang에서 바로 구매</Text>
              </Pressable>
            ) : null}

            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced, { color: theme.text, fontFamily }]}>
              📝 메모
            </Text>
            {editing ? (
              <>
                <TextInput
                  style={[styles.input, styles.memoInput, { color: theme.text, borderColor: theme.text, fontFamily, fontSize: 16 * fontScale }]}
                  value={draftMemo}
                  onChangeText={setDraftMemo}
                  maxLength={MEMO_MAX_LENGTH}
                  multiline
                  placeholder="상세 주의사항 등 (선택 입력)"
                  placeholderTextColor={`${theme.text}80`}
                />
                <Text style={[styles.counterText, { color: theme.text }]}>
                  {draftMemo.length}/{MEMO_MAX_LENGTH}
                </Text>
              </>
            ) : (
              <Text style={[styles.note, { color: theme.text, fontFamily }]}>
                {event.memo || '메모가 없어요'}
              </Text>
            )}

            {editing ? (
              <Pressable
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.text },
                  !draftTitle.trim() && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!draftTitle.trim()}
              >
                <Text style={[styles.saveButtonText, { color: theme.board }]}>저장</Text>
              </Pressable>
            ) : null}
          </View>

          {!readOnly && !editing ? (
            <Pressable
              style={styles.editButton}
              onPress={() => setEditing(true)}
              accessibilityLabel="일정 수정"
            >
              <Text style={[styles.editButtonText, { color: theme.text }]}>✏️ 일정 수정</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
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
    sectionLabel: {
      fontSize: 12,
      fontWeight: '800',
      opacity: 0.7,
      marginBottom: 6,
    },
    sectionLabelSpaced: {
      marginTop: 16,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      opacity: 0.25,
      marginVertical: 14,
    },
    date: {
      fontSize: 15,
      opacity: 0.85,
    },
    title: {
      fontSize: 24,
      marginTop: 4,
    },
    note: {
      fontSize: 16,
      lineHeight: 22,
    },
    input: {
      fontSize: 16,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    counterText: {
      alignSelf: 'flex-end',
      fontSize: 10,
      opacity: 0.6,
      marginTop: 3,
    },
    memoInput: {
      minHeight: 60,
      textAlignVertical: 'top',
    },
    saveButton: {
      alignSelf: 'flex-end',
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginTop: 14,
    },
    saveButtonDisabled: {
      opacity: 0.4,
    },
    saveButtonText: {
      fontWeight: '700',
      fontSize: 13,
    },
    coupangButton: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(30, 41, 59, 0.08)',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginTop: 10,
    },
    coupangButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.coralPink,
    },
    editButton: {
      alignSelf: 'center',
      marginTop: 14,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: 'rgba(30, 41, 59, 0.08)',
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
