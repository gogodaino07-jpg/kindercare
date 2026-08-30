import { Feather, Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/common/AppText';
import { isAdTestAccount } from '../constants/adTestAccounts';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useAppLock } from '../context/AppLockContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useToast } from '../context/ToastContext';
import {
  AIUsageLimitService,
  FREE_MEAL_WEEKLY_LIMIT,
  GeminiAnalysisError,
  GeminiAnalysisService,
  PREMIUM_MEAL_MONTHLY_LIMIT,
  PREMIUM_MEAL_WEEKLY_LIMIT,
} from '../features/newsletter-analysis';
import { PremiumUpsellModal } from '../features/newsletter-analysis/components/PremiumUpsellModal';
import { ZoomableImage } from '../features/newsletter-analysis/components/ZoomableImage';
import { SCAN_COLORS as C } from '../features/newsletter-analysis/uiColors';
import { useScanRewardedAd } from '../hooks/useScanRewardedAd';
import { UploadedDoc } from '../types/models';

const CORAL = '#FF6F5B';
const CORAL_DARK = '#FF4E3A';
const HEADER_BUTTON_SIZE = 36;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ZOOM_WIDTH = SCREEN_WIDTH - 80;
const ZOOM_HEIGHT = 480;

export default function MealScanScreen() {
  const router = useRouter();
  const { selectedChild, googleAccount, addMealPlans } = useAppData();
  const { isSubscribed } = useSubscription();
  const { showAlert } = useAlert();
  const { setPickerActive } = useAppLock();
  const { showToast } = useToast();
  const { requestAndShow } = useScanRewardedAd();
  const insets = useSafeAreaInsets();

  const [doc, setDoc] = useState<UploadedDoc | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [remainingCount, setRemainingCount] = useState<number | null>(null);
  const maxMealCredits = isSubscribed ? PREMIUM_MEAL_WEEKLY_LIMIT : FREE_MEAL_WEEKLY_LIMIT;
  const skipAd = isAdTestAccount(googleAccount?.email);

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    AIUsageLimitService.getRemainingCount(googleAccount?.email, isSubscribed, 'meal').then(setRemainingCount);
  }, [googleAccount?.email, isSubscribed]);

  // TEMP(테스트용, 추후 제거 예정): 급식표 스캔 무료 횟수를 즉시 초기화한다.
  const handleResetTestUsage = async () => {
    if (!googleAccount?.email) return;
    await AIUsageLimitService.resetUsage(googleAccount.email, 'meal');
    setRemainingCount(await AIUsageLimitService.getRemainingCount(googleAccount.email, isSubscribed, 'meal'));
    showToast('급식표 스캔 횟수가 초기화됐어요.');
  };

  // 화면에 들어오면 바로 라이브 카메라 화면을 보여줄 수 있도록 미리 권한을 요청해둔다.
  useEffect(() => {
    requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 뷰파인더의 가운데 촬영 버튼: 사진을 아직 안 찍었으면 그 자리에서 바로 촬영하고,
  // 이미 찍은 사진이 보이는 중이면(다시 찍기) 라이브 화면으로 되돌아간다.
  const handleShutterPress = async () => {
    if (doc) {
      setDoc(null);
      return;
    }
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        setDoc({ id: `meal-${Date.now()}`, uri: photo.uri, kind: 'image', pickSource: 'camera' });
      }
    } catch {
      showAlert({ title: '촬영 실패', message: '사진을 촬영하지 못했어요. 다시 시도해주세요.' });
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
        // Android 13+ 기본 선택기는 구글 포토 UI로만 뜨는데, legacy를 켜면
        // 다른 갤러리 앱·파일 앱 등에서도 사진을 고를 수 있게 열린다.
        ...(Platform.OS === 'android' ? { legacy: true } : null),
      });
      if (!result.canceled && result.assets[0]) {
        setDoc({ id: `meal-${Date.now()}`, uri: result.assets[0].uri, kind: 'image', pickSource: 'gallery' });
      }
    } finally {
      setPickerActive(false);
    }
  };

  const handlePickFile = async () => {
    setPickerActive(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: false });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setDoc({
          id: `meal-${Date.now()}`,
          uri: asset.uri,
          kind: asset.mimeType?.startsWith('image/') ? 'image' : 'file',
          name: asset.name,
          pickSource: 'file',
        });
      }
    } finally {
      setPickerActive(false);
    }
  };

  const handleAnalyze = async () => {
    if (!doc) {
      showAlert({ title: '알림', message: '먼저 급식표 사진이나 파일을 올려주세요' });
      return;
    }
    if (!selectedChild) {
      showAlert({ title: '알림', message: '아이를 먼저 선택해주세요' });
      return;
    }

    const remaining = await AIUsageLimitService.getRemainingCount(googleAccount?.email, isSubscribed, 'meal');
    if (remaining <= 0) {
      if (isSubscribed) {
        showAlert({
          title: '이번 한도를 모두 사용했어요',
          message: `프리미엄은 급식표 스캔을 1주일 최대 ${PREMIUM_MEAL_WEEKLY_LIMIT}회, 1달 최대 ${PREMIUM_MEAL_MONTHLY_LIMIT}회까지 할 수 있어요. 다음 기간에 다시 시도해주세요.`,
          icon: '⏳',
        });
        return;
      }
      setShowPremiumModal(true);
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

      setAnalyzing(true);
      try {
        const analysis = await GeminiAnalysisService.analyze([doc], selectedChild, [], 'meal');
        if (analysis.mealPlans.length === 0) {
          showAlert({ title: '식단표를 찾지 못했어요', message: '더 선명한 사진으로 다시 시도해주세요.' });
          return;
        }
        await AIUsageLimitService.consume(googleAccount?.email, isSubscribed, 'meal');
        addMealPlans(analysis.mealPlans);
        showToast(`식단표 ${analysis.mealPlans.length}일치를 저장했어요 🍱`);
        router.back();
      } catch (err) {
        const message =
          err instanceof GeminiAnalysisError ? err.message : '문서 분석 중 문제가 발생했어요. 다시 시도해주세요.';
        showAlert({ title: '분석 실패', message });
      } finally {
        setAnalyzing(false);
      }
    } finally {
      setStarting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {analyzing ? (
        <View style={styles.analyzingContainer}>
          <ActivityIndicator size="large" color={C.violet600} />
          <Text style={styles.analyzingTitle}>급식표에서 메뉴를 읽고 있어요</Text>
          <Text style={styles.analyzingSubtitle}>요일별 메뉴를 AI가 정리하는 중입니다...</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.headerButton} hitSlop={6}>
              <Feather name="x" size={22} color={C.slate900} />
            </Pressable>
            <Text style={styles.headerTitle}>급식표 스캔</Text>
          </View>

          {remainingCount !== null && (
            <Text style={styles.remainingCaption}>
              이번 주 급식표 스캔 {remainingCount} / {maxMealCredits}회 남음
            </Text>
          )}

          {/* TEMP(테스트용, 추후 제거 예정) */}
          <Pressable onPress={handleResetTestUsage} style={styles.testResetButton}>
            <Text style={styles.testResetButtonText}>🧪 테스트용: 급식표 스캔 횟수 초기화</Text>
          </Pressable>

          <View style={styles.viewfinderWrap}>
            <View style={styles.viewfinder}>
              {doc ? (
                doc.kind === 'image' ? (
                  <>
                    <Image source={{ uri: doc.uri }} style={styles.previewImage} />
                    <Pressable onPress={() => setShowZoomModal(true)} style={styles.zoomButton} hitSlop={6}>
                      <Feather name="zoom-in" size={13} color="#FFFFFF" />
                      <Text style={styles.zoomButtonText}>확대 보기</Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.previewFile}>
                    <Feather name="file-text" size={40} color="#FFFFFF" />
                    <Text style={styles.previewFileName} numberOfLines={1}>{doc.name ?? '선택한 파일'}</Text>
                  </View>
                )
              ) : !permission ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : permission.granted ? (
                <>
                  <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
                  <Text style={styles.viewfinderHint}>급식표를 사각형 안에{'\n'}맞춰주세요</Text>
                </>
              ) : (
                <View style={styles.permissionFallback}>
                  <Feather name="camera-off" size={26} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.viewfinderHint}>카메라 권한이 필요해요</Text>
                  <Pressable onPress={requestPermission} style={styles.permissionButton}>
                    <Text style={styles.permissionButtonText}>권한 허용하기</Text>
                  </Pressable>
                </View>
              )}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </View>

          <View style={[styles.dock, { paddingBottom: 10 + insets.bottom }]}>
            <View style={styles.dockRow}>
              <Pressable onPress={handlePickGallery} style={styles.dockButton}>
                <Feather name="image" size={22} color={C.slate600} />
                <Text style={styles.dockButtonText}>갤러리</Text>
              </Pressable>
              <Pressable onPress={handleShutterPress} style={[styles.dockButton, styles.dockButtonAccent]}>
                <Feather name={doc ? 'refresh-ccw' : 'camera'} size={22} color="#FFFFFF" />
                <Text style={styles.dockButtonTextAccent}>{doc ? '다시 찍기' : '촬영'}</Text>
              </Pressable>
              <Pressable onPress={handlePickFile} style={styles.dockButton}>
                <Feather name="file-text" size={22} color={C.slate600} />
                <Text style={styles.dockButtonText}>파일</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleAnalyze}
              disabled={!doc || starting}
              style={[styles.analyzeButtonWrap, (!doc || starting) && styles.analyzeButtonWrapDisabled]}
            >
              <LinearGradient
                colors={[CORAL, CORAL_DARK]}
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
                    <Ionicons name="sparkles" size={18} color="#FFF3E0" />
                    <Text style={styles.analyzeButtonText}>AI로 내용 분석하기</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
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

      {doc?.kind === 'image' && (
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
                  <Text style={styles.zoomHeaderText}>급식표 크게보기</Text>
                </View>
                <Pressable onPress={() => setShowZoomModal(false)} style={styles.zoomCloseButton} hitSlop={6}>
                  <Feather name="x" size={16} color={C.slate500} />
                </Pressable>
              </View>
              <ZoomableImage uri={doc.uri} width={ZOOM_WIDTH} height={ZOOM_HEIGHT} />
              <Pressable onPress={() => setShowZoomModal(false)} style={styles.zoomCloseFooter}>
                <Text style={styles.zoomCloseFooterText}>닫기</Text>
              </Pressable>
            </View>
          </GestureHandlerRootView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.appBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
  },
  headerButton: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.slate900 },
  remainingCaption: {
    fontSize: 12,
    fontWeight: '600',
    color: C.slate400,
    textAlign: 'center',
    paddingTop: 10,
  },
  // TEMP(테스트용, 추후 제거 예정)
  testResetButton: {
    alignSelf: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
  },
  testResetButtonText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  viewfinderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  viewfinder: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 3 / 4,
    borderRadius: 24,
    backgroundColor: C.slate900,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  viewfinderHint: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  permissionFallback: { alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  permissionButton: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  permissionButtonText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  previewImage: { width: '100%', height: '100%' },
  previewFile: { alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  previewFileName: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  zoomButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  zoomButtonText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
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
    backgroundColor: '#FFFFFF',
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
  zoomCloseFooterText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  cornerTL: { top: 16, left: 16, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  cornerTR: { top: 16, right: 16, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  cornerBL: { bottom: 16, left: 16, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  cornerBR: { bottom: 16, right: 16, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  dock: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: 1,
    borderTopColor: C.slate100,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  dockRow: { flexDirection: 'row', gap: 8 },
  dockButton: {
    flex: 1,
    backgroundColor: C.slate50,
    borderRadius: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5EAF0',
    alignItems: 'center',
    gap: 4,
  },
  dockButtonAccent: { backgroundColor: C.slate800, borderColor: C.slate800 },
  dockButtonText: { fontSize: 14, fontWeight: '800', color: C.slate800 },
  dockButtonTextAccent: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  analyzeButtonWrap: { borderRadius: 16, overflow: 'hidden' },
  analyzeButtonWrapDisabled: { opacity: 0.5 },
  analyzeButton: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  analyzeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  analyzingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  analyzingTitle: { fontSize: 17, fontWeight: '800', color: C.slate900, textAlign: 'center' },
  analyzingSubtitle: { fontSize: 14, color: C.slate500, textAlign: 'center', lineHeight: 20 },
});
