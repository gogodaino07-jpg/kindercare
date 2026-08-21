import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
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

  // "맨 위 도달"만으로 바로 확대되지 않도록, 맨 위에 도착한 뒤 한 번 더
  // 의도적으로 당기는 제스처(약 18px 이상)가 있을 때만 확대한다.
  const PULL_TO_EXPAND_THRESHOLD = 18;
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    const y = event.contentOffset.y;
    scrollY.value = y;
    if (y > 20 && expandedProgress.value > 0.5) {
      runOnJS(setExpanded)(0);
    } else if (
      Platform.OS === 'ios' &&
      y <= -PULL_TO_EXPAND_THRESHOLD &&
      expandedProgress.value < 0.5
    ) {
      // iOS: 맨 위에서 더 당기면 ScrollView가 자체 바운스로 음수 오프셋을 보고해준다.
      runOnJS(setExpanded)(1);
    }
  });

  // Android: 기본 ScrollView는 맨 위에서 바운스(음수 오프셋)를 주지 않으므로,
  // 같은 터치를 관찰하는 Pan 제스처를 ScrollView와 동시에 실행해 "맨 위에
  // 도달한 뒤 추가로 당긴 양"을 직접 측정해서 확대를 트리거한다.
  // 이미 펼쳐진 상태에서는 이 제스처가 할 일이 없을 뿐 아니라, 계속 살아있으면
  // 당겨서 새로고침(RefreshControl)이나 위로 스크롤하는 제스처와 인식 우선순위를
  // 다투면서 새로고침이 안 먹히거나 스크롤이 버벅이는 원인이 되어, 접힌 상태에서만 켠다.
  const nativeScrollGesture = Gesture.Native();
  const pullReferenceY = useSharedValue<number | null>(null);
  const pullToExpandGesture = Gesture.Pan()
    .enabled(Platform.OS === 'android' && !isExpanded)
    .activeOffsetY(15)
    .failOffsetY(-10)
    .simultaneousWithExternalGesture(nativeScrollGesture)
    .onUpdate((e) => {
      if (scrollY.value > 2) {
        pullReferenceY.value = null;
        return;
      }
      if (pullReferenceY.value === null) {
        pullReferenceY.value = e.translationY;
      }
      const pulled = e.translationY - pullReferenceY.value;
      if (pulled > PULL_TO_EXPAND_THRESHOLD && expandedProgress.value < 0.5) {
        runOnJS(setExpanded)(1);
      }
    })
    .onEnd(() => {
      pullReferenceY.value = null;
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

        <GestureDetector gesture={Gesture.Simultaneous(pullToExpandGesture, nativeScrollGesture)}>
          <Animated.ScrollView
            style={styles.scrollFlex}
            contentContainerStyle={styles.scrollContent}
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
