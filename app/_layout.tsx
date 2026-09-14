import { Dongle_400Regular, Dongle_700Bold } from '@expo-google-fonts/dongle';
import { GamjaFlower_400Regular } from '@expo-google-fonts/gamja-flower';
import { Gaegu_400Regular } from '@expo-google-fonts/gaegu';
import { HiMelody_400Regular } from '@expo-google-fonts/hi-melody';
import { Jua_400Regular } from '@expo-google-fonts/jua';
import { PoorStory_400Regular } from '@expo-google-fonts/poor-story';
import { Sunflower_500Medium } from '@expo-google-fonts/sunflower';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, BackHandler, Keyboard, LogBox, ToastAndroid, View, Platform, Animated, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppLockScreen from '../components/AppLockScreen';
import BootSplashOverlay from '../components/BootSplashOverlay';
import { isExternalActionActive } from '../utils/externalAction';
import { snoozeNotification, SNOOZE_ACTION_ID } from '../utils/notifications';
import { AlertProvider, useAlert } from '../context/AlertContext';
import { AppDataProvider, useAppData } from '../context/AppDataContext';
import { AppLockProvider, useAppLock } from '../context/AppLockContext';
import { NotificationCenterProvider, useNotificationCenter } from '../context/NotificationCenterContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { ToastProvider, useToast } from '../context/ToastContext';

SplashScreen.preventAutoHideAsync();

// Namespaced React Native Firebase API calls (firestore().collection(), .doc(), etc.)
// log a deprecation warning on every call until the modular API migration is done.
// That's dozens of warnings a minute during normal use, which pops the dev-only
// "Open debugger to view warnings" toast constantly and gets in the way while
// testing. Silencing just this pattern (not all logs) so real warnings still show.
LogBox.ignoreLogs([
  /deprecated \(as well as all React Native Firebase namespaced API\)/,
  /SafeAreaView has been deprecated/,
]);

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
  const lastBackPressRef = useRef(0);
  const { showAlert } = useAlert();
  const { showToast } = useToast();
  const { addNotification, markRead } = useNotificationCenter();
  // showAlert/addNotification/markRead/showToast는 매 렌더마다 새로 만들어지는
  // 함수라, 알림 리스너 effect의 의존성으로 넣으면 알림센터 상태가 바뀔 때마다
  // 리스너가 재등록되고 getLastNotificationResponseAsync가 다시 실행돼 마지막
  // 알림을 반복 처리하게 된다. ref로 최신 함수만 갈아끼우고 effect 자체는
  // 재등록하지 않는다.
  const notifHandlersRef = useRef({ showAlert, addNotification, markRead, showToast });
  notifHandlersRef.current = { showAlert, addNotification, markRead, showToast };

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
      if (router.canGoBack()) {
        router.back();
        return true;
      }

      // 루트('/')뿐 아니라, 로그아웃 직후처럼 router.dismissAll() + replace()로
      // 뒤로 갈 기록 자체가 없어진 화면에서도 여기로 떨어진다. 예전엔 이 경우
      // 확인 없이 바로 앱을 꺼버려서, 로그아웃 후 재로그인 화면에서 뒤로가기를
      // 누르면 앱이 그냥 종료되는 문제가 있었다 — 어디서 이 상태가 되든 항상
      // "한 번 더 누르면 종료" 확인을 거치게 통일한다.
      const now = Date.now();
      if (now - lastBackPressRef.current < EXIT_CONFIRM_WINDOW_MS) {
        BackHandler.exitApp();
      } else {
        lastBackPressRef.current = now;
        ToastAndroid.show('뒤로 가기 버튼을 한 번 더 누르면 종료됩니다.', ToastAndroid.SHORT);
      }
      return true;
    });
    return () => subscription.remove();
  }, [router]);

  // 푸시 알림을 탭했을 때 홈 화면이 아니라 그 알림이 알려준 일정 날짜의 캘린더로 바로 이동.
  // 앱이 이미 떠 있을 때(response listener)와, 완전히 종료된 상태에서 알림 탭으로 막 켜졌을 때
  // (getLastNotificationResponseAsync, cold start) 둘 다 처리해야 한다.
  // "나중에 다시 알림" 액션 버튼을 눌렀을 때는 캘린더 이동 대신 스누즈 시간 선택 팝업을 띄운다.
  useEffect(() => {
    if (!isReady) return;

    type NotifData = { date?: string; notifKey?: string; isSnooze?: boolean };

    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const { addNotification, markRead, showAlert, showToast } = notifHandlersRef.current;
      const content = response.notification.request.content;
      const data = (content.data ?? {}) as NotifData;
      const notificationId = response.notification.request.identifier;

      // 스누즈로 재예약됐던 알림이 실제로 도착/탭된 시점에만 알림센터에 노출한다
      // (기존 전날/당일 알림은 알림센터 연동 대상이 아니므로 그대로 둔다).
      if (data.isSnooze) {
        addNotification({
          id: notificationId,
          title: content.title ?? '',
          body: content.body ?? '',
          date: data.date,
        });
        markRead(notificationId);
      }

      if (response.actionIdentifier === SNOOZE_ACTION_ID) {
        const { notifKey, date } = data;
        if (!notifKey || !date) return;
        const title = content.title ?? '';
        const body = content.body ?? '';
        // 시간 선택 후에도 원래 알림이 알림창에 그대로 남아있어 새로 예약된 스누즈
        // 알림과 헷갈릴 수 있으므로, 선택 시(취소 제외) 원래 알림을 지운다.
        showAlert({
          title: '나중에 다시 알려드릴까요?',
          message: '원하는 시간을 선택해주세요.',
          buttons: [
            {
              text: '15분 후',
              onPress: () => {
                snoozeNotification(notifKey, title, body, date, 15).catch(() => {});
                Notifications.dismissNotificationAsync(notificationId).catch(() => {});
                showToast('⏰ 15분 후 다시 알려드릴게요.');
              },
            },
            {
              text: '30분 후',
              onPress: () => {
                snoozeNotification(notifKey, title, body, date, 30).catch(() => {});
                Notifications.dismissNotificationAsync(notificationId).catch(() => {});
                showToast('⏰ 30분 후 다시 알려드릴게요.');
              },
            },
            {
              text: '1시간 후',
              onPress: () => {
                snoozeNotification(notifKey, title, body, date, 60).catch(() => {});
                Notifications.dismissNotificationAsync(notificationId).catch(() => {});
                showToast('⏰ 1시간 후 다시 알려드릴게요.');
              },
            },
            { text: '취소', style: 'cancel' },
          ],
        });
        return;
      }

      if (typeof data.date === 'string') {
        router.push({ pathname: '/calendar', params: { date: data.date } });
      }
    };

    // 앱이 포그라운드/백그라운드에서 실행 중일 때 스누즈 알림이 도착하면(탭하기 전에도)
    // 알림센터에 안읽음 상태로 바로 노출한다. 완전 종료 상태(cold start)에서는 이 리스너가
    // 아예 실행되지 않으므로, 그 경우는 위 handleResponse의 탭 처리에서 추가해준다.
    const handleReceived = (notification: Notifications.Notification) => {
      const data = (notification.request.content.data ?? {}) as NotifData;
      if (!data.isSnooze) return;
      notifHandlersRef.current.addNotification({
        id: notification.request.identifier,
        title: notification.request.content.title ?? '',
        body: notification.request.content.body ?? '',
        date: data.date,
      });
    };

    Notifications.getLastNotificationResponseAsync().then(handleResponse);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    const receivedSubscription = Notifications.addNotificationReceivedListener(handleReceived);
    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, [isReady, router]);

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
                headerStyle: { backgroundColor: colors.cardWhite },
                headerTintColor: headerColors.text,
                headerTitleStyle: { color: headerColors.text, fontWeight: '800' },
                headerTitleAlign: 'left',
                headerTitleContainerStyle: {
                  marginLeft: Platform.OS === 'android' ? -25 : -10,
                },
                headerLeftContainerStyle: {
                  paddingLeft: Platform.OS === 'android' ? 8 : 0,
                },
                contentStyle: { backgroundColor: colors.gray50 },
                statusBarStyle: statusBarStyle,
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="splash" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="family-group-start" options={{ headerShown: false }} />
              <Stack.Screen name="family-create" options={{ headerShown: false, title: '새로운 가족 그룹 생성' }} />
              <Stack.Screen name="family-role-select" options={{ headerShown: false, title: '역할 선택' }} />
              <Stack.Screen name="google-signin" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding-child-setup" options={{ headerShown: false }} />
              <Stack.Screen name="calendar" options={{ title: '캘린더' }} />
              <Stack.Screen name="upload" options={{ title: '가정통신문 업로드' }} />
              <Stack.Screen name="ai-review" options={{ title: 'AI 확인·수정' }} />
              <Stack.Screen name="save-complete" options={{ headerShown: false }} />
              <Stack.Screen name="nearby-places" options={{ headerShown: false }} />
              <Stack.Screen name="child-profile" options={{ title: '아이 프로필 설정' }} />
              <Stack.Screen name="edit-event" options={{ title: '일정 수정' }} />
              <Stack.Screen name="stamp-board" options={{ title: '참 잘했어요 도장판' }} />
              <Stack.Screen name="settings/index" options={{ title: '설정' }} />
              <Stack.Screen name="settings/subscription" options={{ title: '프리미엄 구독' }} />
              <Stack.Screen name="settings/family" options={{ title: '가족 계정' }} />
              <Stack.Screen name="settings/notifications" options={{ title: '알림 설정' }} />
              <Stack.Screen name="settings/font" options={{ title: '글꼴' }} />
              <Stack.Screen name="settings/font-size" options={{ title: '글자 크기와 스타일' }} />
              <Stack.Screen name="settings/chalkboard-theme" options={{ title: '팝업 테마' }} />
              <Stack.Screen name="settings/theme" options={{ title: '테마' }} />
              <Stack.Screen name="settings/weather-region" options={{ title: '날씨 지역 설정' }} />
              <Stack.Screen name="settings/app-lock" options={{ title: '잠금화면 설정' }} />
              <Stack.Screen name="settings/privacy" options={{ title: '개인정보 처리방침' }} />
              <Stack.Screen name="settings/licenses" options={{ title: '오픈소스 라이선스' }} />
              <Stack.Screen name="settings/support" options={{ title: '고객센터' }} />
            </Stack>
            <AppLockScreen autoBiometricEnabled={!showOverlay} />
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
    Dongle_700Bold,
    Sunflower_500Medium,
  });

  useEffect(() => {
    // 이 앱은 부모(성인)가 아이 일정/가정통신문을 관리하는 용도이며 아동이 직접 쓰는
    // 앱이 아니다 (Play Console 타겟 연령대도 성인 전용으로 등록). AdMob은 이 여부를
    // 광고 요청마다 명시적으로 알려주지 않으면 정책 위반으로 계정이 정지될 수 있어
    // 초기화 전에 반드시 설정해야 한다.
    mobileAds()
      .setRequestConfiguration({
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        maxAdContentRating: MaxAdContentRating.PG,
      })
      .catch(() => {})
      .finally(() => {
        // We handle splash screen hiding in ThemedNavigation once all data is ready.
        mobileAds()
          .initialize()
          .catch(() => {});
      });
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppDataProvider>
            <SubscriptionProvider>
              <NotificationCenterProvider>
                <ToastProvider>
                  <AlertProvider>
                    <AppLockProvider>
                      <ThemedNavigation />
                    </AppLockProvider>
                  </AlertProvider>
                </ToastProvider>
              </NotificationCenterProvider>
            </SubscriptionProvider>
          </AppDataProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
