import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
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
