import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { Event } from '../../types/models';
import { openCoupangSearch } from '../../utils/coupang';
import Text from '../common/AppText';

interface EventCardProps {
  event: Event;
  /** Badge text, e.g. "내일" or "7/26(일)". Omit to render no badge (used when a shared date-group header already shows it). */
  dateBadgeText?: string;
  highlighted?: boolean;
  /** Shows a 🛒 "쿠팡에서 구매" button under the note, searching Coupang for it. Off by default to keep the compact Home list unchanged. */
  showCoupangButton?: boolean;
  /** Lets the note wrap across lines instead of truncating to one line with an ellipsis. Off by default to keep the compact Home list unchanged. */
  wrapNote?: boolean;
  onPress: () => void;
}

export default function EventCard({
  event,
  dateBadgeText,
  highlighted,
  showCoupangButton,
  wrapNote,
  onPress,
}: EventCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // 준비물 takes priority as the subtitle; only fall back to 메모 when there's
  // no 준비물, and always truncate the 메모 fallback to one line regardless
  // of `wrapNote` (that prop only relaxes wrapping for the 준비물 case).
  const subtitle = event.note || event.memo;
  const subtitleIsMemo = !event.note && !!event.memo;

  return (
    <Pressable
      style={[styles.card, highlighted && styles.cardHighlighted]}
      onPress={onPress}
    >
      {dateBadgeText ? (
        <View style={[styles.dateBadge, highlighted && styles.dateBadgeHighlighted]}>
          <Text style={[styles.dateBadgeText, highlighted && styles.dateBadgeTextHighlighted]}>
            {dateBadgeText}
          </Text>
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title}>{event.title}</Text>
        {subtitle ? (
          <Text style={styles.note} numberOfLines={subtitleIsMemo ? 1 : wrapNote ? undefined : 1}>
            {subtitle}
          </Text>
        ) : null}
        {showCoupangButton && event.note ? (
          <Pressable
            style={styles.coupangButton}
            onPress={(e) => {
              e.stopPropagation?.();
              openCoupangSearch(event.note!);
            }}
          >
            <Text style={styles.coupangButtonText}>🛒 Coupang에서 바로 구매</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
    },
    cardHighlighted: {
      backgroundColor: colors.tomorrowRedBg,
    },
    dateBadge: {
      backgroundColor: '#EEF2F5',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginRight: 12,
    },
    dateBadgeHighlighted: {
      backgroundColor: colors.tomorrowRed,
    },
    dateBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    dateBadgeTextHighlighted: {
      color: '#FFFFFF',
    },
    body: {
      flex: 1,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    note: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    coupangButton: {
      alignSelf: 'flex-start',
      backgroundColor: '#FFF1EE',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 6,
    },
    coupangButtonText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.coralPink,
    },
  });
}
