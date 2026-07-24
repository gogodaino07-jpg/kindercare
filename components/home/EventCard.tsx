import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { Event } from '../../types/models';
import { openCoupangSearch } from '../../utils/coupang';
import { isValidCoupangKeyword } from '../../utils/validation';
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

// A small rotating pastel palette for the left icon badge, picked
// deterministically per card so the list reads lively without flickering
// between re-renders.
const ICON_PASTELS = ['#EAF4FB', '#FDECEE', '#FFF3E0', '#EAF7EF', '#F1EAFB'];

function pastelFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ICON_PASTELS[hash % ICON_PASTELS.length];
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
  const icon = event.icon || '📌';

  return (
    <Pressable
      style={[styles.card, highlighted && styles.cardHighlighted]}
      onPress={onPress}
    >
      <Text style={styles.watermark}>{icon}</Text>
      <View style={[styles.iconBadge, { backgroundColor: pastelFor(event.id) }]}>
        <Text style={styles.iconBadgeText}>{icon}</Text>
      </View>
      <View style={styles.body}>
        {dateBadgeText ? (
          <View style={[styles.dateBadge, highlighted && styles.dateBadgeHighlighted]}>
            <Text style={[styles.dateBadgeText, highlighted && styles.dateBadgeTextHighlighted]}>
              {dateBadgeText}
            </Text>
          </View>
        ) : null}
        <Text style={styles.title}>{event.title}</Text>
        {subtitle ? (
          <Text style={styles.note} numberOfLines={subtitleIsMemo ? 1 : wrapNote ? undefined : 1}>
            {subtitle}
          </Text>
        ) : null}
        {showCoupangButton && isValidCoupangKeyword(event.note) ? (
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
      overflow: 'hidden',
    },
    cardHighlighted: {
      borderWidth: 1.5,
      borderColor: '#F9C4CE',
    },
    watermark: {
      position: 'absolute',
      right: -6,
      bottom: -14,
      fontSize: 56,
      opacity: 0.06,
    },
    iconBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    iconBadgeText: {
      fontSize: 18,
    },
    dateBadge: {
      alignSelf: 'flex-start',
      backgroundColor: '#EEF2F5',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
      marginBottom: 4,
    },
    dateBadgeHighlighted: {
      backgroundColor: '#FFE0E6',
    },
    dateBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    dateBadgeTextHighlighted: {
      color: '#E85D75',
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
