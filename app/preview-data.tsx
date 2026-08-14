import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import BagSection from '../components/home/BagSection';
import ChildSwitcherSheet from '../components/home/ChildSwitcherSheet';
import { Event } from '../types/models';
import { toISODate } from '../utils/date';

const today = toISODate(new Date());

const mainEvents: Event[] = [
  { id: 'm1', date: today, title: '생일 파티', note: '3천원짜리 생일선물 준비', childId: 'c1', source: 'ai', icon: '🎁' },
  { id: 'm2', date: today, title: '독서퀴즈', note: '내 아옹이 가져갔니?', childId: 'c1', source: 'ai', icon: '📚' },
];

export default function PreviewDataScreen() {
  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingTop: 20, paddingBottom: 60 }}>
          <BagSection
            mainEvents={mainEvents}
            secondaryEvents={[]}
            displayType="TODAY"
            onEventPress={() => {}}
          />
        </ScrollView>
        <View style={{ position: 'absolute', bottom: 20, right: 20 }} />
      </SafeAreaView>
      <ChildSwitcherSheet visible={true} onClose={() => {}} />
    </ScreenBackground>
  );
}
