import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AdPopupModal from '../components/home/AdPopupModal';
import BlackboardModal from '../components/home/BlackboardModal';
import ChildSwitcherSheet from '../components/home/ChildSwitcherSheet';
import HomeEmptyContent from '../components/home/HomeEmptyContent';
import HomeHeroHeader from '../components/home/HomeHeroHeader';
import HomeProfileBar from '../components/home/HomeProfileBar';
import MealPlanSheet from '../components/home/MealPlanSheet';
import ScheduleBoard, { ScheduleTab } from '../components/home/ScheduleBoard';
import StickyPrepBar from '../components/home/StickyPrepBar';
import TodayPrepProgress from '../components/home/TodayPrepProgress';
import ScreenBackground from '../components/ScreenBackground';
import CoupangBanner from '../components/common/CoupangBanner';
import { SHADOW, type ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useAppLock } from '../context/AppLockContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useThemeColors } from '../context/ThemeContext';
import { useLocalChecklist } from '../hooks/useLocalChecklist';
import { useUpcomingEvents } from '../hooks/useUpcomingEvents';
import { useWeeklyWeather } from '../hooks/useWeeklyWeather';
import { toISODate } from '../utils/date';

// 앱 프로세스가 살아있는 동안 전면 광고는 한 번만 시도한다. 컴포넌트 스코프
// ref로 관리하면 AI 스캔 후 홈으로 돌아오면서 화면이 다시 마운트될 때마다
// 광고가 또 뜨는 문제가 있어, 모듈 스코프(진짜 콜드 스타트에서만 리셋)로 관리.
let hasAttemptedAdThisSession = false;

function createStyles(colors: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    mainContainer: {
      flex: 1,
    },
    scrollContainer: {
      paddingBottom: 150 + bottomInset,
    },
    adBanner: {
      position: 'absolute',
      bottom: bottomInset,
      left: 0,
      right: 0,
      zIndex: 100,
    },
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { hasOnboarded, selectedChild, events, googleAccount, onboardingLoaded, mealPlans } = useAppData();
  const { isLocked } = useAppLock();
  const { isSubscribed } = useSubscription();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(
    () => createStyles(colors, insets.bottom),
    [colors, insets.bottom]
  );
  const upcoming = useUpcomingEvents();
  const weather = useWeeklyWeather();
  const todayMainMenu = useMemo(() => {
    const todayISO = toISODate(new Date());
    return mealPlans.find((m) => m.childId === selectedChild?.id && m.date === todayISO)?.mainMenu;
  }, [mealPlans, selectedChild]);
  const checklist = useLocalChecklist();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [mealSheetOpen, setMealSheetOpen] = useState(false);
  const [adPopupVisible, setAdPopupVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<ScheduleTab>('today');
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const progressYRef = useRef(0);
  const progressHeightRef = useRef(0);
  const [stickyVisible, setStickyVisible] = useState(false);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const todayProgress = useMemo(() => checklist.getProgress(upcoming.mainEvents), [checklist, upcoming.mainEvents]);

  // 아래로 당겨서 새로고침 — 날씨를 강제로 다시 조회(이벤트/체크리스트는 실시간 구독이라 재조회 불필요).
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await weather.retry();
    } finally {
      setRefreshing(false);
    }
  }, [weather]);

  // "오늘 등원 준비물 챙기기" 배너를 누르면 그 배너가 화면 상단(고정 프로필 헤더 바로 아래)으로 오도록 스크롤.
  const scrollToProgress = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(progressYRef.current - 8, 0), animated: true });
  }, []);

  // 준비물 배너가 절반 이상 스크롤로 가려지면, 상단에 얇은 진행률 띠를 대신 보여준다.
  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const scrollY = e.nativeEvent.contentOffset.y;
    const bannerHalfway = progressYRef.current + progressHeightRef.current / 2;
    setStickyVisible(progressHeightRef.current > 0 && scrollY > bannerHalfway);
  }, []);

  // 오늘/내일/모레 날씨 카드를 누르면 스크롤 대신 해당 탭으로 바로 전환.
  const onDatePress = useCallback((date: string) => {
    const tomorrowISO = toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const dayAfterTomorrowISO = toISODate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
    if (date === tomorrowISO) setActiveTab('tomorrow');
    else if (date === dayAfterTomorrowISO) setActiveTab('dayAfterTomorrow');
    else setActiveTab('today');
  }, []);

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
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <HomeProfileBar selectedChild={selectedChild} onPressChild={() => setSwitcherOpen(true)} />
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
          />
        ) : (
          <>
            <ScrollView
              ref={scrollRef}
              style={styles.mainContainer}
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              onScroll={handleScroll}
              scrollEventThrottle={16}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              <HomeHeroHeader
                selectedChild={selectedChild}
                onPressMeal={() => setMealSheetOpen(true)}
                weatherDays={weather.days}
                weatherLoading={weather.loading}
                locationLabel={weather.locationLabel}
                onPressDate={onDatePress}
                todayMainMenu={todayMainMenu}
              />
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
                isItemChecked={checklist.isChecked}
                onToggleItem={checklist.toggle}
                onToggleAll={checklist.setAllChecked}
              />
            </ScrollView>
          </>
        )}
      </SafeAreaView>

      {!isSubscribed && <CoupangBanner style={styles.adBanner} />}

      <BlackboardModal event={selectedEvent} onClose={() => setSelectedEventId(null)} />
      <ChildSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <MealPlanSheet visible={mealSheetOpen} onClose={() => setMealSheetOpen(false)} />
      {!isLocked && !isSubscribed && <AdPopupModal visible={adPopupVisible} onClose={() => setAdPopupVisible(false)} />}
    </ScreenBackground>
  );
}
