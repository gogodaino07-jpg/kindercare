import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
}

export default function EventListSection({
  tomorrowEvents,
  laterGroups,
  onEventPress,
}: EventListSectionProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      >
        {laterGroups.map((group) => (
          <View key={group.date} style={styles.dateGroup}>
            <Text style={styles.dateGroupHeader}>{formatMD(group.date)}</Text>
            {group.events.map((event) => (
              <EventCard key={event.id} event={event} onPress={() => onEventPress(event)} />
            ))}
          </View>
        ))}
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
  });
}
