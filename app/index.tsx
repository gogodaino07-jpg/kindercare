import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AdPopupModal from '../components/home/AdPopupModal';
import AiScanSection from '../components/home/AiScanSection';
import BlackboardModal from '../components/home/BlackboardModal';
import ChildSwitcherSheet from '../components/home/ChildSwitcherSheet';
import EmptyState from '../components/home/EmptyState';
import EventListSection from '../components/home/EventListSection';
import HomeHeader from '../components/home/HomeHeader';
import NotificationCenterModal from '../components/home/NotificationCenterModal';
import WeeklyWeatherStrip from '../components/home/WeeklyWeatherStrip';
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
      flex: 1,
      paddingTop: 0,
      paddingBottom: 120 + bottomInset,
      zIndex: 10,
    },
    upcomingLayer: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: '56%', // Fixed top position to prevent pushing up
      zIndex: 20, // Higher than supplies list to overlay
    },
    fixedContentLayer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 110 + bottomInset,
      zIndex: 25, // Above other layers to ensure touchability
    },
    adBanner: {
      position: 'absolute',
      bottom: 24 + bottomInset,
      left: 20,
      right: 20,
    },
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { hasOnboarded, selectedChild, events, googleAccount, onboardingLoaded } = useAppData();
  const { isLocked, isBooting } = useAppLock();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const upcoming = useUpcomingEvents();
  const weather = useWeeklyWeather();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [adPopupVisible, setAdPopupVisible] = useState(false);
  const adShownRef = useRef(false);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  useEffect(() => {
    if (isLocked || isBooting || adShownRef.current) return;
    const timer = setTimeout(() => {
      adShownRef.current = true;
      setAdPopupVisible(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isLocked, isBooting]);

  useEffect(() => {
    if (isLocked) setAdPopupVisible(false);
  }, [isLocked]);

  if (!onboardingLoaded) {
    return null;
  }

  if (!hasOnboarded || !googleAccount) {
    return <Redirect href="/splash" />;
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.mainContainer}>
          <View style={styles.topCurve}>
            <HomeHeader
              selectedChild={selectedChild}
              onPressChild={() => setSwitcherOpen(true)}
            />
            <WeeklyWeatherStrip
              days={weather.days}
              loading={weather.loading}
              error={weather.error}
              retry={weather.retry}
              usingFallbackLocation={weather.usingFallbackLocation}
            />
          </View>

          <View style={styles.contentPadding} pointerEvents="box-none">
            {upcoming.isEmpty ? (
              <EmptyState />
            ) : (
              <EventListSection
                mainEvents={upcoming.mainEvents}
                featuredLaterEvents={upcoming.featuredLaterEvents}
                displayType={upcoming.displayType}
                onEventPress={(event) => router.push({ pathname: '/calendar', params: { date: event.date } })}
                hideUpcoming={true}
              />
            )}
          </View>

          {!upcoming.isEmpty && (
            <View style={styles.upcomingLayer} pointerEvents="box-none">
              <EventListSection
                mainEvents={upcoming.mainEvents}
                featuredLaterEvents={upcoming.featuredLaterEvents}
                displayType={upcoming.displayType}
                onEventPress={(event) => router.push({ pathname: '/calendar', params: { date: event.date } })}
                hideSupplies={true}
              />
            </View>
          )}

          <View style={styles.fixedContentLayer} pointerEvents="box-none">
            <AiScanSection />
          </View>
        </View>
      </SafeAreaView>

      <CoupangBanner style={styles.adBanner} />

      <BlackboardModal event={selectedEvent} onClose={() => setSelectedEventId(null)} />
      <ChildSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <AdPopupModal visible={adPopupVisible} onClose={() => setAdPopupVisible(false)} />
    </ScreenBackground>
  );
}
