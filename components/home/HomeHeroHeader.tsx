import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { WeatherDay } from '../../hooks/useWeeklyWeather';
import { Child } from '../../types/models';
import { formatMD } from '../../utils/date';
import { describeGuideTip, describeMiniTip } from '../../utils/weatherCode';
import Text from '../common/AppText';

interface HomeHeroHeaderProps {
  selectedChild: Child | undefined;
  onPressChild: () => void;
  onPressMeal: () => void;
  onPressPlaces: () => void;
  weatherDays: WeatherDay[] | null;
  weatherLoading: boolean;
  onPressDate: (date: string) => void;
}

/** Korean 아/야 particle: true when the syllable ends with a batchim (final consonant). */
function hasFinalConsonant(text: string): boolean {
  const trimmed = text.trim();
  const code = trimmed.charCodeAt(trimmed.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return true;
  return (code - 0xac00) % 28 !== 0;
}

/** Shared greeting header + weather hero, used for both the empty and has-data home states so the top of the screen never differs. */
export default function HomeHeroHeader({
  selectedChild,
  onPressChild,
  onPressMeal,
  onPressPlaces,
  weatherDays,
  weatherLoading,
  onPressDate,
}: HomeHeroHeaderProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const today = weatherDays?.find((d) => d.isToday);
  const tomorrow = weatherDays?.find((d) => d.isTomorrow);
  const dayAfter = useMemo(() => {
    if (!weatherDays) return undefined;
    const todayIdx = weatherDays.findIndex((d) => d.isToday);
    if (todayIdx === -1) return undefined;
    return weatherDays[todayIdx + 2];
  }, [weatherDays]);

  const greetingName = selectedChild?.name;
  const particle = greetingName ? (hasFinalConsonant(greetingName) ? '아' : '야') : '';

  return (
    <View>
      <View style={styles.topIconsRow}>
        <Pressable style={styles.iconButton} onPress={() => router.push('/calendar')}>
          <Image source={require('../../assets/icon_calendar_cute.png')} style={styles.iconImage} resizeMode="contain" />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={() => router.push('/settings')}>
          <Image source={require('../../assets/icon_settings_cute.png')} style={styles.iconImage} resizeMode="contain" />
        </Pressable>
      </View>

      <View style={styles.greetingArea}>
        <Pressable style={styles.greetingSection} onPress={onPressChild}>
          <View style={styles.avatarContainer}>
            {selectedChild?.photoUri ? (
              <Image source={{ uri: selectedChild.photoUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarIcon}>🧒</Text>
              </View>
            )}
          </View>

          <Text style={styles.greetingText}>
            오늘도 신나게, <Text style={styles.greetingName}>{greetingName ?? '우리 아이'}{particle}</Text>!
          </Text>

          {selectedChild && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {[`${selectedChild.age}세`, selectedChild.className].filter(Boolean).join(' ')}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Thought bubbles "hovering" over the avatar, tails pointing down at
            it — read as the kid's own thoughts, not part of the profile tap target. */}
        <View style={styles.placesButtonSlot}>
          <ThoughtBubble text={'오늘은\n어디가지? 🗺️'} onPress={onPressPlaces} mirror />
        </View>
        <View style={styles.mealButtonSlot}>
          <ThoughtBubble text={'오늘 점심은\n뭐지? 🍚'} onPress={onPressMeal} />
        </View>
      </View>

      <View style={styles.weatherHeroRow}>
        <View style={styles.todayCardWrapper}>
          {weatherLoading && !today ? (
            <View style={[styles.todayCard, styles.skeleton]} />
          ) : (
            <Pressable style={styles.todayCardPressable} onPress={() => today && onPressDate(today.date)}>
              <LinearGradient
                colors={[colors.blue500, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.todayCard}
              >
                <Text style={styles.todayDateText}>오늘 {today ? formatMD(today.date) : ''}</Text>
                <View style={styles.todayTipCenter}>
                  <View style={styles.todayTipBox}>
                    <Text style={styles.todayEmoji}>{today?.emoji ?? '🌤️'}</Text>
                    <Text style={styles.todayTipText} numberOfLines={2}>
                      {describeGuideTip(today?.label ?? '')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.todayTempText}>{today?.tempMax ?? '--'}°</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>

        <View style={styles.miniCardColumn}>
          <MiniWeatherCard
            label="내일"
            day={tomorrow}
            loading={weatherLoading && !tomorrow}
            variant="peach"
            onPress={() => tomorrow && onPressDate(tomorrow.date)}
          />
          <MiniWeatherCard
            label="모레"
            day={dayAfter}
            loading={weatherLoading && !dayAfter}
            variant="plain"
            onPress={() => dayAfter && onPressDate(dayAfter.date)}
          />
        </View>
      </View>
    </View>
  );
}

/** A cartoon "thought bubble" over the avatar's head — idle-bounces to invite a tap. `mirror` flips it to the left side of the avatar, tail included. */
function ThoughtBubble({ text, onPress, mirror }: { text: string; onPress: () => void; mirror?: boolean }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createMealButtonStyles(colors), [colors]);
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(600),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounceAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, friction: 5 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 3, tension: 200 }).start();
  };
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Animated.View
      style={[
        mirror ? styles.wrapperMirror : styles.wrapper,
        { transform: [{ translateY: bounceAnim }, { scale: scaleAnim }] },
      ]}
    >
      <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut} hitSlop={10}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{text}</Text>
        </View>
        {/* Trailing thought-bubble dots, curling down toward the avatar */}
        <View style={mirror ? styles.tailDotMediumMirror : styles.tailDotMedium} />
        <View style={mirror ? styles.tailDotSmallMirror : styles.tailDotSmall} />
      </Pressable>
    </Animated.View>
  );
}

function MiniWeatherCard({
  label,
  day,
  loading,
  variant,
  onPress,
}: {
  label: string;
  day?: WeatherDay;
  loading: boolean;
  variant: 'peach' | 'plain';
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createMiniCardStyles(colors), [colors]);

  if (loading) {
    return <View style={[styles.container, styles.skeleton]} />;
  }

  return (
    <Pressable
      style={[styles.container, variant === 'peach' ? styles.peach : styles.plain]}
      onPress={onPress}
      disabled={!day}
    >
      <Text style={styles.label}>
        {label}
        {day ? ` ${formatMD(day.date)}` : ''}
      </Text>
      <View style={styles.tipRow}>
        <Text style={styles.emoji}>{day?.emoji ?? '🌡️'}</Text>
        {day && (
          <Text style={styles.tip} numberOfLines={1}>
            {describeMiniTip(day.label)}
          </Text>
        )}
      </View>
      <Text style={styles.temp}>{day ? `${day.tempMax}°` : '--'}</Text>
    </Pressable>
  );
}

const AVATAR_SIZE = 84;
const ICON_BUTTON_SIZE = 32;
const TODAY_CARD_HEIGHT = 192;
const BUBBLE_GAP = 6;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    topIconsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      gap: 8,
    },
    iconButton: {
      width: ICON_BUTTON_SIZE,
      height: ICON_BUTTON_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconImage: {
      width: ICON_BUTTON_SIZE,
      height: ICON_BUTTON_SIZE,
    },
    greetingArea: {
      position: 'relative',
    },
    greetingSection: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 4,
      paddingBottom: 20,
    },
    // Anchored off the avatar's known center + fixed size (not a measured
    // layout) so both bubbles land an identical gap from the avatar on any
    // platform/font, regardless of how wide each bubble's own text renders.
    mealButtonSlot: {
      position: 'absolute',
      top: 14,
      left: '50%',
      transform: [{ translateX: AVATAR_SIZE / 2 + BUBBLE_GAP }],
    },
    placesButtonSlot: {
      position: 'absolute',
      top: 14,
      right: '50%',
      transform: [{ translateX: -(AVATAR_SIZE / 2 + BUBBLE_GAP) }],
    },
    avatarContainer: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: colors.orangeLight2,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: colors.orangeBorder,
      marginBottom: 12,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
    },
    avatarPlaceholder: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarIcon: {
      fontSize: 42,
    },
    greetingText: {
      fontSize: 23,
      fontWeight: '800',
      color: colors.gray900,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    greetingName: {
      color: colors.purple500,
      fontWeight: '900',
    },
    badge: {
      marginTop: 12,
      backgroundColor: '#FFE066',
      borderRadius: 6,
      paddingHorizontal: 16,
      paddingVertical: 6,
      transform: [{ rotate: '-1.5deg' }],
      ...SHADOW,
      shadowOpacity: 0.1,
      elevation: 2,
    },
    badgeText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#5C4A1E',
    },
    weatherHeroRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      gap: 12,
      height: TODAY_CARD_HEIGHT,
    },
    todayCardWrapper: {
      flex: 1.3,
    },
    todayCardPressable: {
      flex: 1,
      borderRadius: 26,
      overflow: 'hidden',
      ...SHADOW,
      shadowOpacity: 0.18,
      shadowColor: colors.accent,
      elevation: 4,
    },
    todayCard: {
      flex: 1,
      padding: 18,
    },
    todayTipCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    skeleton: {
      backgroundColor: colors.gray100,
      borderRadius: 26,
    },
    todayDateText: {
      fontSize: 14,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.9)',
    },
    todayEmoji: {
      fontSize: 20,
    },
    todayTempText: {
      fontSize: 40,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -1,
    },
    todayTipBox: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      justifyContent: 'center',
      maxWidth: '100%',
      gap: 8,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    todayTipText: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
      textAlign: 'center',
    },
    miniCardColumn: {
      flex: 1,
      justifyContent: 'space-between',
      gap: 10,
    },
  });
}

function createMealButtonStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      alignItems: 'flex-end',
    },
    wrapperMirror: {
      alignItems: 'flex-start',
    },
    bubble: {
      minWidth: 114,
      backgroundColor: colors.cardWhite,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: colors.orangeBorder,
      paddingHorizontal: 12,
      paddingVertical: 8,
      ...SHADOW,
      shadowOpacity: 0.15,
      elevation: 3,
    },
    bubbleText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.gray800,
      textAlign: 'center',
      lineHeight: 18,
    },
    // Small trailing circles that curl the bubble's tail down toward the avatar,
    // the classic comic "thought bubble" shape instead of a pointed speech tail.
    tailDotMedium: {
      position: 'absolute',
      bottom: -9,
      left: 22,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.cardWhite,
      borderWidth: 2,
      borderColor: colors.orangeBorder,
    },
    tailDotSmall: {
      position: 'absolute',
      bottom: -16,
      left: 12,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.cardWhite,
      borderWidth: 2,
      borderColor: colors.orangeBorder,
    },
    tailDotMediumMirror: {
      position: 'absolute',
      bottom: -9,
      right: 22,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.cardWhite,
      borderWidth: 2,
      borderColor: colors.orangeBorder,
    },
    tailDotSmallMirror: {
      position: 'absolute',
      bottom: -16,
      right: 12,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.cardWhite,
      borderWidth: 2,
      borderColor: colors.orangeBorder,
    },
  });
}

function createMiniCardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1.5,
      paddingVertical: 10,
      paddingHorizontal: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    peach: {
      backgroundColor: colors.orangeLight1,
      borderColor: colors.orangeBorder,
    },
    plain: {
      backgroundColor: colors.cardWhite,
      borderColor: colors.border,
    },
    skeleton: {
      backgroundColor: colors.gray100,
      borderColor: colors.gray100,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.gray600,
      textAlign: 'center',
      marginBottom: 4,
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginVertical: 4,
      maxWidth: '100%',
    },
    emoji: {
      fontSize: 16,
    },
    temp: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.gray900,
    },
    tip: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.gray500,
      flexShrink: 1,
    },
  });
}
