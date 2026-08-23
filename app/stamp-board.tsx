import { Feather, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import StampCelebrationEffect from '../components/stampBoard/StampCelebrationEffect';
import TextInput from '../components/common/ClearableTextInput';
import CoupangBanner from '../components/common/CoupangBanner';
import Text from '../components/common/AppText';
import {
  RAINBOW_PROGRESS_GRADIENT,
  STAMP_BOARD_THEMES,
  StampBoardThemeId,
  WISH_PRESETS,
} from '../constants/stampBoardThemes';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useStampBoard } from '../hooks/useStampBoard';

function formatClassName(className?: string): string | undefined {
  const trimmed = className?.trim();
  if (!trimmed) return undefined;
  return trimmed.endsWith('반') ? trimmed : `${trimmed}반`;
}

const CELEBRATION_BAND_SIZES = [130, 108, 86, 64, 42];

/** 목표 달성 축하 카드 상단에 크게 노출되는, 도장판 테마에 맞춘 애니메이션. */
function ThemeCelebrationHero({ themeId }: { themeId: StampBoardThemeId }) {
  const bandAnims = useRef(RAINBOW_PROGRESS_GRADIENT.map(() => new Animated.Value(0))).current;
  const heroScale = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (themeId === 'classic') {
      bandAnims.forEach((v) => v.setValue(0));
      Animated.stagger(
        110,
        bandAnims.map((v) => Animated.spring(v, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }))
      ).start();
    } else {
      heroScale.setValue(0);
      Animated.spring(heroScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
    }

    floatAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [themeId, bandAnims, heroScale, floatAnim]);

  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  if (themeId === 'classic') {
    return (
      <Animated.View style={[styles.heroWrap, { transform: [{ translateY: floatY }] }]}>
        <View style={styles.rainbowClip}>
          {RAINBOW_PROGRESS_GRADIENT.map((color, i) => {
            const v = bandAnims[i];
            const size = CELEBRATION_BAND_SIZES[i];
            const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.rainbowBand,
                  { width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: v, transform: [{ translateY }] },
                ]}
              />
            );
          })}
        </View>
        <Text style={styles.heroCloud}>☁️</Text>
      </Animated.View>
    );
  }

  const emoji = themeId === 'blue' ? '🚀' : '🦄';
  return (
    <Animated.View style={[styles.heroWrap, { transform: [{ translateY: floatY }, { scale: heroScale }] }]}>
      <Text style={styles.heroEmoji}>{emoji}</Text>
      <Text style={[styles.heroSparkle, styles.heroSparkleLeft]}>✨</Text>
      <Text style={[styles.heroSparkle, styles.heroSparkleRight]}>✨</Text>
    </Animated.View>
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
    stamps,
    currentStamps,
    wish,
    themeId,
    stampIcon,
    soundEnabled,
    isCompleted,
    placeStamp,
    updateSettings,
    resetProgress,
    setTheme,
    setStampIcon,
    setSoundEnabled,
    refresh,
  } = useStampBoard(selectedChild?.id);

  const theme = STAMP_BOARD_THEMES[themeId];

  const [showSettings, setShowSettings] = useState(false);
  const [showWish, setShowWish] = useState(false);
  const [tempWish, setTempWish] = useState(wish);
  const [stampingIndex, setStampingIndex] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [stickerPanelOpen, setStickerPanelOpen] = useState(false);

  const stampAnim = useRef(new Animated.Value(1)).current;
  const stampRotateAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  // 도장이 찍히는 순간 화면 전체가 짧게 흔들리는 효과.
  const screenShakeAnim = useRef(new Animated.Value(0)).current;
  // 화면 중앙 축하 연출 — 아이콘 종류(무지개/별빛, 풍선, 그 외)에 맞춰 다른 파티클이 재생된다.
  const [celebrationTriggerKey, setCelebrationTriggerKey] = useState(0);
  const [celebrationIcon, setCelebrationIcon] = useState('');
  const prevCompletedRef = useRef(isCompleted);
  // 슬램 애니메이션이 끝나야 실제로 칸이 채워지는데, 그 전까지 연타하면 같은 칸이나
  // 다른 칸에 애니메이션이 겹쳐 찍힐 수 있다. ref로 애니메이션 도중엔 새 찍기를 막는다.
  const isStampingRef = useRef(false);

  // 완성 팝업은 "닫기"로 끄고 나면 같은 완성 상태에서는 다시 안 뜨다가, 도장판을
  // 초기화하고 새로 완성했을 때만 다시 뜨게 한다.
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);

  useEffect(() => {
    if (isCompleted && !prevCompletedRef.current) {
      setCelebrationDismissed(false);
      if (soundEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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

  // 빈 칸(index)에 새 도장을 찍을 때 공통으로 쓰는 슬램 애니메이션 — 도장이 위에서
  // 기울어진 채 크게 내려와 콱 찍히고 살짝 튕긴 뒤, 실제로 그 칸을 채운다.
  const runStampSlamAnimation = (index: number) => {
    if (isStampingRef.current) return;
    isStampingRef.current = true;

    if (soundEnabled) {
      // 쿵! 하고 한 번 세게, 아주 살짝 뒤에 가볍게 한 번 더 — 임팩트가 통통 튀는 느낌.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }, 110);
    }

    setStampingIndex(index);

    // 화면 중앙 축하 연출 트리거 — 아이콘 종류에 맞는 파티클이 재생된다.
    setCelebrationIcon(stampIcon);
    setCelebrationTriggerKey((k) => k + 1);

    // 도장이 종이에 콱 부딪히는 순간(약 150ms 뒤)에 맞춰 화면이 크게 통통 흔들린다.
    screenShakeAnim.setValue(0);
    Animated.sequence([
      Animated.delay(140),
      Animated.timing(screenShakeAnim, { toValue: 1, duration: 30, useNativeDriver: true }),
      Animated.timing(screenShakeAnim, { toValue: -1, duration: 30, useNativeDriver: true }),
      Animated.timing(screenShakeAnim, { toValue: 0.85, duration: 30, useNativeDriver: true }),
      Animated.timing(screenShakeAnim, { toValue: -0.85, duration: 30, useNativeDriver: true }),
      Animated.timing(screenShakeAnim, { toValue: 0.5, duration: 30, useNativeDriver: true }),
      Animated.timing(screenShakeAnim, { toValue: -0.5, duration: 30, useNativeDriver: true }),
      Animated.timing(screenShakeAnim, { toValue: 0.2, duration: 30, useNativeDriver: true }),
      Animated.timing(screenShakeAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
    ]).start();

    stampAnim.setValue(2.6);
    stampRotateAnim.setValue(1);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(stampAnim, { toValue: 0.8, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(stampRotateAnim, { toValue: 0, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.spring(stampAnim, { toValue: 1, friction: 3, tension: 220, useNativeDriver: true }),
    ]).start(() => {
      placeStamp(index);
      setStampingIndex(null);
      isStampingRef.current = false;
    });
  };

  // 하단 "도장 쾅!" 버튼 — 맨 앞의 빈 칸에 자동으로 찍는다.
  const handleStamp = () => {
    const emptyIndex = stamps.findIndex((s) => s === null);
    if (emptyIndex === -1 || isStampingRef.current) return;

    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    runStampSlamAnimation(emptyIndex);
  };

  // 빈 칸을 직접 탭하면 그 자리에 바로 찍힌다. 이미 찍힌 칸은 탭해도 아무 반응 없음(지우기 불가).
  const handleSlotPress = (index: number) => {
    if (stamps[index]) return;
    runStampSlamAnimation(index);
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
      ? '모든 도장을 다 모았어요! 🎉'
      : progressPercent >= 50
        ? '벌써 절반 모았어요! 파이팅! 🌈'
        : '차곡차곡 모으면 무지개가 펴요! 👍';

  const classLabel = selectedChild
    ? [`${selectedChild.age}세`, formatClassName(selectedChild.className)].filter(Boolean).join(' ')
    : undefined;

  // 미리보기 5칸에는 항상 현재 고른 스탬프가 보이도록, 뒤쪽 그리드에서만 있는
  // 스티커를 골랐다면 미리보기 맨 앞에 끼워 넣는다.
  const previewStickers = theme.stickers.slice(0, 5).includes(stampIcon)
    ? theme.stickers.slice(0, 5)
    : [stampIcon, ...theme.stickers.slice(0, 4)];

  const handleSelectSticker = (stk: string) => {
    setStampIcon(stk);
    setStickerPanelOpen(false);
  };

  const screenShakeStyle = {
    transform: [
      {
        translateX: screenShakeAnim.interpolate({
          inputRange: [-1, 1],
          outputRange: [-16, 16],
        }),
      },
      {
        translateY: screenShakeAnim.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [3, 0, 3],
        }),
      },
      {
        rotate: screenShakeAnim.interpolate({
          inputRange: [-1, 1],
          outputRange: ['-2.5deg', '2.5deg'],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.root, screenShakeStyle]}>
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
                <Image
                  source={{ uri: selectedChild.photoUri }}
                  style={[styles.avatarImage, { borderColor: theme.avatarBorder }]}
                />
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
          style={styles.scrollFlex}
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
              <View style={styles.wishTopRowRight}>
                <Pressable onPress={openWishModal} style={styles.wishEditButton}>
                  <Feather name="edit-3" size={12} color="#0369A1" />
                  <Text style={styles.wishEditButtonText}>소원 수정</Text>
                </Pressable>
              </View>
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
            <View style={styles.stickerRightGroup}>
              <View style={styles.stickerOptions}>
                {previewStickers.map((stk) => (
                  <Pressable
                    key={stk}
                    onPress={() => handleSelectSticker(stk)}
                    style={[styles.stickerButton, stk === stampIcon && styles.stickerButtonActive]}
                  >
                    <Text style={styles.stickerEmoji}>{stk}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={() => setStickerPanelOpen((v) => !v)}
                style={[styles.stickerMoreButton, { backgroundColor: theme.progressIconBg }]}
                hitSlop={6}
              >
                <Text style={[styles.stickerMoreButtonText, { color: theme.progressIconColor }]}>
                  {stickerPanelOpen ? '접기' : '더보기'}
                </Text>
                <Feather
                  name={stickerPanelOpen ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={theme.progressIconColor}
                />
              </Pressable>
            </View>
          </View>

          {stickerPanelOpen && (
            <View style={[styles.stickerGridPanel, { borderColor: theme.boardBorder }]}>
              {theme.stickers.map((stk) => (
                <Pressable
                  key={stk}
                  onPress={() => handleSelectSticker(stk)}
                  style={styles.stickerGridSlot}
                >
                  <View style={[styles.stickerGridButton, stk === stampIcon && styles.stickerButtonActive]}>
                    <Text style={styles.stickerGridEmoji}>{stk}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.boardFillWrap}>
          <View style={styles.boardCard}>
            <View style={styles.grid}>
              {Array.from({ length: targetCount }).map((_, index) => {
                const icon = stamps[index];
                const isStamped = icon !== null;
                const isJustStamped = index === stampingIndex;

                return (
                  <View key={index} style={styles.stampSlotWrap}>
                    {isStamped || isJustStamped ? (
                      <Animated.View
                        style={[
                          styles.stampSlotAnimatedWrap,
                          isJustStamped && {
                            transform: [
                              { scale: stampAnim },
                              {
                                rotate: stampRotateAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ['0deg', '-14deg'],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={['#FEF3C7', '#FCE7F3', '#E0F2FE']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.stampSlot, styles.stampSlotActive]}
                        >
                          <Text style={styles.stampEmoji}>{icon ?? stampIcon}</Text>
                          <View style={styles.stampIndexBadge}>
                            <Text style={styles.stampIndexText}>{index + 1}</Text>
                          </View>
                        </LinearGradient>
                      </Animated.View>
                    ) : (
                      <Pressable
                        onPress={() => handleSlotPress(index)}
                        style={[styles.stampSlot, styles.stampSlotInactive]}
                      >
                        <Text style={styles.stampSlotNumber}>{index + 1}</Text>
                        <Text style={styles.stampSlotCloud}>☁️</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, isSubscribed && { paddingBottom: 8 + insets.bottom }]}>
          <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%', alignItems: 'center' }}>
            <Pressable
              onPress={handleStamp}
              disabled={isCompleted || stampingIndex !== null}
              style={styles.stampButtonWrap}
            >
              <LinearGradient
                colors={isCompleted ? ['#E2E8F0', '#E2E8F0'] : theme.stampButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.stampButton}
              >
                {isCompleted ? (
                  <>
                    <MaterialIcons name="check-circle" size={22} color="#94A3B8" />
                    <Text style={styles.stampButtonTextDisabled}>도장판 완성!</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.stampButtonEmoji}>{stampIcon}</Text>
                    <Text style={styles.stampButtonText}>도장 쾅!</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <View style={styles.footerBottomRow}>
            <Text style={styles.footerHint}>빈 칸을 누르면 도장이 찍혀요!</Text>
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

      {/* 도장 찍는 순간 화면 중앙에 아이콘 종류에 맞는 연출이 재생된다(무지개/별빛류는
          빛줄기, 풍선류는 두둥실, 그 외는 팡팡 터짐). 화면 전체는 screenShakeStyle로
          동시에 짧게 흔들린다. */}
      <StampCelebrationEffect triggerKey={celebrationTriggerKey} icon={celebrationIcon} />

      {/* 목표 달성 축하 오버레이 — 완성되는 순간 바로 뜨도록 애니메이션 없이 표시. */}
      <Modal visible={isCompleted && !celebrationDismissed} animationType="none" transparent>
        <View style={styles.celebrationOverlay}>
          <View style={styles.celebrationCard}>
            {isCompleted && <ThemeCelebrationHero themeId={themeId} />}
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

            <Pressable style={styles.celebrationButton} onPress={confirmReset}>
              <Text style={styles.celebrationButtonText}>새로 시작하기</Text>
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
              {WISH_PRESETS.map((preset) => (
                <Pressable key={preset.text} onPress={() => setTempWish(preset.text)} style={styles.presetChip}>
                  <Text style={styles.presetChipEmoji}>{preset.emoji}</Text>
                  <Text style={styles.presetChipText}>{preset.label}</Text>
                </Pressable>
              ))}
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
    </Animated.View>
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
  avatarImage: { width: 56, height: 56, borderRadius: 28, borderWidth: 2 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarEmoji: { fontSize: 25 },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 15,
    height: 15,
    borderRadius: 8,
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
  scrollFlex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 14, paddingTop: 4, gap: 8 },
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
  wishTopRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  stickerRightGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stickerOptions: { flexDirection: 'row', gap: 5 },
  stickerButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
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
  stickerEmoji: { fontSize: 21 },
  stickerMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  stickerMoreButtonText: { fontSize: 10.5, fontWeight: '800' },
  stickerGridPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
  },
  stickerGridSlot: { width: '20%', aspectRatio: 1, padding: 4, alignItems: 'center', justifyContent: 'center' },
  stickerGridButton: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
  },
  stickerGridEmoji: { fontSize: 24 },
  boardFillWrap: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  boardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
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
  stampSlotAnimatedWrap: { width: '100%', height: '100%', position: 'relative' },
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
    backgroundColor: 'rgba(15,23,42,0.97)',
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
  heroWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 6, minHeight: 80 },
  rainbowClip: { width: 130, height: 65, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
  rainbowBand: { position: 'absolute', bottom: 0 },
  heroCloud: { fontSize: 20, marginTop: -6 },
  heroEmoji: { fontSize: 64 },
  heroSparkle: { position: 'absolute', fontSize: 20 },
  heroSparkleLeft: { top: 0, left: -6 },
  heroSparkleRight: { bottom: 4, right: -10 },
  celebrationBadge: { backgroundColor: '#FEF3C7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10 },
  celebrationBadgeText: { fontSize: 12, fontWeight: '900', color: '#92400E' },
  celebrationTitle: { fontSize: 19, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginBottom: 14 },
  celebrationWishBox: { width: '100%', borderRadius: 16, padding: 16, marginBottom: 12 },
  celebrationWishText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  celebrationFooterText: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 18, textAlign: 'center' },
  celebrationButton: { width: '100%', backgroundColor: '#1E293B', paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
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
