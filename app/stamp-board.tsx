import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import Text from '../components/common/AppText';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { useStampBoard } from '../hooks/useStampBoard';

const { width } = Dimensions.get('window');

export default function StampBoardScreen() {
  const { selectedChild } = useAppData();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const {
    targetCount,
    currentStamps,
    wish,
    hasStampedToday,
    isCompleted,
    addStamp,
    updateSettings,
    resetProgress,
  } = useStampBoard(selectedChild?.id);

  const [showSettings, setShowSettings] = useState(false);
  const [tempTarget, setTempTarget] = useState(String(targetCount));
  const [tempWish, setTempWish] = useState(wish);
  const [stampingIndex, setStampingIndex] = useState<number | null>(null);

  const stampAnim = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setTempTarget(String(targetCount));
    setTempWish(wish);
  }, [targetCount, wish]);

  const handleStamp = () => {
    if (hasStampedToday || isCompleted) return;

    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    setStampingIndex(currentStamps);

    Animated.sequence([
      Animated.timing(stampAnim, { toValue: 1.5, duration: 200, useNativeDriver: true }),
      Animated.timing(stampAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      addStamp();
      setStampingIndex(null);
    });
  };

  const saveSettings = () => {
    const numTarget = Math.max(1, Number(tempTarget) || 1);
    updateSettings(numTarget, tempWish);
    setShowSettings(false);
  };

  const progressPercent = Math.min((currentStamps / Math.max(targetCount, 1)) * 100, 100);

  return (
    <ScreenBackground>
      <Stack.Screen
        options={{
          title: '참 잘했어요 도장판',
          headerRight: () => (
            <Pressable onPress={() => setShowSettings(true)} hitSlop={8}>
              <MaterialIcons name="settings" size={22} color={colors.gray600} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.wishCard}>
            <View style={styles.wishTag}>
              <MaterialIcons name="auto-awesome" size={12} color="#FFFFFF" />
              <Text style={styles.wishTagText}>도장을 다 모으면?</Text>
            </View>
            <Text style={styles.wishTitle}>{wish || '소원을 설정해보세요 ⚙️'}</Text>

            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>진행률</Text>
              <Text style={styles.progressValue}>{currentStamps} / {targetCount}</Text>
            </View>

            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          <View style={styles.boardContainer}>
            <View style={styles.grid}>
              {Array.from({ length: targetCount }).map((_, index) => {
                const isStamped = index < currentStamps;
                const isJustStamped = index === stampingIndex;

                return (
                  <View key={index} style={styles.stampWrapper}>
                    <Animated.View
                      style={[
                        styles.stampCircle,
                        isStamped ? styles.stampCircleActive : styles.stampCircleInactive,
                        isJustStamped && { transform: [{ scale: stampAnim }] },
                        isJustStamped && styles.stampCircleJustStamped,
                      ]}
                    >
                      {!isStamped && !isJustStamped && <Text style={styles.stampNumber}>{index + 1}</Text>}
                      {(isStamped || isJustStamped) && (
                        <MaterialIcons name="star" size={30} color={isJustStamped ? '#FFFFFF' : '#F59E0B'} />
                      )}
                    </Animated.View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%', alignItems: 'center' }}>
            <Pressable
              onPress={handleStamp}
              disabled={hasStampedToday || isCompleted}
              style={[styles.actionBtn, hasStampedToday && styles.actionBtnDisabled]}
            >
              {hasStampedToday ? (
                <>
                  <MaterialIcons name="check-circle" size={26} color={colors.gray400} />
                  <Text style={styles.actionBtnTextDisabled}>내일 또 만나요!</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="favorite" size={26} color="#FFFFFF" />
                  <Text style={styles.actionBtnTextActive}>오늘의 도장 쾅!</Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        </View>

        {/* 목표 달성 축하 오버레이 */}
        <Modal visible={isCompleted} animationType="fade" transparent>
          <View style={styles.celebrationOverlay}>
            <View style={styles.celebrationCard}>
              <View style={styles.trophyIcon}>
                <MaterialIcons name="emoji-events" size={44} color="#F59E0B" />
              </View>
              <Text style={styles.celebrationTitle}>우와! 해냈어요!</Text>
              <Text style={styles.celebrationSubtitle}>목표한 도장을 모두 모았습니다!</Text>

              <View style={styles.rewardBox}>
                <Text style={styles.rewardBoxLabel}>우리의 약속 🎁</Text>
                <Text style={styles.rewardBoxValue}>{wish || '소원을 설정해보세요'}</Text>
              </View>

              <Pressable style={styles.restartBtn} onPress={resetProgress}>
                <Text style={styles.restartBtnText}>새로운 목표 시작하기</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* 설정 모달 */}
        <Modal visible={showSettings} animationType="slide" transparent>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.select({ ios: 0, android: -100 })}
          >
            <View style={styles.settingsCard}>
              <View style={styles.settingsHeader}>
                <MaterialCommunityIcons name="crown" size={22} color={colors.gray600} />
                <Text style={styles.settingsTitle}>도장판 설정</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>총 목표 도장 개수</Text>
                <TextInput
                  style={styles.input}
                  value={tempTarget}
                  onChangeText={setTempTarget}
                  keyboardType="numeric"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>다 모으면 이루어줄 소원</Text>
                <TextInput
                  style={styles.input}
                  value={tempWish}
                  onChangeText={setTempWish}
                  placeholder="예: 에버랜드 가기"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setShowSettings(false)}>
                  <Text style={styles.cancelBtnText}>취소</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={saveSettings}>
                  <Text style={styles.saveBtnText}>저장하기</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function createStyles(colors: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 120 + bottomInset },
    wishCard: {
      backgroundColor: '#6366F1',
      borderRadius: 24,
      padding: 24,
      marginBottom: 24,
      ...SHADOW,
      shadowColor: '#4338CA',
      shadowOpacity: 0.25,
      elevation: 8,
    },
    wishTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      alignSelf: 'flex-start',
      marginBottom: 16,
    },
    wishTagText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    wishTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', lineHeight: 28, marginBottom: 20 },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 8,
    },
    progressText: { color: '#E0E7FF', fontSize: 13, fontWeight: '600' },
    progressValue: { color: '#FDE047', fontSize: 22, fontWeight: '900' },
    progressBarBackground: {
      width: '100%',
      height: 8,
      backgroundColor: 'rgba(30,27,75,0.4)',
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBarFill: { height: '100%', backgroundColor: '#FBBF24', borderRadius: 4 },
    boardContainer: {
      backgroundColor: colors.cardWhite,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
      shadowOpacity: 0.05,
      elevation: 2,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
    stampWrapper: { width: '20%', aspectRatio: 1, padding: 6, alignItems: 'center', justifyContent: 'center' },
    stampCircle: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    stampCircleInactive: { backgroundColor: colors.gray50, borderColor: colors.border, borderStyle: 'dashed' },
    stampCircleActive: { backgroundColor: '#FEF3C7', borderColor: '#FBBF24' },
    stampCircleJustStamped: { backgroundColor: '#FDE047', borderColor: '#FBBF24' },
    stampNumber: { fontSize: 16, fontWeight: '800', color: colors.gray400 },
    footer: {
      position: 'absolute',
      bottom: 20 + bottomInset,
      left: 20,
      right: 20,
      alignItems: 'center',
    },
    actionBtn: {
      width: Math.min(width * 0.8, 360),
      height: 60,
      borderRadius: 30,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: '#F59E0B',
      ...SHADOW,
      shadowColor: '#F59E0B',
      shadowOpacity: 0.3,
      elevation: 8,
    },
    actionBtnDisabled: { backgroundColor: colors.gray100, shadowOpacity: 0, elevation: 0 },
    actionBtnTextActive: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
    actionBtnTextDisabled: { color: colors.gray500, fontSize: 18, fontWeight: '800' },
    celebrationOverlay: {
      flex: 1,
      backgroundColor: '#FBBF24',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    celebrationCard: {
      backgroundColor: colors.cardWhite,
      width: '100%',
      borderRadius: 32,
      padding: 32,
      alignItems: 'center',
      ...SHADOW,
      elevation: 10,
    },
    trophyIcon: {
      width: 88,
      height: 88,
      backgroundColor: '#FEF3C7',
      borderRadius: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: '#FDE047',
      marginBottom: 24,
    },
    celebrationTitle: { fontSize: 26, fontWeight: '900', color: colors.gray900, marginBottom: 8 },
    celebrationSubtitle: { fontSize: 15, fontWeight: '700', color: colors.gray600, marginBottom: 24 },
    rewardBox: {
      width: '100%',
      backgroundColor: colors.purpleBg,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 20,
      marginBottom: 32,
    },
    rewardBoxLabel: { fontSize: 13, fontWeight: '800', color: colors.purple500, marginBottom: 8 },
    rewardBoxValue: { fontSize: 18, fontWeight: '900', color: colors.gray900 },
    restartBtn: { width: '100%', backgroundColor: '#F59E0B', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    restartBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    settingsCard: {
      backgroundColor: colors.cardWhite,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 24,
      paddingBottom: 24 + Math.max(bottomInset, 16),
    },
    settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
    settingsTitle: { fontSize: 18, fontWeight: '800', color: colors.gray900 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: colors.gray600, marginBottom: 8 },
    input: {
      backgroundColor: colors.gray50,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      fontWeight: '600',
      color: colors.gray900,
    },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, backgroundColor: colors.gray100, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
    cancelBtnText: { color: colors.gray600, fontSize: 15, fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: colors.gray900, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
    saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  });
}
