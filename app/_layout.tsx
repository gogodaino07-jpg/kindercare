import { Dongle_400Regular } from '@expo-google-fonts/dongle';
import { EastSeaDokdo_400Regular } from '@expo-google-fonts/east-sea-dokdo';
import { GamjaFlower_400Regular } from '@expo-google-fonts/gamja-flower';
import { Gaegu_400Regular } from '@expo-google-fonts/gaegu';
import { HiMelody_400Regular } from '@expo-google-fonts/hi-melody';
import { Jua_400Regular } from '@expo-google-fonts/jua';
import { PoorStory_400Regular } from '@expo-google-fonts/poor-story';
import { Sunflower_500Medium } from '@expo-google-fonts/sunflower';
import { YeonSung_400Regular } from '@expo-google-fonts/yeon-sung';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppDataProvider } from '../context/AppDataContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Gaegu_400Regular,
    GamjaFlower_400Regular,
    HiMelody_400Regular,
    PoorStory_400Regular,
    Jua_400Regular,
    Dongle_400Regular,
    YeonSung_400Regular,
    Sunflower_500Medium,
    EastSeaDokdo_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Single app-wide hardware back handler: go back one screen (2뎁스+) whenever the
  // stack has a previous screen to return to, and only exit the app once there is
  // nowhere left to go back to (1뎁스, i.e. Home). Registered once at the root so it
  // always reflects the current navigation depth, instead of being scoped to a single
  // screen's focus state.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      BackHandler.exitApp();
      return true;
    });
    return () => subscription.remove();
  }, [router]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppDataProvider>
          <StatusBar style="auto" />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="splash" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="family-group-start" options={{ headerShown: false }} />
            <Stack.Screen name="verify-phone" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding-child-setup" options={{ headerShown: false }} />
            <Stack.Screen name="calendar" options={{ title: '캘린더' }} />
            <Stack.Screen name="add-event" options={{ title: '일정 추가' }} />
            <Stack.Screen name="upload" options={{ title: '가정통신문 업로드' }} />
            <Stack.Screen name="ai-review" options={{ title: 'AI 확인·수정' }} />
            <Stack.Screen name="save-complete" options={{ headerShown: false }} />
            <Stack.Screen name="past-events" options={{ title: '지난 일정' }} />
            <Stack.Screen name="child-profile" options={{ title: '아이 프로필 설정' }} />
            <Stack.Screen name="settings/index" options={{ title: '설정' }} />
            <Stack.Screen name="settings/family" options={{ title: '가족 계정' }} />
            <Stack.Screen name="settings/notifications" options={{ title: '알림 설정' }} />
            <Stack.Screen name="settings/font" options={{ title: '글씨체 설정' }} />
            <Stack.Screen name="settings/font-size" options={{ title: '글자 크기 설정' }} />
            <Stack.Screen
              name="settings/chalkboard-theme"
              options={{ title: '칠판 테마 색상' }}
            />
          </Stack>
        </AppDataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
