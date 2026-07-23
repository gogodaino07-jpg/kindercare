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
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, BackHandler, ToastAndroid } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppLockScreen from '../components/AppLockScreen';
import BootSplashOverlay from '../components/BootSplashOverlay';
import { isExternalActionActive } from '../utils/externalAction';
import { AlertProvider } from '../context/AlertContext';
import { AppDataProvider, useAppData } from '../context/AppDataContext';
import { AppLockProvider, useAppLock } from '../context/AppLockContext';
import { NotificationCenterProvider } from '../context/NotificationCenterContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';

SplashScreen.preventAutoHideAsync();

const EXIT_CONFIRM_WINDOW_MS = 2000;
const BOOT_SPLASH_MS = 2000;
// App-wide signature header colors — fixed across light/dark theme so every
// settings/detail screen header reads consistently.
const HEADER_BG = '#EAF5F9';
const HEADER_TEXT = '#1E293B';

function ThemedNavigation() {
  const { colors, resolvedScheme } = useTheme();
  const { loaded: lockLoaded } = useAppLock();
  const { onboardingLoaded } = useAppData();
  const router = useRouter();
  const pathname = usePathname();
  const lastBackPressRef = useRef(0);

  // Shown once on cold boot (initial state below) and again every time the
  // app returns to the foreground after being backgrounded — distinct from
  // the routed /splash screen, which only plays once on the way into
  // onboarding and doesn't fire on every relaunch/resume.
  const [showBootSplash, setShowBootSplash] = useState(true);
  const backgroundedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const timer = setTimeout(() => setShowBootSplash(false), BOOT_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'background') {
        backgroundedRef.current = true;
      } else if (nextState === 'active' && prevState !== 'active' && backgroundedRef.current) {
        backgroundedRef.current = false;
        // A picker/contacts/GPS/external-link round trip also blips through
        // 'background' — only replay the splash for a genuine app switch.
        if (!isExternalActionActive()) {
          setShowBootSplash(true);
          setTimeout(() => setShowBootSplash(false), BOOT_SPLASH_MS);
        }
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      // At the Home screen root: require a second press within the confirm
      // window before exiting, instead of exiting on the very first press.
      if (pathname === '/') {
        const now = Date.now();
        if (now - lastBackPressRef.current < EXIT_CONFIRM_WINDOW_MS) {
          BackHandler.exitApp();
        } else {
          lastBackPressRef.current = now;
          ToastAndroid.show('뒤로 가기 버튼을 한 번 더 누르면 종료됩니다.', ToastAndroid.SHORT);
        }
        return true;
      }
      BackHandler.exitApp();
      return true;
    });
    return () => subscription.remove();
  }, [router, pathname]);

  if (!lockLoaded || !onboardingLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          // App-wide signature pastel-blue header, fixed regardless of
          // light/dark theme — applies to every settings/detail screen
          // below that doesn't override it.
          headerStyle: { backgroundColor: HEADER_BG },
          headerTintColor: HEADER_TEXT,
          headerTitleStyle: { color: HEADER_TEXT },
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
        {/* Title is overridden per-entry ('구성원 관리' / '키 재발급') by a
            nested <Stack.Screen> inside family.tsx based on a nav param —
            this is just the fallback for direct/back navigation. */}
        <Stack.Screen name="settings/family" options={{ title: '가족 계정' }} />
        <Stack.Screen name="settings/notifications" options={{ title: '알림 설정' }} />
        <Stack.Screen name="settings/font" options={{ title: '글씨체' }} />
        <Stack.Screen name="settings/font-size" options={{ title: '글자 크기' }} />
        <Stack.Screen name="settings/chalkboard-theme" options={{ title: '팝업 테마' }} />
        <Stack.Screen name="settings/theme" options={{ title: '테마' }} />
        <Stack.Screen name="settings/app-lock" options={{ title: '앱 잠금' }} />
      </Stack>
      <AppLockScreen autoBiometricEnabled={!showBootSplash} />
      {showBootSplash ? <BootSplashOverlay /> : null}
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
            <NotificationCenterProvider>
              <ToastProvider>
                <AlertProvider>
                  <AppLockProvider>
                    <ThemedNavigation />
                  </AppLockProvider>
                </AlertProvider>
              </ToastProvider>
            </NotificationCenterProvider>
          </AppDataProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
