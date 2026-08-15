import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AdPopupModal from '../components/home/AdPopupModal';
import { AdventureHeader, AdventureNode } from '../components/home/AdventureTimeline';
import BagSection from '../components/home/BagSection';
import BlackboardModal from '../components/home/BlackboardModal';
import ChildSwitcherSheet from '../components/home/ChildSwitcherSheet';
import HomeEmptyContent from '../components/home/HomeEmptyContent';
import HomeHeroHeader from '../components/home/HomeHeroHeader';
import MealPlanSheet from '../components/home/MealPlanSheet';
import ScreenBackground from '../components/ScreenBackground';
import CoupangBanner from '../components/common/CoupangBanner';
import { SHADOW, type ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useAppLock } from '../context/AppLockContext';
import { useThemeColors } from '../context/ThemeContext';
import { useUpcomingEvents } from '../hooks/useUpcomingEvents';
import { useWeeklyWeather } from '../hooks/useWeeklyWeather';
import Text from '../components/common/AppText';

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
      bottom: 12 + bottomInset,
      left: 0,
      right: 0,
      zIndex: 100,
    },
    toastContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 1000, // Higher than any other UI
      elevation: 20, // Max for Android
    },
    toast: {
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 999,
    },
    toastText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    emptyUpcomingCard: {
      marginHorizontal: 20,
      marginTop: 12,
      paddingVertical: 32,
      paddingHorizontal: 24,
      backgroundColor: colors.gray50,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyUpcomingEmoji: {
      fontSize: 36,
      marginBottom: 12,
    },
    emptyUpcomingTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.gray900,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyUpcomingSubtitle: {
      fontSize: 13,
      color: colors.gray500,
      textAlign: 'center',
      lineHeight: 19,
      fontWeight: '500',
    },
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { hasOnboarded, selectedChild, events, googleAccount, onboardingLoaded } = useAppData();
  const { isLocked } = useAppLock();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const upcoming = useUpcomingEvents();
  const weather = useWeeklyWeather();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [mealSheetOpen, setMealSheetOpen] = useState(false);
  const [adPopupVisible, setAdPopupVisible] = useState(false);
  const adShownRef = useRef(false);

  const scrollRef = useRef<ScrollView>(null);
  const layoutMap = useRef<Record<string, number>>({});
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (highlightedDate) {
      const timer = setTimeout(() => setHighlightedDate(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [highlightedDate]);

  const onDatePress = useCallback((date: string) => {
    const hasEvents = upcoming.laterGroups.some(g => g.date === date);

    if (!hasEvents) {
      setToastMessage('이 날에 해당하는 일정이 아직 없어요');
      return;
    }

    const yPos = layoutMap.current[date];
    if (yPos !== undefined && yPos > 0) {
      // Precise offset calculation for sticky header (~110px)
      scrollRef.current?.scrollTo({
        y: Math.max(0, yPos - 110),
        animated: true,
      });
      setHighlightedDate(date);
    } else {
      setToastMessage('잠시 후 다시 시도해 주세요.');
    }
  }, [upcoming.laterGroups]);

  const onItemLayout = useCallback((date: string, y: number) => {
    // Only capture coordinates once per date for stability, or update if significant change
    if (y > 100 && (!layoutMap.current[date] || Math.abs(layoutMap.current[date] - y) > 50)) {
      layoutMap.current[date] = y;
    }
  }, []);

  // Show ad popup once when app is ready — never while the app-lock screen is
  // still up, since a native Modal always renders above it regardless of
  // z-index and would visually jump the ad in front of the pattern/biometric
  // prompt on cold start.
  useEffect(() => {
    if (!adShownRef.current && onboardingLoaded && hasOnboarded && googleAccount && !isLocked) {
      const timer = setTimeout(() => {
        setAdPopupVisible(true);
        adShownRef.current = true;
      }, 1500); // 1.5s delay for better UX
      return () => clearTimeout(timer);
    }
  }, [onboardingLoaded, hasOnboarded, googleAccount, isLocked]);

  const upcomingElements = useMemo(() => {
    if (upcoming.isEmpty) {
      return [] as React.ReactNode[];
    }

    const elements: React.ReactNode[] = [];

    elements.push(
      <HomeHeroHeader
        key="hero-header"
        selectedChild={selectedChild}
        onPressChild={() => setSwitcherOpen(true)}
        onPressMeal={() => setMealSheetOpen(true)}
        onPressPlaces={() => router.push('/nearby-places')}
        weatherDays={weather.days}
        weatherLoading={weather.loading}
        onPressDate={onDatePress}
      />
    );

    elements.push(
      <BagSection
        key="bag"
        mainEvents={upcoming.mainEvents}
        secondaryEvents={upcoming.secondaryEvents}
        displayType={upcoming.displayType}
        onEventPress={(event) => router.push({ pathname: '/calendar', params: { date: event.date } })}
      />
    );

    elements.push(<AdventureHeader key="adventure-header" />);

    if (upcoming.laterGroups.length > 0) {
      upcoming.laterGroups.forEach((group, idx) => {
        elements.push(
          <View
            key={`card-wrapper-${group.date}`}
            collapsable={false}
            onLayout={(e) => onItemLayout(group.date, e.nativeEvent.layout.y)}
          >
            <AdventureNode
              group={group}
              index={idx}
              isLast={idx === upcoming.laterGroups.length - 1}
              isHighlighted={highlightedDate === group.date}
              onEventPress={(event) => router.push({ pathname: '/calendar', params: { date: event.date } })}
            />
          </View>
        );
      });
    } else {
      elements.push(
        <View key="empty-upcoming" style={styles.emptyUpcomingCard}>
          <Text style={styles.emptyUpcomingEmoji}>🏝️</Text>
          <Text style={styles.emptyUpcomingTitle}>이번 주는 특별한 일정이 없어요</Text>
          <Text style={styles.emptyUpcomingSubtitle}>여유롭고 평화로운 한 주를 보내세요!</Text>
        </View>
      );
    }

    return elements;

  }, [upcoming, selectedChild, weather, styles, router, onDatePress, onItemLayout, highlightedDate]);

  if (!onboardingLoaded) {
    return null;
  }

  if (!hasOnboarded || !googleAccount) {
    return <Redirect href="/splash" />;
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {upcoming.isEmpty ? (
          <HomeEmptyContent
            selectedChild={selectedChild}
            onPressChild={() => setSwitcherOpen(true)}
            onPressMeal={() => setMealSheetOpen(true)}
            onPressPlaces={() => router.push('/nearby-places')}
            weatherDays={weather.days}
            weatherLoading={weather.loading}
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
          >
            {upcomingElements}
          </ScrollView>
        )}
      </SafeAreaView>

      {toastMessage && (
        <View style={[styles.toastContainer, { bottom: 100 + insets.bottom }]}>
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

      <CoupangBanner style={styles.adBanner} />

      <BlackboardModal event={selectedEvent} onClose={() => setSelectedEventId(null)} />
      <ChildSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <MealPlanSheet visible={mealSheetOpen} onClose={() => setMealSheetOpen(false)} />
      {!upcoming.isEmpty && !isLocked && <AdPopupModal visible={adPopupVisible} onClose={() => setAdPopupVisible(false)} />}
    </ScreenBackground>
  );
}
