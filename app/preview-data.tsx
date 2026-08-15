import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import HomeHeroHeader from '../components/home/HomeHeroHeader';

export default function PreviewDataScreen() {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <HomeHeroHeader
          selectedChild={{ id: 'c1', name: '서준', age: 4, className: '스웨덴반' }}
          onPressChild={() => {}}
          onPressMeal={() => {}}
          weatherDays={[
            { date: iso(today), isToday: true, isTomorrow: false, emoji: '☀️', tempMax: 28, label: '맑음' } as any,
            { date: iso(tomorrow), isToday: false, isTomorrow: true, emoji: '🌦️', tempMax: 24, label: '이슬비' } as any,
            { date: iso(dayAfter), isToday: false, isTomorrow: false, emoji: '❄️', tempMax: 22, label: '눈' } as any,
          ]}
          weatherLoading={false}
          onPressDate={() => {}}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}
