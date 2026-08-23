import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
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

  // 달력 축소/확대 진행도(0=주간 1줄, 1=월간). 카드 드래그·리스트 드래그·아래로
  // 당겨 펼치기가 모두 이 값을 실시간으로 갱신하고, 손을 떼면 가까운 상태로
  // 스냅한다.
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
  // 새로고침 중에는 드래그로 인한 확대/축소 상태 변화를 막아 꿀렁임을 방지한다.
  // worklet에서 읽어야 해서 refreshing 상태를 shared value로 미러링해둔다.
  const refreshingShared = useSharedValue(false);
  useEffect(() => {
    refreshingShared.value = refreshing;
  }, [refreshing, refreshingShared]);

  const scrollY = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const DRAG_RANGE = 90; // 완전 축소↔확대 전환에 필요한 드래그 거리(px)
  const VELOCITY_THRESHOLD = 600; // px/s — 이 이상으로 튕기면 위치와 무관하게 그 방향으로 스냅

  const snapToNearest = (velocityY: number) => {
    'worklet';
    const target: 0 | 1 =
      Math.abs(velocityY) > VELOCITY_THRESHOLD
        ? velocityY < 0
          ? 0
          : 1
        : expandedProgress.value >= 0.5
        ? 1
        : 0;
    runOnJS(setExpanded)(target);
  };

  // 리스트 영역에서 위로 드래그하면(달력이 펼쳐진 동안) 스크롤 대신 달력
  // 높이를 직접 조절한다 — 펼쳐진 동안은 항상 네이티브 스크롤보다 우선한다
  // (아래 Gesture.Exclusive). 내용이 짧아 실제로 스크롤할 게 없는 날에도 동작에
  // 영향을 받지 않는다: 스크롤 오프셋과 무관하게 손가락 이동량만으로 판단한다.
  // 완전히 접힌 뒤에는 비활성화되어 네이티브 스크롤이 그대로 살아난다.
  // 아래 방향은 잡지 않는다: enabled인 동안 expandedProgress는 항상 이미 최댓값(1)이라
  // 아래로 당겨도 시각적으로는 아무 효과가 없는데, 손짓만 가로채면 그 아래
  // 네이티브 스크롤에 딸린 당겨서 새로고침(RefreshControl)이 아예 동작하지 않게 된다.
  const collapsePan = Gesture.Pan()
    .enabled(isExpanded)
    .activeOffsetY(-10)
    .failOffsetX([-15, 15])
    .onChange((e) => {
      if (refreshingShared.value) return;
      expandedProgress.value = Math.min(1, Math.max(0, expandedProgress.value + e.changeY / DRAG_RANGE));
    })
    .onEnd((e) => snapToNearest(e.velocityY));

  // 리스트가 완전히 접힌 상태에서만 켜진다. 스크롤 위치가 맨 위(0)일 때 아래로
  // 당기면 달력을 다시 펼친다. 네이티브 스크롤과 동시에 인식되어야 해서(맨 위에서
  // 더 당기는 동작은 네이티브 스크롤 관점에서는 그냥 정지해 있는 것과 같다)
  // Exclusive가 아니라 Simultaneous로 묶는다.
  const pulledThisGesture = useSharedValue(false);
  const pullExpandPan = Gesture.Pan()
    .enabled(!isExpanded)
    .activeOffsetY([-10, 10])
    .failOffsetX([-15, 15])
    .onChange((e) => {
      if (refreshingShared.value) return;
      if (scrollY.value > 0.5 || e.changeY <= 0) return;
      pulledThisGesture.value = true;
      expandedProgress.value = Math.min(1, Math.max(0, expandedProgress.value + e.changeY / DRAG_RANGE));
    })
    .onEnd((e) => {
      if (!pulledThisGesture.value) return;
      pulledThisGesture.value = false;
      snapToNearest(e.velocityY);
    });

  // 날짜 탭이나 좌우 스와이프로 selectedDate가 바뀌면 이전 날짜의 스크롤 위치가
  // 그대로 남아있었다. 새 날짜의 일정이 이전보다 짧으면(예: 일정 많은 날 → 적은
  // 날) 그 위치가 새 콘텐츠 범위를 벗어나 빈 여백만 보이고, 한 번 더 스크롤해야
  // 카드가 나타나는 문제가 있었다. 날짜가 바뀔 때마다 스크롤을 맨 위로 되돌린다.
  useLayoutEffect(() => {
    // 레이아웃이 갱신된 후 스크롤이 일어나도록 아주 짧은 지연을 준다.
    const timeoutId = setTimeout(() => {
      runOnUI(() => {
        'worklet';
        scrollTo(scrollRef, 0, 0, false);
      })();
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [selectedDate, scrollRef]);

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
  // collapsePan이 켜져 있는(펼쳐진) 동안은 Exclusive로 네이티브 스크롤보다 먼저
  // 손짓을 가로채 달력을 접는다. pullExpandPan은 접힌 동안 네이티브 스크롤과
  // 동시에 인식되어 "맨 위에서 더 당기면 펼치기"를 감지한다.
  const nativeScrollGesture = Gesture.Native();
  const listGesture = Gesture.Simultaneous(
    Gesture.Exclusive(collapsePan, nativeScrollGesture),
    pullExpandPan,
    Gesture.Race(swipeNextDayGesture, swipePrevDayGesture)
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
    <View style={styles.root}>
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
        />

        <GestureDetector gesture={listGesture}>
          <Animated.ScrollView
            ref={scrollRef}
            style={styles.scrollFlex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            overScrollMode="always"
            refreshControl={
              isExpanded ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={t.textSecondary}
                  colors={[t.textSecondary]}
                  progressBackgroundColor={t.cardWhite}
                />
              ) : undefined
            }
          >
            <DayDetailSection
              selectedDate={selectedDate}
              events={selectedDateEvents}
              todayISO={todayISO}
              onAddEvent={() => setAddEventVisible(true)}
              onPressEvent={setEditingEvent}
              onToggleItem={handleToggleItem}
              onOpenBuy={handleOpenBuy}
            />
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
