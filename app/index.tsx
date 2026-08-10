import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, TouchableOpacity, Linking, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AdPopupModal from '../components/home/AdPopupModal';
import AiScanSection from '../components/home/AiScanSection';
import BlackboardModal from '../components/home/BlackboardModal';
import ChildSwitcherSheet from '../components/home/ChildSwitcherSheet';
import EmptyState from '../components/home/EmptyState';
import EventListSection, { SuppliesSection, UpcomingHeader, UpcomingDateCard } from '../components/home/EventListSection';
import HomeHeader from '../components/home/HomeHeader';
import NotificationCenterModal from '../components/home/NotificationCenterModal';
import WeeklyWeatherStrip, { WeatherCards, WeatherTip } from '../components/home/WeeklyWeatherStrip';
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
    topCurve: {
      backgroundColor: colors.cardWhite,
      paddingBottom: 0,
    },
    contentPadding: {
      paddingBottom: 20,
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
    stickyHeaderContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      backgroundColor: '#FFFFFF',
    },
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { hasOnboarded, selectedChild, events, googleAccount, onboardingLoaded } = useAppData();
  const { isLocked, isBooting } = useAppLock();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const upcoming = useUpcomingEvents();
  const weather = useWeeklyWeather();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [adPopupVisible, setAdPopupVisible] = useState(false);
  const adShownRef = useRef(false);

  const scrollRef = useRef<ScrollView>(null);
  const layoutMap = useRef<Record<string, number>>({});
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);

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

  // Show ad popup once when app is ready
  useEffect(() => {
    if (!adShownRef.current && onboardingLoaded && hasOnboarded && googleAccount) {
      const timer = setTimeout(() => {
        setAdPopupVisible(true);
        adShownRef.current = true;
      }, 1500); // 1.5s delay for better UX
      return () => clearTimeout(timer);
    }
  }, [onboardingLoaded, hasOnboarded, googleAccount]);

  const handleScroll = useCallback((event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    // Show sticky header when we scroll past the HomeHeader (~80px)
    if (y > 80) {
      if (!showStickyHeader) setShowStickyHeader(true);
    } else {
      if (showStickyHeader) setShowStickyHeader(false);
    }
  }, [showStickyHeader]);

  const upcomingElements = useMemo(() => {
    const elements: React.ReactNode[] = [];
    const stickyIndices: number[] = [];

    // Child 0: HomeHeader
    elements.push(
      <View key="header" style={styles.topCurve}>
        <HomeHeader
          selectedChild={selectedChild}
          onPressChild={() => setSwitcherOpen(true)}
        />
      </View>
    );

    // Child 1: WeatherCards (Sticky)
    stickyIndices.push(elements.length);
    elements.push(
      <WeatherCards
        key="weather-cards"
        days={weather.days}
        loading={weather.loading}
        retry={weather.retry}
        onPressDate={onDatePress}
      />
    );

    // Child 2: WeatherTip
    elements.push(
      <View key="weather-tip" style={{ paddingBottom: 12 }}>
        <WeatherTip
          days={weather.days}
          usingFallbackLocation={weather.usingFallbackLocation}
          error={weather.error}
          retry={weather.retry}
        />
      </View>
    );

    // Child 3: SuppliesSection
    elements.push(
      <SuppliesSection
        key="supplies"
        mainEvents={upcoming.mainEvents}
        displayType={upcoming.displayType}
        onEventPress={(event) => router.push({ pathname: '/calendar', params: { date: event.date } })}
      />
    );

    // Child 4: UpcomingHeader
    elements.push(<UpcomingHeader key="upcoming-header" />);

    upcoming.laterGroups.forEach((group, idx) => {
      elements.push(
        <View
          key={`card-wrapper-${group.date}`}
          collapsable={false} // Ensure layout is measured correctly on Android
          onLayout={(e) => onItemLayout(group.date, e.nativeEvent.layout.y)}
        >
          <UpcomingDateCard
            group={group}
            weather={weather.days?.find((d) => d.date === group.date)}
            isHighlighted={highlightedDate === group.date}
            onEventPress={(event) => router.push({ pathname: '/calendar', params: { date: event.date } })}
          />
        </View>
      );
    });

    return { elements, stickyIndices };

  }, [selectedChild, weather, upcoming, colors, styles, router, onDatePress, onItemLayout, highlightedDate]);

  if (!onboardingLoaded) {
    return null;
  }

  if (!hasOnboarded || !googleAccount) {
    return <Redirect href="/splash" />;
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            style={styles.mainContainer}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={true}
          >
            {upcomingElements.elements}
          </ScrollView>

          {showStickyHeader && (
            <View style={styles.stickyHeaderContainer}>
              <WeatherCards
                days={weather.days}
                loading={weather.loading}
                retry={weather.retry}
                onPressDate={onDatePress}
              />
            </View>
          )}
        </View>
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
      <AdPopupModal visible={adPopupVisible} onClose={() => setAdPopupVisible(false)} />
    </ScreenBackground>
  );
}
