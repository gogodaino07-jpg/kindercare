import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter, useNavigation } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../components/common/AppText';
import { ThemeColors } from '../constants/theme';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useAppLock } from '../context/AppLockContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { isSimilarEvent } from '../data/mockAIResult';
import { useScanRewardedAd } from '../hooks/useScanRewardedAd';
import { Event, MealPlan, UploadedDoc } from '../types/models';
import {
  AIUsageLimitService,
  AnalysisResultStore,
  FREE_WEEKLY_LIMIT,
  PREMIUM_MONTHLY_LIMIT,
  PREMIUM_WEEKLY_LIMIT,
  GeminiAnalysisError,
  GeminiAnalysisService,
} from '../features/newsletter-analysis';

const MAX_DOCS = 5;

// UI는 전면 재설계 예정이라 비워둔 상태. 아래 상태/핸들러(업로드, 분석 호출,
// 사용량 체크, 중복 검사, 세션 저장 등)는 실제 로직이라 그대로 유지 —
// 새 UI에서 그대로 다시 연결해서 쓸 것.
export default function UploadScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { selectedChild, events, googleAccount, addMealPlans } = useAppData();
  const { isSubscribed } = useSubscription();
  const { showAlert } = useAlert();
  const { setPickerActive } = useAppLock();
  const { showToast } = useToast();
  const { requestAndShow } = useScanRewardedAd();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [remainingAnalyses, setRemainingAnalyses] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastUsedType, setLastUsedType] = useState<'camera' | 'gallery' | 'file' | null>(null);

  // Prevent accidental navigation during analysis
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!analyzing) return;

      e.preventDefault();

      showAlert({
        title: '분석 중단',
        message: '분석을 중단하고 처음부터 다시 할까요? 아니면 마저 진행할까요?',
        icon: '🤖',
        onDismiss: () => {
          // Hardware back button pressed while alert is visible
          setAnalyzing(false);
          AnalysisResultStore.clearPendingSession();
          router.replace('/');
        },
        buttons: [
          {
            text: '중단하고 처음부터',
            style: 'destructive',
            onPress: () => {
              setAnalyzing(false);
              AnalysisResultStore.clearPendingSession();
              navigation.dispatch(e.data.action);
            },
          },
          { text: '마저 진행할게요', style: 'cancel' },
        ],
      });
    });

    return unsubscribe;
  }, [navigation, analyzing]);

  // Reset docs if coming back from an abandoned review session
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (AnalysisResultStore.getResetUpload()) {
        setDocs([]);
        AnalysisResultStore.setResetUpload(false);
      }
    });
    return unsub;
  }, [navigation]);

  useEffect(() => {
    AIUsageLimitService.getRemainingCount(googleAccount?.email, isSubscribed).then(setRemainingAnalyses);
  }, [googleAccount?.email, isSubscribed]);

  useEffect(() => {
    // Check for pending analysis session from a previous app instance
    const checkPendingSession = async () => {
      const pending = await AnalysisResultStore.getPendingSession();
      if (pending && pending.docs.length > 0) {
        showAlert({
          title: '분석 이어하기',
          message: '이전에 완료되지 않은 분석 작업이 있습니다. 이어서 진행할까요?',
          icon: '🤖',
          buttons: [
            {
              text: '처음부터 하기',
              style: 'cancel',
              onPress: () => AnalysisResultStore.clearPendingSession(),
            },
            {
              text: '네, 이어서 할게요',
              onPress: () => {
                setDocs(pending.docs);
                // Trigger analysis with recovered data
                performAnalysis(pending.docs, pending.child);
              },
            },
          ]
        });
      }
    };
    checkPendingSession();
  }, []);

  const addDoc = (doc: UploadedDoc) => {
    if (docs.length >= MAX_DOCS) {
      showToast('최대 5장까지 첨부할 수 있어요');
      return;
    }
    setDocs((prev) => [...prev, doc]);
  };

  const handleTakePhoto = async () => {
    if (docs.length >= MAX_DOCS) {
      showToast('최대 5장까지 첨부할 수 있어요');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert({ title: '권한 필요', message: '카메라 권한이 필요해요' });
      return;
    }
    setPickerActive(true);
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        addDoc({ id: `doc-${Date.now()}`, uri: result.assets[0].uri, kind: 'image' });
        setLastUsedType('camera');
        setIsMenuOpen(false);
      }
    } finally {
      setPickerActive(false);
    }
  };

  const handlePickGallery = async () => {
    if (docs.length >= MAX_DOCS) {
      showToast('최대 5장까지 첨부할 수 있어요');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({ title: '권한 필요', message: '사진첩 권한이 필요해요' });
      return;
    }
    setPickerActive(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: MAX_DOCS - docs.length,
      });
      if (!result.canceled) {
        result.assets.forEach((asset) =>
          addDoc({ id: `doc-${Date.now()}-${asset.assetId ?? asset.uri}`, uri: asset.uri, kind: 'image' })
        );
        setLastUsedType('gallery');
        setIsMenuOpen(false);
      }
    } finally {
      setPickerActive(false);
    }
  };

  const handlePickFile = async () => {
    if (docs.length >= MAX_DOCS) {
      showToast('최대 5장까지 첨부할 수 있어요');
      return;
    }
    setPickerActive(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: false,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        addDoc({
          id: `doc-${Date.now()}`,
          uri: asset.uri,
          kind: asset.mimeType?.startsWith('image/') ? 'image' : 'file',
          name: asset.name,
        });
        setLastUsedType('file');
        setIsMenuOpen(false);
      }
    } finally {
      setPickerActive(false);
    }
  };

  const removeDoc = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const goToAnalysis = (
    uploadedDocs: UploadedDoc[],
    result: Omit<Event, 'id'>[],
    mealPlans: Omit<MealPlan, 'id'>[],
    replaceSimilar: boolean = false
  ) => {
    AnalysisResultStore.setSession(uploadedDocs, result, mealPlans);
    // Track if we should auto-delete existing similar events on save
    if (replaceSimilar) {
      const session = AnalysisResultStore.getSession();
      if (session) session.shouldReplaceSimilar = true;
    }
    showToast(mealPlans.length > 0 ? '분석 완료! 식단표도 함께 저장했어요 🍱' : '분석 완료하였습니다');
    router.push('/ai-review');
  };

  const performAnalysis = async (targetDocs: UploadedDoc[], targetChild: any) => {
    if (targetDocs.length === 0 || !targetChild) return;

    // Save pending session state before starting long-running analysis
    await AnalysisResultStore.savePendingSession(targetDocs, targetChild);

    setAnalyzing(true);
    let result: Omit<Event, 'id'>[];
    let mealPlans: Omit<MealPlan, 'id'>[];
    try {
      const analysis = await GeminiAnalysisService.analyze(targetDocs, targetChild);
      result = analysis.events;
      mealPlans = analysis.mealPlans;
    } catch (err) {
      const message =
        err instanceof GeminiAnalysisError
          ? err.message
          : '문서 분석 중 문제가 발생했어요. 다시 시도해주세요.';
      showAlert({ title: '분석 실패', message });
      setAnalyzing(false);
      return;
    }
    const count = await AIUsageLimitService.consume(googleAccount?.email, isSubscribed);
    setRemainingAnalyses(count);
    setAnalyzing(false);

    // 급식 메뉴가 감지되면 검수 없이 바로 저장한다.
    if (mealPlans.length > 0) {
      addMealPlans(mealPlans);
    }

    // Check for duplicate/similar events already in calendar
    const duplicateResults = result.filter((newEvent) =>
      events.some(
        (existing) => existing.childId === newEvent.childId && isSimilarEvent(existing, newEvent)
      )
    );

    if (duplicateResults.length > 0) {
      showAlert({
        title: '비슷한 일정이 이미 있어요',
        message: `분석된 ${result.length}개 일정 중 ${duplicateResults.length}개가 이미 캘린더에 등록된 것 같아요. 어떻게 처리할까요?`,
        icon: '📅',
        buttons: [
          {
            text: '중복 제외하고 보기',
            onPress: () => {
              const filtered = result.filter(
                (nr) =>
                  !events.some(
                    (ex) => ex.childId === nr.childId && isSimilarEvent(ex, nr)
                  )
              );
              if (filtered.length === 0) {
                showToast('모든 일정이 이미 등록되어 있어 리뷰할 내용이 없습니다.');
                AnalysisResultStore.clearPendingSession();
              } else {
                goToAnalysis(targetDocs, filtered, mealPlans, false);
              }
            },
          },
          {
            text: '기존 일정 덮어쓰기',
            onPress: () => goToAnalysis(targetDocs, result, mealPlans, true),
          },
          {
            text: '취소',
            style: 'cancel',
            onPress: () => AnalysisResultStore.clearPendingSession(),
          },
        ],
      });
      return;
    }
    goToAnalysis(targetDocs, result, mealPlans);
  };

  const handleAnalyze = async () => {
    if (docs.length === 0) {
      showAlert({ title: '알림', message: '먼저 사진이나 파일을 올려주세요' });
      return;
    }
    if (remainingAnalyses !== null && remainingAnalyses <= 0) {
      if (isSubscribed) {
        showAlert({
          title: '이번 한도를 모두 사용했어요',
          message: `프리미엄은 1주일 최대 ${PREMIUM_WEEKLY_LIMIT}회, 1달 최대 ${PREMIUM_MONTHLY_LIMIT}회까지 스캔할 수 있어요. 다음 기간에 다시 시도해주세요.`,
          icon: '⏳',
        });
        return;
      }
      showAlert({
        title: '무료 횟수 소진',
        message: (
          <Text style={{ textAlign: 'center' }}>
            이번 주 무료 횟수({FREE_WEEKLY_LIMIT}회)를 모두 사용했어요.{"\n"}
            <Text style={{ color: colors.coralPink, fontWeight: 'bold' }}>프리미엄</Text>
            으로 구독하시면{" "}
            <Text style={{ color: colors.coralPink, fontWeight: 'bold' }}>월 {PREMIUM_MONTHLY_LIMIT}회 · 광고 없이</Text>
            이용하실 수 있습니다.
          </Text>
        ),
        icon: '💎',
        buttons: [
          { text: '확인', style: 'cancel' },
          {
            text: '프리미엄 구독 안내',
            onPress: () => router.push('/settings/subscription'),
          },
        ],
      });
      return;
    }
    if (!selectedChild) {
      showAlert({ title: '알림', message: '아이를 먼저 선택해주세요' });
      return;
    }

    if (!isSubscribed) {
      const earnedReward = await requestAndShow();
      if (!earnedReward) {
        showAlert({ title: '광고 시청이 필요해요', message: '광고를 끝까지 시청해야 분석을 진행할 수 있어요. 다시 시도해주세요.' });
        return;
      }
    }

    await performAnalysis(docs, selectedChild);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: '가정통신문 업로드' }} />
      <View style={{ flex: 1 }} />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.skyBackground,
    },
  });
}
