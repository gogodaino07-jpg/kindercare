import { Feather } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AdPopupModal from '../components/home/AdPopupModal';
import BirthdayCenterConfetti from '../components/home/BirthdayCenterConfetti';
import ChildSwitcherSheet from '../components/home/ChildSwitcherSheet';
import FamilyShareCard from '../components/home/FamilyShareCard';
import HomeEmptyContent, { HomeEmptyContentHandle } from '../components/home/HomeEmptyContent';
import HomeHeroHeader from '../components/home/HomeHeroHeader';
import HomeProfileBar from '../components/home/HomeProfileBar';
import HomeTutorialOverlay, { HomeTutorialStep } from '../components/home/HomeTutorialOverlay';
import MealPlanSheet from '../components/home/MealPlanSheet';
import MultiChildPrepSummary from '../components/home/MultiChildPrepSummary';
import NoticeBoardCard from '../components/home/NoticeBoardCard';
import ScheduleBoard, { ScheduleTab } from '../components/home/ScheduleBoard';
import TomorrowWeatherAlert from '../components/home/TomorrowWeatherAlert';
import StickyPrepBar from '../components/home/StickyPrepBar';
import TodayPrepProgress from '../components/home/TodayPrepProgress';
import ScreenBackground from '../components/ScreenBackground';
import CoupangBanner from '../components/common/CoupangBanner';
import Text from '../components/common/AppText';
import { SHADOW, type ThemeColors } from '../constants/theme';
import { isChildLocked, useAppData } from '../context/AppDataContext';
import { useAppLock } from '../context/AppLockContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { getDisplayItems } from '../hooks/useLocalChecklist';
import { useTodayISO } from '../hooks/useTodayISO';
import { useUpcomingEvents } from '../hooks/useUpcomingEvents';
import { useWeeklyWeather } from '../hooks/useWeeklyWeather';
import { Event, EventItem } from '../types/models';
import { isBirthdayToday, parseISODate, toISODate, WEEKDAY_KO } from '../utils/date';
import { updateHomeWidget } from '../utils/homeWidget';
import { HOME_TUTORIAL_KEY, hasSeenTutorial, markTutorialSeen } from '../utils/tutorialStorage';

// 앱 프로세스가 살아있는 동안 전면 광고는 한 번만 시도한다. 컴포넌트 스코프
// ref로 관리하면 AI 스캔 후 홈으로 돌아오면서 화면이 다시 마운트될 때마다
// 광고가 또 뜨는 문제가 있어, 모듈 스코프(진짜 콜드 스타트에서만 리셋)로 관리.
let hasAttemptedAdThisSession = false;

/** 홈 화면 최하단 "가족과 함께 보기" 공유 배너 노출 여부 — 임시로 숨김. */
const SHOW_FAMILY_SHARE_CARD = false;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    mainContainer: {
      flex: 1,
    },
    // flexGrow: 1이 있어야 콘텐츠가 화면보다 짧을 때 스크롤뷰 내부 요소(예: 오늘 일정
    // 카드 1개뿐일 때)가 남는 세로 공간을 flex로 채울 수 있다. 콘텐츠가 화면보다 길면
    // 평소처럼 스크롤됨.
    scrollContainer: { flexGrow: 1 },
    pullIndicator: {
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    bottomFixedStack: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 100,
    },
    familyBannerWrap: {
      marginHorizontal: 20,
      marginBottom: 8,
    },
    familyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 14,
      ...SHADOW,
      shadowOpacity: 0.1,
      elevation: 0,
    },
    familyBannerEmoji: {
      fontSize: 14,
    },
    familyBannerText: {
      fontSize: 12.5,
      fontWeight: '800',
    },
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { replayTutorial } = useLocalSearchParams<{ replayTutorial?: string }>();
  const { hasOnboarded, children, selectedChild, selectChild, events, googleAccount, onboardingLoaded, mealPlans, updateEvent, isFamilyOwner, canEditFamilyData } = useAppData();
  const { isLocked } = useAppLock();
  const { isSubscribed, isReady: subscriptionReady } = useSubscription();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );
  const upcoming = useUpcomingEvents();
  const weather = useWeeklyWeather();
  const todayISO = useTodayISO();
  const tomorrowISO = useMemo(() => {
    const d = parseISODate(todayISO);
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }, [todayISO]);
  const noticeEvents = useMemo(() => {
    // 과거 공지가 홈 화면에 계속 노출되지 않도록 오늘 이후의 공지만 보여준다.
    // 단, 오늘 날짜인 공지는 "오늘 일정"(D-DAY 배지)에 이미 노출되므로 중복을 피하기 위해 내일 이후만 보여준다.
    return events
      .filter((e) => e.category === '공지' && e.childId === selectedChild?.id && e.date > todayISO)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, selectedChild, todayISO]);
  const todayMeal = useMemo(() => {
    return mealPlans.find((m) => m.childId === selectedChild?.id && m.date === todayISO);
  }, [mealPlans, selectedChild, todayISO]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [mealSheetOpen, setMealSheetOpen] = useState(false);
  const [adPopupVisible, setAdPopupVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<ScheduleTab>('today');
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const progressYRef = useRef(0);
  const progressHeightRef = useRef(0);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [birthdayBurstKey, setBirthdayBurstKey] = useState(0);
  const profileSectionRef = useRef<View>(null);
  const calendarIconRef = useRef<View>(null);
  const settingsIconRef = useRef<View>(null);
  const mealCardRef = useRef<View>(null);
  const weatherSectionRef = useRef<View>(null);
  const prepSectionRef = useRef<View>(null);
  const scanButtonRef = useRef<View>(null);
  const scheduleSectionRef = useRef<View>(null);
  const emptyContentRef = useRef<HomeEmptyContentHandle>(null);
  const [homeTutorialVisible, setHomeTutorialVisible] = useState(false);
  // 하단에 떠있는 공유배너/쿠팡배너 높이만큼만 스크롤 여백을 잡아준다 — 고정값을
  // 쓰면 오늘 일정이 짧아 스크롤 콘텐츠가 짧은 날 그 아래로 빈 여백이 크게 남았다.
  const [bottomStackHeight, setBottomStackHeight] = useState(0);
  const isChildBirthdayToday = isBirthdayToday(selectedChild?.birthdate);

  // 쿠팡 검색창(ScheduleBoard 맨 아래)이 키보드에 가려지는 문제 — 이 화면은
  // targetSdk 36(엣지투엣지 강제 적용) 기기에서 windowSoftInputMode="adjustResize"만으론
  // 스크롤 영역이 제대로 줄어들지 않아, scrollToEnd()를 호출해도 마지막 콘텐츠가
  // 여전히 키보드 뒤에 남는다. 키보드 실제 높이만큼 스크롤 콘텐츠 하단에 여백을
  // 직접 추가해서 스크롤이 그 여백까지 내려갈 수 있게 한다.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const searchInputFocusedRef = useRef(false);
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      if (searchInputFocusedRef.current) {
        // 새로 생긴 하단 여백이 실제 레이아웃에 반영될 시간을 살짝 준 뒤 스크롤.
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 구독이 끝나 지금 선택된 아이가 잠기면(무료 한도 초과), 잠기지 않은 첫 아이로
  // 자동 전환한다 — 안 그러면 잠긴 아이의 일정/급식 등이 홈 화면에 계속 노출된다.
  useEffect(() => {
    if (!selectedChild || !isChildLocked(children, selectedChild.id, isSubscribed)) return;
    const firstUnlocked = children.find((c) => !isChildLocked(children, c.id, isSubscribed));
    if (firstUnlocked) selectChild(firstUnlocked.id);
  }, [children, selectedChild, isSubscribed, selectChild]);

  // 다자녀 요약 바에는 무료 한도로 잠긴 아이는 뺀다 — 어차피 전환해도 그 아이 데이터는 볼 수 없다.
  const unlockedChildren = useMemo(
    () => children.filter((c) => !isChildLocked(children, c.id, isSubscribed)),
    [children, isSubscribed]
  );

  const todayProgress = useMemo(() => {
    const items = upcoming.mainEvents.flatMap((e) => getDisplayItems(e));
    const checked = items.filter((i) => i.completed).length;
    return {
      total: items.length,
      checked,
      percent: items.length === 0 ? 0 : Math.round((checked / items.length) * 100),
    };
  }, [upcoming.mainEvents]);

  // 홈 화면 위젯(안드로이드)에 오늘 일정을 일정별 준비물과 함께, 내일 일정도 미리보기로 밀어준다.
  // 앱을 켜거나, 준비물을 체크하거나, 날짜가 바뀌어 일정이 갱신될 때마다 최신 상태로 맞춘다.
  useEffect(() => {
    const widgetDateLabel = (iso: string) => {
      const d = parseISODate(iso);
      return `${d.getMonth() + 1}.${d.getDate()} (${WEEKDAY_KO[d.getDay()]})`;
    };
    const tomorrowEvent = upcoming.secondaryEvents[0];

    updateHomeWidget({
      dateLabel: widgetDateLabel(todayISO),
      dateISO: todayISO,
      todayEvents: upcoming.mainEvents.map((e) => {
        const displayItems = getDisplayItems(e);
        return {
          title: e.title,
          itemNames: displayItems.filter((i) => !i.completed).map((i) => i.name),
          allItemsDone: displayItems.length > 0 && displayItems.every((i) => i.completed),
        };
      }),
      tomorrow: tomorrowEvent
        ? {
            dateLabel: widgetDateLabel(tomorrowISO),
            dateISO: tomorrowISO,
            title: tomorrowEvent.title,
            itemCount: getDisplayItems(tomorrowEvent).filter((i) => !i.completed).length,
          }
        : null,
    });
  }, [upcoming.mainEvents, upcoming.secondaryEvents, todayISO, tomorrowISO]);

  // 준비물 체크 여부를 캘린더 화면과 같은 곳(event.items[].completed)에 저장해서,
  // 홈에서 체크해도 캘린더에 바로 반영되도록 한다.
  const setItemCompleted = useCallback((event: Event, item: EventItem, completed: boolean) => {
    const nextItems = getDisplayItems(event).map((i) => (i.id === item.id ? { ...i, completed } : i));
    updateEvent(event.id, { items: nextItems, note: nextItems.map((i) => i.name).join('\n') });
  }, [updateEvent]);

  const handleToggleItem = useCallback(
    (event: Event, item: EventItem) => setItemCompleted(event, item, !item.completed),
    [setItemCompleted]
  );

  const handleToggleAll = useCallback((event: Event, items: EventItem[], value: boolean) => {
    const nextItems = getDisplayItems(event).map((i) => ({ ...i, completed: value }));
    updateEvent(event.id, { items: nextItems, note: nextItems.map((i) => i.name).join('\n') });
  }, [updateEvent]);

  // 아래로 당겨서 새로고침 — 날씨를 강제로 다시 조회(이벤트/체크리스트는 실시간 구독이라 재조회 불필요).
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await weather.retry();
    } finally {
      setRefreshing(false);
      if (isChildBirthdayToday) setBirthdayBurstKey((k) => k + 1);
    }
  }, [weather, isChildBirthdayToday]);

  // "오늘 등원 준비물 챙기기" 배너를 누르면 그 배너가 화면 상단(고정 프로필 헤더 바로 아래)으로 오도록 스크롤.
  const scrollToProgress = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(progressYRef.current - 8, 0), animated: true });
  }, []);

  // 쿠팡 검색창(ScheduleBoard 맨 아래)에 포커스가 가 있는 동안엔, 키보드가 실제로
  // 올라온 시점(keyboardDidShow)에 맞춰 화면 끝까지 스크롤한다 — 포커스 시점에
  // 바로 스크롤하면 keyboardHeight 여백이 아직 반영되기 전이라 부족하게 스크롤될
  // 수 있어, 실제 키보드 표시 이벤트를 기준으로 삼는다.
  const handleSearchInputFocus = useCallback(() => {
    searchInputFocusedRef.current = true;
    // 이미 키보드가 떠 있는 상태(예: 다른 입력에서 바로 이 입력으로 옮겨온 경우)엔
    // keyboardDidShow가 다시 발생하지 않으므로, 포커스 시점에도 한 번 시도해둔다.
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);
  const handleSearchInputBlur = useCallback(() => {
    searchInputFocusedRef.current = false;
  }, []);

  // 준비물 배너가 절반 이상 스크롤로 가려지면, 상단에 얇은 진행률 띠를 대신 보여준다.
  const handleScroll = useCallback((y: number) => {
    const bannerHalfway = progressYRef.current + progressHeightRef.current / 2;
    setStickyVisible(progressHeightRef.current > 0 && y > bannerHalfway);
  }, []);

  // 네이티브 RefreshControl은 당김 거리를 조절하는 방법이 없어(짧게만 당겨도
  // 바로 새로고침돼 불편하다는 피드백), 직접 손가락 이동량을 추적하는 커스텀
  // 당겨서 새로고침으로 바꿨다. 목록이 맨 위(scrollY<=0)일 때만 반응하고,
  // PULL_TRIGGER만큼 당겨야(네이티브보다 더 많이) 새로고침이 실행된다.
  const PULL_TRIGGER = 110;
  const pullY = useSharedValue(0);
  const scrollYShared = useSharedValue(0);
  const refreshingShared = useSharedValue(false);
  useEffect(() => {
    refreshingShared.value = refreshing;
  }, [refreshing, refreshingShared]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollYShared.value = e.contentOffset.y;
      runOnJS(handleScroll)(e.contentOffset.y);
    },
  });

  const triggerRefresh = useCallback(() => {
    onRefresh().finally(() => {
      pullY.value = withTiming(0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRefresh]);

  const pullGesture = Gesture.Pan()
    .activeOffsetY([-1000, 10])
    .failOffsetX([-20, 20])
    // 리스트가 맨 위(scrollY<=0)가 아닐 때는 터치 시작 시점에 바로 제스처를
    // 실패 처리해 이 Pan 인식기가 아예 활성화되지 않도록 막는다. 이 가드가
    // 없으면 목록 중간 어디서든 손가락을 10px만 아래로 움직여도 매번 활성화돼
    // 네이티브 스크롤과 동시에 경쟁하게 되고, 화면을 위아래로 빠르게 반복
    // 스크롤할 때(손을 떼지 않고 방향을 계속 바꿀 때) 그 경쟁이 반복되면서
    // 화면이 번쩍이는 렌더링 결함이 있었다.
    .onTouchesDown((_e, state) => {
      if (scrollYShared.value > 0.5) {
        state.fail();
      }
    })
    .onChange((e) => {
      if (refreshingShared.value || scrollYShared.value > 0.5) return;
      pullY.value = Math.max(0, Math.min(pullY.value + e.changeY, PULL_TRIGGER * 1.3));
    })
    .onEnd(() => {
      if (refreshingShared.value) return;
      if (pullY.value >= PULL_TRIGGER) {
        pullY.value = withTiming(56);
        runOnJS(triggerRefresh)();
      } else {
        pullY.value = withTiming(0);
      }
    });
  const nativeScrollGesture = Gesture.Native();
  const homeScrollGesture = Gesture.Simultaneous(pullGesture, nativeScrollGesture);

  const pullIndicatorStyle = useAnimatedStyle(() => ({ height: pullY.value }));
  const pullArrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(pullY.value, [0, PULL_TRIGGER], [0, 180], 'clamp')}deg` }],
  }));

  // 오늘/내일/모레 날씨 카드를 누르면 스크롤 대신 해당 탭으로 바로 전환.
  const onDatePress = useCallback((date: string) => {
    const tomorrowISO = toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const dayAfterTomorrowISO = toISODate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
    if (date === tomorrowISO) setActiveTab('tomorrow');
    else if (date === dayAfterTomorrowISO) setActiveTab('dayAfterTomorrow');
    else setActiveTab('today');
  }, []);

  // 가족 공유 카드는 지금 보고 있는 탭(오늘/내일/모레) 기준으로 내용을 만든다.
  const dayAfterTomorrowISO = useMemo(() => {
    const d = parseISODate(todayISO);
    d.setDate(d.getDate() + 2);
    return toISODate(d);
  }, [todayISO]);
  const activeDayEvents = useMemo(() => {
    if (activeTab === 'today') return upcoming.mainEvents;
    if (activeTab === 'tomorrow') return upcoming.secondaryEvents;
    return upcoming.laterGroups.find((g) => g.date === dayAfterTomorrowISO)?.events ?? [];
  }, [activeTab, upcoming, dayAfterTomorrowISO]);
  const activeDayLabel = activeTab === 'today' ? '오늘' : activeTab === 'tomorrow' ? '내일' : '모레';
  const activeDayISO = useMemo(() => {
    if (activeTab === 'today') return todayISO;
    if (activeTab === 'tomorrow') return tomorrowISO;
    return dayAfterTomorrowISO;
  }, [activeTab, todayISO, tomorrowISO, dayAfterTomorrowISO]);

  // Show ad popup once per app session when app is ready — never while the
  // app-lock screen is still up, since a native Modal always renders above it
  // regardless of z-index and would visually jump the ad in front of the
  // pattern/biometric prompt on cold start. Shown regardless of whether the
  // user has any events yet — a brand-new signup with zero events should
  // still see it, not just users who already have schedules.
  // hasAttemptedAdThisSession is a module-scope flag (not state) so AI scan
  // → Home remounts mid-session don't retrigger it; it only resets on a
  // genuine cold start.
  useEffect(() => {
    // subscriptionReady를 기다리지 않으면, 프리미엄 구독자도 콜드 스타트 직후 RevenueCat
    // 조회가 끝나기 전엔 isSubscribed가 잠깐 false라 광고 팝업이 떠버린다.
    // 홈 화면 튜토리얼이 떠 있는 동안엔 광고 팝업이 그 위를 덮어버리지 않도록 미룬다.
    if (hasAttemptedAdThisSession || !onboardingLoaded || !hasOnboarded || !googleAccount || isLocked || !subscriptionReady || isSubscribed || homeTutorialVisible) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (hasAttemptedAdThisSession) return;
      setAdPopupVisible(true);
      hasAttemptedAdThisSession = true;
    }, 500); // 0.5s delay for better UX

    return () => clearTimeout(timeoutId);
  }, [onboardingLoaded, hasOnboarded, googleAccount, isLocked, subscriptionReady, isSubscribed, homeTutorialVisible]);

  // 홈 화면 첫 진입 시 1회만(신규 가입자 대상) 4단계 코치마크 투어를 보여준다.
  // 이미 온보딩한 계정은 google-signin.tsx에서 로그인 시점에 시청 기록을
  // 미리 남겨두므로 여기서는 걸러지고, 신규 가입자에게만 자연스럽게 뜬다
  // (앱 삭제 후 재설치해도 다시 온보딩해야 하는 계정이 아니면 안 뜸).
  useEffect(() => {
    if (!onboardingLoaded || !hasOnboarded || !googleAccount || isLocked) return;
    let cancelled = false;
    hasSeenTutorial(HOME_TUTORIAL_KEY).then((seen) => {
      if (cancelled || seen) return;
      setTimeout(() => {
        if (!cancelled) setHomeTutorialVisible(true);
      }, 600);
    });
    return () => {
      cancelled = true;
    };
  }, [onboardingLoaded, hasOnboarded, googleAccount, isLocked]);

  // 설정 화면 "온보딩 다시 보기"로 들어온 경우: 시청 기록과 무관하게 즉시 투어를
  // 다시 띄운다. 한 번 처리한 뒤에는 파라미터를 지워서 이후 홈 재진입 시
  // 또 뜨지 않게 한다.
  useEffect(() => {
    if (replayTutorial !== '1' || !onboardingLoaded || !hasOnboarded || !googleAccount || isLocked) return;
    setHomeTutorialVisible(true);
    router.setParams({ replayTutorial: undefined });
  }, [replayTutorial, onboardingLoaded, hasOnboarded, googleAccount, isLocked, router]);

  // 개발/테스트용 숨은 진입점 — 삭제·재설치 없이 온보딩 튜토리얼을 바로 다시
  // 볼 수 있게, 프로필 영역의 "생후 N일째" 문구를 3번 연속 탭하면 실행된다.
  const handleDaysOldTripleTap = useCallback(() => {
    setHomeTutorialVisible(true);
    showToast('🎬 온보딩 튜토리얼을 다시 보여드릴게요.');
  }, [showToast]);

  const handleFinishHomeTutorial = useCallback(() => {
    setHomeTutorialVisible(false);
    markTutorialSeen(HOME_TUTORIAL_KEY).catch(() => {});
  }, []);

  // 프로필/캘린더/설정 아이콘은 스크롤 영역 밖(항상 보이는 고정 헤더)이라
  // 이 호출이 사실상 스크롤을 0으로 되돌리는 정도로만 작동하고, 급식/날씨/
  // 준비물/일정처럼 스크롤 안쪽에 있는 대상은 실제로 화면에 보이도록 스크롤해준다.
  const handleScrollTutorialTargetIntoView = useCallback(
    (targetRef: React.RefObject<View | null>, onWillScroll?: () => void) =>
      emptyContentRef.current?.scrollToTarget(targetRef, onWillScroll) ?? Promise.resolve({ scrolled: false, deltaY: 0 }),
    []
  );

  // 순서 고정: 프로필 → 캘린더 아이콘 → 설정 아이콘 → 오늘의 급식 → 오늘의 날씨
  // → 가방에 쏙쏙(카드 전체) → AI 스캔 버튼 → 앞으로의 모험. 화면에 위에서
  // 아래로 나오는 순서와 같게 맞춰뒀다.
  const homeTutorialSteps = useMemo<HomeTutorialStep[]>(() => [
    {
      key: 'profile',
      targetRef: profileSectionRef,
      title: '프로필 및 설정',
      description: '아이 이름을 누르면 다른 아이로 전환할 수 있고, 반 정보도 바로 확인할 수 있어요.',
    },
    {
      key: 'calendar-icon',
      targetRef: calendarIconRef,
      title: '캘린더',
      description: '전체 일정을 달력으로 한눈에 볼 수 있어요.',
    },
    {
      key: 'settings-icon',
      targetRef: settingsIconRef,
      title: '설정',
      description: '테마, 알림, 잠금화면 등 앱 설정을 관리할 수 있어요.',
    },
    {
      key: 'meal',
      targetRef: mealCardRef,
      title: '오늘의 급식',
      description: '우리 아이가 오늘 원에서 어떤 음식을 먹는지 바로 확인할 수 있어요.',
    },
    {
      key: 'weather',
      targetRef: weatherSectionRef,
      title: '오늘의 날씨',
      description: '오늘·내일·모레 날씨와 준비물 팁을 확인할 수 있어요. 우산이 필요한 날엔 미리 알려드려요.',
    },
    {
      key: 'prep',
      targetRef: prepSectionRef,
      title: '가방에 쏙쏙!',
      description: '알림장을 스캔하면 아이가 챙겨야 할 준비물이 이곳에 자동으로 정리돼요.',
    },
    {
      key: 'scan',
      targetRef: scanButtonRef,
      title: 'AI 준비물 스캐너',
      description: '복잡한 알림장은 이제 그만! AI가 알림장을 읽고 꼭 필요한 준비물만 요약해서 알려줍니다.',
      fullyRounded: true,
    },
    {
      key: 'schedule',
      targetRef: scheduleSectionRef,
      title: '앞으로의 모험',
      description: '내일, 모레처럼 다가오는 일정을 미리 확인할 수 있어요. 알림장을 스캔하면 자동으로 채워드려요!',
    },
  ], []);

  const handleEventPress = useCallback(
    (event: { date: string }) => router.push({ pathname: '/calendar', params: { date: event.date } }),
    [router]
  );

  if (!onboardingLoaded) {
    return null;
  }

  if (!hasOnboarded || !googleAccount) {
    return <Redirect href="/splash" />;
  }

  return (
    <ScreenBackground showDots={false}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <TomorrowWeatherAlert weatherDays={weather.days} weatherLoading={weather.loading} />
        <View ref={profileSectionRef} collapsable={false}>
          <HomeProfileBar
            selectedChild={selectedChild}
            onPressChild={() => setSwitcherOpen(true)}
            birthdayBurstKey={birthdayBurstKey}
            onDaysOldTripleTap={handleDaysOldTripleTap}
            calendarIconRef={calendarIconRef}
            settingsIconRef={settingsIconRef}
          />
        </View>
        {!isFamilyOwner && (
          <View style={styles.familyBannerWrap}>
            <LinearGradient
              colors={canEditFamilyData ? ['#34D399', '#10B981'] : ['#CBD5E1', '#94A3B8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.familyBanner}
            >
              <Text style={styles.familyBannerEmoji}>{canEditFamilyData ? '🙌' : '👀'}</Text>
              <Text style={[styles.familyBannerText, { color: '#FFFFFF' }]}>
                {canEditFamilyData ? '가족 구성원으로 참여 중' : '가족 구성원으로 보는 중 (읽기 전용)'}
              </Text>
            </LinearGradient>
          </View>
        )}
        {stickyVisible && (
          <StickyPrepBar
            total={todayProgress.total}
            checked={todayProgress.checked}
            percent={todayProgress.percent}
            onPress={scrollToProgress}
          />
        )}
        {upcoming.isEmpty ? (
          <HomeEmptyContent
            ref={emptyContentRef}
            selectedChild={selectedChild}
            onPressMeal={() => setMealSheetOpen(true)}
            weatherDays={weather.days}
            weatherLoading={weather.loading}
            locationLabel={weather.locationLabel}
            onPressDate={onDatePress}
            todayMeal={todayMeal}
            refreshing={refreshing}
            onRefresh={onRefresh}
            mealCardRef={mealCardRef}
            weatherSectionRef={weatherSectionRef}
            prepSectionRef={prepSectionRef}
            scanButtonRef={scanButtonRef}
            scheduleSectionRef={scheduleSectionRef}
          />
        ) : (
          <>
            <GestureDetector gesture={homeScrollGesture}>
              <Animated.ScrollView
                ref={scrollRef}
                style={styles.mainContainer}
                contentContainerStyle={[
                  styles.scrollContainer,
                  { paddingBottom: bottomStackHeight + insets.bottom + 16 + keyboardHeight },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                overScrollMode="never"
              >
              <Animated.View style={[styles.pullIndicator, pullIndicatorStyle]}>
                {refreshing ? (
                  <ActivityIndicator color={colors.gray400} />
                ) : (
                  <Animated.View style={pullArrowStyle}>
                    <Feather name="arrow-down" size={18} color={colors.gray400} />
                  </Animated.View>
                )}
              </Animated.View>
              <HomeHeroHeader
                selectedChild={selectedChild}
                onPressMeal={() => setMealSheetOpen(true)}
                weatherDays={weather.days}
                weatherLoading={weather.loading}
                locationLabel={weather.locationLabel}
                onPressDate={onDatePress}
                todayMeal={todayMeal}
                mealCardRef={mealCardRef}
                weatherSectionRef={weatherSectionRef}
              />
              {noticeEvents.length > 0 && (
                <NoticeBoardCard notices={noticeEvents} onPressNotice={handleEventPress} />
              )}
              {unlockedChildren.length > 1 && (
                <MultiChildPrepSummary
                  children={unlockedChildren}
                  events={events}
                  selectedChildId={selectedChild?.id}
                  onSelectChild={selectChild}
                />
              )}
              <View
                onLayout={(e) => {
                  progressYRef.current = e.nativeEvent.layout.y;
                  progressHeightRef.current = e.nativeEvent.layout.height;
                }}
              >
                <Pressable onPress={scrollToProgress} disabled={todayProgress.total === 0}>
                  <TodayPrepProgress
                    total={todayProgress.total}
                    checked={todayProgress.checked}
                    percent={todayProgress.percent}
                  />
                </Pressable>
              </View>
              <ScheduleBoard
                mainEvents={upcoming.mainEvents}
                secondaryEvents={upcoming.secondaryEvents}
                laterGroups={upcoming.laterGroups}
                activeTab={activeTab}
                onChangeTab={setActiveTab}
                onEventPress={handleEventPress}
                onToggleItem={handleToggleItem}
                onToggleAll={handleToggleAll}
                onSearchInputFocus={handleSearchInputFocus}
                onSearchInputBlur={handleSearchInputBlur}
              />
              </Animated.ScrollView>
            </GestureDetector>
          </>
        )}
      </SafeAreaView>

      <BirthdayCenterConfetti triggerKey={birthdayBurstKey} />

      <View
        style={[styles.bottomFixedStack, { bottom: insets.bottom }]}
        onLayout={(e) => setBottomStackHeight(e.nativeEvent.layout.height)}
      >
        {SHOW_FAMILY_SHARE_CARD && !upcoming.isEmpty && (
          <FamilyShareCard events={activeDayEvents} dayLabel={activeDayLabel} dateISO={activeDayISO} />
        )}
        {subscriptionReady && !isSubscribed && <CoupangBanner />}
      </View>

      <ChildSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <MealPlanSheet visible={mealSheetOpen} onClose={() => setMealSheetOpen(false)} />
      {!isLocked && subscriptionReady && !isSubscribed && <AdPopupModal visible={adPopupVisible} onClose={() => setAdPopupVisible(false)} />}

      <HomeTutorialOverlay
        visible={homeTutorialVisible}
        steps={homeTutorialSteps}
        onFinish={handleFinishHomeTutorial}
        scrollIntoView={handleScrollTutorialTargetIntoView}
      />
    </ScreenBackground>
  );
}
