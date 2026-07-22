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
import AppLockScreen from '../components/AppLockScreen';
import { AppDataProvider } from '../context/AppDataContext';
import { AppLockProvider, useAppLock } from '../context/AppLockContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

SplashScreen.preventAutoHideAsync();

function ThemedNavigation() {
  const { colors, resolvedScheme } = useTheme();
  const { loaded: lockLoaded } = useAppLock();
  const router = useRouter();

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

  if (!lockLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.cardWhite },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary },
          contentStyle: { backgroundColor: colors.skyBackground },
        }}
      >
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
        <Stack.Screen name="settings/chalkboard-theme" options={{ title: '칠판 테마 색상' }} />
        <Stack.Screen name="settings/theme" options={{ title: '테마' }} />
        <Stack.Screen name="settings/app-lock" options={{ title: '앱 잠금' }} />
      </Stack>
      <AppLockScreen />
    </>
  );
}

export default function RootLayout() {
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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppDataProvider>
            <AppLockProvider>
              <ThemedNavigation />
            </AppLockProvider>
          </AppDataProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
