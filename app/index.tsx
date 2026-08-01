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
import { SHADOW, type ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useAppLock } from '../context/AppLockContext';
import { useNotificationCenter } from '../context/NotificationCenterContext';
import { useThemeColors } from '../context/ThemeContext';
import { useUpcomingEvents } from '../hooks/useUpcomingEvents';
import { useWeeklyWeather } from '../hooks/useWeeklyWeather';
import Text from '../components/common/AppText';

const COUPANG_LINK = 'https://link.coupang.com/a/fHdMU98clE';

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
      paddingBottom: 260 + bottomInset, // Increased to ensure scroll space for both fixed sections
      zIndex: 10,
    },
    fixedContentLayer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 110 + bottomInset, // Adjust based on 쿠팡배너(adBannerContainer) height
      zIndex: 1,
    },
    adBannerContainer: {
      position: 'absolute',
      bottom: 24 + bottomInset,
      left: 20,
      right: 20,
      backgroundColor: '#297FCA',
      borderRadius: 20,
      overflow: 'hidden',
      ...SHADOW,
      shadowColor: '#297FCA',
      shadowOpacity: 0.4,
      elevation: 6,
    },
    adDecoCircle1: {
      position: 'absolute',
      top: -40,
      right: -20,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    adDecoCircle2: {
      position: 'absolute',
      bottom: -30,
      left: -20,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    adContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    adLeftContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    adIconEmoji: {
      fontSize: 32,
      marginRight: 14,
    },
    adTextGroup: {
      flexDirection: 'column',
    },
    adSubText: {
      fontSize: 12,
      fontWeight: '900',
      color: '#FDE047',
      marginBottom: 4,
    },
    adMainText: {
      fontSize: 16,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    adButton: {
      backgroundColor: colors.cardWhite,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    adButtonText: {
      color: '#297FCA',
      fontSize: 14,
      fontWeight: '900',
    }
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { hasOnboarded, selectedChild, events, googleAccount, onboardingLoaded } = useAppData();
  const { isLocked, isBooting } = useAppLock();
  const { unreadCount } = useNotificationCenter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const upcoming = useUpcomingEvents();
  const weather = useWeeklyWeather();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
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
              onPressNotifications={() => setNotificationCenterOpen(true)}
              unreadCount={unreadCount}
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

          <View style={styles.fixedContentLayer} pointerEvents="box-none">
            <EventListSection
              mainEvents={upcoming.mainEvents}
              featuredLaterEvents={upcoming.featuredLaterEvents}
              displayType={upcoming.displayType}
              onEventPress={(event) => router.push({ pathname: '/calendar', params: { date: event.date } })}
              hideSupplies={true}
            />
            <AiScanSection />
          </View>
        </View>
      </SafeAreaView>

      <TouchableOpacity
        style={styles.adBannerContainer}
        activeOpacity={0.9}
        onPress={() => Linking.openURL(COUPANG_LINK).catch((err) => console.error('Failed to open Coupang link:', err))}
      >
        <View style={styles.adDecoCircle1} />
        <View style={styles.adDecoCircle2} />
        <View style={styles.adContent}>
          <View style={styles.adLeftContent}>
            <Text style={styles.adIconEmoji}>🎁</Text>
            <View style={styles.adTextGroup}>
              <Text style={styles.adSubText}>놓치면 후회하는 특가!</Text>
              <Text style={styles.adMainText}>국민 육아템 세일전</Text>
            </View>
          </View>
          <View style={styles.adButton}>
            <Text style={styles.adButtonText}>바로가기 🚀</Text>
          </View>
        </View>
      </TouchableOpacity>

      <BlackboardModal event={selectedEvent} onClose={() => setSelectedEventId(null)} />
      <ChildSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <NotificationCenterModal
        visible={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
      />
      <AdPopupModal visible={adPopupVisible} onClose={() => setAdPopupVisible(false)} />
    </ScreenBackground>
  );
}
