import { Redirect } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet } from 'react-native';
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
import { useUpcomingEvents } from '../hooks/useUpcomingEvents';

export default function HomeScreen() {
  const { hasOnboarded, selectedChild, events } = useAppData();
  const { tomorrowEvents, laterGroups, isEmpty } = useUpcomingEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [adPopupVisible, setAdPopupVisible] = useState(false);
  const backgroundedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const adTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Look up the live event by id each render so edits made in the modal (updateEventNote)
  // are reflected immediately instead of showing a stale snapshot.
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  // Wait a beat after landing on Home before showing the ad popup so it
  // doesn't feel like it's ambushing the user the instant the screen appears.
  useEffect(() => {
    adTimerRef.current = setTimeout(() => setAdPopupVisible(true), 1000);
    return () => {
      if (adTimerRef.current) clearTimeout(adTimerRef.current);
    };
  }, []);

  // Home stays mounted across background/foreground cycles, so the mount-only
  // effect above only ever fires once — re-show the popup (with the same
  // delay) whenever the app comes back from the background too.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'background') {
        backgroundedRef.current = true;
        setAdPopupVisible(false);
      } else if (nextState === 'active' && prevState !== 'active' && backgroundedRef.current) {
        backgroundedRef.current = false;
        if (adTimerRef.current) clearTimeout(adTimerRef.current);
        adTimerRef.current = setTimeout(() => setAdPopupVisible(true), 1000);
      }
    });
    return () => {
      subscription.remove();
      if (adTimerRef.current) clearTimeout(adTimerRef.current);
    };
  }, []);

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
        />
        <WeeklyWeatherStrip />
        {isEmpty ? (
          <EmptyState />
        ) : (
          <EventListSection
            tomorrowEvents={tomorrowEvents}
            laterGroups={laterGroups}
            onEventPress={(event) => setSelectedEventId(event.id)}
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
});
