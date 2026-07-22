import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import Text from '../components/common/AppText';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { generateMockAIEvents } from '../data/mockAIResult';
import { Event } from '../types/models';
import { formatMD, parseISODate, startOfDay } from '../utils/date';

interface DraftEvent extends Omit<Event, 'id'> {
  localId: string;
}

function isImminent(isoDate: string): boolean {
  const diffMs = parseISODate(isoDate).getTime() - startOfDay(new Date()).getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return diffDays <= 2;
}

export default function AIReviewScreen() {
  const router = useRouter();
  const { children, selectedChild, addEvents } = useAppData();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [draftEvents, setDraftEvents] = useState<DraftEvent[]>(() =>
    generateMockAIEvents(selectedChild).map((e, i) => ({ ...e, localId: `draft-${i}` }))
  );
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, DraftEvent[]>();
    for (const e of draftEvents) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, evs]) => ({ date, events: evs }));
  }, [draftEvents]);

  const updateDraft = (localId: string, patch: Partial<DraftEvent>) => {
    setDraftEvents((prev) => prev.map((e) => (e.localId === localId ? { ...e, ...patch } : e)));
  };

  const deleteDraft = (localId: string) => {
    setDraftEvents((prev) => prev.filter((e) => e.localId !== localId));
    if (editingId === localId) setEditingId(null);
  };

  const addDraftForDate = (date: string) => {
    const localId = `draft-new-${Date.now()}`;
    setDraftEvents((prev) => [
      ...prev,
      {
        localId,
        date,
        title: '새 일정',
        note: '',
        childId: selectedChild?.id ?? children[0]?.id ?? '',
        source: 'ai',
        icon: '📝',
      },
    ]);
    setEditingId(localId);
  };

  const toggleCollapsed = (date: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const handleSave = () => {
    if (draftEvents.length === 0) return;
    addEvents(draftEvents.map(({ localId, ...rest }) => rest));
    router.replace({ pathname: '/save-complete', params: { count: String(draftEvents.length) } });
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {groups.map((group) => {
            const collapsed = group.events.length >= 2 && collapsedDates.has(group.date);
            return (
              <View key={group.date} style={styles.dateCard}>
                <View style={styles.dateCardHeader}>
                  <View
                    style={[
                      styles.dateBadge,
                      isImminent(group.date) && styles.dateBadgeImminent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateBadgeText,
                        isImminent(group.date) && styles.dateBadgeTextImminent,
                      ]}
                    >
                      {formatMD(group.date)}
                    </Text>
                  </View>
                  {group.events.length >= 2 ? (
                    <Pressable onPress={() => toggleCollapsed(group.date)}>
                      <Text style={styles.chevron}>{collapsed ? '▸' : '▾'}</Text>
                    </Pressable>
                  ) : null}
                </View>

                {!collapsed &&
                  group.events.map((ev) => {
                    const child = children.find((c) => c.id === ev.childId);
                    const isEditing = editingId === ev.localId;
                    return (
                      <View key={ev.localId} style={styles.eventRow}>
                        <View style={styles.eventRowTop}>
                          <Pressable
                            style={styles.eventTitleArea}
                            onPress={() => setEditingId(isEditing ? null : ev.localId)}
                          >
                            {isEditing ? (
                              <TextInput
                                style={styles.titleInput}
                                value={ev.title}
                                onChangeText={(text) => updateDraft(ev.localId, { title: text })}
                                autoFocus
                              />
                            ) : (
                              <Text style={styles.eventTitle}>
                                {ev.icon ? `${ev.icon} ` : ''}
                                {ev.title}
                                {child?.name ? ` · ${child.name}` : ''}
                              </Text>
                            )}
                          </Pressable>
                          <Pressable
                            onPress={() => deleteDraft(ev.localId)}
                            accessibilityLabel="삭제"
                            style={styles.trashButton}
                          >
                            <Text style={styles.trashIcon}>🗑️</Text>
                          </Pressable>
                        </View>

                        {isEditing ? (
                          <TextInput
                            style={styles.noteInput}
                            value={ev.note ?? ''}
                            onChangeText={(text) => updateDraft(ev.localId, { note: text })}
                            placeholder="준비물을 적어주세요"
                            placeholderTextColor={colors.textSecondary}
                          />
                        ) : ev.note ? (
                          <View style={styles.noteTag}>
                            <Text style={styles.noteTagText}>✔ {ev.note}</Text>
                          </View>
                        ) : null}

                        {ev.needsReview ? (
                          <View style={styles.reviewBadgeRow}>
                            <Text style={styles.reviewBadge}>확인 필요</Text>
                          </View>
                        ) : null}
                        {ev.needsReview && ev.reviewReason ? (
                          <Text style={styles.reviewReason}>💡 {ev.reviewReason}</Text>
                        ) : null}
                      </View>
                    );
                  })}

                <Pressable style={styles.addButton} onPress={() => addDraftForDate(group.date)}>
                  <Text style={styles.addButtonText}>+ 이 날짜에 일정 추가</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>

        <Pressable
          style={[styles.saveButton, draftEvents.length === 0 && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={draftEvents.length === 0}
        >
          <Text style={styles.saveButtonText}>캘린더에 저장</Text>
        </Pressable>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: { padding: 20, paddingBottom: 12 },
    dateCard: {
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      ...SHADOW,
    },
    dateCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    dateBadge: {
      backgroundColor: '#EEF2F5',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    dateBadgeImminent: {
      backgroundColor: colors.tomorrowRed,
    },
    dateBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    dateBadgeTextImminent: {
      color: '#FFFFFF',
    },
    chevron: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    eventRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 10,
    },
    eventRowTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    eventTitleArea: {
      flex: 1,
    },
    eventTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    titleInput: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      borderBottomWidth: 1,
      borderBottomColor: colors.accent,
      paddingVertical: 2,
    },
    trashButton: {
      padding: 6,
    },
    trashIcon: {
      fontSize: 15,
    },
    noteTag: {
      alignSelf: 'flex-start',
      backgroundColor: '#EAF6EE',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: 6,
    },
    noteTagText: {
      fontSize: 12,
      color: '#3A8455',
      fontWeight: '600',
    },
    noteInput: {
      fontSize: 13,
      color: colors.textPrimary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 4,
      marginTop: 6,
    },
    reviewBadgeRow: {
      marginTop: 6,
    },
    reviewBadge: {
      alignSelf: 'flex-start',
      backgroundColor: '#FFF3CD',
      color: '#8A6A00',
      fontSize: 11,
      fontWeight: '700',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    reviewReason: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
    },
    addButton: {
      marginTop: 8,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    addButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accent,
    },
    saveButton: {
      marginHorizontal: 20,
      marginBottom: 16,
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      ...SHADOW,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
