import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/common/AppText';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useNotificationCenter } from '../context/NotificationCenterContext';
import { generateMockAIEvents, isSimilarEvent } from '../data/mockAIResult';
import { AnalysisLogService, AnalysisResultStore } from '../features/newsletter-analysis';
import { EventReviewCard } from '../features/newsletter-analysis/components/EventReviewCard';
import { ZoomableImage } from '../features/newsletter-analysis/components/ZoomableImage';
import { SCAN_COLORS as C } from '../features/newsletter-analysis/uiColors';
import { DraftEvent } from '../features/newsletter-analysis/types';
import { Event } from '../types/models';
import { parseISODate, toISODate } from '../utils/date';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 32;
const ZOOM_WIDTH = SCREEN_WIDTH - 80;
const ZOOM_HEIGHT = 380;

export default function AIReviewScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { children, selectedChild, events, addEvents, deleteEvents } = useAppData();
  const { showAlert } = useAlert();
  const { addNotification } = useNotificationCenter();
  const insets = useSafeAreaInsets();

  const session = useMemo(() => AnalysisResultStore.getSession(), []);
  const originalEvents = useMemo(() => session?.initialEvents ?? [], [session]);
  const docs = useMemo(() => session?.docs ?? [], [session]);
  const imageDocs = useMemo(() => docs.filter((d) => d.kind === 'image'), [docs]);

  const [draftEvents, setDraftEvents] = useState<DraftEvent[]>(() => {
    const source = originalEvents.length > 0 ? originalEvents : generateMockAIEvents(selectedChild);
    return source.map((e, i) => ({ ...e, localId: `draft-${i}` }));
  });

  const [isSaved, setIsSaved] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateTargetId, setDateTargetId] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [resolutionMap, setResolutionMap] = useState<Record<string, 'add' | 'overwrite'>>({});

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
        ],
      });
    });

    return unsubscribe;
  }, [navigation, isSaved, draftEvents, showAlert]);

  const overlapMap = useMemo(() => {
    const map: Record<string, Event[]> = {};
    draftEvents.forEach((d) => {
      const matches = events.filter((ex) => ex.childId === d.childId && isSimilarEvent(ex, d));
      if (matches.length > 0) map[d.localId] = matches;
    });
    return map;
  }, [draftEvents, events]);

  const sortedEvents = useMemo(
    () => [...draftEvents].sort((a, b) => a.date.localeCompare(b.date)),
    [draftEvents]
  );

  const updateDraft = (localId: string, patch: Partial<DraftEvent>) => {
    setDraftEvents((prev) => prev.map((e) => (e.localId === localId ? { ...e, ...patch } : e)));
  };

  const deleteDraft = (localId: string) => {
    setDraftEvents((prev) => prev.filter((e) => e.localId !== localId));
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
  };

  const handleDatePress = (localId: string) => {
    setDateTargetId(localId);
    setShowDatePicker(true);
  };

  const handleSave = async () => {
    if (draftEvents.length === 0) return;

    const idsToDelete = new Set<string>();
    draftEvents.forEach((d) => {
      if ((resolutionMap[d.localId] ?? 'add') === 'overwrite') {
        (overlapMap[d.localId] ?? []).forEach((ex) => idsToDelete.add(ex.id));
      }
    });
    if (idsToDelete.size > 0) deleteEvents(Array.from(idsToDelete));

    const finalWithoutIds = draftEvents.map(({ localId, ...rest }) => rest);
    await AnalysisLogService.logCorrection(originalEvents, finalWithoutIds);
    addEvents(finalWithoutIds);

    const keyword = draftEvents.find((e) => e.note?.trim())?.note;
    addNotification({
      title: '가정통신문 분석 완료',
      body: `${draftEvents.length}건의 일정이 캘린더에 저장됐어요.`,
      keyword,
      date: draftEvents[0]?.date,
      childId: draftEvents[0]?.childId,
    });

    setIsSaved(true);
    AnalysisResultStore.takeSession();
    router.replace({ pathname: '/save-complete', params: { count: String(draftEvents.length) } });
  };

  const hasImageDocs = imageDocs.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={6}>
            <Feather name="chevron-left" size={24} color={C.slate900} />
          </Pressable>
          <Text style={styles.headerTitle}>AI 확인 · 수정</Text>
          <View style={styles.extractedBadge}>
            <Text style={styles.extractedBadgeText}>추출 완료 🎉</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => setShowOriginal((v) => !v)}>
            {showOriginal ? (
              <LinearGradient
                colors={[C.violet600, C.indigo600]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.togglePill}
              >
                <Feather name="eye-off" size={12} color={C.white} />
                <Text style={styles.togglePillTextActive}>원본 닫기</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.togglePill, styles.togglePillInactive]}>
                <Feather name="eye" size={12} color={C.slate600} />
                <Text style={styles.togglePillTextInactive}>원본 보기</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.rescanButton}>
            <Text style={styles.rescanButtonText}>다시 스캔</Text>
          </Pressable>
        </View>
      </View>

      {showOriginal && (
        <View style={styles.originalWrap}>
          <View style={styles.originalHeader}>
            <View style={styles.originalHeaderLeft}>
              <Feather name="image" size={13} color="#FCD34D" />
              <Text style={styles.originalHeaderText}>첨부한 원본 문서 스캔본 (대조용)</Text>
            </View>
            <Pressable
              onPress={() => hasImageDocs && setShowZoomModal(true)}
              style={[styles.zoomButton, !hasImageDocs && styles.zoomButtonDisabled]}
              disabled={!hasImageDocs}
            >
              <Feather name="zoom-in" size={11} color={C.white} />
              <Text style={styles.zoomButtonText}>확대 보기</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => hasImageDocs && setShowZoomModal(true)}
            style={styles.originalPreviewCard}
          >
            {docs.length === 0 ? (
              <Text style={styles.originalEmptyText}>첨부된 원본이 없어요</Text>
            ) : (
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                {docs.map((doc) => (
                  <View key={doc.id} style={styles.originalPreviewSlide}>
                    {doc.kind === 'image' ? (
                      <Image source={{ uri: doc.uri }} style={styles.originalPreviewImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.originalPreviewFile}>
                        <Feather name="file" size={22} color={C.slate400} />
                        <Text style={styles.originalPreviewFileName} numberOfLines={1}>
                          {doc.name ?? '문서'}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {sortedEvents.map((ev) => (
          <EventReviewCard
            key={ev.localId}
            event={ev}
            overlaps={overlapMap[ev.localId] ?? []}
            resolution={resolutionMap[ev.localId] ?? 'add'}
            onResolutionChange={(r) => setResolutionMap((prev) => ({ ...prev, [ev.localId]: r }))}
            expandedBadge={
              expandedKey === `${ev.localId}:review`
                ? 'review'
                : expandedKey === `${ev.localId}:overlap`
                  ? 'overlap'
                  : null
            }
            onToggleBadge={(which) =>
              setExpandedKey((prev) => (prev === `${ev.localId}:${which}` ? null : `${ev.localId}:${which}`))
            }
            onUpdate={(patch) => updateDraft(ev.localId, patch)}
            onDelete={() => deleteDraft(ev.localId)}
            onDatePress={() => handleDatePress(ev.localId)}
          />
        ))}

        <Pressable style={styles.addEventButton} onPress={() => addDraftForDate(toISODate(new Date()))}>
          <Feather name="plus" size={13} color={C.violet600} />
          <Text style={styles.addEventButtonText}>새 일정 추가</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          onPress={handleSave}
          disabled={isSaved || draftEvents.length === 0}
          style={[styles.saveButton, isSaved && styles.saveButtonSaved, draftEvents.length === 0 && styles.saveButtonDisabled]}
        >
          {isSaved ? (
            <>
              <Feather name="check-circle" size={18} color={C.white} />
              <Text style={styles.saveButtonText}>캘린더에 성공적으로 저장되었습니다!</Text>
            </>
          ) : (
            <>
              <Text style={styles.saveButtonText}>최종 검토 완료 & 캘린더 저장</Text>
              <Feather name="arrow-right" size={16} color={C.white} />
            </>
          )}
        </Pressable>
      </View>

      {showDatePicker && dateTargetId && (
        <DateTimePicker
          value={parseISODate(draftEvents.find((e) => e.localId === dateTargetId)?.date || toISODate(new Date()))}
          mode="date"
          display="default"
          onChange={(_event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate && dateTargetId) {
              updateDraft(dateTargetId, { date: toISODate(selectedDate) });
            }
          }}
        />
      )}

      <Modal visible={showZoomModal} transparent animationType="fade" onRequestClose={() => setShowZoomModal(false)}>
        <View style={styles.zoomOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowZoomModal(false)} />
          <View style={styles.zoomCard}>
            <View style={styles.zoomHeader}>
              <View style={styles.zoomHeaderLeft}>
                <Feather name="image" size={16} color={C.violet600} />
                <Text style={styles.zoomHeaderText}>원본 통신문 크게보기</Text>
              </View>
              <Pressable onPress={() => setShowZoomModal(false)} style={styles.zoomCloseButton} hitSlop={6}>
                <Feather name="x" size={16} color={C.slate500} />
              </Pressable>
            </View>

            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {imageDocs.map((doc) => (
                <ZoomableImage key={doc.id} uri={doc.uri} width={ZOOM_WIDTH} height={ZOOM_HEIGHT} />
              ))}
            </ScrollView>

            <Pressable onPress={() => setShowZoomModal(false)} style={styles.zoomCloseFooter}>
              <Text style={styles.zoomCloseFooterText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.appBg },
  header: {
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: C.slate900 },
  extractedBadge: { backgroundColor: C.emerald100, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  extractedBadgeText: { fontSize: 10, fontWeight: '700', color: C.emerald800 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  togglePillInactive: { backgroundColor: C.slate100 },
  togglePillTextActive: { fontSize: 11, fontWeight: '700', color: C.white },
  togglePillTextInactive: { fontSize: 11, fontWeight: '700', color: C.slate600 },
  rescanButton: { backgroundColor: C.slate100, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  rescanButtonText: { fontSize: 11, fontWeight: '700', color: C.slate500 },
  originalWrap: {
    backgroundColor: C.slate900,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  originalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  originalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  originalHeaderText: { fontSize: 11, fontWeight: '800', color: '#FCD34D' },
  zoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  zoomButtonDisabled: { opacity: 0.4 },
  zoomButtonText: { fontSize: 10, fontWeight: '700', color: C.white },
  originalPreviewCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    overflow: 'hidden',
    height: 120,
  },
  originalEmptyText: { flex: 1, textAlign: 'center', textAlignVertical: 'center', color: C.slate400, fontSize: 12 },
  originalPreviewSlide: { width: PREVIEW_WIDTH, height: 120 },
  originalPreviewImage: { width: '100%', height: '100%' },
  originalPreviewFile: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 20 },
  originalPreviewFileName: { fontSize: 11, color: C.slate500, fontWeight: '600' },
  scrollContent: { padding: 16, gap: 14 },
  addEventButton: {
    borderWidth: 1.5,
    borderColor: C.violet200,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  addEventButtonText: { fontSize: 12, fontWeight: '800', color: C.violet600 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.slate100,
  },
  saveButton: {
    backgroundColor: C.slate900,
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonSaved: { backgroundColor: C.emerald700 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontSize: 14, fontWeight: '800', color: C.white },
  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  zoomCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: C.white,
    borderRadius: 32,
    padding: 20,
    gap: 12,
  },
  zoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
    paddingBottom: 10,
  },
  zoomHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  zoomHeaderText: { fontSize: 13, fontWeight: '900', color: C.slate900 },
  zoomCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomCloseFooter: { backgroundColor: C.slate900, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  zoomCloseFooterText: { fontSize: 12, fontWeight: '700', color: C.white },
});
