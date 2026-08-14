import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { Event } from '../../types/models';
import Text from '../common/AppText';

interface BagSectionProps {
  mainEvents: Event[];
  /** Today's leftover events once the main focus has shifted to tomorrow (afternoon) — shown de-emphasized below the main cards. */
  secondaryEvents: Event[];
  displayType: 'TODAY' | 'TOMORROW';
  onEventPress: (event: Event) => void;
}

const DEFAULT_ICON = '📌';
const SIDE_PADDING = 20;
const CARD_GAP = 12;

/** Blends a hex color toward white by `amount` (0-1) to make it a paler shade. */
function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function getCategoryStyle(event: Event, colors: ThemeColors) {
  if (event.needsReview) return { bg: colors.pastelOrange, mutedBg: colors.orangeLight1, accent: colors.pastelOrangeAccent };
  if (event.source === 'manual') return { bg: colors.pastelPink, mutedBg: colors.tomorrowRedBg, accent: colors.pastelPinkAccent };
  return { bg: colors.pastelBlue, mutedBg: colors.lightBlueBg, accent: colors.pastelBlueAccent };
}

export default function BagSection({ mainEvents, secondaryEvents, displayType, onEventPress }: BagSectionProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(220, Math.max(150, (screenWidth - SIDE_PADDING * 2 - CARD_GAP) / 2));
  const styles = useMemo(() => createStyles(colors, cardWidth), [colors, cardWidth]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const dateBadgeText = displayType === 'TODAY' ? '오늘' : '내일';

  const toggleComplete = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderCard = (event: Event, badgeText: string, muted: boolean) => (
    <BagCard
      key={event.id}
      event={event}
      badgeText={badgeText}
      muted={muted}
      isDone={completedIds.has(event.id)}
      onToggleComplete={() => toggleComplete(event.id)}
      onPress={() => onEventPress(event)}
      colors={colors}
      styles={styles}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionEmoji}>🎒</Text>
        <Text style={styles.sectionTitle}>가방에 쏙쏙!</Text>
      </View>

      {mainEvents.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardTitle}>{dateBadgeText} 챙길 준비물이 무엇인가요?</Text>
          <Pressable style={styles.emptyCardButton} onPress={() => router.push('/upload')}>
            <Text style={styles.emptyCardButtonText}>가정통신문 스캔하기</Text>
          </Pressable>
          <Text style={styles.emptyCardSubtitle}>AI가 일정이랑 준비물을 쏙쏙 찾아드려요!</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {mainEvents.map((event) => renderCard(event, dateBadgeText, false))}
        </ScrollView>
      )}

      {secondaryEvents.length > 0 && (
        <>
          <View style={styles.secondaryHeaderRow}>
            <Text style={styles.sectionEmoji}>📍</Text>
            <Text style={styles.sectionTitle}>오늘 진행한 일정</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {secondaryEvents.map((event) => renderCard(event, '오늘', true))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function BagCard({
  event,
  badgeText,
  muted,
  isDone,
  onToggleComplete,
  onPress,
  colors,
  styles,
}: {
  event: Event;
  badgeText: string;
  muted: boolean;
  isDone: boolean;
  onToggleComplete: () => void;
  onPress: () => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const category = getCategoryStyle(event, colors);
  const description = event.note || event.memo || '';
  // "내일" cards (tomorrow's items shown as the main focus) get a paler card
  // background than usual — button color stays the normal accent.
  const isTomorrowCard = !muted && badgeText === '내일';
  const cardBg = muted ? category.mutedBg : (isTomorrowCard ? lighten(category.bg, 0.6) : category.bg);

  // Fades the whole card when marked done, so "완료" reads as a finished
  // task rather than just a button color flip.
  const doneOpacity = useRef(new Animated.Value(isDone ? 0.55 : 1)).current;
  useEffect(() => {
    Animated.timing(doneOpacity, {
      toValue: isDone ? 0.55 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isDone, doneOpacity]);

  // Button "pop" on tap, and the checkmark springs in/out with it, so
  // marking something done feels like a satisfying little bounce.
  const buttonScale = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(isDone ? 1 : 0)).current;
  useEffect(() => {
    // marginRight below animates alongside scale, and layout properties like
    // margin aren't supported by the native driver, so this one runs on JS.
    Animated.spring(checkScale, {
      toValue: isDone ? 1 : 0,
      friction: 4,
      tension: 140,
      useNativeDriver: false,
    }).start();
  }, [isDone, checkScale]);

  const handleTogglePress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(buttonScale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();
    onToggleComplete();
  };

  return (
    <Animated.View
      style={[styles.card, { backgroundColor: cardBg, opacity: doneOpacity }]}
    >
      <Pressable onPress={onPress}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, muted && { backgroundColor: colors.cardWhite }]}>
            <Text style={styles.iconEmoji}>{event.icon || DEFAULT_ICON}</Text>
          </View>
          <View style={[styles.dateBadge, muted && styles.dateBadgeMuted]}>
            <Text style={[styles.dateBadgeText, { color: muted ? colors.gray500 : category.accent }]}>
              {badgeText}
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={1}>{event.title}</Text>
        {!!description && (
          <Text style={styles.cardDescription} numberOfLines={2}>{description}</Text>
        )}
      </Pressable>

      <Pressable onPress={handleTogglePress}>
        <Animated.View
          style={[
            styles.completeButton,
            muted
              ? [styles.completeButtonMuted, { borderColor: category.accent }, isDone && { backgroundColor: category.accent }]
              : { backgroundColor: isDone ? colors.gray900 : category.accent },
            { transform: [{ scale: buttonScale }] },
          ]}
        >
        <Animated.View
          style={{
            transform: [{ scale: checkScale }],
            marginRight: checkScale.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }),
          }}
        >
          <MaterialIcons
            name="check"
            size={14}
            color={muted && !isDone ? category.accent : '#FFFFFF'}
          />
        </Animated.View>
        <Text
          style={[
            styles.completeButtonText,
            muted && !isDone && { color: category.accent },
          ]}
        >
          {isDone ? '완료!' : '확인'}
        </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors, cardWidth: number) {
  return StyleSheet.create({
    container: {
      marginTop: 20,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: SIDE_PADDING,
      marginBottom: 12,
    },
    sectionEmoji: {
      fontSize: 18,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.gray900,
      letterSpacing: -0.5,
    },
    secondaryHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: SIDE_PADDING,
      marginTop: 18,
      marginBottom: 12,
    },
    scrollContent: {
      paddingHorizontal: SIDE_PADDING,
      paddingVertical: 6,
      gap: CARD_GAP,
    },
    card: {
      width: cardWidth,
      borderRadius: 18,
      padding: 12,
      ...SHADOW,
      shadowOpacity: 0.1,
      elevation: 3,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    dateBadge: {
      backgroundColor: 'rgba(255,255,255,0.75)',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    dateBadgeMuted: {
      backgroundColor: colors.gray100,
    },
    dateBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.cardWhite,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconEmoji: {
      fontSize: 20,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.gray900,
      marginBottom: 3,
    },
    cardDescription: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.gray600,
      lineHeight: 15,
      minHeight: 30,
    },
    completeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      paddingVertical: 9,
      marginTop: 10,
    },
    completeButtonMuted: {
      backgroundColor: colors.cardWhite,
      borderWidth: 1.5,
    },
    completeButtonText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    emptyCard: {
      marginHorizontal: SIDE_PADDING,
      backgroundColor: colors.gray50,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      paddingVertical: 24,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    emptyCardTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.gray900,
      marginBottom: 14,
      textAlign: 'center',
    },
    emptyCardButton: {
      backgroundColor: colors.tomorrowRed,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 999,
      ...SHADOW,
      shadowOpacity: 0.2,
      elevation: 4,
      marginBottom: 10,
    },
    emptyCardButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
    },
    emptyCardSubtitle: {
      fontSize: 11,
      color: colors.gray500,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
