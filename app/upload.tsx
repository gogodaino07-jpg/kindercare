import { Feather, Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { getInfoAsync } from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { PremiumUpsellModal } from '../features/newsletter-analysis/components/PremiumUpsellModal';
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
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const maxCredits = isSubscribed ? PREMIUM_WEEKLY_LIMIT : FREE_LIFETIME_LIMIT;
  const skipAd = isAdTestAccount(googleAccount?.email);

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
    if (remainingAnalyses !== null && remainingAnalyses <= 0) {
      if (isSubscribed) {
        showAlert({
          title: '이번 한도를 모두 사용했어요',
          message: `프리미엄은 1주일 최대 ${PREMIUM_WEEKLY_LIMIT}회, 1달 최대 ${PREMIUM_MONTHLY_LIMIT}회까지 스캔할 수 있어요. 다음 기간에 다시 시도해주세요.`,
          icon: '⏳',
        });
        return;
      }
      setShowPremiumModal(true);
      return;
    }
    if (!selectedChild) {
      showAlert({ title: '알림', message: '아이를 먼저 선택해주세요' });
      return;
    }

    setStarting(true);
    try {
      if (!isSubscribed && !skipAd) {
        const earnedReward = await requestAndShow();
        if (!earnedReward) {
          showAlert({ title: '광고 시청이 필요해요', message: '광고를 끝까지 시청해야 분석을 진행할 수 있어요. 다시 시도해주세요.' });
          return;
        }
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
            <Text style={styles.headerTitle}>AI 알림장 스마트 스캔</Text>
          </View>

          <ScrollView
            style={styles.scrollFlex}
            contentContainerStyle={[styles.scrollContent, docs.length === 0 && styles.scrollContentFill]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={docs.length > 0}
            bounces={docs.length > 0}
            overScrollMode={docs.length > 0 ? 'auto' : 'never'}
          >
            <View style={styles.gaugeCard}>
              <View style={styles.gaugeTopRow}>
                <View style={styles.gaugeTopLeft}>
                  <View style={styles.gaugeDot} />
                  <Text style={styles.gaugeLabel}>
                    {isSubscribed ? '이번 주 스캔 잔여 횟수' : '무료 스캔 잔여 횟수'}
                  </Text>
                </View>
                <Text style={styles.gaugeValue}>
                  {remainingAnalyses ?? '-'} <Text style={styles.gaugeMax}>/ {maxCredits}회</Text>
                </Text>
              </View>
              <View style={styles.gaugeTrack}>
                {Array.from({ length: maxCredits }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.gaugeSegment,
                      remainingAnalyses !== null && i < remainingAnalyses && styles.gaugeSegmentFilled,
                    ]}
                  />
                ))}
              </View>
              <View style={styles.gaugeFootRow}>
                <Text style={styles.gaugeFootText}>
                  {isSubscribed
                    ? '1회 스캔 시 사진/문서 1건이 분석됩니다'
                    : '평생 무료 횟수예요 (알림장+급식표 스캔 합산). 1회 스캔 시 사진/문서 1건이 분석됩니다'}
                </Text>
                {remainingAnalyses === 0 && <Text style={styles.gaugeExhaustedText}>모두 사용됨</Text>}
              </View>
            </View>

            {docs.length > 0 ? (
              <View style={styles.docsSection}>
                <Text style={styles.docsCountLabel}>
                  선택된 파일 {docs.length}개
                </Text>
                {docs.map((doc) => (
                  <DocCard key={doc.id} doc={doc} onRemove={() => removeDoc(doc.id)} />
                ))}
                <View style={styles.hintBox}>
                  <Ionicons name="sparkles" size={16} color={C.violet600} />
                  <Text style={styles.hintText}>
                    아래 <Text style={styles.hintBold}>[AI로 내용 분석하기]</Text> 버튼을 누르면 일정이
                    추출됩니다.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyStateFill}>
                <DropzoneCard onPress={handlePickFile} />
                <RoadmapCard />
                <TipBox />
              </View>
            )}
          </ScrollView>

          <View style={[styles.dock, isSubscribed && { paddingBottom: 8 + insets.bottom }]}>
            <View style={styles.dockRow}>
              <Pressable onPress={handleTakePhoto} style={styles.dockButton}>
                <Feather name="camera" size={22} color={C.violet600} />
                <Text style={styles.dockButtonText}>카메라 촬영</Text>
              </Pressable>
              <Pressable onPress={handlePickGallery} style={[styles.dockButton, styles.dockButtonAccent]}>
                <Feather name="image" size={22} color={C.violet700} />
                <Text style={styles.dockButtonTextAccent}>앨범 사진</Text>
              </Pressable>
              <Pressable onPress={handlePickFile} style={styles.dockButton}>
                <Feather name="file-text" size={22} color={C.slate600} />
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
                    <>
                      <Ionicons name="sparkles" size={18} color="#FCD34D" />
                      <Text style={styles.analyzeButtonText}>AI로 내용 분석하기 (1회 차감)</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            )}
            {docs.length > 0 && subscriptionReady && !isSubscribed && !skipAd && (
              <Text style={styles.analyzeAdCaption}>짧은 광고 시청 후 분석이 시작돼요</Text>
            )}
          </View>

          {subscriptionReady && !isSubscribed && <CoupangBanner style={{ paddingBottom: insets.bottom }} />}
        </>
      )}

      <PremiumUpsellModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onSubscribe={() => {
          setShowPremiumModal(false);
          router.push('/settings/subscription');
        }}
      />
    </SafeAreaView>
  );
}

function DropzoneCard({ onPress }: { onPress: () => void }) {
  const C = useScanColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <Pressable style={styles.dropzoneCard} onPress={onPress}>
      <View style={styles.dropzoneIconBox}>
        <Feather name="upload-cloud" size={24} color={C.violet600} />
      </View>
      <Text style={styles.dropzoneTitle}>통신문 사진이나 문서를 터치하여 업로드</Text>
      <Text style={styles.dropzoneSubtitle}>
        가정통신문, 주간계획안, 식단표를 인식하여{'\n'}캘린더 일정과 준비물로 바꿔드려요 ✨
      </Text>
    </Pressable>
  );
}

function TipBox() {
  const C = useScanColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={styles.tipBox}>
      <Ionicons name="bulb" size={18} color={C.amber700} />
      <Text style={styles.tipText}>
        <Text style={styles.tipBold}>스마트 스캔 팁: </Text>
        글자가 잘 보이도록 빛 반사 없이 찍어주시면 더 정확하게 추출됩니다!
      </Text>
    </View>
  );
}

function RoadmapConnector() {
  const C = useScanColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={styles.roadmapConnector}>
      <Feather name="chevron-down" size={16} color={C.slate300} />
    </View>
  );
}

function RoadmapCard() {
  const C = useScanColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={styles.roadmapCard}>
      <View style={styles.roadmapRow}>
        <View style={styles.roadmapStepCircle}>
          <Text style={styles.roadmapStepNumber}>01</Text>
        </View>
        <View style={styles.roadmapTextBlock}>
          <View style={styles.roadmapTitleRow}>
            <Text style={styles.roadmapTitle}>통신문 사진 또는 파일 올리기</Text>
            <View style={styles.roadmapTag}>
              <Text style={styles.roadmapTagText}>촬영·PDF·HWP</Text>
            </View>
          </View>
          <Text style={styles.roadmapDesc}>아래 버튼을 눌러 사진이나 문서를 선택하세요</Text>
        </View>
      </View>

      <RoadmapConnector />

      <View style={styles.roadmapRow}>
        <View style={[styles.roadmapStepCircle, styles.roadmapStepCircleAccent]}>
          <Ionicons name="sparkles" size={14} color="#FCD34D" />
        </View>
        <View style={styles.roadmapTextBlock}>
          <View style={styles.roadmapTitleRow}>
            <Text style={[styles.roadmapTitle, styles.roadmapTitleAccent]}>AI가 날짜와 준비물 자동 추출</Text>
            <View style={[styles.roadmapTag, styles.roadmapTagAccent]}>
              <Text style={[styles.roadmapTagText, styles.roadmapTagTextAccent]}>스마트 OCR</Text>
            </View>
          </View>
          <Text style={styles.roadmapDesc}>행사 일시, 챙길 물품, 선생님 메모를 알아서 분류</Text>
        </View>
      </View>

      <RoadmapConnector />

      <View style={styles.roadmapRow}>
        <View style={[styles.roadmapStepCircle, styles.roadmapStepCircleDone]}>
          <Text style={styles.roadmapStepNumber}>03</Text>
        </View>
        <View style={styles.roadmapTextBlock}>
          <View style={styles.roadmapTitleRow}>
            <Text style={styles.roadmapTitle}>내 캘린더에 바로 저장</Text>
            <View style={[styles.roadmapTag, styles.roadmapTagDone]}>
              <Text style={[styles.roadmapTagText, styles.roadmapTagTextDone]}>완료</Text>
            </View>
          </View>
          <Text style={styles.roadmapDesc}>당일 준비물 체크리스트 & D-day 알림 자동 연동</Text>
        </View>
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
          <Feather name={doc.kind === 'image' ? 'image' : 'file'} size={13} color={C.violet700} />
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
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
  },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.slate900 },
  scrollFlex: { flex: 1 },
  scrollContent: { padding: 14, gap: 10 },
  scrollContentFill: { flexGrow: 1 },
  emptyStateFill: { flex: 1, justifyContent: 'space-between', gap: 10 },
  gaugeCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: C.slate200,
    gap: 8,
  },
  gaugeTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gaugeTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gaugeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.violet600 },
  gaugeLabel: { fontSize: 14, fontWeight: '900', color: C.slate800 },
  gaugeValue: { fontSize: 14, fontWeight: '900', color: C.violet700 },
  gaugeMax: { color: C.slate400, fontWeight: '400' },
  gaugeTrack: { flexDirection: 'row', gap: 4, height: 8 },
  gaugeSegment: { flex: 1, height: '100%', borderRadius: 999, backgroundColor: C.slate100 },
  gaugeSegmentFilled: { backgroundColor: C.violet600 },
  gaugeFootRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gaugeFootText: { fontSize: 12, color: C.slate400, fontWeight: '500' },
  gaugeExhaustedText: { fontSize: 12, color: C.rose600, fontWeight: '700' },
  dropzoneCard: {
    borderWidth: 2,
    borderColor: C.violet200,
    borderStyle: 'dashed',
    borderRadius: 32,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  dropzoneIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: C.violet50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  dropzoneTitle: { fontSize: 16, fontWeight: '900', color: C.slate900, textAlign: 'center' },
  dropzoneSubtitle: { fontSize: 13.5, color: C.slate400, textAlign: 'center', lineHeight: 19 },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.amber50,
    borderWidth: 1,
    borderColor: C.amber200,
    borderRadius: 16,
    padding: 11,
  },
  tipText: { flex: 1, fontSize: 13.5, color: C.slate700, lineHeight: 19 },
  tipBold: { fontWeight: '900', color: C.amber700 },
  roadmapCard: {
    backgroundColor: C.surface,
    borderRadius: 32,
    padding: 14,
    borderWidth: 1,
    borderColor: C.slate100,
    gap: 4,
  },
  roadmapRow: { flexDirection: 'row', gap: 14 },
  roadmapConnector: { width: 32, alignItems: 'center' },
  roadmapStepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadmapStepCircleAccent: { backgroundColor: C.violet600 },
  roadmapStepCircleDone: { backgroundColor: C.emerald50, borderWidth: 1, borderColor: C.emerald100 },
  roadmapStepNumber: { fontSize: 14, fontWeight: '900', color: C.slate700 },
  roadmapTextBlock: { flex: 1, gap: 2 },
  roadmapTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roadmapTitle: { fontSize: 14, fontWeight: '900', color: C.slate800 },
  roadmapTitleAccent: { color: C.violet950 },
  roadmapDesc: { fontSize: 13, color: C.slate400, fontWeight: '400' },
  roadmapTag: { backgroundColor: C.slate100, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  roadmapTagAccent: { backgroundColor: C.violet100 },
  roadmapTagDone: { backgroundColor: C.emerald100 },
  roadmapTagText: { fontSize: 10.5, fontWeight: '900', color: C.slate500 },
  roadmapTagTextAccent: { color: C.violet700 },
  roadmapTagTextDone: { color: C.emerald800 },
  docsSection: { gap: 10 },
  docsCountLabel: { fontSize: 13, fontWeight: '700', color: C.slate400 },
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
    backgroundColor: C.violet50,
    borderWidth: 1,
    borderColor: C.violet100,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  docCardTagText: { fontSize: 13, fontWeight: '800', color: C.violet700 },
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
  hintBox: {
    backgroundColor: C.slate50,
    borderWidth: 1,
    borderColor: C.slate200,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  hintText: { flex: 1, fontSize: 13, color: C.slate600, lineHeight: 19 },
  hintBold: { fontWeight: '800', color: C.slate800 },
  dock: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.slate100,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
  },
  dockRow: { flexDirection: 'row', gap: 8 },
  dockButton: {
    flex: 1,
    backgroundColor: C.slate50,
    borderRadius: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.slate200,
    alignItems: 'center',
    gap: 4,
  },
  dockButtonAccent: { backgroundColor: C.violet50, borderColor: C.violet200 },
  dockButtonText: { fontSize: 14, fontWeight: '800', color: C.slate800 },
  dockButtonTextAccent: { fontSize: 14, fontWeight: '800', color: C.violet900 },
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
