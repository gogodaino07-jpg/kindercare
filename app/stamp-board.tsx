import { Feather, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import TextInput from '../components/common/ClearableTextInput';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import CoupangBanner from '../components/common/CoupangBanner';
import Text from '../components/common/AppText';
import { RAINBOW_PROGRESS_GRADIENT, STAMP_BOARD_THEMES, WISH_PRESETS } from '../constants/stampBoardThemes';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useStampBoard } from '../hooks/useStampBoard';

function formatClassName(className?: string): string | undefined {
  const trimmed = className?.trim();
  if (!trimmed) return undefined;
  return trimmed.endsWith('반') ? trimmed : `${trimmed}반`;
}

function DotPattern() {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id="stampDotGrid" width={16} height={16} patternUnits="userSpaceOnUse">
          <Circle cx={8} cy={8} r={1.2} fill="#38BDF8" opacity={0.18} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#stampDotGrid)" />
    </Svg>
  );
}

export default function StampBoardScreen() {
  const router = useRouter();
  const { selectedChild } = useAppData();
  const { isSubscribed } = useSubscription();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const {
    targetCount,
    currentStamps,
    wish,
    themeId,
    stampIcon,
    soundEnabled,
    hasStampedToday,
    isCompleted,
    addStamp,
    updateSettings,
    resetProgress,
    setTheme,
    setStampIcon,
    setSoundEnabled,
    refresh,
    cancelTodayStamp,
  } = useStampBoard(selectedChild?.id);

  const theme = STAMP_BOARD_THEMES[themeId];

  const [showSettings, setShowSettings] = useState(false);
  const [showWish, setShowWish] = useState(false);
  const [tempWish, setTempWish] = useState(wish);
  const [stampingIndex, setStampingIndex] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const stampAnim = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const prevCompletedRef = useRef(isCompleted);
  // 애니메이션이 끝나야 addStamp()가 불리는데, hasStampedToday 상태는 그 전까지 그대로라
  // 애니메이션 도중 연타하면 두 번 다 통과해서 도장이 2개 찍힌다. ref로 즉시 막는다.
  const isStampingRef = useRef(false);

  useEffect(() => {
    if (isCompleted && !prevCompletedRef.current && soundEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    prevCompletedRef.current = isCompleted;
  }, [isCompleted, soundEnabled]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const openWishModal = () => {
    setTempWish(wish);
    setShowWish(true);
  };

  const handleStamp = () => {
    if (hasStampedToday || isCompleted || isStampingRef.current) return;
    isStampingRef.current = true;

    if (soundEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

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
      isStampingRef.current = false;
    });
  };

  // 오늘 찍은 도장(가장 마지막 칸)만 탭해서 취소할 수 있다 — 이전 날짜 도장은 지난 성취라 건드리지 않는다.
  const handleCancelTodayStamp = () => {
    if (!hasStampedToday || isStampingRef.current) return;
    if (soundEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    cancelTodayStamp();
  };

  const saveWish = () => {
    if (tempWish.trim()) updateSettings(targetCount, tempWish.trim());
    setShowWish(false);
  };

  const confirmReset = () => {
    showAlert({
      title: '도장판 처음부터 다시 시작',
      message: '지금까지 모은 도장이 모두 사라져요. 정말 다시 시작할까요?',
      icon: '🔄',
      buttons: [
        { text: '취소', style: 'cancel' },
        {
          text: '다시 시작',
          style: 'destructive',
          onPress: () => {
            resetProgress();
            setShowSettings(false);
          },
        },
      ],
    });
  };

  const progressPercent = Math.round((currentStamps / Math.max(targetCount, 1)) * 100);
  const progressCaption =
    progressPercent >= 100
      ? '오늘 모든 도장을 모았어요! 🎉'
      : progressPercent >= 50
        ? '벌써 절반 모았어요! 파이팅! 🌈'
        : '차곡차곡 모으면 무지개가 펴요! 👍';

  const classLabel = selectedChild
    ? [`${selectedChild.age}세`, formatClassName(selectedChild.className)].filter(Boolean).join(' ')
    : undefined;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={6}>
            <MaterialCommunityIcons name="chevron-left" size={26} color="#1E293B" />
          </Pressable>

          <View style={styles.profileBlock}>
            <View style={styles.avatarWrap}>
              {selectedChild?.photoUri ? (
                <Image source={{ uri: selectedChild.photoUri }} style={styles.avatarImage} />
              ) : (
                <LinearGradient
                  colors={theme.avatarGradient}
                  style={[styles.avatarImage, styles.avatarPlaceholder, { borderColor: theme.avatarBorder }]}
                >
                  <Text style={styles.avatarEmoji}>🧒</Text>
                </LinearGradient>
              )}
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.profileTextBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.childName} numberOfLines={1}>
                  {selectedChild?.name ?? '우리 아이'}
                </Text>
                {!!classLabel && (
                  <View style={[styles.classBadge, { backgroundColor: theme.classBg }]}>
                    <Text style={[styles.classBadgeText, { color: theme.classText }]} numberOfLines={1}>
                      {classLabel}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.headerSubtitle}>무지개 동산 도장 모으기! 🌈</Text>
            </View>
          </View>

          <Pressable onPress={() => setShowSettings(true)} style={styles.iconButton} hitSlop={6}>
            <MaterialIcons name="settings" size={18} color="#475569" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accentIconColor} />
          }
        >
          <View style={styles.wishCard}>
            <Text style={styles.wishCloudDecor}>🌈</Text>
            <View style={styles.wishTopRow}>
              <LinearGradient
                colors={theme.wishBadgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.wishBadge}
              >
                <MaterialIcons name="star" size={12} color="#FDE68A" />
                <Text style={styles.wishBadgeText}>우리 아이 소원 보상</Text>
              </LinearGradient>
              <Pressable onPress={openWishModal} style={styles.wishEditButton}>
                <Feather name="edit-3" size={12} color="#0369A1" />
                <Text style={styles.wishEditButtonText}>소원 수정</Text>
              </Pressable>
            </View>
            <Pressable onPress={openWishModal}>
              <Text style={styles.wishTitle}>{wish || '소원을 설정해보세요 ⚙️'}</Text>
            </Pressable>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressTopRow}>
              <View style={styles.progressLeft}>
                <View style={[styles.progressIconBox, { backgroundColor: theme.progressIconBg }]}>
                  <Ionicons name="sparkles" size={14} color={theme.progressIconColor} />
                </View>
                <View>
                  <Text style={styles.progressLabel}>칭찬 미션 진행률</Text>
                  <Text style={styles.progressCount}>
                    총 {targetCount}개 중 {currentStamps}개 완료
                  </Text>
                </View>
              </View>
              <View style={styles.progressPercentPill}>
                <Text style={styles.progressPercentText}>{progressPercent}%</Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <LinearGradient
                colors={RAINBOW_PROGRESS_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.min(progressPercent, 100)}%` }]}
              />
            </View>

            <Text style={styles.progressCaption}>☁️ {progressCaption}</Text>
          </View>

          <View style={styles.stickerRow}>
            <Text style={styles.stickerLabel}>스탬프 종류:</Text>
            <View style={styles.stickerOptions}>
              {theme.stickers.map((stk) => (
                <Pressable
                  key={stk}
                  onPress={() => setStampIcon(stk)}
                  style={[styles.stickerButton, stk === stampIcon && styles.stickerButtonActive]}
                >
                  <Text style={styles.stickerEmoji}>{stk}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.boardCard, { borderColor: theme.boardBorder }]}>
            <DotPattern />
            <View style={styles.grid}>
              {Array.from({ length: targetCount }).map((_, index) => {
                const isStamped = index < currentStamps;
                const isJustStamped = index === stampingIndex;
                const isTodaysStamp = hasStampedToday && index === currentStamps - 1;

                return (
                  <View key={index} style={styles.stampSlotWrap}>
                    {isStamped || isJustStamped ? (
                      <Animated.View
                        style={[styles.stampSlotAnimatedWrap, isJustStamped && { transform: [{ scale: stampAnim }] }]}
                      >
                        <Pressable
                          onPress={isTodaysStamp ? handleCancelTodayStamp : undefined}
                          disabled={!isTodaysStamp}
                        >
                          <LinearGradient
                            colors={['#FEF3C7', '#FCE7F3', '#E0F2FE']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.stampSlot, styles.stampSlotActive]}
                          >
                            <Text style={styles.stampEmoji}>{stampIcon}</Text>
                            <View style={styles.stampIndexBadge}>
                              <Text style={styles.stampIndexText}>{index + 1}</Text>
                            </View>
                          </LinearGradient>
                        </Pressable>
                      </Animated.View>
                    ) : (
                      <View style={[styles.stampSlot, styles.stampSlotInactive]}>
                        <Text style={styles.stampSlotNumber}>{index + 1}</Text>
                        <Text style={styles.stampSlotCloud}>☁️</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, isSubscribed && { paddingBottom: 8 + insets.bottom }]}>
          <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%', alignItems: 'center' }}>
            <Pressable
              onPress={handleStamp}
              disabled={hasStampedToday || isCompleted || stampingIndex !== null}
              style={styles.stampButtonWrap}
            >
              <LinearGradient
                colors={hasStampedToday ? ['#E2E8F0', '#E2E8F0'] : theme.stampButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.stampButton}
              >
                {hasStampedToday ? (
                  <>
                    <MaterialIcons name="check-circle" size={22} color="#94A3B8" />
                    <Text style={styles.stampButtonTextDisabled}>내일 또 만나요!</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.stampButtonEmoji}>{stampIcon}</Text>
                    <Text style={styles.stampButtonText}>오늘의 도장 쾅!</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <View style={styles.footerBottomRow}>
            <Text style={styles.footerHint}>도장을 누르면 오늘의 도장이 찍혀요!</Text>
            <Pressable onPress={() => setSoundEnabled(!soundEnabled)} style={styles.soundToggle} hitSlop={6}>
              <Feather
                name={soundEnabled ? 'volume-2' : 'volume-x'}
                size={13}
                color={soundEnabled ? theme.accentIconColor : '#94A3B8'}
              />
              <Text style={styles.soundToggleText}>{soundEnabled ? '소리 켬' : '소리 끔'}</Text>
            </Pressable>
          </View>
        </View>

        {!isSubscribed && <CoupangBanner style={{ paddingBottom: insets.bottom }} />}
      </SafeAreaView>

      {/* 목표 달성 축하 오버레이 */}
      <Modal visible={isCompleted} animationType="fade" transparent>
        <View style={styles.celebrationOverlay}>
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationTrophy}>🏆</Text>
            <View style={styles.celebrationBadge}>
              <Text style={styles.celebrationBadgeText}>축하합니다! 소원 성취!</Text>
            </View>
            <Text style={styles.celebrationTitle}>우와! 무지개 도장을 모두 모았어요!</Text>
            <LinearGradient
              colors={theme.stampButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.celebrationWishBox}
            >
              <Text style={styles.celebrationWishText}>{wish || '소원을 설정해보세요'}</Text>
            </LinearGradient>
            <Text style={styles.celebrationFooterText}>칭찬 약속을 멋지게 지킨 최고의 어린이! 👍</Text>

            <Pressable style={styles.celebrationButton} onPress={resetProgress}>
              <Text style={styles.celebrationButtonText}>신나게 선물 받으러 가기! 🎁</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 설정 모달 */}
      <Modal visible={showSettings} animationType="fade" transparent onRequestClose={() => setShowSettings(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <MaterialIcons name="settings" size={18} color="#475569" />
                <Text style={styles.modalTitle}>도장판 설정</Text>
              </View>
              <Pressable onPress={() => setShowSettings(false)} hitSlop={8}>
                <Feather name="x" size={18} color="#94A3B8" />
              </Pressable>
            </View>

            <Text style={styles.modalSectionLabel}>무지개 테마 색상 선택</Text>
            <View style={styles.themeRow}>
              {Object.values(STAMP_BOARD_THEMES).map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setTheme(t.id)}
                  style={[styles.themeOption, themeId === t.id && styles.themeOptionActive]}
                >
                  <Text style={styles.themeOptionEmoji}>{t.emoji}</Text>
                  <Text style={[styles.themeOptionLabel, themeId === t.id && styles.themeOptionLabelActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalSectionLabel}>목표 도장 개수</Text>
            <View style={styles.countRow}>
              {[5, 10, 15, 20].map((num) => (
                <Pressable
                  key={num}
                  onPress={() => updateSettings(num, wish)}
                  style={[styles.countOption, targetCount === num && styles.countOptionActive]}
                >
                  <Text style={[styles.countOptionText, targetCount === num && styles.countOptionTextActive]}>
                    {num}개
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalDivider} />

            <Pressable
              onPress={() => {
                setShowSettings(false);
                openWishModal();
              }}
              style={styles.modalRowButton}
            >
              <Feather name="edit-3" size={14} color="#334155" />
              <Text style={styles.modalRowButtonText}>소원 문구 수정하기</Text>
            </Pressable>

            <Pressable onPress={confirmReset} style={styles.modalRowButtonDanger}>
              <Feather name="rotate-ccw" size={14} color="#E11D48" />
              <Text style={styles.modalRowButtonDangerText}>도장판 처음부터 다시 시작</Text>
            </Pressable>

            <Pressable onPress={() => setShowSettings(false)} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseButtonText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 소원 수정 모달 */}
      <Modal visible={showWish} animationType="fade" transparent onRequestClose={() => setShowWish(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.select({ ios: 0, android: -100 })}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalHeaderEmoji}>🎁</Text>
                <Text style={styles.modalTitle}>우리 아이 소원 정하기</Text>
              </View>
              <Pressable onPress={() => setShowWish(false)} hitSlop={8}>
                <Feather name="x" size={18} color="#94A3B8" />
              </Pressable>
            </View>

            <Text style={styles.modalSectionLabel}>목표 소원을 적어주세요:</Text>
            <TextInput
              style={styles.wishInput}
              value={tempWish}
              onChangeText={setTempWish}
              placeholder="예: 키즈카페 가기, 장난감 선물 받기"
              placeholderTextColor="#94A3B8"
              maxLength={40}
            />

            <Text style={styles.modalSectionLabel}>인기 소원 추천 💡</Text>
            <View style={styles.presetRow}>
              {WISH_PRESETS.map((preset) => {
                const [emoji, word] = preset.split(' ');
                return (
                  <Pressable key={preset} onPress={() => setTempWish(preset)} style={styles.presetChip}>
                    <Text style={styles.presetChipEmoji}>{emoji}</Text>
                    <Text style={styles.presetChipText}>{word}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActionsRow}>
              <Pressable onPress={() => setShowWish(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable onPress={saveWish} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>저장하기</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F9FF' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
  },
  profileBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  avatarWrap: { width: 56, height: 56, position: 'relative' },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarEmoji: { fontSize: 25 },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileTextBlock: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  childName: { fontSize: 17, fontWeight: '900', color: '#1E293B', flexShrink: 1 },
  classBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  classBadgeText: { fontSize: 12, fontWeight: '800' },
  headerSubtitle: { fontSize: 13, fontWeight: '700', color: '#0369A1', marginTop: 2 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 90, gap: 8 },
  wishCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  wishCloudDecor: {
    position: 'absolute',
    right: -8,
    bottom: -14,
    fontSize: 64,
    opacity: 0.18,
  },
  wishTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  wishBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  wishBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  wishEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  wishEditButtonText: { fontSize: 11, fontWeight: '800', color: '#0369A1' },
  wishTitle: { fontSize: 19, fontWeight: '900', color: '#0F172A', lineHeight: 26 },
  progressCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  progressTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  progressLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  progressIconBox: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  progressLabel: { fontSize: 10.5, fontWeight: '700', color: '#64748B' },
  progressCount: { fontSize: 13, fontWeight: '900', color: '#1E293B', marginTop: 1 },
  progressPercentPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  progressPercentText: { fontSize: 16, fontWeight: '900', color: '#78350F' },
  progressTrack: {
    width: '100%',
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },
  progressCaption: { marginTop: 8, fontSize: 11.5, fontWeight: '700', color: '#475569', textAlign: 'center' },
  stickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  stickerLabel: { fontSize: 11.5, fontWeight: '800', color: '#475569' },
  stickerOptions: { flexDirection: 'row', gap: 4 },
  stickerButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
  },
  stickerButtonActive: {
    opacity: 1,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  stickerEmoji: { fontSize: 15 },
  boardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    marginHorizontal: -5,
  },
  stampSlotWrap: { width: '20%', aspectRatio: 1, padding: 5, alignItems: 'center', justifyContent: 'center' },
  stampSlotAnimatedWrap: { width: '100%', height: '100%' },
  stampSlot: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  stampSlotInactive: { backgroundColor: 'rgba(255,255,255,0.7)', borderColor: '#BAE6FD', borderStyle: 'dashed' },
  stampSlotActive: { borderColor: '#FCD34D' },
  stampEmoji: { fontSize: 24 },
  stampIndexBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampIndexText: { fontSize: 9, fontWeight: '900', color: '#1E293B' },
  stampSlotNumber: { fontSize: 12, fontWeight: '900', color: '#7DD3FC' },
  stampSlotCloud: { position: 'absolute', top: 3, right: 3, fontSize: 8 },
  footer: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(226,232,240,0.6)',
    gap: 5,
  },
  stampButtonWrap: { width: '100%', borderRadius: 18, overflow: 'hidden' },
  stampButton: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stampButtonEmoji: { fontSize: 20 },
  stampButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  stampButtonTextDisabled: { color: '#94A3B8', fontSize: 16, fontWeight: '800' },
  footerBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  footerHint: { fontSize: 10.5, fontWeight: '700', color: '#94A3B8', flexShrink: 1 },
  soundToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  soundToggleText: { fontSize: 10.5, fontWeight: '700', color: '#64748B' },
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  celebrationCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  celebrationTrophy: { fontSize: 56, marginBottom: 6 },
  celebrationBadge: { backgroundColor: '#FEF3C7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10 },
  celebrationBadgeText: { fontSize: 12, fontWeight: '900', color: '#92400E' },
  celebrationTitle: { fontSize: 19, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginBottom: 14 },
  celebrationWishBox: { width: '100%', borderRadius: 16, padding: 16, marginBottom: 12 },
  celebrationWishText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  celebrationFooterText: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 18, textAlign: 'center' },
  celebrationButton: { width: '100%', backgroundColor: '#F59E0B', paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  celebrationButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, gap: 12 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalHeaderEmoji: { fontSize: 18 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  modalSectionLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: -4 },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 2,
  },
  themeOptionActive: { borderColor: '#0EA5E9', backgroundColor: '#F0F9FF' },
  themeOptionEmoji: { fontSize: 18 },
  themeOptionLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  themeOptionLabelActive: { color: '#0369A1', fontWeight: '900' },
  countRow: { flexDirection: 'row', gap: 8 },
  countOption: { flex: 1, paddingVertical: 10, borderRadius: 14, borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center' },
  countOptionActive: { borderColor: '#0EA5E9', backgroundColor: '#F0F9FF' },
  countOptionText: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  countOptionTextActive: { color: '#0369A1' },
  modalDivider: { height: 1, backgroundColor: '#F1F5F9' },
  modalRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 11,
  },
  modalRowButtonText: { fontSize: 12.5, fontWeight: '800', color: '#334155' },
  modalRowButtonDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    paddingVertical: 11,
  },
  modalRowButtonDangerText: { fontSize: 12.5, fontWeight: '800', color: '#E11D48' },
  modalCloseButton: { backgroundColor: '#1E293B', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  modalCloseButtonText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
  wishInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  presetChipEmoji: { fontSize: 12.5 },
  presetChipText: { fontSize: 11.5, fontWeight: '800', color: '#0369A1' },
  modalActionsRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  cancelButton: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  cancelButtonText: { fontSize: 13.5, fontWeight: '800', color: '#64748B' },
  saveButton: { flex: 1, backgroundColor: '#0EA5E9', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  saveButtonText: { fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' },
});
