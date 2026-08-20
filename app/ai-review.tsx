import { useRouter, useNavigation } from 'expo-router';
import React, { useMemo, useState, useEffect } from 'react';
import { View } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import { useAppData } from '../context/AppDataContext';
import { useAlert } from '../context/AlertContext';
import { useNotificationCenter } from '../context/NotificationCenterContext';
import { generateMockAIEvents } from '../data/mockAIResult';
import { toISODate } from '../utils/date';
import { AnalysisResultStore, AnalysisLogService } from '../features/newsletter-analysis';
import { DraftEvent } from '../features/newsletter-analysis/types';

// UI는 전면 재설계 예정이라 비워둔 상태. 아래 상태/핸들러(검수 세션 로드,
// draft 일정 CRUD, 저장·알림·분석 로그 기록 등)는 실제 로직이라 그대로
// 유지 — 새 UI에서 그대로 다시 연결해서 쓸 것.
export default function AIReviewScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { children, selectedChild, addEvents } = useAppData();
  const { showAlert } = useAlert();
  const { addNotification } = useNotificationCenter();

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

  const summaryCounts = useMemo(() => {
    const todayISO = toISODate(new Date());
    const tomorrowISO = toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    return {
      total: draftEvents.length,
      today: draftEvents.filter((e) => e.date === todayISO).length,
      tomorrow: draftEvents.filter((e) => e.date === tomorrowISO).length,
    };
  }, [draftEvents]);

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
      childId: draftEvents[0]?.childId,
    });

    setIsSaved(true);
    AnalysisResultStore.takeSession();
    router.replace({ pathname: '/save-complete', params: { count: String(draftEvents.length) } });
  };

  return (
    <ScreenBackground>
      <View style={{ flex: 1 }} />
    </ScreenBackground>
  );
}
