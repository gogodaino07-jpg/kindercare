import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { EventDateGroup } from '../../hooks/useUpcomingEvents';
import { Event } from '../../types/models';
import { formatMD, parseISODate, startOfDay } from '../../utils/date';
import Text from '../common/AppText';

/** Decorative, data-independent marker colors — cycles per node so the timeline reads as a playful trail rather than a status indicator. */
function getMarkerPalette(colors: ThemeColors): string[] {
  return [colors.peachOrangeDeep, colors.blue500, colors.pastelPinkAccent, colors.statusGreen, colors.purple500];
}

/** Blends a hex color toward white by `amount` (0-1) to make it a paler shade. */
function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** "D-3" for future dates, "D-DAY" for today, "D+2" for past dates. */
function computeDday(dateISO: string): string {
  const diffDays = Math.round(
    (parseISODate(dateISO).getTime() - startOfDay(new Date()).getTime()) / 86400000
  );
  if (diffDays === 0) return 'D-DAY';
  if (diffDays > 0) return `D-${diffDays}`;
  return `D+${Math.abs(diffDays)}`;
}

export function AdventureHeader() {
  const colors = useThemeColors();
  const styles = useMemo(() => createHeaderStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🗺️</Text>
      <Text style={styles.title}>앞으로의 모험</Text>
    </View>
  );
}

export function AdventureNode({
  group,
  index,
  isLast,
  isHighlighted,
  onEventPress,
}: {
  group: EventDateGroup;
  /** Position within the timeline — picks a decorative marker color, unrelated to the event data itself. */
  index: number;
  isLast: boolean;
  isHighlighted?: boolean;
  onEventPress: (event: Event) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createNodeStyles(colors), [colors]);
  const ddayLabel = computeDday(group.date);
  const markerPalette = useMemo(() => getMarkerPalette(colors), [colors]);
  const markerColor = markerPalette[index % markerPalette.length];

  return (
    <View style={styles.row}>
      <View style={styles.markerColumn}>
        <View style={[styles.marker, { borderColor: markerColor }, isHighlighted && styles.markerHighlighted]} />
        {!isLast && <View style={styles.dottedLine} />}
      </View>

      <View style={[styles.card, isHighlighted && styles.cardHighlighted]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.dateText, { color: markerColor }]}>{formatMD(group.date)}</Text>
          <View style={[styles.ddayBadge, { backgroundColor: lighten(markerColor, 0.75) }]}>
            <Text style={[styles.ddayText, { color: markerColor }]}>{ddayLabel}</Text>
          </View>
        </View>

        {group.events.map((event, idx) => (
          <AdventureEventRow
            key={event.id}
            event={event}
            spaced={idx > 0}
            styles={styles}
            onPress={() => onEventPress(event)}
          />
        ))}
      </View>
    </View>
  );
}

const NOTE_COLLAPSED_LINES = 2;

function AdventureEventRow({
  event,
  spaced,
  styles,
  onPress,
}: {
  event: Event;
  spaced: boolean;
  styles: ReturnType<typeof createNodeStyles>;
  onPress: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const noteContent = event.note || event.memo;

  return (
    <Pressable style={[styles.eventRow, spaced && styles.eventRowSpaced]} onPress={onPress}>
      <Text style={styles.eventTitle} numberOfLines={1}>
        {event.icon ? `${event.icon} ` : ''}
        {event.title}
      </Text>
      {!!noteContent && (
        <>
          <Text
            style={styles.eventDesc}
            numberOfLines={expanded ? undefined : NOTE_COLLAPSED_LINES}
            onTextLayout={(e) => {
              if (e.nativeEvent.lines.length > NOTE_COLLAPSED_LINES) setTruncated(true);
            }}
          >
            {noteContent}
          </Text>
          {truncated && (
            <Pressable
              hitSlop={6}
              onPress={(e) => {
                e.stopPropagation();
                setExpanded((prev) => !prev);
              }}
            >
              <Text style={styles.eventMoreText}>{expanded ? '접기 ▲' : '더보기 ▾'}</Text>
            </Pressable>
          )}
        </>
      )}
    </Pressable>
  );
}

function createHeaderStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      marginTop: 24,
      marginBottom: 4,
    },
    emoji: {
      fontSize: 18,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.gray900,
      letterSpacing: -0.5,
    },
  });
}

function createNodeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'stretch',
      paddingHorizontal: 20,
    },
    markerColumn: {
      width: 20,
      alignItems: 'center',
    },
    marker: {
      width: 14,
      height: 14,
      borderRadius: 7,
      marginTop: 20,
      backgroundColor: colors.cardWhite,
      borderWidth: 3,
    },
    markerHighlighted: {
      borderColor: colors.tomorrowRed,
    },
    dottedLine: {
      flex: 1,
      width: 0,
      borderLeftWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.border,
      marginVertical: 4,
    },
    card: {
      flex: 1,
      backgroundColor: colors.cardWhite,
      borderRadius: 18,
      padding: 14,
      marginLeft: 8,
      marginBottom: 16,
      ...SHADOW,
      shadowOpacity: 0.05,
      elevation: 2,
    },
    cardHighlighted: {
      borderColor: colors.tomorrowRed,
      borderWidth: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    dateText: {
      fontSize: 15,
      fontWeight: 'bold',
    },
    ddayBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    ddayText: {
      fontSize: 12,
      fontWeight: '800',
    },
    eventRow: {},
    eventRowSpaced: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    eventTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.gray900,
      marginBottom: 2,
    },
    eventDesc: {
      fontSize: 12,
      color: colors.gray500,
      fontWeight: '500',
    },
    eventMoreText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.accent,
      marginTop: 4,
    },
  });
}
