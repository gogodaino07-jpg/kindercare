import { Feather, Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { getInfoAsync } from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import CoupangBanner from '../components/common/CoupangBanner';
import Text from '../components/common/AppText';
import { isAdTestAccount } from '../constants/adTestAccounts';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useAppLock } from '../context/AppLockContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useToast } from '../context/ToastContext';
import {
  AIUsageLimitService,
  AnalysisResultStore,
  FREE_LIFETIME_LIMIT,
  GeminiAnalysisError,
  GeminiAnalysisService,
  PREMIUM_MONTHLY_LIMIT,
  PREMIUM_WEEKLY_LIMIT,
} from '../features/newsletter-analysis';
import { ScanColors, useScanColors } from '../features/newsletter-analysis/uiColors';
import { useScanRewardedAd } from '../hooks/useScanRewardedAd';
import { Event, MealPlan, UploadedDoc } from '../types/models';
import { toISODate } from '../utils/date';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

async function buildDocMeta(uri: string): Promise<{ sizeLabel?: string; pickedAt: string }> {
  const pickedAt = toISODate(new Date()).replace(/-/g, '.');
  try {
    const info = await getInfoAsync(uri);
    if (info.exists && typeof info.size === 'number') {
      return { sizeLabel: formatFileSize(info.size), pickedAt };
    }
  } catch {
    // 용량 조회 실패해도 첨부 자체는 계속 진행
  }
  return { pickedAt };
}

function docTagLabel(doc: UploadedDoc): string {
  if (doc.pickSource === 'camera') return '카메라 촬영';
  if (doc.pickSource === 'gallery') return '앨범 사진';
  const ext = doc.name?.split('.').pop()?.toUpperCase();
  return ext ? `${ext} 문서` : '문서 파일';
}

function fileIconColors(doc: UploadedDoc, C: ScanColors): [string, string] {
  const lower = (doc.name ?? '').toLowerCase();
  if (lower.endsWith('.pdf')) return [C.rose600, '#F43F5E'];
  if (lower.endsWith('.hwp')) return [C.blue700, '#3B82F6'];
  return [C.slate600, C.slate400];
}

export default function UploadScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { selectedChild, googleAccount, addMealPlans, events } = useAppData();
  const { isSubscribed, isReady: subscriptionReady } = useSubscription();
  const { showAlert } = useAlert();
  const { setPickerActive } = useAppLock();
  const { showToast } = useToast();
  const { requestAndShow } = useScanRewardedAd();
  const insets = useSafeAreaInsets();
  const C = useScanColors();
  const styles = useMemo(() => createStyles(C), [C]);

  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [remainingAnalyses, setRemainingAnalyses] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  // 버튼을 누른 시점부터 광고 요청/시청이 끝날 때까지는 analyzing이 아직 true가
  // 아니라(그건 실제 AI 분석이 시작될 때만 켜짐) 버튼에 아무 반응이 없어 보여서
  // 여러 번 누르게 되는 문제가 있었음 — 그 구간을 채우기 위한 별도 상태.
  const [starting, setStarting] = useState(false);
  // 무료 횟수를 다 쓴 사용자가 분석 버튼을 누르는 시점이 아니라, 화면 상단에서
  // 미리 광고를 보고 스캔권 1회를 "충전"해둘 수 있게 하는 상태. 충전해두면
  // 다음 분석 시 광고를 다시 요구하지 않고, 분석에 성공하면 소모돼 다시 false로 돌아간다.
  const [adCredited, setAdCredited] = useState(false);
  const [watchingCredit, setWatchingCredit] = useState(false);

  const maxCredits = isSubscribed ? PREMIUM_WEEKLY_LIMIT : FREE_LIFETIME_LIMIT;
  const skipAd = isAdTestAccount(googleAccount?.email);
  // 무료 사용자는 처음 FREE_LIFETIME_LIMIT회까지만 광고 없이 쓰고, 그 이후엔 구독하지
  // 않는 한 스캔마다 광고 시청이 필요하다(막히지 않고 무제한 반복 가능).
  const hasFreeCredit = !isSubscribed && remainingAnalyses !== null && remainingAnalyses > 0;
  const needsAdThisScan = !isSubscribed && !skipAd && !hasFreeCredit && !adCredited;
  // 카드 노출 자체는 skipAd(테스트 계정)와 무관하게 보여준다 — 테스트 계정도 디자인을
  // 확인/QA할 수 있어야 하므로. 실제 광고 시청 생략은 handleWatchAdForCredit 안에서 처리.
  // adCredited가 true여도 카드를 계속 보여준다 — 충전 직후 카드 자체가 다른 모양으로
  // 바뀌면 실제로 충전됐는데도 "반영이 안 된 것처럼" 보이는 문제가 있었다. 카드는
  // 그대로 두고 내부 게이지만 0→1로 채워서 보여준다(ScanCreditCard 참고).
  const showCreditCard = !isSubscribed && !hasFreeCredit;

  const handleWatchAdForCredit = async () => {
    if (watchingCredit) return;
    if (skipAd) {
      setAdCredited(true);
      showToast('테스트 계정: 광고 없이 충전됐어요');
      return;
    }
    setWatchingCredit(true);
    try {
      const earned = await requestAndShow();
      if (earned) {
        setAdCredited(true);
        showToast('스캔권 1회가 충전됐어요 🎟️');
      } else {
        showAlert({ title: '광고 시청이 필요해요', message: '광고를 끝까지 시청해야 충전돼요. 다시 시도해주세요.' });
      }
    } finally {
      setWatchingCredit(false);
    }
  };

  const gaugeHeadline = isSubscribed
    ? `이번 주 ${remainingAnalyses ?? 0}번 더 스캔할 수 있어요`
    : hasFreeCredit
      ? `${remainingAnalyses}번 더 무료로 스캔할 수 있어요`
      : adCredited
        ? '충전된 스캔권으로 바로 분석할 수 있어요'
        : '광고 보면 계속 스캔할 수 있어요';
  const gaugeSubtitle = !isSubscribed && !hasFreeCredit
    ? adCredited
      ? '스캔권 1회 충전 완료 · 지금 분석을 진행해보세요'
      : `무료 ${maxCredits}회를 모두 사용했어요 · 광고 시청 후 계속 이용 가능`
    : `총 ${maxCredits}회 중 ${remainingAnalyses ?? 0}회 남음 · 1건당 1회 차감`;

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
  }, [navigation, analyzing, showAlert, router]);

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
                performAnalysis(pending.docs, pending.child);
              },
            },
          ],
        });
      }
    };
    checkPendingSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addDoc = (doc: UploadedDoc) => {
    setDocs((prev) => [...prev, doc]);
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert({ title: '권한 필요', message: '카메라 권한이 필요해요' });
      return;
    }
    setPickerActive(true);
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const meta = await buildDocMeta(result.assets[0].uri);
        addDoc({ id: `doc-${Date.now()}`, uri: result.assets[0].uri, kind: 'image', pickSource: 'camera', ...meta });
      }
    } finally {
      setPickerActive(false);
    }
  };

  const handlePickGallery = async () => {
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
        selectionLimit: 0, // 0 = 개수 제한 없음
        // Android 13+ 기본 선택기는 구글 포토 UI로만 뜨는데, legacy를 켜면
        // 다른 갤러리 앱·파일 앱 등에서도 사진을 고를 수 있게 열린다.
        ...(Platform.OS === 'android' ? { legacy: true } : null),
      });
      if (!result.canceled) {
        const metas = await Promise.all(result.assets.map((a) => buildDocMeta(a.uri)));
        result.assets.forEach((asset, i) =>
          addDoc({
            id: `doc-${Date.now()}-${asset.assetId ?? asset.uri}`,
            uri: asset.uri,
            kind: 'image',
            pickSource: 'gallery',
            ...metas[i],
          })
        );
      }
    } finally {
      setPickerActive(false);
    }
  };

  const handlePickFile = async () => {
    setPickerActive(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: false,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const meta = await buildDocMeta(asset.uri);
        addDoc({
          id: `doc-${Date.now()}`,
          uri: asset.uri,
          kind: asset.mimeType?.startsWith('image/') ? 'image' : 'file',
          name: asset.name,
          pickSource: 'file',
          ...meta,
        });
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
    mealPlans: Omit<MealPlan, 'id'>[]
  ) => {
    AnalysisResultStore.setSession(uploadedDocs, result, mealPlans);
    // 식단표까지 함께 저장됐다는 안내는 문장이 길어서 기본 토스트 노출 시간(2초)으로는
    // 다 읽기 전에 사라진다는 피드백이 있어 더 길게 띄운다.
    if (mealPlans.length > 0) {
      showToast('분석 완료! 식단표도 함께 저장했어요 🍱', 4000);
    } else {
      showToast('분석 완료하였습니다');
    }
    router.push('/ai-review');
  };

  const performAnalysis = async (targetDocs: UploadedDoc[], targetChild: any) => {
    if (targetDocs.length === 0 || !targetChild) return;

    await AnalysisResultStore.savePendingSession(targetDocs, targetChild);

    // 통신문이 "물놀이 재활동", "현장학습 연기" 처럼 이미 등록된 일정을 미루거나
    // 다시 진행한다는 안내일 때, 새 통신문에 준비물이 다 적혀있지 않아도 AI가
    // 원래 일정의 준비물을 참고할 수 있도록 최근 일정을 함께 넘겨준다.
    const REFERENCE_WINDOW_DAYS_BEFORE = 14;
    const REFERENCE_WINDOW_DAYS_AFTER = 45;
    const windowStart = toISODate(new Date(Date.now() - REFERENCE_WINDOW_DAYS_BEFORE * 24 * 60 * 60 * 1000));
    const windowEnd = toISODate(new Date(Date.now() + REFERENCE_WINDOW_DAYS_AFTER * 24 * 60 * 60 * 1000));
    const referenceEvents = events
      .filter((e) => e.childId === targetChild.id && e.date >= windowStart && e.date <= windowEnd)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 30);

    setAnalyzing(true);
    let result: Omit<Event, 'id'>[];
    let mealPlans: Omit<MealPlan, 'id'>[];
    try {
      const analysis = await GeminiAnalysisService.analyze(targetDocs, targetChild, referenceEvents);
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

    if (mealPlans.length > 0) {
      addMealPlans(mealPlans);
    }

    goToAnalysis(targetDocs, result, mealPlans);
  };

  const handleAnalyze = async () => {
    if (docs.length === 0) {
      showAlert({ title: '알림', message: '먼저 사진이나 파일을 올려주세요' });
      return;
    }
    if (isSubscribed && remainingAnalyses !== null && remainingAnalyses <= 0) {
      showAlert({
        title: '이번 한도를 모두 사용했어요',
        message: `프리미엄은 1주일 최대 ${PREMIUM_WEEKLY_LIMIT}회, 1달 최대 ${PREMIUM_MONTHLY_LIMIT}회까지 스캔할 수 있어요. 다음 기간에 다시 시도해주세요.`,
        icon: '⏳',
      });
      return;
    }
    if (!selectedChild) {
      showAlert({ title: '알림', message: '아이를 먼저 선택해주세요' });
      return;
    }

    setStarting(true);
    try {
      if (needsAdThisScan) {
        const earnedReward = await requestAndShow();
        if (!earnedReward) {
          showAlert({ title: '광고 시청이 필요해요', message: '광고를 끝까지 시청해야 분석을 진행할 수 있어요. 다시 시도해주세요.' });
          return;
        }
      } else if (adCredited) {
        setAdCredited(false); // 미리 충전해둔 스캔권을 이번 분석에 소모
      }

      await performAnalysis(docs, selectedChild);
    } finally {
      setStarting(false);
    }
  };

  const analyzingLabel =
    docs.length === 1 ? (docs[0].name ?? '선택한 파일') : `선택한 파일 ${docs.length}개`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {analyzing ? (
        <AnalyzingBody label={analyzingLabel} />
      ) : (
        <>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={6}>
              <Feather name="chevron-left" size={24} color={C.slate900} />
            </Pressable>
            <Text style={styles.headerTitle}>AI 알림장 스캔</Text>
          </View>

          <ScrollView
            style={styles.scrollFlex}
            // 문서가 없을 땐 남는 세로 공간을 emptyStateFill 안의 스페이서가 흡수해서
            // 스캔 팁이 하단 버튼 바로 위까지 내려가게 한다(스크린 아래 붕 뜬 여백 방지).
            contentContainerStyle={[styles.scrollContent, docs.length === 0 && styles.scrollContentFill]}
            showsVerticalScrollIndicator={false}
          >
            {showCreditCard ? (
              <ScanCreditCard watching={watchingCredit} onWatchAd={handleWatchAdForCredit} adCredited={adCredited} />
            ) : (
              <View style={styles.gaugeCard}>
                <View style={styles.gaugeTextBlock}>
                  <View style={styles.gaugeHeadlineRow}>
                    <View style={styles.gaugeDot} />
                    <Text style={styles.gaugeHeadline}>{gaugeHeadline}</Text>
                  </View>
                  <Text style={styles.gaugeSubtitle}>{gaugeSubtitle}</Text>
                </View>
                <CircularGauge value={remainingAnalyses ?? 0} max={maxCredits} />
              </View>
            )}

            {docs.length > 0 ? (
              <View style={styles.docsSection}>
                {/* 파일이 1개뿐일 때는 카드 안의 "선택된 OOO" 배지와 겹쳐 보여
                    어색해서, 여러 개를 골랐을 때만 전체 개수를 배지 형태로 보여준다
                    — 맨 텍스트로 붕 떠 있지 않도록 아이콘+배경을 갖춘 칩으로 디자인. */}
                {docs.length > 1 && (
                  <View style={styles.docsCountBadge}>
                    <Feather name="paperclip" size={12} color={C.slate600} />
                    <Text style={styles.docsCountBadgeText}>총 {docs.length}개 파일 선택됨</Text>
                  </View>
                )}
                {docs.map((doc) => (
                  <DocCard key={doc.id} doc={doc} onRemove={() => removeDoc(doc.id)} />
                ))}
              </View>
            ) : (
              <View style={styles.emptyStateFill}>
                <DropzoneCard />
                <ScanGuideCard />
                <View style={[styles.emptyStateSpacer, { flex: 0.6 }]} />
                <TipBox />
                <View style={[styles.emptyStateSpacer, { flex: 1.4 }]} />
              </View>
            )}
          </ScrollView>

          <View style={[styles.dock, isSubscribed && { paddingBottom: 8 + insets.bottom }]}>
            <View style={styles.dockHeaderRow}>
              <View style={styles.dockHeaderLeft}>
                <Feather name="folder" size={14} color={C.slate600} />
                <Text style={styles.dockHeaderText}>알림장 파일 선택하기</Text>
              </View>
              <View style={styles.dockFastBadge}>
                <Text style={styles.dockFastBadgeText}>빠른 업로드</Text>
              </View>
            </View>
            <View style={styles.dockRow}>
              <Pressable onPress={handleTakePhoto} style={styles.dockButton}>
                <View style={styles.dockButtonIconCircle}>
                  <Feather name="camera" size={18} color={C.slate700} />
                </View>
                <Text style={styles.dockButtonText}>카메라 촬영</Text>
              </Pressable>
              <Pressable onPress={handlePickGallery} style={[styles.dockButton, styles.dockButtonAccent]}>
                <View style={[styles.dockButtonIconCircle, styles.dockButtonIconCircleAccent]}>
                  <Feather name="image" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.dockButtonTextAccent}>앨범 사진</Text>
              </Pressable>
              <Pressable onPress={handlePickFile} style={styles.dockButton}>
                <View style={styles.dockButtonIconCircle}>
                  <Feather name="file-text" size={18} color={C.slate700} />
                </View>
                <Text style={styles.dockButtonText}>PDF / 문서</Text>
              </Pressable>
            </View>

            {docs.length > 0 && (
              <Pressable
                onPress={handleAnalyze}
                disabled={remainingAnalyses === null || starting}
                style={[
                  styles.analyzeButtonWrap,
                  (remainingAnalyses === null || starting) && styles.analyzeButtonWrapDisabled,
                ]}
              >
                <LinearGradient
                  colors={[C.violet600, C.indigo600]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.analyzeButton}
                >
                  {starting ? (
                    <>
                      <ActivityIndicator color="#FFFFFF" />
                      <Text style={styles.analyzeButtonText}>잠시만요...</Text>
                    </>
                  ) : (
                    <Text style={styles.analyzeButtonText}>
                      {needsAdThisScan ? '광고 보고 분석하기' : 'AI로 내용 분석하기 (1회 차감)'}
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            )}
            {docs.length > 0 && subscriptionReady && needsAdThisScan && (
              <Text style={styles.analyzeAdCaption}>짧은 광고 시청 후 분석이 시작돼요</Text>
            )}
          </View>

          {subscriptionReady && !isSubscribed && <CoupangBanner style={{ paddingBottom: insets.bottom }} />}
        </>
      )}
    </SafeAreaView>
  );
}

function CircularGauge({
  value,
  max,
  size = 76,
  trackColor,
  fillColor,
  textColor,
  subTextColor,
  unit = '',
}: {
  value: number;
  max: number;
  size?: number;
  trackColor?: string;
  fillColor?: string;
  textColor?: string;
  subTextColor?: string;
  unit?: string;
}) {
  const C = useScanColors();
  const strokeWidth = size >= 60 ? 7 : 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor ?? C.violet100} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fillColor ?? C.violet600}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: size >= 60 ? 15 : 13, fontWeight: '900', color: textColor ?? C.slate900 }}>
          {value}
          <Text style={{ fontSize: size >= 60 ? 11 : 9.5, fontWeight: '700', color: subTextColor ?? C.slate400 }}>/{max}{unit}</Text>
        </Text>
      </View>
    </View>
  );
}

// 점선 테두리(예전 스타일)는 "여기를 눌러서 선택하세요"처럼 보여서, 실제
// 선택 동작은 하단 독(카메라/앨범/문서) 버튼에 있는데도 이 카드를 눌러보려는
// 사용자가 있었다 — 테두리를 없애 순수 안내문 카드로 바꾸고, 진짜 선택
// 지점인 하단 버튼 쪽으로 시선을 유도하는 바운스 화살표 힌트를 덧붙였다.
function DropzoneCard() {
  const C = useScanColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 550, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });

  return (
    <View style={styles.dropzoneCard}>
      <View style={styles.dropzoneIconBox}>
        <Ionicons name="sparkles" size={18} color={C.slate600} />
      </View>
      <Text style={styles.dropzoneTitle}>분석할 알림장을 추가해 주세요</Text>
      <Text style={styles.dropzoneSubtitle}>
        가정통신문, 식단표를 넣으면 AI가 일정을 캘린더에 쏙쏙 정리해 드려요
      </Text>
      <Animated.View style={[styles.dropzoneHint, { transform: [{ translateY }] }]}>
        <Text style={styles.dropzoneHintText}>아래에서 사진이나 파일을 선택해주세요</Text>
        <Feather name="chevron-down" size={14} color={C.slate500} />
      </Animated.View>
    </View>
  );
}

function TipBox() {
  const C = useScanColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={styles.tipBox}>
      <Ionicons name="bulb" size={18} color={C.amber700} />
      <Text style={styles.tipText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        <Text style={styles.tipBold}>인식률 높이기 TIP: </Text>
        빛 반사가 없도록 평평한 곳에서 위에서 아래로 수직 촬영해 보세요!
      </Text>
    </View>
  );
}

// 무료 횟수를 다 쓴 사용자에게 분석 버튼까지 가지 않고도 바로 상단에서 광고를
// 보고 스캔권을 미리 충전할 수 있게 해주는 카드. 충전 후에도 카드는 그대로
// 두고 오른쪽 게이지가 0→1로 차오르는 것으로 충전됐음을 보여준다(카드 자체가
// 다른 모양으로 바뀌면, 실제로는 충전됐는데도 "반영이 안 된 것처럼" 보이는
// 문제가 있었다 — 기존 무료 스캔 잔여 게이지는 완전히 다른 숫자라 헷갈렸음).
function ScanCreditCard({
  watching,
  onWatchAd,
  adCredited,
}: {
  watching: boolean;
  onWatchAd: () => void;
  adCredited: boolean;
}) {
  const C = useScanColors();
  const styles = useMemo(() => createStyles(C), [C]);
  // 버튼 전체가 아주 살짝 작아졌다 커졌다 하며(+ 옅어졌다 또렷해지며) 천천히
  // 숨쉬듯 반복해서, 무료 횟수가 다 떨어졌을 때 시선이 자연스럽게 이 버튼으로
  // 가도록 유도한다. 이미 충전된 뒤에는 더 유도할 필요가 없어 멈춘다.
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseScale = pulse.interpolate({ inputRange: [0.6, 1], outputRange: [0.97, 1] });

  useEffect(() => {
    if (adCredited) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.6, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, adCredited]);

  return (
    <LinearGradient
      colors={[C.violet600, C.indigo600]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.creditCard}
    >
      <View style={styles.creditTopRow}>
        <View style={styles.creditTextBlock}>
          <View style={styles.creditBadge}>
            <Ionicons name="flash" size={13} color="#FCD34D" />
            <Text style={styles.creditBadgeText}>무료 이용권 모두 소진</Text>
          </View>
          <Text style={styles.creditHeadline}>
            {adCredited ? '스캔권 충전 완료!' : '광고 1개 보고 스캔권 충전하기'}
          </Text>
          <Text style={styles.creditSubtitle}>
            {adCredited ? (
              '지금 알림장을 추가해 바로 분석해보세요'
            ) : (
              <>짧은 광고 시청 시 <Text style={styles.creditSubtitleEm}>1회 즉시 충전</Text></>
            )}
          </Text>
        </View>
        <CircularGauge
          value={adCredited ? 1 : 0}
          max={1}
          unit="회"
          trackColor="rgba(255,255,255,0.25)"
          fillColor="#FCD34D"
          textColor="#FFFFFF"
          subTextColor="rgba(255,255,255,0.85)"
        />
      </View>
      {!adCredited && (
        <Animated.View style={{ opacity: pulse, transform: [{ scale: pulseScale }] }}>
          <Pressable style={styles.creditButton} onPress={onWatchAd} disabled={watching}>
            {watching ? (
              <ActivityIndicator color={C.violet700} />
            ) : (
              <>
                <Ionicons name="play" size={15} color={C.violet700} />
                <Text style={styles.creditButtonText}>광고 1개 시청하고 1회 충전하기</Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const GUIDE_STEPS = [
  { id: '1', title: '사진·파일 업로드', caption: '카메라나 앨범 선택' },
  { id: '2', title: 'AI 정밀 분석', caption: '날짜·일정 자동 추출' },
  { id: '3', title: '캘린더 연동', caption: '스마트 일정 저장' },
];

// 탭하면 눌린 단계가 강조 표시되는 3단 가이드 카드였는데, 눌렀을 때 강조
// 테두리가 하단 버튼과 시각적으로 겹쳐 보여 혼란스럽다는 피드백으로 탭
// 상호작용을 제거하고 2단계(AI 분석)만 고정으로 강조 표시되는 정적인 요약으로 남겼다.
function ScanGuideCard() {
  const C = useScanColors();
  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <View style={styles.guideCard}>
      <View style={styles.guideHeaderRow}>
        <View style={styles.guideHeaderLeft}>
          <View style={styles.guideInfoBadge}>
            <Feather name="info" size={13} color={C.slate600} />
          </View>
          <Text style={styles.guideTitle}>AI 스캔 이용 가이드</Text>
        </View>
        <View style={styles.guideProgressBadge}>
          <Text style={styles.guideProgressBadgeText}>3단계 자동 진행</Text>
        </View>
      </View>
      <View style={styles.guideDivider} />

      <View style={styles.guideGrid}>
        {GUIDE_STEPS.map((step) => {
          const isSelected = step.id === '2';
          return (
            <View key={step.id} style={[styles.guideStep, isSelected && styles.guideStepSelected]}>
              <View style={[styles.guideStepCircle, isSelected && styles.guideStepCircleSelected]}>
                <Text style={[styles.guideStepNumber, isSelected && styles.guideStepNumberSelected]}>
                  {step.id}
                </Text>
              </View>
              <Text style={styles.guideStepTitle}>{step.title}</Text>
              <Text style={[styles.guideStepCaption, isSelected && styles.guideStepCaptionSelected]}>
                {step.caption}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function DocCard({ doc, onRemove }: { doc: UploadedDoc; onRemove: () => void }) {
  const C = useScanColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={styles.docCard}>
      <View style={styles.docCardTopRow}>
        <View style={styles.docCardTag}>
          <Feather name={doc.kind === 'image' ? 'image' : 'file'} size={13} color={C.slate700} />
          <Text style={styles.docCardTagText}>선택된 {docTagLabel(doc)}</Text>
        </View>
        <Pressable onPress={onRemove} style={styles.docCardRemove} hitSlop={8}>
          <Feather name="x" size={15} color={C.slate400} />
        </Pressable>
      </View>
      <View style={styles.docCardBodyRow}>
        {doc.kind === 'image' ? (
          <Image source={{ uri: doc.uri }} style={styles.docCardThumb} />
        ) : (
          <LinearGradient colors={fileIconColors(doc, C)} style={styles.docCardThumb}>
            <Feather name="file-text" size={22} color="#FFFFFF" />
          </LinearGradient>
        )}
        <View style={styles.docCardInfo}>
          <Text style={styles.docCardName} numberOfLines={1}>
            {doc.name ?? (doc.kind === 'image' ? '사진' : '문서')}
          </Text>
          <Text style={styles.docCardMeta}>{[doc.sizeLabel, doc.pickedAt].filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
    </View>
  );
}

function SpinnerRing({ size }: { size: number }) {
  const C = useScanColors();
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 4,
        borderColor: C.slate100,
        borderTopColor: C.violet600,
        transform: [{ rotate }],
      }}
    />
  );
}

function SpinningIcon({ name, size, color }: { name: React.ComponentProps<typeof Feather>['name']; size: number; color: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Feather name={name} size={size} color={color} />
    </Animated.View>
  );
}

function AnalyzingBody({ label }: { label: string }) {
  const C = useScanColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={styles.analyzingContainer}>
      <View style={styles.analyzingSpinnerWrap}>
        <SpinnerRing size={80} />
        <Text style={styles.analyzingRobot}>🤖</Text>
      </View>
      <View style={styles.analyzingTextBlock}>
        <Text style={styles.analyzingTitle}>{label}에서 내용을 추출하고 있어요</Text>
        <Text style={styles.analyzingSubtitle}>
          행사 날짜, 준비물, 선생님 전달사항을{'\n'}AI가 꼼꼼하게 정리하는 중입니다...
        </Text>
      </View>
      <View style={styles.analyzingPill}>
        <SpinningIcon name="refresh-cw" size={14} color={C.violet600} />
        <Text style={styles.analyzingPillText}>텍스트 추출 및 캘린더 매핑 중</Text>
      </View>
    </View>
  );
}

function createStyles(C: ScanColors) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.appBg },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
  },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.slate900 },
  scrollFlex: { flex: 1 },
  scrollContent: { padding: 8, gap: 10 },
  scrollContentFill: { flexGrow: 1 },
  emptyStateFill: { flex: 1, gap: 14 },
  emptyStateSpacer: { flex: 1, minHeight: 6 },
  gaugeCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: C.slate200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  gaugeTextBlock: { flex: 1, gap: 4 },
  gaugeHeadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gaugeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.violet600 },
  gaugeHeadline: { fontSize: 15, fontWeight: '900', color: C.slate900, flexShrink: 1 },
  gaugeSubtitle: { fontSize: 12.5, color: C.slate400, fontWeight: '500', marginLeft: 16 },
  dropzoneCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.slate200,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 5,
  },
  dropzoneIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  dropzoneTitle: { fontSize: 16, fontWeight: '900', color: C.slate900, textAlign: 'center' },
  dropzoneSubtitle: { fontSize: 13.5, color: C.slate400, textAlign: 'center', lineHeight: 18 },
  dropzoneHint: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  dropzoneHintText: { fontSize: 12, fontWeight: '700', color: C.slate500 },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.amber50,
    borderWidth: 1,
    borderColor: C.amber200,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    // 위쪽 스페이서가 채워주는 여백 위에, 조금 더 아래로 내려 보이도록 추가 여백.
    marginTop: 10,
  },
  tipText: { flex: 1, fontSize: 12.5, color: C.slate700 },
  tipBold: { fontWeight: '600', color: C.amber700 },
  creditCard: {
    borderRadius: 24,
    padding: 12,
    gap: 7,
  },
  creditTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  creditTextBlock: { flex: 1, gap: 6 },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  creditBadgeText: { fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' },
  creditHeadline: { fontSize: 19, fontWeight: '700', color: '#FFFFFF' },
  creditSubtitle: { fontSize: 12.5, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  creditSubtitleEm: { fontWeight: '600', color: '#FCD34D', textDecorationLine: 'underline' },
  creditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 11,
  },
  creditButtonText: { fontSize: 12.5, fontWeight: '800', color: C.violet700 },
  guideCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 10,
    borderWidth: 1,
    borderColor: C.slate200,
    gap: 6,
    // 드롭존 카드와의 간격을 기본 gap보다 조금 더 벌려서 아래로 내려 보이게 함.
    marginTop: 6,
  },
  guideHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  guideHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guideInfoBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: C.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideTitle: { fontSize: 14.5, fontWeight: '500', color: C.slate900 },
  guideProgressBadge: { backgroundColor: C.slate100, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  guideProgressBadgeText: { fontSize: 10.5, fontWeight: '800', color: C.slate600 },
  guideDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.slate100 },
  guideGrid: { flexDirection: 'row', gap: 10 },
  guideStep: {
    flex: 1,
    backgroundColor: C.slate50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: 7,
    alignItems: 'center',
    gap: 2,
  },
  guideStepSelected: { backgroundColor: C.violet50 },
  guideStepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideStepCircleSelected: { backgroundColor: C.violet600 },
  guideStepNumber: { fontSize: 13, fontWeight: '900', color: C.slate500 },
  guideStepNumberSelected: { color: '#FFFFFF' },
  guideStepTitle: { fontSize: 12.5, fontWeight: '800', color: C.slate900, textAlign: 'center' },
  guideStepCaption: { fontSize: 10.5, fontWeight: '600', color: C.slate400 },
  guideStepCaptionSelected: { color: C.violet700 },
  docsSection: { gap: 10 },
  docsCountBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.slate100,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  docsCountBadgeText: { fontSize: 12, fontWeight: '700', color: C.slate600 },
  docCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 14,
    borderWidth: 2,
    borderColor: C.violet200,
    gap: 10,
  },
  docCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
    paddingBottom: 10,
  },
  docCardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.slate50,
    borderWidth: 1,
    borderColor: C.slate200,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  docCardTagText: { fontSize: 13, fontWeight: '800', color: C.slate700 },
  docCardRemove: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCardBodyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docCardThumb: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  docCardInfo: { flex: 1, gap: 2 },
  docCardName: { fontSize: 14, fontWeight: '900', color: C.slate900 },
  docCardMeta: { fontSize: 12.5, color: C.slate400 },
  dock: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.slate100,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 5,
    gap: 4,
  },
  dockHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dockHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dockHeaderText: { fontSize: 12.5, fontWeight: '700', color: C.slate600 },
  dockFastBadge: { backgroundColor: C.slate100, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  dockFastBadgeText: { fontSize: 10.5, fontWeight: '500', color: C.slate600 },
  dockRow: { flexDirection: 'row', gap: 8 },
  // 실제로 눌러서 선택하는 지점이라는 걸 분명히 보여주려고, 흰 배경 + 그림자 +
  // 아이콘 사각 배지로 카드형 버튼처럼 강조했다.
  dockButton: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: C.slate200,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 3,
  },
  dockButtonAccent: {
    backgroundColor: C.violet600,
    borderColor: C.violet200,
    borderWidth: 3,
    shadowColor: C.violet600,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  dockButtonIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.slate50,
  },
  dockButtonIconCircleAccent: { backgroundColor: 'rgba(255,255,255,0.25)' },
  dockButtonText: { fontSize: 13, fontWeight: '500', color: C.slate800 },
  dockButtonTextAccent: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  analyzeButtonWrap: { borderRadius: 16, overflow: 'hidden' },
  analyzeButtonWrapDisabled: { opacity: 0.5 },
  analyzeButton: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  analyzeButtonText: { color: C.white, fontSize: 16, fontWeight: '900' },
  analyzeAdCaption: { marginTop: 8, fontSize: 12, color: C.slate500, textAlign: 'center' },
  analyzingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
  analyzingSpinnerWrap: { alignItems: 'center', justifyContent: 'center' },
  analyzingRobot: { position: 'absolute', fontSize: 30 },
  analyzingTextBlock: { alignItems: 'center', gap: 6 },
  analyzingTitle: { fontSize: 17, fontWeight: '800', color: C.slate900, textAlign: 'center' },
  analyzingSubtitle: { fontSize: 14, color: C.slate500, textAlign: 'center', lineHeight: 20 },
  analyzingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.slate50,
    borderWidth: 1,
    borderColor: C.slate200,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  analyzingPillText: { fontSize: 13, fontWeight: '700', color: C.slate600 },
  });
}
