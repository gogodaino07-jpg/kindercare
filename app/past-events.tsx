import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import BlackboardModal from '../components/home/BlackboardModal';
import ScreenBackground from '../components/ScreenBackground';
import Text from '../components/common/AppText';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useNotificationCenter } from '../context/NotificationCenterContext';
import { useThemeColors } from '../context/ThemeContext';
import { Event } from '../types/models';
import { formatMD, isPast, parseISODate, toISODate } from '../utils/date';

function dateGroupLabel(isoDate: string): string {
  const date = parseISODate(isoDate);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekday})`;
}

export default function PastEventsScreen() {
  const { events, selectedChild, deleteEvents, addEvent } = useAppData();
  const { showAlert } = useAlert();
  const { addNotification } = useNotificationCenter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  const pastEvents = useMemo(
    () =>
      events
        .filter((e) => e.childId === selectedChild?.id && isPast(e.date))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [events, selectedChild]
  );

  // Grouped by exact date (not month) and kept in the same date-descending
  // order as `pastEvents` above.
  const groups = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of pastEvents) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return Array.from(map.entries());
  }, [pastEvents]);

  const exitEditMode = () => {
    setEditMode(false);
    setSelectedIds(new Set());
  };

  // Hardware back while in edit mode exits edit mode instead of leaving the
  // screen — returning true stops propagation before _layout.tsx's
  // app-wide back handler ever sees the press.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (editMode) {
        exitEditMode();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [editMode]);

  const toggleSelected = (eventId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const allSelected = editMode && pastEvents.length > 0 && selectedIds.size === pastEvents.length;

  const handleHeaderButtonPress = () => {
    if (!editMode) {
      setEditMode(true);
      return;
    }
    setSelectedIds(allSelected ? new Set() : new Set(pastEvents.map((e) => e.id)));
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    showAlert({
      title: '선택 일정 삭제',
      message: `선택한 ${selectedIds.size}개의 일정을 삭제하시겠습니까?`,
      buttons: [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            deleteEvents(Array.from(selectedIds));
            exitEditMode();
          },
        },
      ],
    });
  };

  const handleCardPress = (event: Event) => {
    if (editMode) {
      toggleSelected(event.id);
      return;
    }
    setSelectedEventId(event.id);
  };

  const handleTestNotification = async () => {
    addNotification({
      title: '🕰️ 지난 일정 알림 테스트',
      body: '지난 일정도 알림으로 꼼꼼하게 챙겨보세요!',
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (selectedChild) {
      console.log('🧪 Triggering test event addition...');
      // addEvent is not async in the interface, but it calls pushEventToCloud internally.
      // We can't await it here unless we change the interface.
      // But we can add a log to see it happening.
      addEvent({
        date: toISODate(yesterday),
        title: '🧪 알림 테스트용 일정',
        note: '테스트용 준비물',
        childId: selectedChild.id,
        source: 'manual',
        icon: '🧪',
      });
    }

    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '킨더케어 지난 일정 테스트',
          body: '지난 일정 화면에서 보낸 테스트 알림입니다.',
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('Failed to fire test notification:', e);
    }
  };

  return (
    <ScreenBackground>
      <Stack.Screen
        options={{
          headerLeft: editMode
            ? () => (
                <Pressable onPress={exitEditMode} hitSlop={8} accessibilityLabel="편집 모드 종료">
                  <Text style={styles.headerBackIcon}>‹</Text>
                </Pressable>
              )
            : undefined,
          headerRight: editMode
            ? () => (
                <Pressable onPress={exitEditMode} hitSlop={8}>
                  <Text style={styles.headerCancelText}>취소</Text>
                </Pressable>
              )
            : () => (
                <Pressable
                  style={styles.iconButton}
                  onPress={handleTestNotification}
                  accessibilityLabel="알림 테스트"
                  hitSlop={8}
                >
                  <Text style={styles.headerIcon}>🧪</Text>
                </Pressable>
              ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            groups.length === 0 && { flexGrow: 1, justifyContent: 'center' },
            editMode && { paddingBottom: 96 + insets.bottom },
          ]}
        >
          {groups.length === 0 ? (
            <Text style={styles.emptyText}>지난 일정이 없어요</Text>
          ) : (
            groups.map(([date, dateEvents], groupIdx) => (
              <View key={date} style={styles.dateGroup}>
                <View style={styles.dateHeaderRow}>
                  <Text style={styles.dateLabel}>{dateGroupLabel(date)}</Text>
                  {groupIdx === 0 ? (
                    <Pressable onPress={handleHeaderButtonPress} hitSlop={8}>
                      <Text style={styles.selectButtonText}>
                        {!editMode ? '선택' : allSelected ? '선택해제' : '모두선택'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                {dateEvents.map((event) => {
                  const selected = selectedIds.has(event.id);
                  return (
                    <Pressable
                      key={event.id}
                      style={styles.card}
                      onPress={() => handleCardPress(event)}
                    >
                      <View style={styles.dateBadge}>
                        <Text style={styles.dateBadgeText}>{formatMD(event.date)}</Text>
                      </View>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {event.icon ? `${event.icon} ` : ''}
                        {event.title}
                      </Text>
                      {editMode ? (
                        <View style={[styles.radio, selected && styles.radioSelected]}>
                          {selected ? <Text style={styles.radioMark}>✓</Text> : null}
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {editMode ? (
        <View style={[styles.bottomBarWrap, { bottom: 24 + insets.bottom }]}>
          <Pressable
            style={[styles.bottomBar, selectedIds.size === 0 && styles.bottomBarDisabled]}
            onPress={handleDeleteSelected}
            disabled={selectedIds.size === 0}
          >
            <Text style={styles.bottomBarText}>선택한 {selectedIds.size}개 삭제</Text>
          </Pressable>
        </View>
      ) : null}

      <BlackboardModal
        event={selectedEvent}
        onClose={() => setSelectedEventId(null)}
        readOnly
      />
    </ScreenBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: { padding: 20 },
    headerBackIcon: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.textPrimary,
      marginLeft: 4,
    },
    headerCancelText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginRight: 4,
    },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIcon: {
      fontSize: 22,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textSecondary,
    },
    dateGroup: { marginBottom: 18 },
    dateHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    dateLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    selectButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardWhite,
      borderRadius: 14,
      padding: 12,
      marginBottom: 8,
      ...SHADOW,
    },
    dateBadge: {
      backgroundColor: colors.gray100,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginRight: 10,
    },
    dateBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    cardTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
    radioSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    radioMark: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.cardWhite,
    },
    bottomBarWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      paddingHorizontal: 20,
    },
    bottomBar: {
      backgroundColor: colors.gray900,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      ...SHADOW,
    },
    bottomBarDisabled: {
      opacity: 0.4,
    },
    bottomBarText: {
      color: colors.cardWhite,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
