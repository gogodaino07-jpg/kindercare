import { Feather } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AdPopupModal from '../components/home/AdPopupModal';
import BirthdayCenterConfetti from '../components/home/BirthdayCenterConfetti';
import ChildSwitcherSheet from '../components/home/ChildSwitcherSheet';
import FamilyShareCard from '../components/home/FamilyShareCard';
import HomeEmptyContent from '../components/home/HomeEmptyContent';
import HomeHeroHeader from '../components/home/HomeHeroHeader';
import HomeProfileBar from '../components/home/HomeProfileBar';
import MealPlanSheet from '../components/home/MealPlanSheet';
import NoticeBoardCard from '../components/home/NoticeBoardCard';
import ScheduleBoard, { ScheduleTab } from '../components/home/ScheduleBoard';
import StickyPrepBar from '../components/home/StickyPrepBar';
import TodayPrepProgress from '../components/home/TodayPrepProgress';
import ScreenBackground from '../components/ScreenBackground';
import CoupangBanner from '../components/common/CoupangBanner';
import Text from '../components/common/AppText';
import { SHADOW, type ThemeColors } from '../constants/theme';
import { isChildLocked, useAppData } from '../context/AppDataContext';
import { useAppLock } from '../context/AppLockContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useThemeColors } from '../context/ThemeContext';
import { getDisplayItems } from '../hooks/useLocalChecklist';
import { useUpcomingEvents } from '../hooks/useUpcomingEvents';
import { useWeeklyWeather } from '../hooks/useWeeklyWeather';
import { Event, EventItem } from '../types/models';
import { isBirthdayToday, toISODate } from '../utils/date';

// 앱 프로세스가 살아있는 동안 전면 광고는 한 번만 시도한다. 컴포넌트 스코프
// ref로 관리하면 AI 스캔 후 홈으로 돌아오면서 화면이 다시 마운트될 때마다
// 광고가 또 뜨는 문제가 있어, 모듈 스코프(진짜 콜드 스타트에서만 리셋)로 관리.
let hasAttemptedAdThisSession = false;

/** 홈 화면 최하단 "가족과 함께 보기" 공유 배너 노출 여부 — 임시로 숨김. */
const SHOW_FAMILY_SHARE_CARD = false;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    mainContainer: {
      flex: 1,
    },
    scrollContainer: {},
    pullIndicator: {
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    bottomFixedStack: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 100,
    },
    familyBannerWrap: {
      marginHorizontal: 20,
      marginBottom: 8,
    },
    familyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 14,
      ...SHADOW,
      shadowOpacity: 0.1,
      elevation: 0,
    },
    familyBannerEmoji: {
      fontSize: 14,
    },
    familyBannerText: {
      fontSize: 12.5,
      fontWeight: '800',
    },
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { hasOnboarded, children, selectedChild, selectChild, events, googleAccount, onboardingLoaded, mealPlans, updateEvent, isFamilyOwner, canEditFamilyData } = useAppData();
  const { isLocked } = useAppLock();
  const { isSubscribed } = useSubscription();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );
  const upcoming = useUpcomingEvents();
  const weather = useWeeklyWeather();
  const noticeEvents = useMemo(() => {
    // 날짜가 없는 순수 공통 안내(하원시간 변경 등)는 스캔한 날짜로 고정돼 들어오므로,
    // "오늘 이후"만 보여주면 하루 지나자마자 사라진다 — 최근 2주 내 공지까지는 계속 보여준다.
    const NOTICE_WINDOW_DAYS_BEFORE = 14;
    const windowStart = toISODate(new Date(Date.now() - NOTICE_WINDOW_DAYS_BEFORE * 24 * 60 * 60 * 1000));
    return events
      .filter((e) => e.category === '공지' && e.childId === selectedChild?.id && e.date >= windowStart)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, selectedChild]);
  const todayMainMenu = useMemo(() => {
    const todayISO = toISODate(new Date());
    return mealPlans.find((m) => m.childId === selectedChild?.id && m.date === todayISO)?.mainMenu;
  }, [mealPlans, selectedChild]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [mealSheetOpen, setMealSheetOpen] = useState(false);
  const [adPopupVisible, setAdPopupVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<ScheduleTab>('today');
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const progressYRef = useRef(0);
  const progressHeightRef = useRef(0);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [birthdayBurstKey, setBirthdayBurstKey] = useState(0);
  const [greetingRefreshKey, setGreetingRefreshKey] = useState(0);
  // 하단에 떠있는 공유배너/쿠팡배너 높이만큼만 스크롤 여백을 잡아준다 — 고정값을
  // 쓰면 오늘 일정이 짧아 스크롤 콘텐츠가 짧은 날 그 아래로 빈 여백이 크게 남았다.
  const [bottomStackHeight, setBottomStackHeight] = useState(0);
  const isChildBirthdayToday = isBirthdayToday(selectedChild?.birthdate);

  // 구독이 끝나 지금 선택된 아이가 잠기면(무료 한도 초과), 잠기지 않은 첫 아이로
  // 자동 전환한다 — 안 그러면 잠긴 아이의 일정/급식 등이 홈 화면에 계속 노출된다.
  useEffect(() => {
    if (!selectedChild || !isChildLocked(children, selectedChild.id, isSubscribed)) return;
    const firstUnlocked = children.find((c) => !isChildLocked(children, c.id, isSubscribed));
    if (firstUnlocked) selectChild(firstUnlocked.id);
  }, [children, selectedChild, isSubscribed, selectChild]);

  const todayProgress = useMemo(() => {
    const items = upcoming.mainEvents.flatMap((e) => getDisplayItems(e));
    const checked = items.filter((i) => i.completed).length;
    return { total: items.length, checked, percent: items.length === 0 ? 0 : Math.round((checked / items.length) * 100) };
  }, [upcoming.mainEvents]);

  // 준비물 체크 여부를 캘린더 화면과 같은 곳(event.items[].completed)에 저장해서,
  // 홈에서 체크해도 캘린더에 바로 반영되도록 한다.
  const setItemCompleted = useCallback((event: Event, item: EventItem, completed: boolean) => {
    const nextItems = getDisplayItems(event).map((i) => (i.id === item.id ? { ...i, completed } : i));
    updateEvent(event.id, { items: nextItems, note: nextItems.map((i) => i.name).join('\n') });
  }, [updateEvent]);

  const handleToggleItem = useCallback(
    (event: Event, item: EventItem) => setItemCompleted(event, item, !item.completed),
    [setItemCompleted]
  );

  const handleToggleAll = useCallback((event: Event, items: EventItem[], value: boolean) => {
    const nextItems = getDisplayItems(event).map((i) => ({ ...i, completed: value }));
    updateEvent(event.id, { items: nextItems, note: nextItems.map((i) => i.name).join('\n') });
  }, [updateEvent]);

  // 아래로 당겨서 새로고침 — 날씨를 강제로 다시 조회(이벤트/체크리스트는 실시간 구독이라 재조회 불필요).
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await weather.retry();
    } finally {
      setRefreshing(false);
      if (isChildBirthdayToday) setBirthdayBurstKey((k) => k + 1);
      setGreetingRefreshKey((k) => k + 1);
    }
  }, [weather, isChildBirthdayToday]);

  // "오늘 등원 준비물 챙기기" 배너를 누르면 그 배너가 화면 상단(고정 프로필 헤더 바로 아래)으로 오도록 스크롤.
  const scrollToProgress = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(progressYRef.current - 8, 0), animated: true });
  }, []);

  // 준비물 배너가 절반 이상 스크롤로 가려지면, 상단에 얇은 진행률 띠를 대신 보여준다.
  const handleScroll = useCallback((y: number) => {
    const bannerHalfway = progressYRef.current + progressHeightRef.current / 2;
    setStickyVisible(progressHeightRef.current > 0 && y > bannerHalfway);
  }, []);

  // 네이티브 RefreshControl은 당김 거리를 조절하는 방법이 없어(짧게만 당겨도
  // 바로 새로고침돼 불편하다는 피드백), 직접 손가락 이동량을 추적하는 커스텀
  // 당겨서 새로고침으로 바꿨다. 목록이 맨 위(scrollY<=0)일 때만 반응하고,
  // PULL_TRIGGER만큼 당겨야(네이티브보다 더 많이) 새로고침이 실행된다.
  const PULL_TRIGGER = 110;
  const pullY = useSharedValue(0);
  const scrollYShared = useSharedValue(0);
  const refreshingShared = useSharedValue(false);
  useEffect(() => {
    refreshingShared.value = refreshing;
  }, [refreshing, refreshingShared]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollYShared.value = e.contentOffset.y;
      runOnJS(handleScroll)(e.contentOffset.y);
    },
  });

  const triggerRefresh = useCallback(() => {
    onRefresh().finally(() => {
      pullY.value = withTiming(0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRefresh]);

  const pullGesture = Gesture.Pan()
    .activeOffsetY([-1000, 10])
    .failOffsetX([-20, 20])
    .onChange((e) => {
      if (refreshingShared.value || scrollYShared.value > 0.5) return;
      pullY.value = Math.max(0, Math.min(pullY.value + e.changeY, PULL_TRIGGER * 1.3));
    })
    .onEnd(() => {
      if (refreshingShared.value) return;
      if (pullY.value >= PULL_TRIGGER) {
        pullY.value = withTiming(56);
        runOnJS(triggerRefresh)();
      } else {
        pullY.value = withTiming(0);
      }
    });
  const nativeScrollGesture = Gesture.Native();
  const homeScrollGesture = Gesture.Simultaneous(pullGesture, nativeScrollGesture);

  const pullIndicatorStyle = useAnimatedStyle(() => ({ height: pullY.value }));
  const pullArrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(pullY.value, [0, PULL_TRIGGER], [0, 180], 'clamp')}deg` }],
  }));

  // 오늘/내일/모레 날씨 카드를 누르면 스크롤 대신 해당 탭으로 바로 전환.
  const onDatePress = useCallback((date: string) => {
    const tomorrowISO = toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const dayAfterTomorrowISO = toISODate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
    if (date === tomorrowISO) setActiveTab('tomorrow');
    else if (date === dayAfterTomorrowISO) setActiveTab('dayAfterTomorrow');
    else setActiveTab('today');
  }, []);

  // 가족 공유 카드는 지금 보고 있는 탭(오늘/내일/모레) 기준으로 내용을 만든다.
  const dayAfterTomorrowISO = useMemo(
    () => toISODate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)),
    []
  );
  const activeDayEvents = useMemo(() => {
    if (activeTab === 'today') return upcoming.mainEvents;
    if (activeTab === 'tomorrow') return upcoming.secondaryEvents;
    return upcoming.laterGroups.find((g) => g.date === dayAfterTomorrowISO)?.events ?? [];
  }, [activeTab, upcoming, dayAfterTomorrowISO]);
  const activeDayLabel = activeTab === 'today' ? '오늘' : activeTab === 'tomorrow' ? '내일' : '모레';
  const activeDayISO = useMemo(() => {
    if (activeTab === 'today') return toISODate(new Date());
    if (activeTab === 'tomorrow') return toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    return dayAfterTomorrowISO;
  }, [activeTab, dayAfterTomorrowISO]);

  // Show ad popup once per app session when app is ready — never while the
  // app-lock screen is still up, since a native Modal always renders above it
  // regardless of z-index and would visually jump the ad in front of the
  // pattern/biometric prompt on cold start. Shown regardless of whether the
  // user has any events yet — a brand-new signup with zero events should
  // still see it, not just users who already have schedules.
  // hasAttemptedAdThisSession is a module-scope flag (not state) so AI scan
  // → Home remounts mid-session don't retrigger it; it only resets on a
  // genuine cold start.
  useEffect(() => {
    if (hasAttemptedAdThisSession || !onboardingLoaded || !hasOnboarded || !googleAccount || isLocked || isSubscribed) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (hasAttemptedAdThisSession) return;
      setAdPopupVisible(true);
      hasAttemptedAdThisSession = true;
    }, 1500); // 1.5s delay for better UX

    return () => clearTimeout(timeoutId);
  }, [onboardingLoaded, hasOnboarded, googleAccount, isLocked, isSubscribed]);

  const handleEventPress = useCallback(
    (event: { date: string }) => router.push({ pathname: '/calendar', params: { date: event.date } }),
    [router]
  );

  if (!onboardingLoaded) {
    return null;
  }

  if (!hasOnboarded || !googleAccount) {
    return <Redirect href="/splash" />;
  }

  return (
    <ScreenBackground showDots={false}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <HomeProfileBar
          selectedChild={selectedChild}
          onPressChild={() => setSwitcherOpen(true)}
          birthdayBurstKey={birthdayBurstKey}
        />
        {!isFamilyOwner && (
          <View style={styles.familyBannerWrap}>
            <LinearGradient
              colors={canEditFamilyData ? ['#34D399', '#10B981'] : ['#CBD5E1', '#94A3B8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.familyBanner}
            >
              <Text style={styles.familyBannerEmoji}>{canEditFamilyData ? '🙌' : '👀'}</Text>
              <Text style={[styles.familyBannerText, { color: '#FFFFFF' }]}>
                {canEditFamilyData ? '가족 구성원으로 참여 중' : '가족 구성원으로 보는 중 (읽기 전용)'}
              </Text>
            </LinearGradient>
          </View>
        )}
        {stickyVisible && (
          <StickyPrepBar
            total={todayProgress.total}
            checked={todayProgress.checked}
            percent={todayProgress.percent}
            onPress={scrollToProgress}
          />
        )}
        {upcoming.isEmpty ? (
          <HomeEmptyContent
            selectedChild={selectedChild}
            onPressMeal={() => setMealSheetOpen(true)}
            weatherDays={weather.days}
            weatherLoading={weather.loading}
            locationLabel={weather.locationLabel}
            onPressDate={onDatePress}
            refreshKey={greetingRefreshKey}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        ) : (
          <>
            <GestureDetector gesture={homeScrollGesture}>
              <Animated.ScrollView
                ref={scrollRef}
                style={styles.mainContainer}
                contentContainerStyle={[styles.scrollContainer, { paddingBottom: bottomStackHeight + insets.bottom + 16 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                overScrollMode="never"
              >
              <Animated.View style={[styles.pullIndicator, pullIndicatorStyle]}>
                {refreshing ? (
                  <ActivityIndicator color={colors.gray400} />
                ) : (
                  <Animated.View style={pullArrowStyle}>
                    <Feather name="arrow-down" size={18} color={colors.gray400} />
                  </Animated.View>
                )}
              </Animated.View>
              <HomeHeroHeader
                selectedChild={selectedChild}
                onPressMeal={() => setMealSheetOpen(true)}
                weatherDays={weather.days}
                weatherLoading={weather.loading}
                locationLabel={weather.locationLabel}
                onPressDate={onDatePress}
                todayMainMenu={todayMainMenu}
                refreshKey={greetingRefreshKey}
              />
              <NoticeBoardCard notices={noticeEvents} onPressNotice={handleEventPress} />
              <View
                onLayout={(e) => {
                  progressYRef.current = e.nativeEvent.layout.y;
                  progressHeightRef.current = e.nativeEvent.layout.height;
                }}
              >
                <Pressable onPress={scrollToProgress} disabled={todayProgress.total === 0}>
                  <TodayPrepProgress
                    total={todayProgress.total}
                    checked={todayProgress.checked}
                    percent={todayProgress.percent}
                  />
                </Pressable>
              </View>
              <ScheduleBoard
                mainEvents={upcoming.mainEvents}
                secondaryEvents={upcoming.secondaryEvents}
                laterGroups={upcoming.laterGroups}
                activeTab={activeTab}
                onChangeTab={setActiveTab}
                onEventPress={handleEventPress}
                onToggleItem={handleToggleItem}
                onToggleAll={handleToggleAll}
              />
              </Animated.ScrollView>
            </GestureDetector>
          </>
        )}
      </SafeAreaView>

      <BirthdayCenterConfetti triggerKey={birthdayBurstKey} />

      <View
        style={[styles.bottomFixedStack, { bottom: insets.bottom }]}
        onLayout={(e) => setBottomStackHeight(e.nativeEvent.layout.height)}
      >
        {SHOW_FAMILY_SHARE_CARD && !upcoming.isEmpty && (
          <FamilyShareCard events={activeDayEvents} dayLabel={activeDayLabel} dateISO={activeDayISO} />
        )}
        {!isSubscribed && <CoupangBanner />}
      </View>

      <ChildSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <MealPlanSheet visible={mealSheetOpen} onClose={() => setMealSheetOpen(false)} />
      {!isLocked && !isSubscribed && <AdPopupModal visible={adPopupVisible} onClose={() => setAdPopupVisible(false)} />}
    </ScreenBackground>
  );
}
