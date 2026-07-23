import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { EventDateGroup } from '../../hooks/useUpcomingEvents';
import { Event } from '../../types/models';
import { formatMD } from '../../utils/date';
import EventCard from './EventCard';

interface EventListSectionProps {
  tomorrowEvents: Event[];
  laterGroups: EventDateGroup[];
  onEventPress: (event: Event) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

// Same-date groups with this many events or more collapse behind a
// '더보기' toggle so a busy day doesn't push every other date off-screen.
const COLLAPSE_THRESHOLD = 3;
const COLLAPSED_PREVIEW_COUNT = 2;

export default function EventListSection({
  tomorrowEvents,
  laterGroups,
  onEventPress,
  refreshing,
  onRefresh,
}: EventListSectionProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const toggleExpanded = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  return (
    <View style={styles.container}>
      {tomorrowEvents.length > 0 && (
        <View style={styles.stickyBlock}>
          {tomorrowEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              dateBadgeText="내일"
              highlighted
              onPress={() => onEventPress(event)}
            />
          ))}
        </View>
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined
        }
      >
        {laterGroups.map((group) => {
          const collapsible = group.events.length >= COLLAPSE_THRESHOLD;
          const expanded = expandedDates.has(group.date);
          const visibleEvents =
            collapsible && !expanded
              ? group.events.slice(0, COLLAPSED_PREVIEW_COUNT)
              : group.events;
          return (
            <View key={group.date} style={styles.dateGroup}>
              <Text style={styles.dateGroupHeader}>{formatMD(group.date)}</Text>
              {visibleEvents.map((event) => (
                <EventCard key={event.id} event={event} onPress={() => onEventPress(event)} />
              ))}
              {collapsible ? (
                <Pressable
                  style={styles.toggleButton}
                  onPress={() => toggleExpanded(group.date)}
                >
                  <Text style={styles.toggleButtonText}>
                    {expanded ? '▲ 접기' : `▼ 일정 ${group.events.length}개 더보기`}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
    },
    stickyBlock: {
      paddingTop: 4,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    dateGroup: {
      marginBottom: 4,
    },
    dateGroupHeader: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 8,
      marginTop: 4,
    },
    toggleButton: {
      alignSelf: 'center',
      paddingVertical: 8,
      paddingHorizontal: 14,
      marginTop: 2,
      marginBottom: 6,
    },
    toggleButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accent,
    },
  });
}
