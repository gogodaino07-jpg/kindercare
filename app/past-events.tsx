import { Stack } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BlackboardModal from '../components/home/BlackboardModal';
import Text from '../components/common/AppText';
import ScreenBackground from '../components/ScreenBackground';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { Event } from '../types/models';
import { formatMD, isPast, parseISODate } from '../utils/date';

function monthLabel(isoDate: string): string {
  const date = parseISODate(isoDate);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

export default function PastEventsScreen() {
  const { events, selectedChild, deleteEvents } = useAppData();
  const { showAlert } = useAlert();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  const pastEvents = useMemo(
    () =>
      events
        .filter((e) => e.childId === selectedChild?.id && isPast(e.date))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [events, selectedChild]
  );

  const groups = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of pastEvents) {
      const key = monthLabel(e.date);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [pastEvents]);

  const toggleChecked = (eventId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const handleDeleteButtonPress = () => {
    if (checkedIds.size > 0) {
      showAlert({
        title: '선택 일정 삭제',
        message: `선택한 ${checkedIds.size}개의 일정을 삭제하시겠습니까?`,
        buttons: [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              deleteEvents(Array.from(checkedIds));
              setCheckedIds(new Set());
            },
          },
        ],
      });
      return;
    }
    if (pastEvents.length === 0) return;
    showAlert({
      title: '지난 일정 전체 삭제',
      message: '등록된 지난 일정을 모두 삭제하시겠습니까?',
      buttons: [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => deleteEvents(pastEvents.map((e) => e.id)),
        },
      ],
    });
  };

  return (
    <ScreenBackground>
      <Stack.Screen
        options={{
          headerRight: () =>
            pastEvents.length > 0 ? (
              <Pressable onPress={handleDeleteButtonPress} hitSlop={8}>
                <Text style={styles.deleteAllText}>
                  {checkedIds.size > 0 ? '선택삭제' : '삭제'}
                </Text>
              </Pressable>
            ) : null,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {groups.length === 0 ? (
            <Text style={styles.emptyText}>지난 일정이 없어요</Text>
          ) : (
            groups.map(([month, monthEvents]) => (
              <View key={month} style={styles.monthGroup}>
                <Text style={styles.monthLabel}>{month}</Text>
                {monthEvents.map((event) => {
                  const checked = checkedIds.has(event.id);
                  return (
                    <Pressable
                      key={event.id}
                      style={styles.card}
                      onPress={() => setSelectedEventId(event.id)}
                    >
                      <View style={styles.dateBadge}>
                        <Text style={styles.dateBadgeText}>{formatMD(event.date)}</Text>
                      </View>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {event.icon ? `${event.icon} ` : ''}
                        {event.title}
                      </Text>
                      <Pressable
                        style={styles.checkButton}
                        onPress={() => toggleChecked(event.id)}
                        accessibilityLabel="선택"
                        hitSlop={8}
                      >
                        <View style={[styles.checkCircle, checked && styles.checkCircleChecked]}>
                          {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                        </View>
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
      <BlackboardModal
        event={selectedEvent}
        onClose={() => setSelectedEventId(null)}
        readOnly
      />
    </ScreenBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: { padding: 20 },
    deleteAllText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.tomorrowRed,
      marginRight: 4,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: 40,
    },
    monthGroup: { marginBottom: 20 },
    monthLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 10,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardWhite,
      borderRadius: 14,
      padding: 12,
      marginBottom: 8,
      ...SHADOW,
    },
    dateBadge: {
      backgroundColor: '#EEF2F5',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginRight: 10,
    },
    dateBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    cardTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    checkButton: { padding: 6 },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkCircleChecked: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    checkMark: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
}
