import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { Event } from '../../types/models';
import Text from '../common/AppText';
import EventIcon from '../common/EventIcon';

interface BagSectionProps {
  /** Today's events, shown as the main cards. */
  mainEvents: Event[];
  /** Tomorrow's events, shown de-emphasized below the main cards. */
  secondaryEvents: Event[];
  displayType: 'TODAY' | 'TOMORROW';
  onEventPress: (event: Event) => void;
}

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
  if (event.needsReview) return { bg: colors.pastelOrange, accent: colors.pastelOrangeAccent };
  if (event.source === 'manual') return { bg: colors.pastelPink, accent: colors.pastelPinkAccent };
  return { bg: colors.pastelBlue, accent: colors.pastelBlueAccent };
}

export default function BagSection({ mainEvents, secondaryEvents, displayType, onEventPress }: BagSectionProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidthFor = (count: number) =>
    count === 1
      ? screenWidth - SIDE_PADDING * 2
      : Math.min(220, Math.max(150, (screenWidth - SIDE_PADDING * 2 - CARD_GAP) / 2));
  const mainCardWidth = cardWidthFor(mainEvents.length);
  const secondaryCardWidth = cardWidthFor(secondaryEvents.length);
  const styles = useMemo(() => createStyles(colors, mainCardWidth), [colors, mainCardWidth]);
  const secondaryStyles = useMemo(() => createStyles(colors, secondaryCardWidth), [colors, secondaryCardWidth]);
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

  const renderCard = (event: Event, badgeText: string, muted: boolean, cardStyles: typeof styles, singleRow = false) => (
    <BagCard
      key={event.id}
      event={event}
      badgeText={badgeText}
      muted={muted}
      singleRow={singleRow}
      isDone={completedIds.has(event.id)}
      onToggleComplete={() => toggleComplete(event.id)}
      onPress={() => onEventPress(event)}
      colors={colors}
      styles={cardStyles}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionEmoji}>🐥</Text>
          <Text style={styles.sectionTitle}>오늘 일정</Text>
        </View>
        {mainEvents.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.scanAgainButton, pressed && { opacity: 0.6 }]}
            onPress={() => router.push('/upload')}
            hitSlop={8}
          >
            <Text style={styles.scanAgainIcon}>✨</Text>
            <Text style={styles.scanAgainButtonText}>AI 스캔</Text>
          </Pressable>
        )}
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
          {mainEvents.map((event) => renderCard(event, dateBadgeText, false, styles, mainEvents.length === 1))}
        </ScrollView>
      )}

      {secondaryEvents.length > 0 && (
        <>
          <View style={styles.secondaryHeaderRow}>
            <Text style={styles.sectionEmoji}>🌟</Text>
            <Text style={styles.sectionTitle}>내일 일정</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={secondaryStyles.scrollContent}
          >
            {secondaryEvents.map((event) => renderCard(event, '내일', true, secondaryStyles, secondaryEvents.length === 1))}
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
  singleRow,
  isDone,
  onToggleComplete,
  onPress,
  colors,
  styles,
}: {
  event: Event;
  badgeText: string;
  muted: boolean;
  singleRow?: boolean;
  isDone: boolean;
  onToggleComplete: () => void;
  onPress: () => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const category = getCategoryStyle(event, colors);
  const description = event.note || event.memo || '';
  // "내일" cards (tomorrow's items shown as the main focus) get an even paler
  // card background than "오늘" cards — button color stays the normal accent.
  const isTomorrowCard = !muted && badgeText === '내일';
  const cardBg = muted ? colors.gray100 : lighten(category.bg, isTomorrowCard ? 0.92 : 0.6);

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

  if (singleRow) {
    return (
      <Animated.View style={[styles.singleRowCard, { backgroundColor: cardBg, opacity: doneOpacity }]}>
        <Pressable style={styles.singleRowMain} onPress={onPress}>
          <View style={[styles.iconCircle, muted && { backgroundColor: colors.cardWhite }]}>
            <EventIcon icon={event.icon} size={24} />
          </View>
          <View style={styles.singleRowTextBlock}>
            <Text style={styles.cardTitle} numberOfLines={1}>{event.title}</Text>
            {!!description && (
              <Text style={styles.singleRowDescription} numberOfLines={1}>{description}</Text>
            )}
          </View>
        </Pressable>

        <Pressable style={styles.singleRowButtonWrap} onPress={handleTogglePress}>
          <Animated.View
            style={[
              styles.completeButton,
              styles.singleRowCompleteButton,
              muted
                ? [styles.completeButtonMuted, { borderColor: colors.gray400 }, isDone && { backgroundColor: colors.gray400, borderColor: colors.gray400 }]
                : { backgroundColor: isDone ? colors.gray900 : category.accent },
              { transform: [{ scale: buttonScale }] },
            ]}
          >
            <Animated.View
              style={{
                width: checkScale.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }),
                overflow: 'hidden',
                transform: [{ scale: checkScale }],
                marginRight: checkScale.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }),
              }}
            >
              <MaterialIcons name="check" size={14} color={muted && !isDone ? colors.gray500 : '#FFFFFF'} />
            </Animated.View>
            <Text style={[styles.completeButtonText, muted && !isDone && { color: colors.gray500 }]}>
              {isDone ? '완료!' : '확인'}
            </Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.card, { backgroundColor: cardBg, opacity: doneOpacity }]}
    >
      <Pressable onPress={onPress}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, muted && { backgroundColor: colors.cardWhite }]}>
            <EventIcon icon={event.icon} size={24} />
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
              ? [styles.completeButtonMuted, { borderColor: colors.gray400 }, isDone && { backgroundColor: colors.gray400, borderColor: colors.gray400 }]
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
            color={muted && !isDone ? colors.gray500 : '#FFFFFF'}
          />
        </Animated.View>
        <Text
          style={[
            styles.completeButtonText,
            muted && !isDone && { color: colors.gray500 },
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
      justifyContent: 'space-between',
      paddingHorizontal: SIDE_PADDING,
      marginBottom: 12,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
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
    scanAgainButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#14B8A6',
    },
    scanAgainIcon: {
      fontSize: 12.5,
      color: '#14B8A6',
    },
    scanAgainButtonText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.gray500,
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
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.cardWhite,
      alignItems: 'center',
      justifyContent: 'center',
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
      paddingHorizontal: 16,
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
    singleRowCard: {
      width: cardWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 18,
      padding: 12,
      ...SHADOW,
      shadowOpacity: 0.1,
      elevation: 3,
    },
    singleRowMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      minWidth: 0,
    },
    singleRowTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    singleRowDescription: {
      fontSize: 11.5,
      fontWeight: '500',
      color: colors.gray600,
      marginTop: 1,
    },
    singleRowCompleteButton: {
      width: 84,
      marginTop: 0,
      paddingHorizontal: 14,
    },
    singleRowButtonWrap: {
      alignSelf: 'center',
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
