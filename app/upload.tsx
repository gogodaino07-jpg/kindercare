import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { generateMockAIEvents, isSimilarEvent } from '../data/mockAIResult';
import { UploadedDoc } from '../types/models';
import {
  DAILY_ANALYSIS_LIMIT,
  consumeAnalysisUse,
  getRemainingAnalysisCount,
} from '../utils/aiUsageLimit';

const MAX_DOCS = 5;

export default function UploadScreen() {
  const router = useRouter();
  const { selectedChild, events } = useAppData();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [remainingAnalyses, setRemainingAnalyses] = useState(DAILY_ANALYSIS_LIMIT);

  useEffect(() => {
    getRemainingAnalysisCount().then(setRemainingAnalyses);
  }, []);

  const addDoc = (doc: UploadedDoc) => {
    if (docs.length >= MAX_DOCS) {
      Alert.alert('최대 5장까지 업로드할 수 있어요');
      return;
    }
    setDocs((prev) => [...prev, doc]);
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('카메라 권한이 필요해요');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      addDoc({ id: `doc-${Date.now()}`, uri: result.assets[0].uri, kind: 'image' });
    }
  };

  const handlePickGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('사진첩 권한이 필요해요');
      return;
    }
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
  };

  const handlePickFile = async () => {
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
  };

  const removeDoc = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const goToAnalysis = () => {
    router.push('/ai-review');
  };

  const handleAnalyze = async () => {
    if (docs.length === 0) {
      Alert.alert('먼저 사진이나 파일을 올려주세요');
      return;
    }
    if (remainingAnalyses <= 0) {
      Alert.alert(
        '오늘의 무료 AI 분석 기회(3회)를 모두 소진하셨습니다. 내일 다시 시도해주세요!'
      );
      return;
    }
    setRemainingAnalyses(await consumeAnalysisUse());

    const mockResult = generateMockAIEvents(selectedChild);
    const hasDuplicate = mockResult.some((mockEvent) =>
      events.some(
        (existing) =>
          existing.childId === mockEvent.childId && isSimilarEvent(existing, mockEvent)
      )
    );
    if (hasDuplicate) {
      Alert.alert('비슷한 일정이 이미 있어요', '그래도 계속 진행할까요?', [
        { text: '취소', style: 'cancel' },
        { text: '계속 진행', onPress: goToAnalysis },
      ]);
      return;
    }
    goToAnalysis();
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.sourceRow}>
            <Pressable style={styles.sourceButton} onPress={handleTakePhoto}>
              <Text style={styles.sourceIcon}>📷</Text>
              <Text style={styles.sourceLabel}>사진 찍기</Text>
            </Pressable>
            <Pressable style={styles.sourceButton} onPress={handlePickGallery}>
              <Text style={styles.sourceIcon}>🖼️</Text>
              <Text style={styles.sourceLabel}>갤러리</Text>
            </Pressable>
            <Pressable style={styles.sourceButton} onPress={handlePickFile}>
              <Text style={styles.sourceIcon}>📄</Text>
              <Text style={styles.sourceLabel}>파일</Text>
            </Pressable>
          </View>

          <Text style={styles.countLabel}>{docs.length} / {MAX_DOCS}</Text>

          <View style={styles.docGrid}>
            {docs.map((doc) =>
              doc.kind === 'image' ? (
                <View key={doc.id} style={styles.imageThumb}>
                  <Image source={{ uri: doc.uri }} style={styles.imageThumbImg} />
                  <Pressable style={styles.removeBadge} onPress={() => removeDoc(doc.id)}>
                    <Text style={styles.removeBadgeText}>✕</Text>
                  </Pressable>
                </View>
              ) : (
                <View key={doc.id} style={styles.fileCard}>
                  <Text style={styles.fileIcon}>📄</Text>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {doc.name ?? '파일'}
                  </Text>
                  <Pressable style={styles.removeBadge} onPress={() => removeDoc(doc.id)}>
                    <Text style={styles.removeBadgeText}>✕</Text>
                  </Pressable>
                </View>
              )
            )}
          </View>
        </ScrollView>

        <Text style={styles.usageText}>
          오늘 남은 횟수: {remainingAnalyses}/{DAILY_ANALYSIS_LIMIT}회
        </Text>
        <Pressable style={styles.analyzeButton} onPress={handleAnalyze}>
          <Text style={styles.analyzeButtonText}>AI로 내용 분석하기</Text>
        </Pressable>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: { padding: 20, paddingBottom: 12 },
    sourceRow: {
      flexDirection: 'row',
      gap: 12,
    },
    sourceButton: {
      flex: 1,
      aspectRatio: 1,
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
    },
    sourceIcon: { fontSize: 28, marginBottom: 6 },
    sourceLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    countLabel: {
      marginTop: 20,
      marginBottom: 8,
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'right',
    },
    docGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    imageThumb: {
      width: 90,
      height: 90,
      borderRadius: 12,
      overflow: 'hidden',
    },
    imageThumbImg: {
      width: '100%',
      height: '100%',
    },
    fileCard: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardWhite,
      borderRadius: 12,
      padding: 12,
      ...SHADOW,
    },
    fileIcon: { fontSize: 20, marginRight: 8 },
    fileName: { flex: 1, fontSize: 13, color: colors.textPrimary },
    removeBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeBadgeText: { color: '#FFFFFF', fontSize: 11 },
    usageText: {
      textAlign: 'center',
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    analyzeButton: {
      marginHorizontal: 20,
      marginBottom: 16,
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      ...SHADOW,
    },
    analyzeButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
