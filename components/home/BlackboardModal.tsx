import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import Text from '../common/AppText';
import { SHADOW } from '../../constants/theme';
import { useAppLock } from '../../context/AppLockContext';
import { Event } from '../../types/models';
import { formatMD, WEEKDAY_KO, parseISODate } from '../../utils/date';

interface BlackboardModalProps {
  event: Event | null;
  onClose: () => void;
  /** Read-only variant: hides edit/delete buttons. */
  readOnly?: boolean;
}

export default function BlackboardModal({ event, onClose, readOnly }: BlackboardModalProps) {
  const router = useRouter();
  const { isLocked } = useAppLock();

  useEffect(() => {
    if (isLocked && event) onClose();
  }, [isLocked, event, onClose]);

  if (!event) return null;

  const handleEditPress = () => {
    onClose();
    router.push({ pathname: '/edit-event', params: { id: event.id } });
  };

  const weekdayLabel = WEEKDAY_KO[parseISODate(event.date).getDay()];

  return (
    <Modal visible={!!event} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.emojiCircle}>
              <Text style={styles.headerEmoji}>{event.icon || '📌'}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.dateRow}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateText}>{formatMD(event.date)} ({weekdayLabel})</Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.titleText}>{event.title}</Text>

              <View style={styles.contentBox}>
                <View style={styles.contentLabelRow}>
                  <Text style={styles.contentEmoji}>🎒</Text>
                  <Text style={styles.contentLabel}>준비물</Text>
                </View>
                <Text style={styles.contentText}>{event.note || '없음'}</Text>
              </View>

              <View style={[styles.contentBox, { marginTop: 12 }]}>
                <View style={styles.contentLabelRow}>
                  <Text style={styles.contentEmoji}>📝</Text>
                  <Text style={styles.contentLabel}>메모</Text>
                </View>
                <Text style={styles.contentText}>{event.memo || '기록된 내용이 없어요'}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {!readOnly && (
              <TouchableOpacity style={styles.editBtn} onPress={handleEditPress}>
                <MaterialIcons name="edit" size={18} color="#475569" />
                <Text style={styles.editBtnText}>수정하기</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    ...SHADOW,
    shadowOpacity: 0.1,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emojiCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: {
    fontSize: 32,
  },
  closeBtn: {
    position: 'absolute',
    right: -4,
    top: -4,
    padding: 8,
  },
  scroll: {
    marginBottom: 16,
  },
  dateRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dateBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  infoSection: {
    alignItems: 'center',
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 24,
  },
  contentBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  contentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contentEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  contentLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  contentText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    fontWeight: '500',
  },
  footer: {
    marginTop: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
});
