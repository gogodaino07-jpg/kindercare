import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  StatusBar,
  Linking
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import BlackboardModal from '../components/home/BlackboardModal';
import CoupangBanner from '../components/common/CoupangBanner';
import Text from '../components/common/AppText';
import EventCard from '../components/home/EventCard';
import { SHADOW, type ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { WEEKDAY_KO, parseISODate, toISODate, formatMD } from '../utils/date';

const DOT_COLORS = {
  ai: '#3B82F6',
  review: '#F59E0B',
  manual: '#F43F5E',
};

function dotColorFor(source: 'ai' | 'manual', needsReview?: boolean): string {
  if (needsReview) return DOT_COLORS.review;
  if (source === 'manual') return DOT_COLORS.manual;
  return DOT_COLORS.ai;
}

function createStyles(colors: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.skyBackground,
    },
    scrollContent: {
      paddingBottom: 220 + bottomInset,
    },
    calendarCard: {
      backgroundColor: colors.cardWhite,
      borderRadius: 28,
      marginHorizontal: 16,
      marginTop: -32,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
      shadowOpacity: 0.04,
      elevation: 3,
    },
    monthSelector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      marginBottom: 8,
    },
    arrowButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.gray100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    arrowIcon: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    monthText: {
      fontSize: 17,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    weekDaysRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 4,
    },
    weekDayText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      width: 40,
      textAlign: 'center',
    },
    sundayText: {
      color: '#FB7185',
    },
    saturdayText: {
      color: '#818CF8',
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCellContainer: {
      width: '14.28%',
      height: 38, // Restoration of recommended height
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    dayCell: {
      width: 32, // Restoration of recommended larger circle
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
    },
    dayCellSelected: {
      backgroundColor: colors.tomorrowRedBg,
      borderWidth: 1,
      borderColor: colors.tomorrowRed,
    },
    dayCellToday: {
      backgroundColor: colors.lightBlueBg,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    dayText: {
      fontSize: 14, // Restoration of recommended font size
      color: colors.textPrimary,
      fontWeight: '500',
    },
    dotRow: {
      flexDirection: 'row',
      marginTop: 1,
      gap: 2,
      height: 3.5, // Slightly refined height
      justifyContent: 'center',
    },
    dot: {
      width: 3.5, // Restoration of recommended crisp size
      height: 3.5,
      borderRadius: 1.75,
    },
    legendContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 20,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    scheduleSection: {
      marginTop: 16,
      paddingHorizontal: 16,
      flex: 1,
    },
    dateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      marginLeft: 4,
      paddingHorizontal: 44,
    },
    scheduleDateText: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginRight: 8,
    },
    dayBadge: {
      backgroundColor: colors.gray100,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    dayBadgeText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: colors.textSecondary,
    },
    emptyStateCard: {
      backgroundColor: colors.cardWhite,
      opacity: 0.8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingVertical: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.gray100,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyIcon: {
      fontSize: 24,
      opacity: 0.8,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    eventListContainer: {
      maxHeight: 320,
    },
    eventList: {
      gap: 8,
      paddingHorizontal: 44,
      paddingBottom: 80,
    },
    eventCardWrapper: {
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
      shadowOpacity: 0.03,
    },
    fabContainer: {
      position: 'absolute',
      bottom: 104 + bottomInset, // Above the common ad banner
      right: 20,
      zIndex: 100,
    },
    fabButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#000000', // Black FAB
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      elevation: 6,
    },
    fabPlus: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '300',
      marginTop: -2,
    },
    adBanner: {
      position: 'absolute',
      bottom: 24 + bottomInset,
      left: 20,
      right: 20,
    },
  });
}

export default function CalendarScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const { events, selectedChild } = useAppData();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);

  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(toISODate(new Date()));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!dateParam) return;
    const parsed = parseISODate(dateParam);
    setMonthCursor(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    setSelectedDate(dateParam);
  }, [dateParam]);

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
    while (list.length % 7 !== 0) list.push(null);
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

  const goToToday = () => {
    const now = new Date();
    const todayISO = toISODate(now);
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayISO);
  };

  const selectedDateObj = selectedDate ? parseISODate(selectedDate) : new Date();
  const weekdayLabel = WEEKDAY_KO[selectedDateObj.getDay()];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: '캘린더',
          headerRight: () => (
            <TouchableOpacity onPress={goToToday} style={{ marginRight: 16 }}>
              <MaterialCommunityIcons name="calendar-today" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Fixed Calendar Card */}
      <View style={styles.calendarCard}>
        <View style={styles.monthSelector}>
          <TouchableOpacity style={styles.arrowButton} onPress={goToPrevMonth}>
            <Text style={styles.arrowIcon}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {monthCursor.getFullYear()}년 {monthCursor.getMonth() + 1}월
          </Text>
          <TouchableOpacity style={styles.arrowButton} onPress={goToNextMonth}>
            <Text style={styles.arrowIcon}>▶</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekDaysRow}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <Text
              key={idx}
              style={[
                styles.weekDayText,
                idx === 0 && styles.sundayText,
                idx === 6 && styles.saturdayText
              ]}
            >
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {cells.map((iso, index) => {
            if (!iso) return <View key={`pad-${index}`} style={styles.dayCellContainer} />;

            const isSelected = iso === selectedDate;
            const isToday = iso === todayISO;
            const dayNum = iso.split('-')[2].replace(/^0/, '');
            const dayEvents = eventsByDate.get(iso) ?? [];

            return (
              <View key={iso} style={styles.dayCellContainer}>
                <TouchableOpacity
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedDate(iso)}
                >
                  <Text style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    isToday && !isSelected && styles.dayTextToday
                  ]}>
                    {dayNum}
                  </Text>
                  <View style={styles.dotRow}>
                    {dayEvents.slice(0, 2).map((e) => (
                      <View
                        key={e.id}
                        style={[
                          styles.dot,
                          { backgroundColor: dotColorFor(e.source, e.needsReview) },
                        ]}
                      />
                    ))}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DOT_COLORS.ai }]} />
            <Text style={styles.legendText}>유치원 일정</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DOT_COLORS.review }]} />
            <Text style={styles.legendText}>확인 필요</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DOT_COLORS.manual }]} />
            <Text style={styles.legendText}>일정 등록</Text>
          </View>
        </View>
      </View>

      <View style={styles.scheduleSection}>
        <View style={styles.dateHeader}>
          <Text style={styles.scheduleDateText}>{selectedDate}</Text>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>{weekdayLabel}요일</Text>
          </View>
        </View>

        {selectedDateEvents.length === 0 ? (
          <View style={{ paddingHorizontal: 44 }}>
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyIconContainer}>
                <Text style={styles.emptyIcon}>☁️</Text>
              </View>
              <Text style={styles.emptyTitle}>이 날짜엔 일정이 없어요</Text>
              <Text style={styles.emptySubtitle}>새로운 일정을 추가해 보세요!</Text>
            </View>
          </View>
        ) : (
          <ScrollView
            style={styles.eventListContainer}
            contentContainerStyle={styles.eventList}
            showsVerticalScrollIndicator={false}
          >
            {selectedDateEvents.map((e) => (
              <View key={e.id} style={styles.eventCardWrapper}>
                <EventCard
                  event={e}
                  showCoupangButton
                  wrapNote
                  hideCheckbox
                  onPress={() => router.push({ pathname: '/edit-event', params: { id: e.id } })}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fabButton}
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: '/add-event', params: { date: selectedDate ?? todayISO } })}
        >
          <Text style={styles.fabPlus}>+</Text>
        </TouchableOpacity>
      </View>

      <CoupangBanner style={styles.adBanner} />

      <BlackboardModal event={selectedEvent} onClose={() => setSelectedEventId(null)} />
    </SafeAreaView>
  );
}
