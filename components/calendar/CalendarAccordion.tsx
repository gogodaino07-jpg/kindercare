import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Text from '../common/AppText';
import { Event } from '../../types/models';
import { toISODate } from '../../utils/date';
import { calendarTheme as t } from './calendarTheme';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const ROW_HEIGHT = 46;
const DRAG_RANGE = 90; // px of drag needed to fully toggle
const DRAG_THRESHOLD = 18; // px

interface CalendarAccordionProps {
  monthCursor: Date;
  selectedDate: string;
  todayISO: string;
  eventsByDate: Map<string, Event[]>;
  onSelectDate: (iso: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  expandedProgress: SharedValue<number>;
  isExpanded: boolean;
  setExpanded: (target: 0 | 1) => void;
}

export default function CalendarAccordion({
  monthCursor,
  selectedDate,
  todayISO,
  eventsByDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  expandedProgress,
  isExpanded,
  setExpanded,
}: CalendarAccordionProps) {
  const cells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const list: (string | null)[] = [];
    for (let i = 0; i < startWeekday; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(toISODate(new Date(year, month, d)));
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [monthCursor]);

  const rows = Math.ceil(cells.length / 7);

  const selectedWeekIndex = useMemo(() => {
    const idx = cells.findIndex((c) => c === selectedDate);
    return idx === -1 ? 0 : Math.floor(idx / 7);
  }, [cells, selectedDate]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    height: interpolate(expandedProgress.value, [0, 1], [ROW_HEIGHT, rows * ROW_HEIGHT]),
  }), [rows]);

  const gridAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(expandedProgress.value, [0, 1], [-selectedWeekIndex * ROW_HEIGHT, 0]) },
    ],
  }), [selectedWeekIndex]);

  const collapsedHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandedProgress.value, [0, 1], [1, 0]),
  }));
  const expandedHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandedProgress.value, [0, 1], [0, 1]),
  }));

  const dragStart = useSharedValue(0);

  const applyDragUpdate = (translationY: number) => {
    'worklet';
    const delta = -translationY / DRAG_RANGE; // 위로 밀면(음수) 축소, 아래로 당기면 확대
    expandedProgress.value = Math.min(1, Math.max(0, dragStart.value + delta));
  };
  const applyDragEnd = (translationY: number) => {
    'worklet';
    let target: 0 | 1;
    if (Math.abs(translationY) > DRAG_THRESHOLD) {
      target = translationY < 0 ? 0 : 1;
    } else {
      target = dragStart.value > 0.5 ? 1 : 0;
    }
    runOnJS(setExpanded)(target);
  };

  // 힌트바(하단) 드래그 — 터치 영역이 시각적으로 작아 hitSlop으로 실제 인식
  // 범위를 넉넉하게 넓혀서 잡기 쉽게 한다.
  const dragGesture = Gesture.Pan()
    .hitSlop({ top: 16, bottom: 16, left: 24, right: 24 })
    .onStart(() => {
      dragStart.value = expandedProgress.value;
    })
    .onUpdate((e) => applyDragUpdate(e.translationY))
    .onEnd((e) => applyDragEnd(e.translationY));

  const tapGesture = Gesture.Tap()
    .hitSlop({ top: 16, bottom: 16, left: 24, right: 24 })
    .onEnd(() => {
      runOnJS(setExpanded)(isExpanded ? 0 : 1);
    });

  const hintGesture = Gesture.Race(dragGesture, tapGesture);

  const toggleBadge = () => setExpanded(isExpanded ? 0 : 1);

  // 요일 행/날짜 그리드 영역(예: 12일~19일 줄쯤)에서 위/아래로 스크롤(드래그)해도
  // 힌트바와 똑같이 축소/확대되도록 한다. failOffsetX로 가로 이동이 먼저 크면
  // 이 제스처는 실패시켜 월 스와이프(Fling)에 넘겨주고, activeOffsetY로 세로
  // 이동이 살짝만 있어도 활성화되지만 아주 작은 움직임(탭)은 그대로
  // 날짜 셀의 onPress로 전달되게 한다.
  const gridDragGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-15, 15])
    .onStart(() => {
      dragStart.value = expandedProgress.value;
    })
    .onUpdate((e) => applyDragUpdate(e.translationY))
    .onEnd((e) => applyDragEnd(e.translationY));

  // 요일 행/날짜 그리드 영역에서 좌우로 스와이프하면 이전/다음 달로 이동한다.
  const swipeLeftGesture = Gesture.Fling()
    .direction(Directions.LEFT)
    .onStart(() => {
      runOnJS(onNextMonth)();
    });
  const swipeRightGesture = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onStart(() => {
      runOnJS(onPrevMonth)();
    });
  const monthSwipeGesture = Gesture.Race(swipeLeftGesture, swipeRightGesture, gridDragGesture);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.monthNav}>
          <Pressable style={styles.arrowButton} onPress={onPrevMonth} hitSlop={6}>
            <MaterialCommunityIcons name="chevron-left" size={18} color={t.textSecondary} />
          </Pressable>
          <Text style={styles.monthText}>
            {monthCursor.getFullYear()}년 {monthCursor.getMonth() + 1}월
          </Text>
          <Pressable style={styles.arrowButton} onPress={onNextMonth} hitSlop={6}>
            <MaterialCommunityIcons name="chevron-right" size={18} color={t.textSecondary} />
          </Pressable>
        </View>

        <Pressable style={styles.toggleBadge} onPress={toggleBadge}>
          <Text style={styles.toggleBadgeText}>{isExpanded ? '월간 보기' : '주간 1줄'}</Text>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={t.textSecondary}
          />
        </Pressable>
      </View>

      <GestureDetector gesture={monthSwipeGesture}>
        <View>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day, idx) => (
              <Text
                key={day}
                style={[
                  styles.weekdayText,
                  idx === 0 && styles.sunday,
                  idx === 6 && styles.saturday,
                ]}
              >
                {day}
              </Text>
            ))}
          </View>

          <Animated.View style={[styles.gridContainer, containerAnimatedStyle]}>
            <Animated.View style={gridAnimatedStyle}>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <WeekRow
                  key={rowIndex}
                  rowIndex={rowIndex}
                  isSelectedRow={rowIndex === selectedWeekIndex}
                  expandedProgress={expandedProgress}
                  days={cells.slice(rowIndex * 7, rowIndex * 7 + 7)}
                  selectedDate={selectedDate}
                  todayISO={todayISO}
                  eventsByDate={eventsByDate}
                  onSelectDate={onSelectDate}
                />
              ))}
            </Animated.View>
          </Animated.View>
        </View>
      </GestureDetector>

      <GestureDetector gesture={hintGesture}>
        <View style={styles.hintArea}>
          <View style={styles.hintBar} />
          <View style={styles.hintTextStack}>
            <Animated.Text style={[styles.hintText, collapsedHintStyle, styles.hintTextAbsolute]}>
              터치하여 전체 달력 펼치기 ▾
            </Animated.Text>
            <Animated.Text style={[styles.hintText, expandedHintStyle, styles.hintTextAbsolute]}>
              터치 또는 위로 밀어서 축소 ▴
            </Animated.Text>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

function computeDday(dateISO: string, todayISO: string): number {
  const a = new Date(dateISO + 'T00:00:00');
  const b = new Date(todayISO + 'T00:00:00');
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function WeekRow({
  rowIndex,
  isSelectedRow,
  expandedProgress,
  days,
  selectedDate,
  todayISO,
  eventsByDate,
  onSelectDate,
}: {
  rowIndex: number;
  isSelectedRow: boolean;
  expandedProgress: SharedValue<number>;
  days: (string | null)[];
  selectedDate: string;
  todayISO: string;
  eventsByDate: Map<string, Event[]>;
  onSelectDate: (iso: string) => void;
}) {
  const rowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandedProgress.value, [0, 1], [isSelectedRow ? 1 : 0, 1]),
  }), [isSelectedRow]);

  return (
    <Animated.View style={[styles.weekRow, rowAnimatedStyle]}>
      {days.map((iso, colIndex) => {
        if (!iso) return <View key={`pad-${rowIndex}-${colIndex}`} style={styles.dayCellContainer} />;

        const isSelected = iso === selectedDate;
        const isToday = iso === todayISO;
        const dayNum = Number(iso.split('-')[2]);
        const dayEvents = eventsByDate.get(iso) ?? [];
        const hasEvents = dayEvents.length > 0;
        const diff = computeDday(iso, todayISO);
        const showBadge = diff === 0 || (diff > 0 && hasEvents);
        const badgeLabel = diff === 0 ? 'D-DAY' : `D+${diff}`;

        return (
          <Pressable
            key={iso}
            style={styles.dayCellContainer}
            onPress={() => onSelectDate(iso)}
          >
            <View
              style={[
                styles.dayCell,
                isToday && !isSelected && styles.dayCellToday,
                isSelected && styles.dayCellSelected,
              ]}
            >
              <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>{dayNum}</Text>
            </View>
            {hasEvents && (
              <View style={[styles.dot, { backgroundColor: isSelected ? '#000000' : t.emerald }]} />
            )}
            {showBadge && (
              <View style={[styles.ddayBadge, { backgroundColor: isSelected ? '#000000' : t.rose }]}>
                <Text style={styles.ddayBadgeText}>{badgeLabel}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const CELL_SIZE = 27;

const styles = StyleSheet.create({
  card: {
    backgroundColor: t.cardWhite,
    borderRadius: 22,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: t.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 14,
    fontWeight: '800',
    color: t.textPrimary,
    marginHorizontal: 5,
  },
  toggleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: t.gray100,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  toggleBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: t.textSecondary,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: t.textSecondary,
  },
  sunday: {
    color: t.rose,
  },
  saturday: {
    color: '#3B82F6',
  },
  gridContainer: {
    overflow: 'hidden',
  },
  weekRow: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
  },
  dayCellContainer: {
    width: `${100 / 7}%`,
    height: ROW_HEIGHT,
    alignItems: 'center',
    paddingTop: 3,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.cardWhite,
    borderWidth: 1,
    borderColor: t.border,
  },
  dayCellToday: {
    backgroundColor: t.amberBgSoft,
    borderColor: t.amber,
  },
  dayCellSelected: {
    backgroundColor: t.amber,
    borderColor: t.amber,
    transform: [{ scale: 1.08 }],
    shadowColor: t.amberDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  dayNumber: {
    fontSize: 11.5,
    fontWeight: '600',
    color: t.textPrimary,
  },
  dayNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  ddayBadge: {
    borderRadius: 5,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginTop: 1,
  },
  ddayBadgeText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  hintArea: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  hintBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.gray200,
    marginBottom: 6,
  },
  hintTextStack: {
    height: 14,
  },
  hintText: {
    fontSize: 11,
    fontWeight: '600',
    color: t.textMuted,
  },
  hintTextAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
});
