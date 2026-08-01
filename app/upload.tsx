import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import Text from '../components/common/AppText';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useAppLock } from '../context/AppLockContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { isSimilarEvent } from '../data/mockAIResult';
import { Event, UploadedDoc } from '../types/models';
import {
  DAILY_ANALYSIS_LIMIT,
  consumeAnalysisUse,
  getRemainingAnalysisCount,
} from '../utils/aiUsageLimit';
import { GeminiAnalysisError, analyzeDocumentsWithGemini } from '../utils/geminiAnalysis';
import { setPendingAnalysisResult } from '../utils/pendingAnalysisResult';

const MAX_DOCS = 5;

export default function UploadScreen() {
  const router = useRouter();
  const { selectedChild, events } = useAppData();
  const { showAlert } = useAlert();
  const { setPickerActive } = useAppLock();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);

  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [remainingAnalyses, setRemainingAnalyses] = useState(DAILY_ANALYSIS_LIMIT);
  const [analyzing, setAnalyzing] = useState(false);

  // Animations
  const robotAnim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getRemainingAnalysisCount().then(setRemainingAnalyses);

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
      }
    } finally {
      setPickerActive(false);
    }
  };

  const removeDoc = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const goToAnalysis = (result: Omit<Event, 'id'>[]) => {
    setPendingAnalysisResult(result);
    showToast('업로드가 완료되었습니다.');
    router.push('/ai-review');
  };

  const handleAnalyze = async () => {
    if (docs.length === 0) {
      showAlert({ title: '알림', message: '먼저 사진이나 파일을 올려주세요' });
      return;
    }
    if (remainingAnalyses <= 0) {
      showAlert({
        title: '사용량 초과',
        message: '오늘의 무료 AI 분석 기회(3회)를 모두 소진하셨습니다. 내일 다시 시도해주세요!',
      });
      return;
    }

    setAnalyzing(true);
    let result: Awaited<ReturnType<typeof analyzeDocumentsWithGemini>>;
    try {
      result = await analyzeDocumentsWithGemini(docs, selectedChild);
    } catch (err) {
      const message =
        err instanceof GeminiAnalysisError
          ? err.message
          : '문서 분석 중 문제가 발생했어요. 다시 시도해주세요.';
      showAlert({ title: '분석 실패', message });
      setAnalyzing(false);
      return;
    }
    setAnalyzing(false);

    setRemainingAnalyses(await consumeAnalysisUse());

    const hasDuplicate = result.some((newEvent) =>
      events.some(
        (existing) => existing.childId === newEvent.childId && isSimilarEvent(existing, newEvent)
      )
    );
    if (hasDuplicate) {
      showAlert({
        title: '비슷한 일정이 이미 있어요',
        message: '그래도 계속 진행할까요?',
        buttons: [
          { text: '취소', style: 'cancel' },
          { text: '계속 진행', onPress: () => goToAnalysis(result) },
        ],
      });
      return;
    }
    goToAnalysis(result);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: '가정통신문 업로드' }} />

      <ScrollView
        scrollEnabled={docs.length > 0}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >

        <View style={styles.mainContainer}>

          {/* 1. Upload Options Row */}
          <View style={styles.uploadOptionsRow}>
            <TouchableOpacity style={styles.optionCard} activeOpacity={0.7} onPress={handleTakePhoto}>
              <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Text style={styles.iconEmoji}>📸</Text>
              </View>
              <Text style={styles.optionText}>사진 찍기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionCard} activeOpacity={0.7} onPress={handlePickGallery}>
              <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Text style={styles.iconEmoji}>🖼️</Text>
              </View>
              <Text style={styles.optionText}>갤러리</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionCard} activeOpacity={0.7} onPress={handlePickFile}>
              <View style={[styles.iconCircle, { backgroundColor: '#FAF5FF' }]}>
                <Text style={styles.iconEmoji}>📁</Text>
              </View>
              <Text style={styles.optionText}>파일</Text>
            </TouchableOpacity>
          </View>

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
                <Text style={styles.robotEmoji}>🤖</Text>
              </Animated.View>

              <Text style={styles.sparkleIcon}>✨</Text>
              <Text style={styles.lightbulbIcon}>💡</Text>
            </View>
          </View>

          {/* 3. Text Info (Shown only when empty) */}
          {docs.length === 0 && (
            <>
              <Text style={styles.mainTitle}>가정통신문을 분석해 드릴게요!</Text>
              <Text style={styles.subDescription}>
                사진 찍기, 갤러리, 파일 중{'\n'}편하신 걸로 올려주세요 ☺️
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
                      style={styles.removeBadge}
                      activeOpacity={0.7}
                      onPress={() => removeDoc(doc.id)}
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

      {/* 5. Bottom Action Area (Floating) */}
      <View style={[styles.bottomActionContainer, { bottom: 24 + insets.bottom }]}>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            오늘 남은 횟수 : <Text style={styles.countBadgeHighlight}>{remainingAnalyses}/{DAILY_ANALYSIS_LIMIT}회</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.analyzeButton, (analyzing || docs.length === 0) && styles.analyzeButtonDisabled]}
          activeOpacity={0.8}
          onPress={handleAnalyze}
          disabled={analyzing || docs.length === 0}
        >
          {analyzing ? (
            <View style={styles.analyzeLoadingRow}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.analyzeButtonText}>문서를 분석하고 있어요…</Text>
            </View>
          ) : (
            <Text style={styles.analyzeButtonText}>✨ AI로 내용 분석하기</Text>
          )}
        </TouchableOpacity>
      </View>
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
    },
    uploadOptionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 40,
    },
    optionCard: {
      width: '31%',
      aspectRatio: 1,
      backgroundColor: colors.cardWhite,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
      shadowOpacity: 0.03,
      elevation: 2,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    iconEmoji: {
      fontSize: 22,
    },
    optionText: {
      fontSize: 13,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    illustrationContainer: {
      width: 220,
      height: 220,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
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
    countBadge: {
      backgroundColor: colors.lightBlueBg,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    countBadgeText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.accent,
    },
    countBadgeHighlight: {
      color: colors.accent,
      fontWeight: '900',
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
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
}
