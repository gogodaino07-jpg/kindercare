import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BlackboardModal from '../components/home/BlackboardModal';
import Text from '../components/common/AppText';
import ScreenBackground from '../components/ScreenBackground';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { Event } from '../types/models';
import { formatMD, isPast, parseISODate } from '../utils/date';

function monthLabel(isoDate: string): string {
  const date = parseISODate(isoDate);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

export default function PastEventsScreen() {
  const { events, selectedChild, deleteEvent } = useAppData();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  const groups = useMemo(() => {
    const past = events
      .filter((e) => e.childId === selectedChild?.id && isPast(e.date))
      .sort((a, b) => b.date.localeCompare(a.date));

    const map = new Map<string, Event[]>();
    for (const e of past) {
      const key = monthLabel(e.date);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [events, selectedChild]);

  const handleDelete = (event: Event) => {
    Alert.alert('삭제할까요?', `"${event.title}" 기록을 지울까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteEvent(event.id) },
    ]);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {groups.length === 0 ? (
            <Text style={styles.emptyText}>지난 일정이 없어요</Text>
          ) : (
            groups.map(([month, monthEvents]) => (
              <View key={month} style={styles.monthGroup}>
                <Text style={styles.monthLabel}>{month}</Text>
                {monthEvents.map((event) => (
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
                      style={styles.trashButton}
                      onPress={() => handleDelete(event)}
                      accessibilityLabel="삭제"
                    >
                      <Text style={styles.trashIcon}>🗑️</Text>
                    </Pressable>
                  </Pressable>
                ))}
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
    trashButton: { padding: 6 },
    trashIcon: { fontSize: 14 },
  });
}
