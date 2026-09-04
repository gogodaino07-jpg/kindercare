// 아기 수학 앱 루트 레이아웃
// - 태블릿 가로모드 고정
// - 진행 상황(GameProvider) / 보상 연출(RewardFxProvider) 전역 제공
// - 화면 전환은 300ms 슬라이드
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, TRANSITION_MS } from '../src/constants/theme';
import { GameProvider } from '../src/context/GameContext';
import { RewardFxProvider } from '../src/context/RewardFxContext';
import { prepareSounds } from '../src/lib/sound';

export default function RootLayout() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    prepareSounds();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GameProvider>
          <RewardFxProvider>
            <StatusBar hidden />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: TRANSITION_MS,
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="quiz" options={{ animation: 'fade' }} />
            </Stack>
          </RewardFxProvider>
        </GameProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
