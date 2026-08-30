import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { parseISODate, startOfDay, toISODate } from '../utils/date';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 32;
const ZOOM_WIDTH = SCREEN_WIDTH - 80;
const ZOOM_HEIGHT = 380;

// ImagePicker/카메라가 주는 uri는 OS가 언제든 비울 수 있는 임시 캐시 경로라, 시간이
// 지나거나 앱을 업데이트 설치하면 캘린더에 저장해둔 "원본 사진 보기"가 파일을 못 찾아
// 조용히 사라져버렸다 — 문서 디렉토리(documentDirectory)로 복사해서 앱이 지워지기
// 전까지는 계속 남아있게 한다.
const SCANNED_PHOTO_DIR = `${FileSystem.documentDirectory}newsletter-photos/`;

function formatMMDD(isoDate: string): string {
  const date = parseISODate(isoDate);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

async function persistScannedPhoto(uri: string): Promise<string> {
  try {
    await FileSystem.makeDirectoryAsync(SCANNED_PHOTO_DIR, { intermediates: true }).catch(() => {});
    const ext = uri.split('.').pop()?.split('?')[0]?.slice(0, 5) || 'jpg';
    const dest = `${SCANNED_PHOTO_DIR}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    // 복사 실패해도 저장 자체가 막히면 안 되니, 원본(임시) 경로라도 그대로 사용한다.
    return uri;
  }
}

export default function AIReviewScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { children, selectedChild, events, addEvents, deleteEvents, canEditFamilyData } = useAppData();
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
  const [isSaving, setIsSaving] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateTargetId, setDateTargetId] = useState<string | null>(null);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateResolution, setDuplicateResolution] = useState<'add' | 'overwrite'>('add');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // 원본 이미지 미리보기가 화면 위쪽 고정 공간을 차지해서, 키보드가 뜨면
  // 아래 입력 카드들이 전부 밀려 안 보이는 문제가 있었다 — 키보드가 떠 있는
  // 동안만 이미지를 잠깐 숨기고, 내려가면 원래 보던 상태(원본 보기 on/off)로 복원한다.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  // 겹치는 기존 일정이 있는지 draftEvents 기준으로 한 번만 계산 — 초기 분석 결과 대비 기존 캘린더를 비교한다.
  const overlapMap = useMemo(() => {
    const map: Record<string, Event[]> = {};
    draftEvents.forEach((d) => {
      const matches = events.filter((ex) => ex.childId === d.childId && isSimilarEvent(ex, d));
      if (matches.length > 0) map[d.localId] = matches;
    });
    return map;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const overlappingTitles = useMemo(() => {
    const set = new Set<string>();
    Object.values(overlapMap).forEach((matches) => matches.forEach((m) => set.add(m.title)));
    return Array.from(set);
  }, [overlapMap]);

  useEffect(() => {
    if (overlappingTitles.length > 0) setShowDuplicateModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedEvents = useMemo(
    () => [...draftEvents].sort((a, b) => a.date.localeCompare(b.date)),
    [draftEvents]
  );

  // 추출된 일정 날짜가 하나도 빠짐없이 전부 오늘보다 과거면, 지난주 이전 알림장을
  // 잘못 업로드했을 가능성이 높다고 보고 경고 배너를 띄운다. 상대적 표현("이번주
  // 목요일" 등)은 AI가 오늘 기준으로 계산해버리므로 이 방식으로는 못 잡아내고,
  // 문서에 실제 날짜가 인쇄돼 있던 경우만 감지된다.
  const todayISO = useMemo(() => toISODate(new Date()), []);
  const looksLikePastNewsletter = useMemo(
    () => draftEvents.length > 0 && draftEvents.every((e) => e.date < todayISO),
    [draftEvents, todayISO]
  );
  const [pastNoticeDismissed, setPastNoticeDismissed] = useState(false);

  // 배너에 보여줄 "지난 날짜(MM/DD ~ MM/DD)"와 "N일 전" — sortedEvents가 이미
  // 날짜순 정렬돼 있으므로 첫/마지막 항목이 곧 범위의 시작/끝이다.
  const pastNoticeInfo = useMemo(() => {
    if (!looksLikePastNewsletter || sortedEvents.length === 0) return null;
    const minDate = sortedEvents[0].date;
    const maxDate = sortedEvents[sortedEvents.length - 1].date;
    const daysAgo = Math.round(
      (startOfDay(new Date()).getTime() - parseISODate(maxDate).getTime()) / 86400000
    );
    const rangeLabel =
      minDate === maxDate ? formatMMDD(minDate) : `${formatMMDD(minDate)} ~ ${formatMMDD(maxDate)}`;
    return { rangeLabel, daysAgo };
  }, [looksLikePastNewsletter, sortedEvents]);

  const updateDraft = (localId: string, patch: Partial<DraftEvent>) => {
    setDraftEvents((prev) => prev.map((e) => (e.localId === localId ? { ...e, ...patch } : e)));
  };

  const deleteDraft = (localId: string) => {
    setDraftEvents((prev) => prev.filter((e) => e.localId !== localId));
  };

  const addDraftForDate = (date: string) => {
    const localId = `draft-new-${Date.now()}`;
    const newDraft: DraftEvent = {
      localId,
      date,
      title: '새 일정',
      note: '',
      childId: selectedChild?.id ?? children[0]?.id ?? '',
      source: 'ai',
      icon: '📝',
    };
    setDraftEvents((prev) => {
      // 같은 날짜의 기존 일정이 있으면 그 바로 아래에 끼워 넣는다.
      let insertIndex = prev.length;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].date === date) {
          insertIndex = i + 1;
          break;
        }
      }
      const next = [...prev];
      next.splice(insertIndex, 0, newDraft);
      return next;
    });
  };

  const handleDatePress = (localId: string) => {
    setDateTargetId(localId);
    setShowDatePicker(true);
  };

  const handleSave = async () => {
    // isSaving 가드: 저장 완료 전(await 도중) 버튼을 빠르게 연타하면 addEvents가 두 번 불려
    // 완전히 동일한 일정이 두 개 저장되는 문제가 있어, 첫 탭에서 바로 동기적으로 막는다.
    if (draftEvents.length === 0 || isSaving || isSaved) return;
    if (!canEditFamilyData) {
      showAlert({ title: '읽기 전용 구성원이에요', message: '가족 일정은 엄마/아빠 역할만 등록할 수 있어요.' });
      return;
    }
    setIsSaving(true);

    if (duplicateResolution === 'overwrite') {
      const idsToDelete = new Set<string>();
      Object.values(overlapMap).forEach((matches) => matches.forEach((ex) => idsToDelete.add(ex.id)));
      if (idsToDelete.size > 0) deleteEvents(Array.from(idsToDelete));
    }

    const finalWithoutIds = draftEvents.map(({ localId, ...rest }) => rest);
    await AnalysisLogService.logCorrection(originalEvents, finalWithoutIds);

    // 이 스캔에서 나온 원본 사진들을 각 일정에 매달아둔다 — 어떤 일정이 정확히 어떤
    // 사진에서 나왔는지는 알 수 없어(AI가 여러 장을 한 번에 분석), 이번 스캔에서
    // 나온 모든 사진을 함께 붙인다. 캘린더에서 작은 아이콘으로 원본을 다시 볼 수 있다.
    const scannedPhotoUris = await Promise.all(imageDocs.map((d) => persistScannedPhoto(d.uri)));
    const eventsToSave =
      scannedPhotoUris.length > 0
        ? finalWithoutIds.map((e) => ({ ...e, photoUris: scannedPhotoUris }))
        : finalWithoutIds;
    addEvents(eventsToSave);

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
      <Stack.Screen options={{ headerShown: false }} />

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

      {pastNoticeInfo && !pastNoticeDismissed && (
        <View style={styles.pastNoticeBanner}>
          <View style={styles.pastNoticeIconCircle}>
            <Feather name="alert-triangle" size={20} color={C.amber700} />
          </View>
          <View style={styles.pastNoticeBody}>
            <View style={styles.pastNoticeTitleRow}>
              <Text style={styles.pastNoticeTitle}>지난 날짜({pastNoticeInfo.rangeLabel}) 알림장이에요</Text>
              <View style={styles.pastNoticeBadge}>
                <Text style={styles.pastNoticeBadgeText}>{pastNoticeInfo.daysAgo}일 전</Text>
              </View>
            </View>
            <Text style={styles.pastNoticeSubtext}>혹시 갤러리에서 이전 주 문서를 잘못 선택하셨나요?</Text>
            <View style={styles.pastNoticeButtonRow}>
              <Pressable style={styles.pastNoticeReuploadButton} onPress={() => router.back()}>
                <Feather name="camera" size={14} color={C.white} />
                <Text style={styles.pastNoticeReuploadButtonText}>이번 주 알림장 다시 올리기</Text>
              </Pressable>
              <Pressable style={styles.pastNoticeContinueButton} onPress={() => setPastNoticeDismissed(true)}>
                <Text style={styles.pastNoticeContinueButtonText}>계속 검토</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {showOriginal && !keyboardVisible && (
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
                      <Image source={{ uri: doc.uri }} style={styles.originalPreviewImage} resizeMode="contain" />
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

      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {sortedEvents.map((ev) => (
          <EventReviewCard
            key={ev.localId}
            event={ev}
            reviewExpanded={expandedReviewId === ev.localId}
            onToggleReview={() => setExpandedReviewId((prev) => (prev === ev.localId ? null : ev.localId))}
            onUpdate={(patch) => updateDraft(ev.localId, patch)}
            onDelete={() => deleteDraft(ev.localId)}
            onDatePress={() => handleDatePress(ev.localId)}
          />
        ))}

        <Pressable
          style={styles.addEventButton}
          onPress={() => addDraftForDate(sortedEvents[sortedEvents.length - 1]?.date ?? toISODate(new Date()))}
        >
          <Feather name="plus" size={13} color={C.violet600} />
          <Text style={styles.addEventButtonText}>새 일정 추가</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          onPress={handleSave}
          disabled={isSaved || isSaving || draftEvents.length === 0}
          style={[
            styles.saveButton,
            isSaved && styles.saveButtonSaved,
            (isSaving || draftEvents.length === 0) && styles.saveButtonDisabled,
          ]}
        >
          {isSaved ? (
            <>
              <Feather name="check-circle" size={18} color={C.white} />
              <Text style={styles.saveButtonText}>캘린더에 성공적으로 저장되었습니다!</Text>
            </>
          ) : (
            <>
              <Text style={styles.saveButtonText}>
                {isSaving ? '저장하는 중...' : '최종 검토 완료 & 캘린더 저장'}
              </Text>
              {!isSaving && <Feather name="arrow-right" size={16} color={C.white} />}
            </>
          )}
        </Pressable>
      </View>
      </KeyboardAvoidingView>

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
        {/* RN Modal은 안드로이드에서 별도 네이티브 윈도우에 렌더링돼 앱 루트의
            GestureHandlerRootView 밖에 놓이면서 핀치줌/팬 제스처가 먹지 않는다 —
            Modal 내부에 별도로 하나 더 씌워줘야 제스처가 정상 동작한다. */}
        <GestureHandlerRootView style={styles.zoomOverlay}>
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
        </GestureHandlerRootView>
      </Modal>

      <Modal visible={showDuplicateModal} transparent animationType="fade">
        <View style={styles.duplicateOverlay}>
          <View style={styles.duplicateCard}>
            <View style={styles.duplicateIconCircle}>
              <Feather name="alert-triangle" size={22} color={C.amber700} />
            </View>
            <Text style={styles.duplicateTitle}>비슷한 일정이 이미 있어요</Text>
            <Text style={styles.duplicateBody}>
              <Text style={styles.duplicateBodyStrong}>{overlappingTitles.join(', ')}</Text>와(과) 겹치는 일정이
              있어요. 어떻게 할까요?
            </Text>

            <Pressable
              onPress={() => {
                setDuplicateResolution('add');
                setShowDuplicateModal(false);
              }}
              style={styles.duplicatePrimaryButtonWrap}
            >
              <LinearGradient
                colors={[C.violet600, C.indigo600]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.duplicatePrimaryButton}
              >
                <Text style={styles.duplicatePrimaryButtonText}>새 일정으로 추가</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => {
                setDuplicateResolution('overwrite');
                setShowDuplicateModal(false);
              }}
              style={styles.duplicateSecondaryButton}
            >
              <Text style={styles.duplicateSecondaryButtonText}>기존 일정 덮어쓰기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.appBg },
  keyboardAvoider: { flex: 1 },
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
  pastNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: C.amber50,
    borderBottomWidth: 1,
    borderBottomColor: C.amber200,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  pastNoticeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.amber100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastNoticeBody: { flex: 1, gap: 6 },
  pastNoticeTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  pastNoticeTitle: { fontSize: 14.5, fontWeight: '800', color: C.slate900 },
  pastNoticeBadge: {
    backgroundColor: C.amber100,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pastNoticeBadgeText: { fontSize: 11, fontWeight: '800', color: C.amber800 },
  pastNoticeSubtext: { fontSize: 12.5, fontWeight: '600', color: C.slate600, lineHeight: 17 },
  pastNoticeButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  pastNoticeReuploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.amber600,
    borderRadius: 999,
    paddingVertical: 12,
  },
  pastNoticeReuploadButtonText: { fontSize: 12.5, fontWeight: '800', color: C.white },
  pastNoticeContinueButton: {
    backgroundColor: C.white,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.amber200,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pastNoticeContinueButtonText: { fontSize: 12.5, fontWeight: '800', color: C.amber700 },
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
    backgroundColor: C.slate50,
    borderRadius: 16,
    overflow: 'hidden',
    height: 220,
  },
  originalEmptyText: { flex: 1, textAlign: 'center', textAlignVertical: 'center', color: C.slate400, fontSize: 12 },
  originalPreviewSlide: { width: PREVIEW_WIDTH, height: 220, backgroundColor: C.slate50 },
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
  duplicateOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 18, 17, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  duplicateCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: C.white,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.045)',
    padding: 26,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  duplicateIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: C.amber50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  duplicateTitle: { fontSize: 18, fontWeight: '800', color: C.slate900, letterSpacing: -0.2 },
  duplicateBody: {
    fontSize: 14,
    color: C.slate500,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 16,
  },
  duplicateBodyStrong: { color: C.slate800, fontWeight: '800' },
  duplicatePrimaryButtonWrap: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
  duplicatePrimaryButton: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  duplicatePrimaryButtonText: { fontSize: 13, fontWeight: '800', color: C.white },
  duplicateSecondaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: C.slate100,
  },
  duplicateSecondaryButtonText: { fontSize: 13, fontWeight: '700', color: C.slate600 },
});
