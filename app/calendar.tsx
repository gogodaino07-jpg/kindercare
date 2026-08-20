import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';

export default function CalendarScreen() {
  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <Stack.Screen options={{ title: '' }} />
        <View style={{ flex: 1 }} />
      </SafeAreaView>
    </ScreenBackground>
  );
}
