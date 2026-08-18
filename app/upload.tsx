import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import Text from '../components/common/AppText';
import { SHADOW, ThemeColors } from '../constants/theme';
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

export default function UploadScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isMealMode = mode === 'meal';
  const { selectedChild, events, googleAccount, addMealPlans } = useAppData();
  const { isSubscribed } = useSubscription();
  const { showAlert } = useAlert();
  const { setPickerActive } = useAppLock();
  const { showToast } = useToast();
  const { requestAndShow } = useScanRewardedAd();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);

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

  // Animations
  const robotAnim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const breathAnim = useRef(new Animated.Value(1)).current;

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

    // Robot floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(robotAnim, {
          toValue: -12,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(robotAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Scan line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 85,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Button balloon floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Robot balloon breathing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1.05,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
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

    // 급식 메뉴 전용 스캔은 일정과 무관하게 급식 메뉴만 가져오면 끝 — 검수 화면으로 보내지 않는다.
    // 종합(가정통신문) 스캔에서는 급식 메뉴가 감지돼도 저장하지 않는다 — 급식은 반드시 전용 스캔으로만 등록.
    if (isMealMode) {
      if (mealPlans.length > 0) {
        addMealPlans(mealPlans);
      }
      AnalysisResultStore.clearPendingSession();
      showToast(mealPlans.length > 0 ? '급식 메뉴를 등록했어요 🍱' : '사진에서 급식 메뉴를 찾지 못했어요. 다른 사진으로 시도해보세요.');
      router.back();
      return;
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

  const isUploadDisabled = analyzing;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: isMealMode ? '급식 메뉴 스캔' : '가정통신문 업로드' }} />

      <ScrollView
        scrollEnabled={docs.length > 0}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          docs.length === 0 && { paddingBottom: 0 }
        ]}
        bounces={false}
        overScrollMode="never"
      >

        <View style={styles.mainContainer}>

          {/* 1. Upload Options Row - Removed and replaced by FAB Menu */}

          {/* 2. AI Illustration Area */}
          <View style={styles.illustrationContainer}>
            <View style={styles.bgBlueCircle} />
            <View style={styles.innerWhiteCircle} />

            <View style={styles.illustCenter}>
              {/* Document Card */}
              <View style={styles.documentCard}>
                <View style={styles.docHeaderLine} />
                <View style={[styles.docLine, { width: '85%' }]} />
                <View style={styles.docLine} />
                <View style={styles.docLine} />
                <View style={[styles.docLine, { width: '80%', marginTop: 8 }]} />

                {/* Scanning Line */}
                <Animated.View style={[
                  styles.scanningLine,
                  { transform: [{ translateY: scanAnim }] }
                ]} />
              </View>

              {/* Floating Robot */}
              <Animated.View style={[
                styles.robotContainer,
                { transform: [{ translateY: robotAnim }] }
              ]}>
                <Animated.View style={[
                  styles.robotBalloon,
                  { transform: [{ scale: breathAnim }] }
                ]}>
                  <Text style={styles.robotBalloonText}>
                    {remainingAnalyses === 0
                      ? '이번 기간 스캔 횟수를 다 썼어요'
                      : docs.length > 0
                        ? '✨ 분석하기 누르기 가능!'
                        : isMealMode
                          ? '급식 메뉴 사진을 올려주세요'
                          : '가정통신문을 올려주세요'}
                  </Text>
                  <Text style={styles.robotUsageText}>
                    {isSubscribed ? '이번 주 남은 프리미엄 횟수' : '이번 주 무료 횟수'}: <Text style={styles.highlightCount}>{remainingAnalyses ?? '-'}</Text>회 남음
                  </Text>
                  <View style={styles.robotBalloonArrow} />
                </Animated.View>
                <Text style={styles.robotEmoji}>🤖</Text>
              </Animated.View>

              <Text style={styles.sparkleIcon}>✨</Text>
              <Text style={styles.lightbulbIcon}>💡</Text>
            </View>
          </View>

          {/* 급식 메뉴는 이 화면에서 등록되지 않으므로 전용 스캔 화면으로 안내 */}
          {!isMealMode && (
            <Pressable
              style={styles.mealBanner}
              onPress={() => router.push({ pathname: '/upload', params: { mode: 'meal' } })}
            >
              <Text style={styles.mealBannerIcon}>🍱</Text>
              <View style={styles.mealBannerTextBlock}>
                <Text style={styles.mealBannerTitle}>급식 메뉴만 등록하고 싶으신가요?</Text>
                <Text style={styles.mealBannerSubtitle}>여기를 눌러 급식 메뉴 스캔으로 이동하세요</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.pastelOrangeAccent} />
            </Pressable>
          )}

          {/* 3. Text Info (Shown only when empty) */}
          {docs.length === 0 && (
            <>
              <Text style={styles.mainTitle}>
                {isMealMode ? '오늘의 급식 메뉴를 스캔해 드릴게요!' : '가정통신문을 분석해 드릴게요!'}
              </Text>
              <Text style={styles.subDescription}>
                우측 하단의 + 버튼을 눌러{'\n'}사진이나 파일을 올려주세요 ☺️
              </Text>
            </>
          )}

          {/* 4. Uploaded Files Slot Grid (Shown only when files exist) */}
          {docs.length > 0 && (
            <View style={styles.slotSection}>
              <Text style={styles.countLabel}>업로드된 파일 {docs.length} / {MAX_DOCS}</Text>
              <View style={styles.gridContainer}>
                {docs.map((doc) => (
                  <View key={doc.id} style={styles.slotWrapper}>
                    <View style={styles.imageThumb}>
                      {doc.kind === 'image' ? (
                        <Image source={{ uri: doc.uri }} style={styles.imageThumbImg} />
                      ) : (
                        <View style={styles.fileSlotPlaceholder}>
                          <Text style={styles.fileSlotIcon}>📄</Text>
                          <Text style={styles.fileSlotText} numberOfLines={1}>{doc.name || '파일'}</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.removeBadge, analyzing && { opacity: 0.5 }]}
                      activeOpacity={0.7}
                      onPress={() => !analyzing && removeDoc(doc.id)}
                      disabled={analyzing}
                    >
                      <Text style={styles.removeBadgeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

        </View>
      </ScrollView>

      <View style={[styles.bottomActionContainer, { bottom: 24 + insets.bottom }]}>
        {docs.length > 0 && remainingAnalyses !== null && remainingAnalyses > 0 && (
          <Animated.View style={[
            styles.buttonBalloon,
            { transform: [{ translateY: floatAnim }] }
          ]}>
            <Text style={styles.buttonBalloonText}>이제 분석을 시작해 볼까요? ✨</Text>
            <View style={styles.buttonBalloonArrow} />
          </Animated.View>
        )}

        {remainingAnalyses === null ? (
          <View style={[styles.analyzeButton, styles.analyzeButtonDisabled]}>
            <ActivityIndicator color={colors.cardWhite} />
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.analyzeButton, (analyzing || docs.length === 0) && styles.analyzeButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleAnalyze}
            disabled={analyzing || docs.length === 0}
          >
            {analyzing ? (
              <View style={styles.analyzeLoadingRow}>
                <ActivityIndicator color={colors.cardWhite} />
                <Text style={styles.analyzeButtonText}>문서를 분석하고 있어요…</Text>
              </View>
            ) : (
              <Text style={styles.analyzeButtonText}>✨ AI로 내용 분석하기</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* FAB and Menu Bar */}
      {!analyzing && (
        <View style={[styles.fabContainer, { bottom: 100 + insets.bottom }]}>
          {isMenuOpen && (
            <View style={styles.menuBar}>
              <TouchableOpacity
                style={[styles.menuItem, lastUsedType === 'file' && styles.menuItemActive]}
                onPress={handlePickFile}
              >
                <Text style={styles.menuItemEmoji}>📁</Text>
                <Text style={styles.menuItemText}>파일</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, lastUsedType === 'camera' && styles.menuItemActive]}
                onPress={handleTakePhoto}
              >
                <Text style={styles.menuItemEmoji}>📸</Text>
                <Text style={styles.menuItemText}>카메라</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, lastUsedType === 'gallery' && styles.menuItemActive]}
                onPress={handlePickGallery}
              >
                <Text style={styles.menuItemEmoji}>🖼️</Text>
                <Text style={styles.menuItemText}>갤러리</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.fabButton}
            activeOpacity={0.8}
            onPress={() => setIsMenuOpen(!isMenuOpen)}
          >
            <MaterialCommunityIcons
              name={isMenuOpen ? "close" : "plus"}
              size={30}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.skyBackground,
    },
    scrollContent: {
      paddingBottom: 280 + bottomInset,
    },
    mainContainer: {
      paddingHorizontal: 20,
      paddingTop: 32,
      alignItems: 'center',
      flex: 1,
    },
    mealBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      backgroundColor: colors.orangeLight1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.pastelOrange,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 16,
      gap: 10,
    },
    mealBannerIcon: {
      fontSize: 22,
    },
    mealBannerTextBlock: {
      flex: 1,
    },
    mealBannerTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.gray900,
    },
    mealBannerSubtitle: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.gray500,
      marginTop: 2,
    },
    illustrationContainer: {
      width: 220,
      height: 220,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
      marginTop: 20,
    },
    bgBlueCircle: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      backgroundColor: colors.accent,
      opacity: 0.2,
      borderRadius: 110,
    },
    innerWhiteCircle: {
      position: 'absolute',
      width: '80%',
      height: '80%',
      backgroundColor: colors.lightBlueBg,
      borderRadius: 90,
      borderWidth: 1,
      borderColor: colors.cardWhite,
    },
    illustCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
    },
    robotContainer: {
      position: 'absolute',
      top: 15,
      zIndex: 20,
      alignItems: 'center',
    },
    robotBalloon: {
      backgroundColor: colors.cardWhite,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 16,
      marginBottom: 8,
      ...SHADOW,
      shadowOpacity: 0.1,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative',
    },
    robotBalloonText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.accent,
      textAlign: 'center',
    },
    robotUsageText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 2,
      textAlign: 'center',
    },
    highlightCount: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.tomorrowRed,
    },
    robotBalloonArrow: {
      position: 'absolute',
      bottom: -8,
      left: '50%',
      marginLeft: -8,
      width: 0,
      height: 0,
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderTopWidth: 8,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: colors.cardWhite,
    },
    robotEmoji: {
      fontSize: 60,
    },
    documentCard: {
      position: 'absolute',
      bottom: 20,
      backgroundColor: colors.cardWhite,
      padding: 14,
      borderRadius: 16,
      width: 100,
      height: 130,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
      shadowOpacity: 0.06,
      elevation: 4,
      gap: 6,
      overflow: 'hidden',
      zIndex: 10,
    },
    docHeaderLine: {
      height: 5,
      backgroundColor: colors.accent,
      opacity: 0.3,
      borderRadius: 3,
      width: '60%',
      marginBottom: 4,
    },
    docLine: {
      height: 7,
      backgroundColor: colors.gray100,
      borderRadius: 4,
      width: '100%',
    },
    scanningLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 12,
      height: 4,
      backgroundColor: colors.accent,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 6,
      elevation: 4,
      zIndex: 20,
    },
    sparkleIcon: {
      position: 'absolute',
      top: 30,
      left: 15,
      fontSize: 22,
    },
    lightbulbIcon: {
      position: 'absolute',
      bottom: 40,
      right: 15,
      fontSize: 26,
    },
    mainTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 6,
      textAlign: 'center',
    },
    subDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    slotSection: {
      width: '100%',
      marginTop: 32,
      alignItems: 'center',
    },
    countLabel: {
      marginBottom: 12,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'center',
    },
    slotWrapper: {
      width: '17%',
      aspectRatio: 1,
      position: 'relative', // Necessary for absolute remove badge
    },
    imageThumb: {
      width: '100%',
      height: '100%',
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: 'rgba(255, 255, 255, 0.6)', // Semi-transparent white
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      ...SHADOW,
    },
    imageThumbImg: {
      width: '100%',
      height: '100%',
    },
    fileSlotPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
      backgroundColor: 'rgba(255, 255, 255, 0.4)', // Consistent semi-transparent bg
    },
    fileSlotIcon: { fontSize: 18, marginBottom: 2 },
    fileSlotText: { fontSize: 8, color: colors.textPrimary, textAlign: 'center' },
    removeBadge: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
    },
    removeBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
    bottomActionContainer: {
      position: 'absolute',
      bottom: 24 + bottomInset,
      left: 20,
      right: 20,
      alignItems: 'center',
    },
    buttonBalloon: {
      backgroundColor: colors.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 24,
      marginBottom: 6, // Adjusted to keep arrow visible and close to button
      ...SHADOW,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonBalloonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    buttonBalloonArrow: {
      position: 'absolute',
      bottom: -7.5, // Tightly coupled with the balloon
      left: '50%',
      marginLeft: -8,
      width: 0,
      height: 0,
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderTopWidth: 8,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: colors.accent,
    },
    analyzeButton: {
      width: '100%',
      flexDirection: 'row',
      backgroundColor: colors.gray900,
      paddingVertical: 16,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
      shadowColor: colors.gray900,
      shadowOpacity: 0.3,
      elevation: 5,
    },
    analyzeButtonDisabled: {
      backgroundColor: '#94A3B8',
      opacity: 0.6,
    },
    analyzeLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    analyzeButtonText: {
      color: colors.cardWhite,
      fontSize: 16,
      fontWeight: 'bold',
    },
    fabContainer: {
      position: 'absolute',
      right: 20,
      alignItems: 'flex-end',
    },
    fabButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#4A4A4A',
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
      elevation: 5,
    },
    menuBar: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderRadius: 30,
      padding: 6,
      marginBottom: 12,
      ...SHADOW,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    menuItem: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      minWidth: 60,
    },
    menuItemActive: {
      backgroundColor: '#F1F1F3',
    },
    menuItemEmoji: {
      fontSize: 20,
      marginBottom: 2,
    },
    menuItemText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });
}
