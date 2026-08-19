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
import TodayPrepProgress from '../components/home/TodayPrepProgress';
import WeekendHighlightCard from '../components/home/WeekendHighlightCard';
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

function createStyles(colors: ThemeColors, bottomInset: number, hasAdBanner: boolean) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    mainContainer: {
      flex: 1,
    },
    scrollContainer: {
      paddingBottom: (hasAdBanner ? 150 : 24) + bottomInset,
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
    () => createStyles(colors, insets.bottom, !isSubscribed),
    [colors, insets.bottom, isSubscribed]
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
  const [activeTab, setActiveTab] = useState<ScheduleTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const adShownRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const progressYRef = useRef(0);

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

  // 오늘/내일/모레 날씨 카드를 누르면 스크롤 대신 해당 탭으로 바로 전환.
  // 오늘은 "전체" 탭 맨 위에 이미 노출되므로 오늘 카드를 누르면 전체 탭으로 전환.
  const onDatePress = useCallback((date: string) => {
    const tomorrowISO = toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const dayAfterTomorrowISO = toISODate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
    if (date === tomorrowISO) setActiveTab('tomorrow');
    else if (date === dayAfterTomorrowISO) setActiveTab('dayAfterTomorrow');
    else setActiveTab('all');
  }, []);

  // Show ad popup once when app is ready — never while the app-lock screen is
  // still up, since a native Modal always renders above it regardless of
  // z-index and would visually jump the ad in front of the pattern/biometric
  // prompt on cold start.
  useEffect(() => {
    if (!adShownRef.current && onboardingLoaded && hasOnboarded && googleAccount && !isLocked && !isSubscribed) {
      const timer = setTimeout(() => {
        setAdPopupVisible(true);
        adShownRef.current = true;
      }, 1500); // 1.5s delay for better UX
      return () => clearTimeout(timer);
    }
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
          <ScrollView
            ref={scrollRef}
            style={styles.mainContainer}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={true}
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
            <View onLayout={(e) => { progressYRef.current = e.nativeEvent.layout.y; }}>
              <Pressable onPress={scrollToProgress} disabled={todayProgress.total === 0}>
                <TodayPrepProgress
                  total={todayProgress.total}
                  checked={todayProgress.checked}
                  percent={todayProgress.percent}
                />
              </Pressable>
            </View>
            <WeekendHighlightCard />
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
        )}
      </SafeAreaView>

      {!isSubscribed && <CoupangBanner style={styles.adBanner} />}

      <BlackboardModal event={selectedEvent} onClose={() => setSelectedEventId(null)} />
      <ChildSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <MealPlanSheet visible={mealSheetOpen} onClose={() => setMealSheetOpen(false)} />
      {!upcoming.isEmpty && !isLocked && !isSubscribed && <AdPopupModal visible={adPopupVisible} onClose={() => setAdPopupVisible(false)} />}
    </ScreenBackground>
  );
}
