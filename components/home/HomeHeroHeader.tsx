import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { WEATHER_SOURCE_LABEL, WeatherDay } from '../../hooks/useWeeklyWeather';
import { Child, MealPlan } from '../../types/models';
import { formatMD, toISODate } from '../../utils/date';
import { describeGuideTip, describeMiniTip } from '../../utils/weatherCode';
import Text from '../common/AppText';

interface HomeHeroHeaderProps {
  selectedChild: Child | undefined;
  onPressMeal: () => void;
  weatherDays: WeatherDay[] | null;
  weatherLoading: boolean;
  locationLabel?: string;
  onPressDate: (date: string) => void;
  /** 오늘 등록된 급식. 있으면 급식 카드에 메인 메뉴 + 나머지 반찬 목록을 보여줌. */
  todayMeal?: MealPlan;
}

/** 인사말에 성을 빼고 이름만 부르도록: "김서준" -> "서준". 2자 이하는 성을 뗄 수 없어 그대로 둠. */
function stripSurname(name: string): string {
  const trimmed = name.trim();
  return trimmed.length >= 3 ? trimmed.slice(1) : trimmed;
}

/** birthdate(YYYY-MM-DD)의 월-일이 오늘과 같으면 생일. */
function isBirthdayToday(birthdate?: string): boolean {
  if (!birthdate) return false;
  const monthDay = birthdate.slice(5); // "MM-DD"
  const todayMonthDay = toISODate(new Date()).slice(5);
  return monthDay === todayMonthDay;
}

/** Shared meal-menu card + weather hero, used for both the empty and has-data home states so the top of the screen never differs. */
export default function HomeHeroHeader({
  selectedChild,
  onPressMeal,
  weatherDays,
  weatherLoading,
  locationLabel,
  onPressDate,
  todayMeal,
}: HomeHeroHeaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [weatherExpanded, setWeatherExpanded] = useState(false);

  const today = weatherDays?.find((d) => d.isToday);
  const tomorrow = weatherDays?.find((d) => d.isTomorrow);
  const dayAfter = useMemo(() => {
    if (!weatherDays) return undefined;
    const todayIdx = weatherDays.findIndex((d) => d.isToday);
    if (todayIdx === -1) return undefined;
    return weatherDays[todayIdx + 2];
  }, [weatherDays]);

  const greetingName = selectedChild?.givenName?.trim()
    ? selectedChild.givenName.trim()
    : selectedChild?.name
      ? stripSurname(selectedChild.name)
      : undefined;
  const isBirthday = isBirthdayToday(selectedChild?.birthdate);

  return (
    <View>
      {isBirthday && (
        <LinearGradient
          colors={['#F472B6', '#C084FC', '#818CF8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.birthdayBanner}
        >
          <Text
            style={styles.birthdayBannerText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            🎂 오늘은 {greetingName ?? '우리 아이'} 생일이에요! 축하해요!
          </Text>
        </LinearGradient>
      )}

      <MealMenuCard todayMeal={todayMeal} onPressMeal={onPressMeal} />

      {weatherExpanded && (
        <View style={styles.weatherMetaRow}>
          {locationLabel ? (
            <Text style={styles.weatherMetaText} numberOfLines={1}>
              📍{locationLabel} · {WEATHER_SOURCE_LABEL} 제공
            </Text>
          ) : (
            <View />
          )}
          <Pressable onPress={() => setWeatherExpanded(false)} style={styles.weatherToggleButton} hitSlop={8}>
            <Text style={styles.weatherToggleText}>접기</Text>
            <Feather name="chevron-up" size={12} color={colors.gray400} />
          </Pressable>
        </View>
      )}

      {weatherExpanded ? (
        <View style={styles.weatherHeroRow}>
          <View style={styles.todayCardWrapper}>
            {weatherLoading && !today ? (
              <SkeletonBox style={[styles.todayCard, styles.skeleton]} />
            ) : (
              <Pressable style={styles.todayCardPressable} onPress={() => today && onPressDate(today.date)}>
                <LinearGradient
                  colors={getWeatherGradient(today?.label ?? '')}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.todayCard}
                >
                  <Text style={styles.todayWatermarkEmoji} numberOfLines={1}>
                    {today?.emoji ?? '🌤️'}
                  </Text>
                  <Text style={styles.todayDateText}>
                    오늘{today ? ` ${formatMD(today.date)}` : ''}
                  </Text>
                  <View style={styles.todayTipRow}>
                    <AnimatedWeatherEmoji
                      emoji={today?.emoji ?? '🌤️'}
                      label={today?.label ?? ''}
                      style={styles.todayEmoji}
                    />
                    <Text style={styles.todayTipText} numberOfLines={2}>
                      {describeGuideTip(today?.label ?? '')}
                    </Text>
                  </View>
                  <View style={styles.todayTempRow}>
                    <View style={styles.todayTempItem}>
                      <Text style={styles.todayTempLabel}>최고</Text>
                      <Text style={styles.todayTempText}>{today?.tempMax ?? '--'}°</Text>
                    </View>
                    <View style={styles.todayTempItem}>
                      <Text style={styles.todayTempLabel}>최저</Text>
                      <Text style={styles.todayTempMinText}>{today?.tempMin ?? '--'}°</Text>
                    </View>
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
              onPress={() => tomorrow && onPressDate(tomorrow.date)}
            />
            <MiniWeatherCard
              label="모레"
              day={dayAfter}
              loading={weatherLoading && !dayAfter}
              onPress={() => dayAfter && onPressDate(dayAfter.date)}
            />
          </View>
        </View>
      ) : (
        <Pressable style={styles.weatherCollapsedWrap} onPress={() => setWeatherExpanded(true)}>
          <LinearGradient
            colors={weatherLoading && !today ? ['#E2E8F0', '#E2E8F0'] : getWeatherGradient(today?.label ?? '')}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.weatherCollapsedBanner}
          >
            {weatherLoading && !today ? (
              <Text style={styles.weatherCollapsedText}>날씨 불러오는 중...</Text>
            ) : (
              <View style={styles.weatherCollapsedLeft}>
                <AnimatedWeatherEmoji
                  emoji={today?.emoji ?? '🌤️'}
                  label={today?.label ?? ''}
                  style={styles.weatherCollapsedEmoji}
                />
                <Text style={styles.weatherCollapsedText} numberOfLines={1}>
                  오늘 {today?.label ?? '날씨'} · 최고 {today?.tempMax ?? '--'}° / 최저 {today?.tempMin ?? '--'}°
                </Text>
              </View>
            )}
            <View style={styles.weatherCollapsedChevron}>
              <Feather name="chevron-down" size={18} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

/** 오늘 날씨 조건에 맞춰 카드 그라디언트 색을 바꿔준다(하늘/구름/비/눈/뇌우). */
function getWeatherGradient(label: string): [string, string] {
  if (label === '맑음' || label === '대체로 맑음') return ['#38BDF8', '#FACC15'];
  if (label === '흐림' || label === '안개') return ['#94A3B8', '#CBD5E1'];
  if (label === '이슬비' || label === '비' || label === '소나기') return ['#475569', '#3B82F6'];
  if (label === '눈' || label === '눈 소나기') return ['#93C5FD', '#E0E7FF'];
  if (label === '뇌우') return ['#4C1D95', '#1E293B'];
  return ['#3B82F6', '#6366F1'];
}

/** 오늘 날씨 이모지에 조건별로 은은한 움직임(해 회전, 구름 흔들림, 비/눈 낙하)을 더해준다. */
function AnimatedWeatherEmoji({ emoji, label, style }: { emoji: string; label: string; style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;

  const kind: 'sun' | 'cloud' | 'fall' | 'still' =
    label === '맑음' || label === '대체로 맑음'
      ? 'sun'
      : label === '흐림' || label === '안개'
      ? 'cloud'
      : label === '이슬비' || label === '비' || label === '소나기' || label === '눈' || label === '눈 소나기'
      ? 'fall'
      : 'still';

  useEffect(() => {
    if (kind === 'still') return;
    anim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: kind === 'sun' ? 3200 : 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: kind === 'sun' ? 3200 : 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, kind]);

  if (kind === 'sun') {
    const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] });
    const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
    return (
      <Animated.Text style={[style, { transform: [{ rotate }, { scale }] }]}>{emoji}</Animated.Text>
    );
  }
  if (kind === 'cloud') {
    const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] });
    return <Animated.Text style={[style, { transform: [{ translateX }] }]}>{emoji}</Animated.Text>;
  }
  if (kind === 'fall') {
    const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] });
    return <Animated.Text style={[style, { opacity }]}>{emoji}</Animated.Text>;
  }
  return <Text style={style}>{emoji}</Text>;
}

/** Pulsing placeholder box shown while weather data is loading. */
function SkeletonBox({ style, compact }: { style: any; compact?: boolean }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    pulseLoop.start();
    spinLoop.start();
    return () => {
      pulseLoop.stop();
      spinLoop.stop();
    };
  }, [opacity, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[style, { opacity }]}>
      <View style={skeletonStyles.center}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather name="refresh-cw" size={compact ? 12 : 15} color="#94A3B8" />
        </Animated.View>
        <Text style={compact ? skeletonStyles.textCompact : skeletonStyles.text}>로딩중입니다</Text>
      </View>
    </Animated.View>
  );
}

const skeletonStyles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  text: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  textCompact: { fontSize: 9.5, fontWeight: '700', color: '#94A3B8' },
});

function hexToRgba(hex: string, alpha: number): string {
  const value = parseInt(hex.replace('#', ''), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 날씨별 미니 카드 배경/테두리 — 반투명(rgba)이 이모지와 겹치면 흰 얼룩처럼 보이는
 *  렌더링 문제가 있어, 알파 블렌딩 없이 완전 불투명한 색만 사용한다. */
function getMiniCardTint(label: string | undefined): { bg: string; border: string } {
  if (label === '맑음' || label === '대체로 맑음') return { bg: '#E0F2FE', border: '#7DD3FC' };
  if (label === '흐림' || label === '안개') return { bg: '#F1F5F9', border: '#CBD5E1' };
  if (label === '이슬비' || label === '비' || label === '소나기') return { bg: '#DBEAFE', border: '#93C5FD' };
  if (label === '눈' || label === '눈 소나기') return { bg: '#EFF6FF', border: '#BFDBFE' };
  if (label === '뇌우') return { bg: '#EDE9FE', border: '#C4B5FD' };
  return { bg: '#E0E7FF', border: '#A5B4FC' };
}

function MiniWeatherCard({
  label,
  day,
  loading,
  onPress,
}: {
  label: string;
  day?: WeatherDay;
  loading: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createMiniCardStyles(colors), [colors]);
  const tint = useMemo(() => getMiniCardTint(day?.label), [day?.label]);

  if (loading) {
    return <SkeletonBox style={[styles.container, styles.skeleton]} compact />;
  }

  return (
    <Pressable
      style={[styles.container, { backgroundColor: tint.bg, borderColor: tint.border }]}
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
      <View style={styles.tempRow}>
        <Text style={styles.temp}>{day ? `${day.tempMax}°` : '--'}</Text>
        {day && <Text style={styles.tempMin}>{day.tempMin}°</Text>}
      </View>
    </Pressable>
  );
}

/** 오늘의 급식 카드 — 오렌지 태그 + "전체 식단" 링크(급식 시트를 그대로 엶) + 대표 메뉴 + 나머지 반찬 목록. */
function MealMenuCard({ todayMeal, onPressMeal }: { todayMeal?: MealPlan; onPressMeal: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createMealCardStyles(colors), [colors]);
  const router = useRouter();

  const mainText = todayMeal?.mainMenu?.trim() || todayMeal?.menu[0];
  const sideItems = useMemo(
    () => (todayMeal ? todayMeal.menu.filter((item) => item !== mainText) : []),
    [todayMeal, mainText]
  );

  if (!todayMeal) {
    return (
      <Pressable style={styles.card} onPress={onPressMeal}>
        <View style={styles.emptyRow}>
          <View style={styles.emptyLeftCol}>
            <View style={styles.emptyHeaderRow}>
              <View style={styles.miniTag}>
                <Text style={styles.miniTagText}>점심</Text>
              </View>
              <Text style={styles.unregisteredText}>미등록</Text>
            </View>
            <Text style={styles.emptyMainText}>오늘 등록된 급식 없음</Text>
          </View>
          <Pressable style={styles.scanButton} onPress={() => router.push('/meal-scan')} hitSlop={4}>
            <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
            <Text style={styles.scanButtonText}>스캔하기</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.card} onPress={onPressMeal}>
      <View style={styles.headerRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>오늘의 점심</Text>
        </View>
        <View style={styles.linkRow}>
          <Text style={styles.linkText}>전체 식단</Text>
          <Feather name="chevron-right" size={14} color={colors.gray900} />
        </View>
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.thumbnail}>
          <Text style={styles.thumbnailEmoji}>🍲</Text>
        </View>
        <View style={styles.textCol}>
          <Text style={styles.mainMenuText} numberOfLines={1}>
            {mainText}
          </Text>
          {sideItems.length > 0 && (
            <Text style={styles.sideMenuText} numberOfLines={1}>
              {sideItems.join(' · ')}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function createMealCardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.orangeLight1,
      marginHorizontal: 20,
      marginTop: 10,
      marginBottom: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.pastelOrange,
      paddingVertical: 12,
      paddingHorizontal: 16,
      ...SHADOW,
      shadowOpacity: 0.06,
      elevation: 1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    tag: {
      backgroundColor: colors.pastelOrangeAccent,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    tagText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    linkText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.gray900,
    },
    bodyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      position: 'relative',
    },
    thumbnail: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.cardWhite,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbnailEmoji: {
      fontSize: 24,
    },
    textCol: {
      flex: 1,
      minWidth: 0,
    },
    mainMenuText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.gray900,
      marginBottom: 3,
    },
    sideMenuText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.gray500,
    },
    emptyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    emptyLeftCol: {
      flex: 1,
      minWidth: 0,
    },
    emptyHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    miniTag: {
      backgroundColor: colors.pastelOrangeAccent,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    miniTagText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    unregisteredText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.gray500,
    },
    emptyMainText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.gray900,
    },
    scanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.pastelOrangeAccent,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 9,
      ...SHADOW,
      shadowOpacity: 0.12,
      shadowColor: colors.peachOrangeDeep,
      elevation: 2,
    },
    scanButtonText: {
      fontSize: 13.5,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
}

const TODAY_CARD_HEIGHT = 148;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    birthdayBanner: {
      marginHorizontal: 20,
      marginTop: 10,
      marginBottom: 10,
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 16,
      ...SHADOW,
      shadowOpacity: 0.1,
      elevation: 2,
    },
    birthdayBannerText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    weatherMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      marginBottom: 6,
    },
    weatherMetaText: {
      fontSize: 10.5,
      fontWeight: '600',
      color: colors.gray400,
      flexShrink: 1,
    },
    weatherToggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    weatherToggleText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: colors.gray400,
    },
    weatherCollapsedWrap: {
      marginHorizontal: 20,
      marginBottom: 16,
    },
    weatherCollapsedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 20,
      paddingVertical: 20,
      paddingHorizontal: 20,
      ...SHADOW,
      shadowOpacity: 0.1,
      elevation: 2,
    },
    weatherCollapsedLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      minWidth: 0,
    },
    weatherCollapsedChevron: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    weatherCollapsedEmoji: {
      fontSize: 28,
    },
    weatherCollapsedText: {
      flexShrink: 1,
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    weatherHeroRow: {
      flexDirection: 'row',
      paddingHorizontal: 18,
      gap: 8,
      height: TODAY_CARD_HEIGHT,
    },
    todayCardWrapper: {
      flex: 1.1,
    },
    todayCardPressable: {
      flex: 1,
      borderRadius: 18,
      overflow: 'hidden',
      ...SHADOW,
      shadowOpacity: 0.12,
      shadowColor: colors.accent,
      elevation: 2,
    },
    todayCard: {
      flex: 1,
      padding: 14,
      justifyContent: 'space-between',
    },
    todayWatermarkEmoji: {
      position: 'absolute',
      right: -18,
      bottom: -22,
      fontSize: 108,
      opacity: 0.16,
      transform: [{ rotate: '-8deg' }],
    },
    skeleton: {
      backgroundColor: colors.gray100,
      borderRadius: 18,
    },
    todayDateText: {
      fontSize: 12,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.8)',
    },
    todayEmoji: {
      fontSize: 19,
    },
    todayTipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    todayTipText: {
      flexShrink: 1,
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.92)',
      textAlign: 'left',
    },
    todayTempRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      justifyContent: 'flex-start',
    },
    todayTempItem: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    todayTempLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.75)',
    },
    todayTempText: {
      fontSize: 32,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.5,
    },
    todayTempMinText: {
      fontSize: 15,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.75)',
      letterSpacing: -0.5,
    },
    miniCardColumn: {
      flex: 1,
      justifyContent: 'space-between',
      gap: 8,
    },
  });
}


function createMiniCardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      paddingVertical: 8,
      paddingHorizontal: 10,
      justifyContent: 'center',
      alignItems: 'flex-start',
      ...SHADOW,
      shadowOpacity: 0.05,
      elevation: 1,
    },
    skeleton: {
      backgroundColor: colors.gray100,
      borderColor: colors.gray100,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.gray600,
      textAlign: 'left',
      marginBottom: 3,
    },
    tipRow: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      alignItems: 'center',
      gap: 4,
      marginVertical: 3,
    },
    emoji: {
      fontSize: 14,
    },
    tempRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    temp: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.gray900,
    },
    tempMin: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.gray400,
    },
    tip: {
      fontSize: 10.5,
      fontWeight: '600',
      color: colors.gray500,
      flexShrink: 1,
    },
  });
}
