import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  runOnUI,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AddEventModal from '../components/calendar/AddEventModal';
import BuyModal from '../components/calendar/BuyModal';
import CalendarAccordion from '../components/calendar/CalendarAccordion';
import { calendarTheme as t } from '../components/calendar/calendarTheme';
import CalendarHeader from '../components/calendar/CalendarHeader';
import DayDetailSection from '../components/calendar/DayDetailSection';
import EditEventModal from '../components/calendar/EditEventModal';
import Text from '../components/common/AppText';
import { useAppData } from '../context/AppDataContext';
import { getDisplayItems } from '../hooks/useLocalChecklist';
import { Event, EventItem } from '../types/models';
import { parseISODate, toISODate } from '../utils/date';

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const { events, selectedChild, updateEvent } = useAppData();

  const todayISO = useMemo(() => toISODate(new Date()), []);
  // 홈 화면에서 특정 날짜의 일정을 탭해서 들어온 경우, 그 날짜에 포커스한 채로 시작한다.
  const initialDate = useMemo(
    () => (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayISO),
    [dateParam, todayISO]
  );

  const [monthCursor, setMonthCursor] = useState(() => {
    const base = parseISODate(initialDate);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  const [addEventVisible, setAddEventVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [buyState, setBuyState] = useState<{ event: Event; item: EventItem } | null>(null);

  // 달력 축소/확대 진행도(0=주간 1줄, 1=월간). 힌트바 탭·드래그와 아래
  // 상세 리스트 스크롤 둘 다 이 값을 갱신한다.
  const expandedProgress = useSharedValue(1);
  const [isExpanded, setIsExpandedState] = useState(true);

  const setExpanded = useCallback((target: 0 | 1) => {
    setIsExpandedState(target === 1);
    expandedProgress.value = withTiming(target, { duration: 300, easing: Easing.inOut(Easing.ease) });
  }, [expandedProgress]);

  // 일정/급식 데이터는 Firestore 실시간 리스너로 항상 최신 상태라 새로고침이
  // 별도로 다시 받아올 데이터는 없지만, 홈 화면과 동일하게 당겨서 새로고침
  // 동작은 제공해 "최신 상태 맞음"을 눈으로 확인시켜준다. 접힌 상태에서는
  // 같은 위쪽 당김 제스처가 미니 캘린더 펼치기와 겹치므로, 펼쳐진 상태에서만 켠다.
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  // 접힌 상태에서만 목록 맨 위에 붙는 빈 스페이서 높이. 안드로이드 기본 ScrollView는
  // 맨 위에서 바운스(음수 오프셋)를 주지 않아, 예전엔 ScrollView와 동시에 실행되는
  // 별도 Pan 제스처로 "더 당긴 양"을 흉내 냈었다. 그런데 네이티브 스크롤이 터치를
  // 이미 점유한 상태라 그 Pan 제스처가 터치를 온전히 받지 못해 자주 씹혔다(펼쳐지지
  // 않음). 대신 스페이서로 진짜 스크롤 가능한 여유 공간을 만들어두면, 아래로 당길 때
  // 실제 스크롤 오프셋이 움직이므로 onScroll만으로 안정적으로 감지할 수 있다.
  const EXPAND_PULL_ZONE = 70;
  const EXPAND_PULL_THRESHOLD = 10;
  // 펼쳐진 상태에서 일정이 1개뿐이라 스크롤이 필요 없을 만큼 내용이 짧으면, 실제로
  // 스크롤할 여지가 없어 위로 스와이프해도 아무 반응이 없었다(축소가 안 됨). 화면
  // 전체 높이(rootHeight)보다 이만큼 더 큰 minHeight를 항상 보장해서, 내용 길이와
  // 무관하게 위로 스와이프하면 언제나 진짜 스크롤이 발생하도록 한다.
  // rootHeight는 ScrollView 자신이 아니라 최상위 루트 View에서 한 번만 측정한다.
  // ScrollView 자신의 높이로 측정하면 아코디언이 펼쳐지고 접힐 때마다(300ms 애니메이션
  // 동안 매 프레임) onLayout이 다시 불려서 화면 전체가 계속 리렌더링되어 스크롤이
  // 버벅였다 — 루트 View의 높이는 아코디언 내부 배분과 무관하게 항상 고정이라
  // 회전 등으로만 바뀌므로 이 문제가 없다.
  const COLLAPSE_SWIPE_BUFFER = 80;
  const [rootHeight, setRootHeight] = useState(0);
  // 일정이 없는 날의 "일정 없음" 카드처럼 내부에서 flex:1로 화면을 꽉 채우는
  // 콘텐츠는, 위 버퍼가 더해진 늘어난 전체 높이 기준으로 다시 가운데 정렬되면
  // 화면 밖으로 밀려난다. 그래서 그 카드를 감싸는 안쪽 래퍼는 실제 목록 영역
  // 높이에 훨씬 못 미치는(헤더+달력 카드가 차지하는 공간을 넉넉히 뺀) 값으로만
  // minHeight를 줘서, 늘어난 전체 높이가 아니라 화면에 보이는 범위 안에서만
  // 가운데 정렬되게 한다. 픽셀 단위로 정확할 필요는 없고, 실제 목록 영역보다
  // 작기만 하면 되므로 넉넉히 뺀 고정값을 쓴다.
  const HEADER_AND_ACCORDION_ESTIMATE = 500;

  const scrollY = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  // 달력 그리드·힌트바처럼 ScrollView 바깥 영역에서 시작한 세로 드래그를 그대로
  // 아래 일정 목록 스크롤로 이어준다. 0 밑으로는 절대 내려가지 않게 막아서(음수 방지),
  // 이 경로로는 "맨 위에서 더 당기면 확대" 트리거가 걸리지 않게 한다 — 목록을 아무리
  // 밑으로(끝까지) 스크롤해도 그 자체로 달력이 갑자기 펼쳐지는 일은 없다.
  const forwardScrollDelta = (deltaY: number) => {
    'worklet';
    const next = Math.max(0, scrollY.value - deltaY);
    scrollTo(scrollRef, 0, next, false);
  };

  // 위로 스와이프해 축소를 트리거한 바로 그 손짓인지 표시해둔다. scrollEnabled를
  // 손짓 도중에 꺼서 목록을 못 움직이게 막아보려 했었는데, 그러면 네이티브
  // ScrollView가 그 손짓을 더 이상 드래그로 취급하지 않아 onEndDrag 자체가 안
  // 불려서 스크롤이 계속 잠긴 채로 남는 문제가 있었다. 그래서 스크롤 자체는
  // 막지 않고, 대신 이 손짓이 끝나는 순간(onEndDrag)에 맨 위로 스냅백시켜서
  // "달력만 접히고 첫 일정은 그대로 보인다"는 결과만 보장한다.
  const collapsedThisGesture = useSharedValue(false);

  // 스크롤이 완전히 멈춘 뒤에만 스냅백 여부를 판단한다 — onEndDrag(손을 뗀 시점)에서
  // 판단하면 아직 관성(fling)으로 계속 움직이는 중일 수 있는데, 그 시점 오프셋만 보고
  // 스냅백을 걸면 관성 스크롤이 확대 문턱까지 도달하기 전에 강제로 멈춰버려 "빠르게
  // 쓸어올리면 확대되어야 하는" 케이스가 씹히는 문제가 있었다.
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      scrollY.value = y;
      if (expandedProgress.value > 0.5) {
        if (y > 20) {
          runOnJS(setExpanded)(0);
          collapsedThisGesture.value = true;
        }
      } else if (y <= EXPAND_PULL_ZONE - EXPAND_PULL_THRESHOLD) {
        runOnJS(setExpanded)(1);
      }
    },
    onEndDrag: () => {
      if (collapsedThisGesture.value) {
        collapsedThisGesture.value = false;
        scrollTo(scrollRef, 0, EXPAND_PULL_ZONE, true);
      }
    },
    onMomentumEnd: (event) => {
      const y = event.contentOffset.y;
      if (expandedProgress.value < 0.5 && y > EXPAND_PULL_ZONE - EXPAND_PULL_THRESHOLD && y < EXPAND_PULL_ZONE) {
        scrollTo(scrollRef, 0, EXPAND_PULL_ZONE, true);
      }
    },
  });

  // isExpanded가 바뀌어 스페이서(EXPAND_PULL_ZONE)가 새로 생기거나 사라질 때 스크롤
  // 오프셋을 보정해준다. 접힐 때는 항상 "스페이서만 가려진 맨 위"(EXPAND_PULL_ZONE)로
  // 고정해서, 위로 스와이프해 달력이 축소되는 순간 첫 번째 일정이 스크롤에 가려지지
  // 않고 항상 그대로 보이게 한다 — 달력만 접히고 목록 자체는 스크롤되지 않은 것처럼
  // 느껴지게 하려는 것. (펼칠 때는 반대로, 당겨서 열었던 위치 기준으로 스페이서만큼
  // 빼서 자연스럽게 이어지게 한다.)
  useLayoutEffect(() => {
    runOnUI((expand: boolean) => {
      'worklet';
      const next = expand ? Math.max(0, scrollY.value - EXPAND_PULL_ZONE) : EXPAND_PULL_ZONE;
      scrollTo(scrollRef, 0, next, false);
    })(isExpanded);
  }, [isExpanded, scrollRef, scrollY]);

  // 달력 그리드(월간 뷰) 영역에서 위/아래로 스와이프하면 아래 일정 목록이 그대로
  // 스크롤된다 — 화면 전체가 하나로 이어진 스크롤 영역처럼 느껴지게 한다.
  const gridForwardScrollGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-15, 15])
    .onChange((e) => {
      forwardScrollDelta(e.changeY);
    });

  const childEvents = useMemo(
    () => events.filter((e) => e.childId === selectedChild?.id),
    [events, selectedChild]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of childEvents) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [childEvents]);

  const selectedDateEvents = eventsByDate.get(selectedDate) ?? [];

  const percent = useMemo(() => {
    const items = selectedDateEvents.flatMap((e) => getDisplayItems(e));
    const completed = items.filter((i) => i.completed).length;
    return selectedDateEvents.length === 0 ? 0 : items.length === 0 ? 100 : Math.round((completed / items.length) * 100);
  }, [selectedDateEvents]);

  const selectedDateLabel = selectedDate === todayISO ? '오늘' : selectedDate.replace(/-/g, '.');

  const goToMonth = useCallback((cursor: Date) => {
    setMonthCursor(cursor);
    const now = new Date();
    if (now.getFullYear() === cursor.getFullYear() && now.getMonth() === cursor.getMonth()) {
      setSelectedDate(todayISO);
    } else {
      setSelectedDate(toISODate(new Date(cursor.getFullYear(), cursor.getMonth(), 1)));
    }
  }, [todayISO]);

  const onPrevMonth = useCallback(
    () => goToMonth(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1)),
    [monthCursor, goToMonth]
  );
  const onNextMonth = useCallback(
    () => goToMonth(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)),
    [monthCursor, goToMonth]
  );

  const onPressToday = useCallback(() => {
    const now = new Date();
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayISO);
  }, [todayISO]);

  // 일정 목록 영역에서 좌우로 스와이프하면 선택된 날짜가 하루씩 이동한다.
  // 이동한 날짜가 현재 보여주는 달을 벗어나면 달력도 함께 그 달로 넘어간다.
  const changeSelectedDate = useCallback((deltaDays: number) => {
    const base = parseISODate(selectedDate);
    const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + deltaDays);
    setSelectedDate(toISODate(next));
    if (next.getFullYear() !== monthCursor.getFullYear() || next.getMonth() !== monthCursor.getMonth()) {
      setMonthCursor(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  }, [selectedDate, monthCursor]);

  const swipeNextDayGesture = Gesture.Fling()
    .direction(Directions.LEFT)
    .onStart(() => {
      runOnJS(changeSelectedDate)(1);
    });
  const swipePrevDayGesture = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onStart(() => {
      runOnJS(changeSelectedDate)(-1);
    });
  // ScrollView를 GestureDetector로 감쌀 때 네이티브 스크롤 제스처(Gesture.Native)를
  // 함께 묶어주지 않으면 세로 스크롤 자체가 먹통이 되므로 항상 같이 묶는다.
  const nativeScrollGesture = Gesture.Native();
  const daySwipeGesture = Gesture.Simultaneous(
    Gesture.Race(swipeNextDayGesture, swipePrevDayGesture),
    nativeScrollGesture
  );

  const setItemCompleted = useCallback((event: Event, item: EventItem, completed: boolean) => {
    const nextItems = getDisplayItems(event).map((i) => (i.id === item.id ? { ...i, completed } : i));
    updateEvent(event.id, { items: nextItems, note: nextItems.map((i) => i.name).join('\n') });
  }, [updateEvent]);

  const handleToggleItem = useCallback(
    (event: Event, item: EventItem) => setItemCompleted(event, item, !item.completed),
    [setItemCompleted]
  );

  const handleOpenBuy = useCallback((event: Event, item: EventItem) => {
    setBuyState({ event, item });
  }, []);

  const handleMarkOrdered = useCallback(() => {
    if (!buyState) return;
    setItemCompleted(buyState.event, buyState.item, true);
  }, [buyState, setItemCompleted]);

  return (
    <View style={styles.root} onLayout={(e) => setRootHeight(e.nativeEvent.layout.height)}>
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />

        <CalendarHeader
          childName={selectedChild?.name ?? '우리 아이'}
          age={selectedChild?.age}
          className={selectedChild?.className}
          photoUri={selectedChild?.photoUri}
          percent={percent}
          selectedDateLabel={selectedDateLabel}
          onBack={() => router.back()}
        />

        <CalendarAccordion
          monthCursor={monthCursor}
          selectedDate={selectedDate}
          todayISO={todayISO}
          eventsByDate={eventsByDate}
          onSelectDate={setSelectedDate}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
          expandedProgress={expandedProgress}
          isExpanded={isExpanded}
          setExpanded={setExpanded}
          onOpenAddEvent={() => setAddEventVisible(true)}
          gridScrollGesture={gridForwardScrollGesture}
          onForwardScroll={forwardScrollDelta}
        />

        <GestureDetector gesture={daySwipeGesture}>
          <Animated.ScrollView
            ref={scrollRef}
            style={styles.scrollFlex}
            contentContainerStyle={[
              styles.scrollContent,
              rootHeight ? { minHeight: rootHeight + COLLAPSE_SWIPE_BUFFER } : null,
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            overScrollMode="always"
            refreshControl={
              isExpanded ? (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.textSecondary} />
              ) : undefined
            }
          >
            <View
              style={
                rootHeight
                  ? { minHeight: Math.max(200, rootHeight - HEADER_AND_ACCORDION_ESTIMATE) }
                  : styles.scrollInnerFallback
              }
            >
              {!isExpanded && <View style={{ height: EXPAND_PULL_ZONE }} />}
              <DayDetailSection
                selectedDate={selectedDate}
                events={selectedDateEvents}
                todayISO={todayISO}
                onAddEvent={() => setAddEventVisible(true)}
                onPressEvent={setEditingEvent}
                onToggleItem={handleToggleItem}
                onOpenBuy={handleOpenBuy}
              />
            </View>
            <View style={{ height: COLLAPSE_SWIPE_BUFFER }} />
          </Animated.ScrollView>
        </GestureDetector>
      </SafeAreaView>

      <View pointerEvents="box-none" style={[styles.todayFloatingWrap, { bottom: 20 + insets.bottom }]}>
        <Pressable style={styles.todayFloatingButton} onPress={onPressToday}>
          <Text style={styles.todayFloatingButtonText}>오늘</Text>
        </Pressable>
      </View>

      <BuyModal
        visible={!!buyState}
        itemName={buyState?.item.name ?? null}
        onClose={() => setBuyState(null)}
        onMarkOrdered={handleMarkOrdered}
      />
      <AddEventModal
        visible={addEventVisible}
        initialDateISO={selectedDate}
        onClose={() => setAddEventVisible(false)}
      />
      <EditEventModal
        visible={!!editingEvent}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: t.bg,
  },
  safeArea: {
    flex: 1,
  },
  scrollFlex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  scrollInnerFallback: {
    flex: 1,
  },
  todayFloatingWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  todayFloatingButton: {
    backgroundColor: t.skyBg,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  todayFloatingButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: t.sky,
  },
});
