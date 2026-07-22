import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export default function HomeScreen() {
  const { hasOnboarded, selectedChild, events } = useAppData();
  const { tomorrowEvents, laterGroups, isEmpty } = useUpcomingEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [adPopupVisible, setAdPopupVisible] = useState(false);
  // Look up the live event by id each render so edits made in the modal (updateEventNote)
  // are reflected immediately instead of showing a stale snapshot.
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  // Wait a beat after landing on Home before showing the ad popup so it
  // doesn't feel like it's ambushing the user the instant the screen appears.
  useEffect(() => {
    const timer = setTimeout(() => setAdPopupVisible(true), 1000);
    return () => clearTimeout(timer);
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
        <HomeHeader selectedChild={selectedChild} onPressChild={() => setSwitcherOpen(true)} />
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
      <AdPopupModal visible={adPopupVisible} onClose={() => setAdPopupVisible(false)} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
