import { Redirect, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdBannerPlaceholder from '../components/home/AdBannerPlaceholder';
import AdPopupModal from '../components/home/AdPopupModal';
import BlackboardModal from '../components/home/BlackboardModal';
import ChildSwitcherSheet from '../components/home/ChildSwitcherSheet';
import EmptyState from '../components/home/EmptyState';
import EventListSection from '../components/home/EventListSection';
import HomeHeader from '../components/home/HomeHeader';
import UploadButton from '../components/home/UploadButton';
import WeeklyWeatherStrip from '../components/home/WeeklyWeatherStrip';
import ScreenBackground from '../components/ScreenBackground';
import { useAppData } from '../context/AppDataContext';
import { useUpcomingEvents } from '../hooks/useUpcomingEvents';
import { toISODate } from '../utils/date';

export default function HomeScreen() {
  const { hasOnboarded, selectedChild, events, adDismissedDate, dismissAdForToday } =
    useAppData();
  const { tomorrowEvents, laterGroups, isEmpty } = useUpcomingEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [adPopupVisible, setAdPopupVisible] = useState(
    () => adDismissedDate !== toISODate(new Date())
  );
  // Look up the live event by id each render so edits made in the modal (updateEventNote)
  // are reflected immediately instead of showing a stale snapshot.
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  // Home is the app's true root (1뎁스) screen — pressing hardware back here should
  // exit the app. The listener is registered only while Home is the focused screen
  // (via useFocusEffect, not a plain mount-time useEffect) so that on every other
  // (2뎁스+) screen — which stay mounted in the background under expo-router's Stack —
  // this handler is detached and the default "go back one screen" behavior applies.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        BackHandler.exitApp();
        return true;
      });
      return () => subscription.remove();
    }, [])
  );

  if (!hasOnboarded) {
    return <Redirect href="/splash" />;
  }

  const handleCloseAdPopup = (dismissForToday: boolean) => {
    if (dismissForToday) dismissAdForToday();
    setAdPopupVisible(false);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <HomeHeader selectedChild={selectedChild} onPressChild={() => setSwitcherOpen(true)} />
        <WeeklyWeatherStrip />
        <AdBannerPlaceholder />
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
      <AdPopupModal visible={adPopupVisible} onClose={handleCloseAdPopup} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
