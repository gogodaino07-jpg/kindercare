import { useRouter, useNavigation } from 'expo-router';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/common/AppText';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useAlert } from '../context/AlertContext';
import { useNotificationCenter } from '../context/NotificationCenterContext';
import { useThemeColors } from '../context/ThemeContext';
import { generateMockAIEvents } from '../data/mockAIResult';
import { formatMD, parseISODate, startOfDay, toISODate } from '../utils/date';
import { AnalysisResultStore, AnalysisLogService } from '../features/newsletter-analysis';
import { AIReviewEventItem } from '../features/newsletter-analysis/components/AIReviewEventItem';
import { AIReviewBottomSheet } from '../features/newsletter-analysis/components/AIReviewBottomSheet';
import { ZoomableImage } from '../features/newsletter-analysis/components/ZoomableImage';
import { DraftEvent } from '../features/newsletter-analysis/types';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const MIN_SHEET_HEIGHT = SCREEN_HEIGHT * 0.4;
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

function isImminent(isoDate: string): boolean {
  const diffMs = parseISODate(isoDate).getTime() - startOfDay(new Date()).getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return diffDays <= 2;
}

export default function AIReviewScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { children, selectedChild, addEvents } = useAppData();
  const { showAlert } = useAlert();
  const { addNotification } = useNotificationCenter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const session = useMemo(() => AnalysisResultStore.getSession(), []);
  const originalEvents = useMemo(() => session?.initialEvents ?? [], [session]);
  const docs = useMemo(() => session?.docs ?? [], [session]);

  const [draftEvents, setDraftEvents] = useState<DraftEvent[]>(() => {
    const source = originalEvents.length > 0 ? originalEvents : generateMockAIEvents(selectedChild);
    return source.map((e, i) => ({ ...e, localId: `draft-${i}` }));
  });

  const [isSaved, setIsSaved] = useState(false);

  // Prevent accidental navigation back
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isSaved || draftEvents.length === 0) {
        return;
      }

      e.preventDefault();

      showAlert({
        title: '검수 중단',
        message: '분석 중인 일정이 저장되지 않고 사라집니다. 정말 나가시겠습니까?',
        warningMessage: '이미 분석 횟수가 차감되어, 나가셔도 횟수는 복구되지 않습니다.',
        icon: '⚠️',
        buttons: [
          { text: '취소', style: 'cancel' },
          {
            text: '나가기',
            style: 'destructive',
            onPress: () => {
              AnalysisResultStore.setResetUpload(true);
              AnalysisResultStore.clearPendingSession();
              navigation.dispatch(e.data.action);
            },
          },
        ]
      });
    });

    return unsubscribe;
  }, [navigation, isSaved, draftEvents]);

  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  // Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateTargetId, setDateTargetId] = useState<string | null>(null);

  // Age/Class Picker State
  const [showAgePicker, setShowAgePicker] = useState(false);
  const [ageTargetId, setAgeTargetId] = useState<string | null>(null);

  // Bottom Sheet Animation
  const currentSheetY = useRef(SCREEN_HEIGHT - MIN_SHEET_HEIGHT);
  const startSheetY = useRef(SCREEN_HEIGHT - MIN_SHEET_HEIGHT);
  const sheetY = useRef(new Animated.Value(currentSheetY.current)).current;

  useEffect(() => {
    const id = sheetY.addListener((state) => {
      currentSheetY.current = state.value;
    });
    return () => sheetY.removeListener(id);
  }, [sheetY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 2,
      onPanResponderGrant: () => {
        startSheetY.current = currentSheetY.current;
      },
      onPanResponderMove: (_, gesture) => {
        const newY = startSheetY.current + gesture.dy;
        if (newY >= SCREEN_HEIGHT - MAX_SHEET_HEIGHT && newY <= SCREEN_HEIGHT - 50) {
          sheetY.setValue(newY);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const midPoint = (SCREEN_HEIGHT - MAX_SHEET_HEIGHT + SCREEN_HEIGHT - MIN_SHEET_HEIGHT) / 2;
        let targetY;

        if (gesture.vy < -0.5) {
          targetY = SCREEN_HEIGHT - MAX_SHEET_HEIGHT;
        } else if (gesture.vy > 0.5) {
          targetY = SCREEN_HEIGHT - MIN_SHEET_HEIGHT;
        } else {
          targetY = currentSheetY.current < midPoint ? SCREEN_HEIGHT - MAX_SHEET_HEIGHT : SCREEN_HEIGHT - MIN_SHEET_HEIGHT;
        }

        Animated.spring(sheetY, {
          toValue: targetY,
          useNativeDriver: false,
          tension: 50,
          friction: 10,
        }).start();
      },
    })
  ).current;

  const groups = useMemo(() => {
    const map = new Map<string, DraftEvent[]>();
    for (const e of draftEvents) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, evs]) => ({ date, events: evs }));
  }, [draftEvents]);

  const updateDraft = (localId: string, patch: Partial<DraftEvent>) => {
    setDraftEvents((prev) => prev.map((e) => (e.localId === localId ? { ...e, ...patch } : e)));
  };

  const deleteDraft = (localId: string) => {
    setDraftEvents((prev) => prev.filter((e) => e.localId !== localId));
    if (editingId === localId) setEditingId(null);
  };

  const addDraftForDate = (date: string) => {
    const localId = `draft-new-${Date.now()}`;
    setDraftEvents((prev) => [
      ...prev,
      {
        localId,
        date,
        title: '새 일정',
        note: '',
        childId: selectedChild?.id ?? children[0]?.id ?? '',
        source: 'ai',
        icon: '📝',
      },
    ]);
    setEditingId(localId);
  };

  const handleDatePress = (localId: string) => {
    setDateTargetId(localId);
    setShowDatePicker(true);
  };

  const handleAgePress = (localId: string) => {
    setAgeTargetId(localId);
    setShowAgePicker(true);
  };

  const handleSave = async () => {
    if (draftEvents.length === 0) return;

    const finalWithoutIds = draftEvents.map(({ localId, ...rest }) => rest);
    await AnalysisLogService.logCorrection(originalEvents, finalWithoutIds);

    // Pass the replace flag from session to addEvents
    addEvents(finalWithoutIds, { replaceSimilar: !!session?.shouldReplaceSimilar });

    const keyword = draftEvents.find((e) => e.note?.trim())?.note;
    addNotification({
      title: '가정통신문 분석 완료',
      body: `${draftEvents.length}건의 일정이 캘린더에 저장됐어요.`,
      keyword,
      date: draftEvents[0]?.date,
    });

    setIsSaved(true);
    AnalysisResultStore.takeSession();
    router.replace({ pathname: '/save-complete', params: { count: String(draftEvents.length) } });
  };

  return (
    <View style={styles.container}>
      {/* Background: Original Image(s) */}
      <View style={styles.backgroundContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          scrollEnabled={true}
        >
          {docs.length > 0 ? (
            docs.map((doc) => (
              <ZoomableImage
                key={doc.id}
                uri={doc.uri}
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT - MIN_SHEET_HEIGHT}
              />
            ))
          ) : (
            <View style={[styles.bgImage, { backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: colors.textSecondary }}>원본 이미지가 없습니다</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Bottom Sheet: Analysis Results */}
      <AIReviewBottomSheet
        sheetY={sheetY}
        panHandlers={panResponder.panHandlers}
        colors={colors}
        insets={insets}
        onSave={handleSave}
        isSaveDisabled={draftEvents.length === 0}
      >
        {groups.map((group) => {
          const collapsed = group.events.length >= 2 && collapsedDates.has(group.date);
          return (
            <View key={group.date} style={styles.dateCard}>
              <View style={styles.dateCardHeader}>
                <Pressable
                  onPress={() => handleDatePress(group.events[0].localId)}
                  style={[styles.dateBadge, isImminent(group.date) && styles.dateBadgeImminent]}
                >
                  <Text style={[styles.dateBadgeText, isImminent(group.date) && styles.dateBadgeTextImminent]}>
                    🗓️ {formatMD(group.date)}
                  </Text>
                </Pressable>
                {group.events.length >= 2 && (
                  <Pressable onPress={() => setCollapsedDates(prev => {
                    const next = new Set(prev);
                    if (next.has(group.date)) next.delete(group.date); else next.add(group.date);
                    return next;
                  })}>
                    <Text style={styles.chevron}>{collapsed ? '▸' : '▾'}</Text>
                  </Pressable>
                )}
              </View>

              {!collapsed && group.events.map((ev) => (
                <AIReviewEventItem
                  key={ev.localId}
                  event={ev}
                  child={children.find((c) => c.id === ev.childId)}
                  isEditing={editingId === ev.localId}
                  onEditToggle={() => setEditingId(editingId === ev.localId ? null : ev.localId)}
                  onUpdate={(patch) => updateDraft(ev.localId, patch)}
                  onDelete={() => deleteDraft(ev.localId)}
                  onDatePress={() => handleDatePress(ev.localId)}
                  onAgePress={() => handleAgePress(ev.localId)}
                  colors={colors}
                />
              ))}
              <Pressable style={styles.addButton} onPress={() => addDraftForDate(group.date)}>
                <Text style={styles.addButtonText}>+ 이 날짜에 일정 추가</Text>
              </Pressable>
            </View>
          );
        })}
      </AIReviewBottomSheet>

      {/* Date Picker Modal */}
      {showDatePicker && dateTargetId && (
        <DateTimePicker
          value={parseISODate(draftEvents.find(e => e.localId === dateTargetId)?.date || toISODate(new Date()))}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              updateDraft(dateTargetId, { date: toISODate(selectedDate) });
            }
          }}
        />
      )}

      {/* Age/Class Picker Modal */}
      <Modal visible={showAgePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>대상 아이 선택</Text>
            {children.map(c => (
              <Pressable key={c.id} style={styles.childOption} onPress={() => {
                if (ageTargetId) updateDraft(ageTargetId, { childId: c.id });
                setShowAgePicker(false);
              }}>
                <Text style={styles.childOptionText}>{c.name} ({c.age}세 · {c.className || '반 정보 없음'})</Text>
              </Pressable>
            ))}
            <Pressable style={styles.modalCloseButton} onPress={() => setShowAgePicker(false)}>
              <Text style={styles.modalCloseButtonText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    backgroundContainer: { height: SCREEN_HEIGHT - MIN_SHEET_HEIGHT, width: SCREEN_WIDTH },
    bgImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT - MIN_SHEET_HEIGHT },
    dateCard: {
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    dateBadge: { backgroundColor: colors.gray100, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
    dateBadgeImminent: { backgroundColor: colors.tomorrowRed },
    dateBadgeText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    dateBadgeTextImminent: { color: '#FFFFFF' },
    chevron: { fontSize: 16, color: colors.textSecondary },
    addButton: { marginTop: 12, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: colors.accent, borderStyle: 'dashed' },
    addButtonText: { fontSize: 12, fontWeight: '700', color: colors.accent },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 20, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 20, textAlign: 'center' },
    childOption: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    childOptionText: { fontSize: 15, color: '#333', textAlign: 'center' },
    modalCloseButton: { marginTop: 20, paddingVertical: 12, backgroundColor: '#EEE', borderRadius: 12 },
    modalCloseButtonText: { fontSize: 14, color: '#666', textAlign: 'center', fontWeight: '700' },
  });
}
