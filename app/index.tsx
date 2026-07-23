import { Redirect } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdPopupModal from '../components/home/AdPopupModal';
import BlackboardModal from '../components/home/BlackboardModal';
import ChildSwitcherSheet from '../components/home/ChildSwitcherSheet';
import EmptyState from '../components/home/EmptyState';
import EventListSection from '../components/home/EventListSection';
import HomeHeader from '../components/home/HomeHeader';
import NotificationCenterModal from '../components/home/NotificationCenterModal';
import UploadButton from '../components/home/UploadButton';
import WeeklyWeatherStrip from '../components/home/WeeklyWeatherStrip';
import ScreenBackground from '../components/ScreenBackground';
import { useAppData } from '../context/AppDataContext';
import { useAppLock } from '../context/AppLockContext';
import { useNotificationCenter } from '../context/NotificationCenterContext';
import { useUpcomingEvents } from '../hooks/useUpcomingEvents';
import { useWeeklyWeather } from '../hooks/useWeeklyWeather';

export default function HomeScreen() {
  const { hasOnboarded, selectedChild, events } = useAppData();
  const { isLocked } = useAppLock();
  const { hasUnread } = useNotificationCenter();
  const { tomorrowEvents, laterGroups, isEmpty } = useUpcomingEvents();
  const weather = useWeeklyWeather();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [adPopupVisible, setAdPopupVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const adShownRef = useRef(false);

  // Pull-to-refresh refetches weather immediately — manual per-strip refresh
  // icon was removed in favor of this. Background auto-refresh (1hr) runs
  // independently inside useWeeklyWeather.
  const handleRefresh = async () => {
    setRefreshing(true);
    await weather.retry();
    setRefreshing(false);
  };
  // Look up the live event by id each render so edits made in the modal (updateEventNote)
  // are reflected immediately instead of showing a stale snapshot.
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  // The ad popup shows exactly once per full app launch: ~1.8s after Home is
  // settled and unlocked (not immediately on entry). If the app is still
  // behind the lock screen when Home mounts, wait for unlock before starting
  // that delay — it must never be able to render on top of / behind the lock
  // screen. It deliberately does NOT re-trigger on every background→foreground
  // resume (Home stays mounted across those), only on a genuine fresh launch.
  useEffect(() => {
    if (isLocked || adShownRef.current) return;
    const timer = setTimeout(() => {
      adShownRef.current = true;
      setAdPopupVisible(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, [isLocked]);

  // Force the popup closed immediately if a re-lock happens while it's open.
  useEffect(() => {
    if (isLocked) setAdPopupVisible(false);
  }, [isLocked]);

  // Hardware back handling (go back a screen vs. exit the app) is registered once,
  // app-wide, in app/_layout.tsx — it always checks the live navigation depth there,
  // so it doesn't need to be duplicated or scoped to this screen's focus state.

  if (!hasOnboarded) {
    return <Redirect href="/splash" />;
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <HomeHeader
          selectedChild={selectedChild}
          onPressChild={() => setSwitcherOpen(true)}
          onPressNotifications={() => setNotificationCenterOpen(true)}
          hasUnreadNotifications={hasUnread}
        />
        <WeeklyWeatherStrip
          days={weather.days}
          loading={weather.loading}
          error={weather.error}
          retry={weather.retry}
          usingFallbackLocation={weather.usingFallbackLocation}
        />
        {isEmpty ? (
          <ScrollView
            contentContainerStyle={styles.emptyScrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          >
            <EmptyState />
          </ScrollView>
        ) : (
          <EventListSection
            tomorrowEvents={tomorrowEvents}
            laterGroups={laterGroups}
            onEventPress={(event) => setSelectedEventId(event.id)}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}
        <UploadButton />
      </SafeAreaView>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  emptyScrollContent: {
    flexGrow: 1,
  },
});
