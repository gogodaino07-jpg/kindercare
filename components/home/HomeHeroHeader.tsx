import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { WeatherDay } from '../../hooks/useWeeklyWeather';
import { Child } from '../../types/models';
import { formatMD, parseISODate, WEEKDAY_KO } from '../../utils/date';
import { describeGuideTip } from '../../utils/weatherCode';
import Text from '../common/AppText';

interface HomeHeroHeaderProps {
  selectedChild: Child | undefined;
  onPressChild: () => void;
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
          <MaterialIcons name="date-range" size={18} color={colors.gray600} />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={() => router.push('/settings')}>
          <MaterialIcons name="settings" size={18} color={colors.gray600} />
        </Pressable>
      </View>

      <Pressable style={styles.greetingSection} onPress={onPressChild} hitSlop={8}>
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
                <View style={styles.todayTempRow}>
                  <Text style={styles.todayEmoji}>{today?.emoji ?? '🌤️'}</Text>
                  <Text style={styles.todayTempText}>{today?.tempMax ?? '--'}°</Text>
                </View>
                <View style={styles.todayTipBox}>
                  <Text style={styles.todayTipText} numberOfLines={2}>
                    {describeGuideTip(today?.label ?? '')}
                  </Text>
                </View>
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

  const weekday = day ? WEEKDAY_KO[parseISODate(day.date).getDay()] : '';

  return (
    <Pressable
      style={[styles.container, variant === 'peach' ? styles.peach : styles.plain]}
      onPress={onPress}
      disabled={!day}
    >
      <Text style={styles.label}>
        {label}
        {weekday ? ` (${weekday})` : ''}
      </Text>
      <Text style={styles.emoji}>{day?.emoji ?? '🌡️'}</Text>
      <Text style={styles.temp}>{day ? `${day.tempMax}°` : '--'}</Text>
    </Pressable>
  );
}

const AVATAR_SIZE = 68;
const ICON_BUTTON_SIZE = 32;
const TODAY_CARD_HEIGHT = 192;

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
      borderRadius: ICON_BUTTON_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardWhite,
      ...SHADOW,
      shadowOpacity: 0.06,
      elevation: 1,
    },
    greetingSection: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 4,
      paddingBottom: 20,
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
      fontSize: 34,
    },
    greetingText: {
      fontSize: 19,
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
      marginTop: 10,
      backgroundColor: colors.cardWhite,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 5,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.gray600,
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
      justifyContent: 'space-between',
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
    todayTempRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    todayEmoji: {
      fontSize: 30,
    },
    todayTempText: {
      fontSize: 40,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -1,
    },
    todayTipBox: {
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    todayTipText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    miniCardColumn: {
      flex: 1,
      justifyContent: 'space-between',
      gap: 10,
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
      marginBottom: 4,
    },
    emoji: {
      fontSize: 18,
      marginBottom: 2,
    },
    temp: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.gray900,
    },
  });
}
