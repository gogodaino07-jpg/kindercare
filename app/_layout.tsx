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
import { AppState, AppStateStatus, BackHandler, Keyboard, ToastAndroid, View, Platform, Animated, StyleSheet } from 'react-native';
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
// App-wide header colors - now reactive to theme
const getHeaderColors = (scheme: 'light' | 'dark') => ({
  bg: scheme === 'dark' ? '#1B242E' : '#EAF5F9',
  text: scheme === 'dark' ? '#EDF2F7' : '#1E293B',
});

function ThemedNavigation() {
  const { colors, resolvedScheme, loaded: themeLoaded } = useTheme();
  const headerColors = getHeaderColors(resolvedScheme);
  const { loaded: lockLoaded, isBooting } = useAppLock();
  const { onboardingLoaded } = useAppData();
  const router = useRouter();
  const pathname = usePathname();
  const lastBackPressRef = useRef(0);

  const splashOpacity = useRef(new Animated.Value(1)).current;
  const appOpacity = useRef(new Animated.Value(0)).current;
  const [showOverlay, setShowOverlay] = useState(true);

  // Consolidated readiness flag
  const isReady = themeLoaded && lockLoaded && onboardingLoaded && !isBooting;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});

      // Synchronized cross-fade animation
      Animated.parallel([
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 400, // Faster fade out
          useNativeDriver: true,
        }),
        Animated.timing(appOpacity, {
          toValue: 1,
          duration: 400, // Fade in the app content simultaneously
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowOverlay(false);
      });
    }
  }, [isReady]);

  // Hardware back handling
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
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

      if (router.canGoBack()) {
        router.back();
        return true;
      }

      BackHandler.exitApp();
      return true;
    });
    return () => subscription.remove();
  }, [router, pathname]);

  // Determine status bar style:
  // During splash (always light bg #FEF9F0), we need dark icons.
  // After ready, we follow the theme.
  const statusBarStyle = !isReady ? 'dark' : (resolvedScheme === 'dark' ? 'light' : 'dark');

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={statusBarStyle} />

      {/* Actual App Content */}
      <Animated.View style={{ flex: 1, opacity: appOpacity }}>
        {isReady && (
          <>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: headerColors.bg },
                headerTintColor: headerColors.text,
                headerTitleStyle: { color: headerColors.text },
                headerTitleAlign: 'left',
                headerTitleContainerStyle: {
                  marginLeft: Platform.OS === 'android' ? -25 : -10,
                },
                headerLeftContainerStyle: {
                  paddingLeft: Platform.OS === 'android' ? 8 : 0,
                },
                contentStyle: { backgroundColor: colors.skyBackground },
                statusBarStyle: statusBarStyle,
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="splash" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="family-group-start" options={{ headerShown: false }} />
              <Stack.Screen name="family-create" options={{ headerShown: false, title: '새로운 가족 그룹 생성' }} />
              <Stack.Screen name="google-signin" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding-child-setup" options={{ headerShown: false }} />
              <Stack.Screen name="calendar" options={{ title: '캘린더' }} />
              <Stack.Screen name="add-event" options={{ title: '일정 추가' }} />
              <Stack.Screen name="upload" options={{ title: '가정통신문 업로드' }} />
              <Stack.Screen name="ai-review" options={{ title: 'AI 확인·수정' }} />
              <Stack.Screen name="save-complete" options={{ headerShown: false }} />
              <Stack.Screen name="past-events" options={{ title: '지난 일정' }} />
              <Stack.Screen name="child-profile" options={{ title: '아이 프로필 설정' }} />
              <Stack.Screen name="edit-event" options={{ title: '일정 수정' }} />
              <Stack.Screen name="settings/index" options={{ title: '설정' }} />
              <Stack.Screen name="settings/family" options={{ title: '가족 계정' }} />
              <Stack.Screen name="settings/notifications" options={{ title: '알림 설정' }} />
              <Stack.Screen name="settings/font" options={{ title: '글씨체' }} />
              <Stack.Screen name="settings/font-size" options={{ title: '글자 크기' }} />
              <Stack.Screen name="settings/chalkboard-theme" options={{ title: '팝업 테마' }} />
              <Stack.Screen name="settings/theme" options={{ title: '테마' }} />
              <Stack.Screen name="settings/app-lock" options={{ title: '잠금화면 설정' }} />
              <Stack.Screen name="settings/privacy" options={{ title: '개인정보 처리방침' }} />
              <Stack.Screen name="settings/licenses" options={{ title: '오픈소스 라이선스' }} />
              <Stack.Screen name="settings/support" options={{ title: '고객센터' }} />
            </Stack>
            <AppLockScreen autoBiometricEnabled={true} />
          </>
        )}
      </Animated.View>

      {/* Smooth Boot Splash Overlay */}
      {showOverlay && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: splashOpacity,
              zIndex: 9999,
            }
          ]}
        >
          <BootSplashOverlay />
        </Animated.View>
      )}
    </View>
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
    // We handle splash screen hiding in ThemedNavigation once all data is ready.
  }, []);

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
