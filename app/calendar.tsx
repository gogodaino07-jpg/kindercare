import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BlackboardModal from '../components/home/BlackboardModal';
import Text from '../components/common/AppText';
import EventCard from '../components/home/EventCard';
import ScreenBackground from '../components/ScreenBackground';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { WEEKDAY_KO, toISODate } from '../utils/date';

const DOT_COLORS = {
  ai: '#2E4374',
  review: '#E08A2E',
  manual: '#E48AA6',
};

function dotColorFor(source: 'ai' | 'manual', needsReview?: boolean): string {
  if (needsReview) return DOT_COLORS.review;
  if (source === 'manual') return DOT_COLORS.manual;
  return DOT_COLORS.ai;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { events, selectedChild } = useAppData();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [, forceRefresh] = useState(0);

  // Re-sync the selected date's event list whenever this screen regains focus
  // (e.g. after adding an event elsewhere and navigating back).
  useFocusEffect(
    useCallback(() => {
      forceRefresh((n) => n + 1);
    }, [])
  );

  const todayISO = toISODate(new Date());
  const childEvents = useMemo(
    () => events.filter((e) => e.childId === selectedChild?.id),
    [events, selectedChild]
  );

  const cells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const list: (string | null)[] = [];
    for (let i = 0; i < startWeekday; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(toISODate(new Date(year, month, d)));
    // Always pad to a fixed 6-row grid (42 cells) so the legend row below
    // doesn't shift up/down between 5-week and 6-week months.
    const WEEKS = 6;
    while (list.length < WEEKS * 7) list.push(null);
    return list;
  }, [monthCursor]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof childEvents>();
    for (const e of childEvents) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [childEvents]);

  const selectedDateEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  const goToPrevMonth = () =>
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () =>
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.monthNav}>
            <Pressable onPress={goToPrevMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>◀</Text>
            </Pressable>
            <Text style={styles.monthLabel}>
              {monthCursor.getFullYear()}년 {monthCursor.getMonth() + 1}월
            </Text>
            <Pressable onPress={goToNextMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>▶</Text>
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_KO.map((w) => (
              <Text key={w} style={styles.weekdayText}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((iso, idx) => {
              if (!iso) return <View key={`pad-${idx}`} style={styles.cell} />;
              const dayEvents = eventsByDate.get(iso) ?? [];
              const isToday = iso === todayISO;
              const isSelected = iso === selectedDate;
              const dayNum = Number(iso.split('-')[2]);
              return (
                <Pressable
                  key={iso}
                  style={[
                    styles.cell,
                    isToday && styles.cellToday,
                    isSelected && styles.cellSelected,
                  ]}
                  onPress={() => setSelectedDate(iso)}
                >
                  <Text style={[styles.cellText, isToday && styles.cellTextToday]}>{dayNum}</Text>
                  <View style={styles.dotRow}>
                    {dayEvents.slice(0, 3).map((e) => (
                      <View
                        key={e.id}
                        style={[
                          styles.dot,
                          { backgroundColor: dotColorFor(e.source, e.needsReview) },
                        ]}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: DOT_COLORS.ai }]} />
              <Text style={styles.legendText}>유치원 공지</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: DOT_COLORS.review }]} />
              <Text style={styles.legendText}>확인 필요</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: DOT_COLORS.manual }]} />
              <Text style={styles.legendText}>직접 추가</Text>
            </View>
          </View>

          {selectedDate ? (
            <View style={styles.selectedDateSection}>
              <Text style={styles.selectedDateLabel}>{selectedDate}</Text>
              {selectedDateEvents.length === 0 ? (
                <Text style={styles.noEventText}>이 날짜엔 일정이 없어요</Text>
              ) : (
                selectedDateEvents.map((e) => (
                  <EventCard
                    key={e.id}
                    event={e}
                    onPress={() => setSelectedEventId(e.id)}
                  />
                ))
              )}
            </View>
          ) : null}
        </ScrollView>

        <Pressable
          style={styles.addButton}
          onPress={() =>
            router.push({ pathname: '/add-event', params: { date: selectedDate ?? todayISO } })
          }
        >
          <Text style={styles.addButtonText}>+ 일정 추가</Text>
        </Pressable>
      </SafeAreaView>
      <BlackboardModal event={selectedEvent} onClose={() => setSelectedEventId(null)} />
    </ScreenBackground>
  );
}

const CELL_SIZE = `${100 / 7}%` as const;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: { padding: 16, paddingBottom: 12 },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    navButton: { paddingHorizontal: 16 },
    navButtonText: { fontSize: 16, color: colors.textPrimary },
    monthLabel: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, minWidth: 130, textAlign: 'center' },
    weekdayRow: { flexDirection: 'row' },
    weekdayText: {
      width: CELL_SIZE,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: CELL_SIZE,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      marginBottom: 4,
    },
    cellToday: { backgroundColor: '#A9D8F5' },
    cellSelected: { borderWidth: 2, borderColor: colors.accent },
    cellText: { fontSize: 13, color: colors.textPrimary },
    cellTextToday: { fontWeight: '800', color: colors.accent },
    dotRow: { flexDirection: 'row', marginTop: 3, gap: 2, height: 6 },
    dot: { width: 5, height: 5, borderRadius: 3 },
    legendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 20,
      marginTop: 16,
      marginBottom: 8,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 9, height: 9, borderRadius: 5 },
    legendText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    selectedDateSection: { marginTop: 20 },
    selectedDateLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    noEventText: { fontSize: 13, color: colors.textSecondary },
    addButton: {
      marginHorizontal: 20,
      marginBottom: 16,
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      ...SHADOW,
    },
    addButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  });
}
