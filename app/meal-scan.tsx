import { Feather, Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/common/AppText';
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
import { SCAN_COLORS as C } from '../features/newsletter-analysis/uiColors';
import { useScanRewardedAd } from '../hooks/useScanRewardedAd';
import { UploadedDoc } from '../types/models';

const CORAL = '#FF6F5B';
const CORAL_DARK = '#FF4E3A';
const HEADER_BUTTON_SIZE = 36;

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
  const [remainingCount, setRemainingCount] = useState<number | null>(null);
  const maxMealCredits = isSubscribed ? PREMIUM_MEAL_WEEKLY_LIMIT : FREE_MEAL_WEEKLY_LIMIT;

  useEffect(() => {
    AIUsageLimitService.getRemainingCount(googleAccount?.email, isSubscribed, 'meal').then(setRemainingCount);
  }, [googleAccount?.email, isSubscribed]);

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
        setDoc({ id: `meal-${Date.now()}`, uri: result.assets[0].uri, kind: 'image', pickSource: 'camera' });
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
      if (!isSubscribed) {
        const earnedReward = await requestAndShow();
        if (!earnedReward) {
          showAlert({ title: '광고 시청이 필요해요', message: '광고를 끝까지 시청해야 분석을 진행할 수 있어요. 다시 시도해주세요.' });
          return;
        }
      }

      setAnalyzing(true);
      try {
        const analysis = await GeminiAnalysisService.analyze([doc], selectedChild, []);
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
            <View style={styles.headerButton} />
          </View>

          {remainingCount !== null && (
            <Text style={styles.remainingCaption}>
              이번 주 급식표 스캔 {remainingCount} / {maxMealCredits}회 남음
            </Text>
          )}

          <View style={styles.viewfinderWrap}>
            <View style={styles.viewfinder}>
              {doc ? (
                doc.kind === 'image' ? (
                  <Image source={{ uri: doc.uri }} style={styles.previewImage} />
                ) : (
                  <View style={styles.previewFile}>
                    <Feather name="file-text" size={40} color="#FFFFFF" />
                    <Text style={styles.previewFileName} numberOfLines={1}>{doc.name ?? '선택한 파일'}</Text>
                  </View>
                )
              ) : (
                <Text style={styles.viewfinderHint}>급식표를 사각형 안에{'\n'}맞춰주세요</Text>
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
              <Pressable onPress={handleTakePhoto} style={[styles.dockButton, styles.dockButtonAccent]}>
                <Feather name="camera" size={22} color="#FFFFFF" />
                <Text style={styles.dockButtonTextAccent}>촬영</Text>
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
          showToast('프리미엄은 곧 출시될 예정이에요! 조금만 기다려주세요 😊');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.appBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.white,
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
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  previewImage: { width: '100%', height: '100%' },
  previewFile: { alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  previewFileName: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
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
