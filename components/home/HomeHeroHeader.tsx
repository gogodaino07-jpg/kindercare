import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { WEATHER_SOURCE_LABEL, WeatherDay } from '../../hooks/useWeeklyWeather';
import { Child } from '../../types/models';
import { formatMD, toISODate } from '../../utils/date';
import { describeGuideTip, describeMiniTip, describeTempCompareTip } from '../../utils/weatherCode';
import Text from '../common/AppText';

interface HomeHeroHeaderProps {
  selectedChild: Child | undefined;
  onPressMeal: () => void;
  weatherDays: WeatherDay[] | null;
  weatherLoading: boolean;
  locationLabel?: string;
  onPressDate: (date: string) => void;
  /** 오늘 등록된 급식의 메인 메뉴. 있으면 인사말 대신 "오늘은 OO를 먹어요~" 문구를 보여줌. */
  todayMainMenu?: string;
  /** 값이 바뀔 때마다(당겨서 새로고침) 인사말을 새로 랜덤 선택. 없으면 날짜 기준 고정 문구. */
  refreshKey?: number;
}

/** Korean 아/야 particle: true when the syllable ends with a batchim (final consonant). */
function hasFinalConsonant(text: string): boolean {
  const trimmed = text.trim();
  const code = trimmed.charCodeAt(trimmed.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return true;
  return (code - 0xac00) % 28 !== 0;
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

/**
 * 이름+조사(아/야) 앞뒤에 붙는 문구. 배너 옆 여백이 휑해 보이지 않도록
 * 일부러 길게 써서 점심 메뉴 버튼 바로 옆까지 내용이 채워지게 함.
 */
const GREETING_TEMPLATES: { before: string; after: string }[] = [
  { before: '', after: ', 오늘 하루도 신나고 즐거운 일들이 가득하길 바랄게!' },
  { before: '좋은 아침이야, ', after: '! 오늘도 씩씩하게 하루를 시작해보자!' },
  { before: '', after: ', 잘 잤어? 오늘도 웃음 가득한 하루 보내자!' },
  { before: '', after: ', 오늘도 신나는 일들로 가득한 하루가 되길 바라!' },
  { before: '오늘도 반가워, ', after: '! 하루 종일 즐겁고 행복한 시간 보내자!' },
  { before: '', after: ', 오늘도 힘차게 하루를 시작해볼까? 파이팅!' },
  { before: '', after: ', 오늘은 또 어떤 신나는 일이 기다리고 있을까? 기대돼!' },
  { before: '일어났구나, ', after: '! 오늘도 신나고 활기찬 하루 보내보자!' },
  { before: '', after: ', 오늘도 활짝 웃으며 즐거운 하루 시작해보자!' },
  { before: '', after: ', 오늘 하루도 무럭무럭 건강하게 자라렴!' },
  { before: '좋은 하루야, ', after: '! 오늘도 신나고 알찬 하루 보내보자!' },
  { before: '', after: ', 오늘도 씩씩하게 하루를 힘껏 채워보자!' },
  { before: '', after: ', 오늘 하루도 두근두근 기대되는 일이 가득하길!' },
  { before: '', after: ', 신나는 모험이 오늘도 너를 기다리고 있어!' },
  { before: '', after: ', 오늘도 언제나처럼 네가 최고야, 힘내자!' },
  { before: '', after: ', 오늘 하루도 알차고 즐겁게 보내볼까?' },
  { before: '', after: ', 씩씩하고 건강하게 오늘 하루도 잘 지내자!' },
  { before: '', after: ', 오늘도 무럭무럭 자라나는 소중한 하루야!' },
  { before: '', after: ', 좋은 하루 시작해볼까? 오늘도 응원할게!' },
  { before: '', after: ', 오늘도 웃음꽃 활짝 피우는 하루가 되길!' },
  { before: '상쾌한 아침이야, ', after: '! 오늘 하루도 튼튼하게 지내보자!' },
  { before: '', after: ', 오늘 하루도 튼튼하고 건강하게 지내자!' },
  { before: '', after: ', 오늘도 별처럼 반짝반짝 빛나는 하루 보내!' },
  { before: '', after: ', 오늘 하루도 함께라서 좋아, 즐겁게 지내자!' },
  { before: '안녕, ', after: '! 오늘 하루도 신나게 보내보자, 파이팅!' },
  { before: '', after: ', 오늘도 방긋 웃어줄래? 그럼 나도 행복해!' },
  { before: '', after: ', 오늘 하루도 신나는 일만 가득하길 바랄게!' },
  { before: '', after: ', 오늘도 사랑스럽고 행복한 하루 보내자!' },
  { before: '', after: ', 씩씩하게 오늘 하루도 힘차게 파이팅!' },
  { before: '', after: ', 오늘도 행복 가득한 하루가 되길 바랄게!' },
];

/** 오늘 날짜를 시드로 30개 중 하나를 고정 선택 — 같은 날엔 항상 같은 문구, 자정 지나면 자동으로 바뀜. */
function pickDailyGreetingTemplate(): { before: string; after: string } {
  const todayKey = toISODate(new Date());
  let hash = 0;
  for (let i = 0; i < todayKey.length; i++) {
    hash = (hash * 31 + todayKey.charCodeAt(i)) >>> 0;
  }
  return GREETING_TEMPLATES[hash % GREETING_TEMPLATES.length];
}

/**
 * 급식 메인 메뉴가 등록된 날 인사말 대신 보여주는 문구들. {name}/{menu}는 굵게
 * 강조되고, {nameSubj}(이/가)·{menuObj}(을/를)·{menuCopula}(이에요/예요)는
 * 받침 유무에 맞는 조사로 자동 치환된다.
 */
const MEAL_GREETING_TEMPLATES: string[] = [
  '🍽️ {name}{nameSubj} 오늘은 {menu}{menuObj} 냠냠 맛있게 먹는 날이에요!',
  '오늘 급식은 {menu}! {name}{nameSubj} 맛있게 먹었으면 좋겠어요 😋',
  '🍴 {menu} 냄새가 솔솔~ {name}{nameSubj} 오늘 점심이 기대되겠어요!',
  '오늘의 급식 하이라이트는 {menu}! {name}{nameSubj} 신나게 먹고 오길 바라요',
  '{name}{nameSubj} 오늘 먹을 메뉴는 바로 {menu}{menuCopula}! 냠냠 🍽️',
  '급식 메뉴 공개! 오늘은 {menu}{menuObj} 먹는 날이에요 🍚',
  '오늘 {name} 급식엔 {menu}{menuObj} 나와요~ 맛있게 먹고 오길!',
  '따끈따끈한 {menu}, {name}{nameSubj} 오늘 급식으로 만나요 🍴',
  '{menu}{menuCopula}! 오늘 급식, {name}{nameSubj} 싹싹 비우고 올까요? 😆',
  '오늘의 메뉴는 {menu}! {name}{nameSubj} 든든하게 먹는 하루 되길 🍽️',
];

/** 오늘 날짜(+salt)를 시드로 배열에서 하나를 고정 선택. */
function pickDailyTemplate<T>(templates: T[], salt: string): T {
  const todayKey = toISODate(new Date()) + salt;
  let hash = 0;
  for (let i = 0; i < todayKey.length; i++) {
    hash = (hash * 31 + todayKey.charCodeAt(i)) >>> 0;
  }
  return templates[hash % templates.length];
}

/** "{name}", "{menu}" 등의 자리표시자를 실제 값으로 치환하며, name/menu만 굵게 렌더링. */
function renderMealTemplate(
  template: string,
  values: { name: string; menu: string; nameSubj: string; menuObj: string; menuCopula: string },
  boldStyle: object
) {
  return template.split(/(\{[a-zA-Z]+\})/g).map((part, i) => {
    const match = part.match(/^\{([a-zA-Z]+)\}$/);
    if (!match) return part;
    const key = match[1] as keyof typeof values;
    const value = values[key];
    if (key === 'name' || key === 'menu') {
      return (
        <Text key={i} style={boldStyle}>
          {value}
        </Text>
      );
    }
    return value ?? part;
  });
}


/** Shared greeting banner + weather hero, used for both the empty and has-data home states so the top of the screen never differs. */
export default function HomeHeroHeader({
  selectedChild,
  onPressMeal,
  weatherDays,
  weatherLoading,
  locationLabel,
  onPressDate,
  todayMainMenu,
  refreshKey,
}: HomeHeroHeaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [weatherExpanded, setWeatherExpanded] = useState(true);

  const today = weatherDays?.find((d) => d.isToday);
  const tomorrow = weatherDays?.find((d) => d.isTomorrow);
  const yesterday = weatherDays?.find((d) => d.isYesterday);
  const tempCompareTip = today ? describeTempCompareTip(today.tempMax, yesterday?.tempMax) : null;
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
  // 새로고침(refreshKey 변경)할 때마다 랜덤으로 새 문구를 뽑고, 첫 로드 때는 날짜 기준 고정 문구를 보여준다.
  const greetingTemplate = useMemo(() => {
    return refreshKey
      ? GREETING_TEMPLATES[Math.floor(Math.random() * GREETING_TEMPLATES.length)]
      : pickDailyGreetingTemplate();
  }, [refreshKey]);
  const mealGreetingTemplate = useMemo(() => {
    return refreshKey
      ? MEAL_GREETING_TEMPLATES[Math.floor(Math.random() * MEAL_GREETING_TEMPLATES.length)]
      : pickDailyTemplate(MEAL_GREETING_TEMPLATES, 'meal');
  }, [refreshKey]);
  const isBirthday = isBirthdayToday(selectedChild?.birthdate);

  return (
    <View>
      <LinearGradient
        colors={isBirthday ? ['#F472B6', '#C084FC', '#818CF8'] : ['#FBBF24', '#FCD34D', '#FDE68A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.greetingBanner}
      >
        <View style={styles.greetingBannerTextBlock}>
          {isBirthday ? (
            <Text
              style={[styles.bannerGreetingText, styles.bannerGreetingTextOnBirthday]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              🎂 오늘은 {greetingName ?? '우리 아이'} 생일이에요! 축하해요!
            </Text>
          ) : todayMainMenu ? (
            <Text
              style={styles.bannerGreetingText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {renderMealTemplate(
                mealGreetingTemplate,
                {
                  name: greetingName ?? '우리 아이',
                  menu: todayMainMenu,
                  nameSubj: hasFinalConsonant(greetingName ?? '우리 아이') ? '이' : '가',
                  menuObj: hasFinalConsonant(todayMainMenu) ? '을' : '를',
                  menuCopula: hasFinalConsonant(todayMainMenu) ? '이에요' : '예요',
                },
                styles.bannerGreetingName
              )}
            </Text>
          ) : (
            <Text
              style={styles.bannerGreetingText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {greetingTemplate.before}<Text style={styles.bannerGreetingName}>{greetingName ?? '우리 아이'}</Text>{greetingTemplate.after}
            </Text>
          )}
        </View>
        <Pressable style={styles.mealBannerButton} onPress={onPressMeal}>
          <Text style={styles.mealBannerButtonIcon}>🍴</Text>
          <Text style={styles.mealBannerButtonText}>점심 메뉴</Text>
        </Pressable>
      </LinearGradient>

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
                  <Text style={styles.todayDateText}>오늘 {today ? formatMD(today.date) : ''}</Text>
                  <View style={styles.todayTipCenter}>
                    <View style={styles.todayTipBox}>
                      <AnimatedWeatherEmoji
                        emoji={today?.emoji ?? '🌤️'}
                        label={today?.label ?? ''}
                        style={styles.todayEmoji}
                      />
                      <Text style={styles.todayTipText} numberOfLines={2}>
                        {describeGuideTip(today?.label ?? '')}
                      </Text>
                    </View>
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
                  {tempCompareTip && (
                    <Text style={styles.todayCompareText} numberOfLines={1}>{tempCompareTip}</Text>
                  )}
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

/** 그 날 날씨 느낌에 어울리는 은은한 카드 색(배경/테두리)을 골라준다 — 오늘 카드의 날씨별 그라데이션과 같은 계열. */
function getMiniCardTint(label: string | undefined, colors: ThemeColors): { bg: string; border: string } {
  if (label === '맑음' || label === '대체로 맑음') return { bg: colors.orangeLight1, border: colors.orangeBorder };
  if (label === '흐림' || label === '안개') return { bg: colors.gray100, border: colors.border };
  if (label === '이슬비' || label === '비' || label === '소나기') return { bg: colors.lightBlueBg, border: colors.blue100 };
  if (label === '눈' || label === '눈 소나기') return { bg: colors.pastelBlue, border: colors.blue100 };
  if (label === '뇌우') return { bg: colors.purpleBg, border: colors.purpleDeep };
  return { bg: colors.cardWhite, border: colors.border };
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
  const tint = useMemo(() => getMiniCardTint(day?.label, colors), [day?.label, colors]);

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

const TODAY_CARD_HEIGHT = 192;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    greetingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: 20,
      marginTop: 10,
      marginBottom: 16,
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 10,
      ...SHADOW,
      shadowOpacity: 0.1,
      elevation: 2,
    },
    greetingBannerTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    bannerGreetingText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#3D2E06',
      marginTop: 2,
    },
    bannerGreetingName: {
      color: colors.purpleDeep,
      fontSize: 20,
      fontWeight: '900',
    },
    bannerGreetingTextOnBirthday: {
      color: '#FFFFFF',
    },
    mealBannerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderRadius: 12,
      paddingVertical: 9,
      paddingHorizontal: 12,
      ...SHADOW,
      shadowOpacity: 0.08,
      elevation: 1,
    },
    mealBannerButtonIcon: {
      fontSize: 14,
    },
    mealBannerButtonText: {
      fontSize: 12.5,
      fontWeight: '800',
      color: '#5C4A1E',
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
    todayTempRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
    },
    todayTempItem: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    todayTempLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.75)',
    },
    todayTempText: {
      fontSize: 40,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -1,
    },
    todayTempMinText: {
      fontSize: 20,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.75)',
      letterSpacing: -0.5,
    },
    todayCompareText: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.85)',
      marginTop: 2,
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
    tempRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    temp: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.gray900,
    },
    tempMin: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.gray400,
    },
    tip: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.gray500,
      flexShrink: 1,
    },
  });
}
