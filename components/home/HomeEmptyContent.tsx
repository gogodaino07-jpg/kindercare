import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { useRequireLogin } from '../../context/GuestLoginGateContext';
import { WeatherDay } from '../../hooks/useWeeklyWeather';
import { Child, MealPlan } from '../../types/models';
import Text from '../common/AppText';
import HomeHeroHeader from './HomeHeroHeader';

interface HomeEmptyContentProps {
  selectedChild: Child | undefined;
  onPressMeal: () => void;
  weatherDays: WeatherDay[] | null;
  weatherLoading: boolean;
  locationLabel?: string;
  onPressDate: (date: string) => void;
  todayMeal?: MealPlan;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** 홈 화면 튜토리얼이 "오늘의 급식" 카드를 스포트라이트로 강조할 때 위치를 재기 위한 ref. */
  mealCardRef?: React.RefObject<View | null>;
  /** 홈 화면 튜토리얼이 날씨 영역을 스포트라이트로 강조할 때 위치를 재기 위한 ref. */
  weatherSectionRef?: React.RefObject<View | null>;
  /** 홈 화면 튜토리얼이 "가방에 쏙쏙" 준비물 영역을 스포트라이트로 강조할 때 위치를 재기 위한 ref. */
  prepSectionRef?: React.RefObject<View | null>;
  /** 홈 화면 튜토리얼이 "✨ AI로 알림장 스캔하기" 버튼만 좁혀서 강조할 때 위치를 재기 위한 ref. */
  scanButtonRef?: React.RefObject<View | null>;
  /** 홈 화면 튜토리얼이 "앞으로의 모험" 일정 영역을 스포트라이트로 강조할 때 위치를 재기 위한 ref. */
  scheduleSectionRef?: React.RefObject<View | null>;
}

export interface HomeEmptyContentHandle {
  /** 튜토리얼 대상이 화면에 보이도록 필요할 때만 스크롤한다(이미 화면에 충분히
   * 보이면 건너뜀). 스크롤을 "시작"시키고(애니메이션이 끝나길 기다리지 않고)
   * 바로 resolve된다. 실제로 스크롤하기로 했으면, 네이티브 scrollTo를 호출하는
   * 바로 그 순간(동기적으로) onWillScroll을 호출해준다 — 호출부가 그 순간에
   * 맞춰 스포트라이트를 즉시 숨겨서 스크롤되는 내용 위에 이전 위치가 잠깐
   * 떠 있는 것처럼 보이지 않게 할 수 있다. */
  scrollToTarget: (
    targetRef: React.RefObject<View | null>,
    onWillScroll?: () => void
  ) => Promise<{ scrolled: boolean; deltaY: number }>;
}

const HomeEmptyContent = forwardRef<HomeEmptyContentHandle, HomeEmptyContentProps>(function HomeEmptyContent({
  selectedChild,
  onPressMeal,
  weatherDays,
  weatherLoading,
  locationLabel,
  onPressDate,
  todayMeal,
  refreshing,
  onRefresh,
  mealCardRef,
  weatherSectionRef,
  prepSectionRef,
  scanButtonRef,
  scheduleSectionRef,
}, ref) {
  const router = useRouter();
  const colors = useThemeColors();
  const requireLogin = useRequireLogin();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // 컨텐츠가 화면에 다 들어갈 때는 스크롤을 아예 막아서(살짝 흔들리는 것 포함)
  // 완전히 고정되게 하고, 화면보다 길어지는 기기(작은 화면 등)에서만 실제로
  // 스크롤되게 한다. bounces/overScrollMode만으로는 내용이 화면보다 아주
  // 조금 더 길 때 생기는 진짜(미세한) 스크롤까지는 못 막아서 별도로 둘 다 잰다.
  const [containerHeight, setContainerHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const canScroll = contentHeight > containerHeight + 1;

  // 튜토리얼이 "앞으로의 모험"처럼 아래쪽 영역을 강조할 때, 스크롤을 처음 위치
  // 그대로 둔 채 스포트라이트만 띄우면 대상이 화면 밖이라 안 보인다 — 대상이
  // 화면에 들어오도록 먼저 스크롤한 뒤에 스포트라이트를 그리도록 부모(홈
  // 화면 튜토리얼)가 호출할 수 있는 메서드를 ref로 노출한다.
  const viewportRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const SCROLL_MARGIN = 24;

  useImperativeHandle(ref, () => ({
    scrollToTarget: (targetRef, onWillScroll) =>
      new Promise<{ scrolled: boolean; deltaY: number }>((resolve) => {
        if (!targetRef.current || !viewportRef.current || !scrollViewRef.current) {
          resolve({ scrolled: false, deltaY: 0 });
          return;
        }
        targetRef.current.measureInWindow((_tx, ty, _tw, th) => {
          viewportRef.current?.measureInWindow((_vx, vy, _vw, vh) => {
            const viewTop = vy;
            const viewBottom = vy + vh;
            const targetTop = ty;
            const targetBottom = ty + th;

            // 대상이 이미 여백을 두고 화면에 온전히 보이면 스크롤을 아예 건너뛴다
            // (예: 같은 카드 안의 버튼처럼 이미 보이는 대상을 매번 화면 맨 위로
            // 재정렬하려다 보니, 필요 없는 미세한 스크롤이 "튕기는" 것처럼
            // 보이는 원인이었다). 필요할 때만, 딱 필요한 만큼만 스크롤한다.
            let adjust = 0;
            if (targetTop < viewTop + SCROLL_MARGIN) {
              adjust = targetTop - (viewTop + SCROLL_MARGIN);
            } else if (targetBottom > viewBottom - SCROLL_MARGIN) {
              adjust = targetBottom - (viewBottom - SCROLL_MARGIN);
            }

            if (Math.abs(adjust) < 20) {
              resolve({ scrolled: false, deltaY: 0 });
              return;
            }

            const prevY = scrollYRef.current;
            const newY = Math.max(prevY + adjust, 0);
            const appliedDelta = newY - prevY;
            if (Math.abs(appliedDelta) < 20) {
              resolve({ scrolled: false, deltaY: 0 });
              return;
            }
            // scrollTo를 부르는 바로 이 순간 onWillScroll을 동기 호출한다 —
            // 호출부가 이 시점에 맞춰 스포트라이트를 즉시 숨겨야, 스크롤되는
            // 내용 위에 이전 위치가 잠깐 붕 떠 있는 것처럼 보이지 않는다.
            onWillScroll?.();
            scrollViewRef.current?.scrollTo({ y: newY, animated: true });
            resolve({ scrolled: true, deltaY: appliedDelta });
          });
        });
      }),
  }));

  return (
    <View ref={viewportRef} collapsable={false} style={styles.flexFill}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.flexFill}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        scrollEnabled={canScroll}
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_w, h) => setContentHeight(h)}
        onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined
        }
      >
        <HomeHeroHeader
          selectedChild={selectedChild}
          onPressMeal={onPressMeal}
          weatherDays={weatherDays}
          weatherLoading={weatherLoading}
          locationLabel={locationLabel}
          onPressDate={onPressDate}
          todayMeal={todayMeal}
          mealCardRef={mealCardRef}
          weatherSectionRef={weatherSectionRef}
        />

        <View ref={prepSectionRef} collapsable={false}>
          <SectionHeader emoji="🎒" title="가방에 쏙쏙!" />
          <View style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: colors.purpleBg }]}>
              <Text style={styles.iconCircleEmoji}>🪄</Text>
            </View>
            <Text style={styles.cardTitle}>앗, 아직 챙길 물건이 없네요!</Text>
            <Text style={styles.cardSubtitle}>
              알림장을 일일이 읽지 않아도 괜찮아요.{'\n'}AI가 똑똑하게 필요한 준비물을 찾아드릴게요!
            </Text>
            <View ref={scanButtonRef} collapsable={false}>
              <Pressable onPress={() => requireLogin(() => router.push('/upload'))}>
                <LinearGradient
                  colors={[colors.purple500, colors.purpleDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.scanButton}
                >
                  <Text style={styles.scanButtonText}>✨ AI로 알림장 스캔하기</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>

      <View ref={scheduleSectionRef} collapsable={false}>
        <SectionHeader emoji="🗺️" title="앞으로의 모험" />
        <View style={[styles.card, styles.scheduleCard]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.lightBlueBg }]}>
            <Text style={styles.iconCircleEmoji}>🏝️</Text>
          </View>
          <Text style={styles.cardTitle}>이번 주는 특별한 일정이 없어요</Text>
          <Text style={[styles.cardSubtitle, { marginBottom: 0 }]}>여유롭고 평화로운 한 주를 보내세요!</Text>
        </View>
      </View>
      </ScrollView>
    </View>
  );
});

export default HomeEmptyContent;

function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createSectionHeaderStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flexFill: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 150,
    },
    card: {
      marginHorizontal: 20,
      backgroundColor: colors.cardWhite,
      borderRadius: 24,
      paddingVertical: 20,
      paddingHorizontal: 24,
      alignItems: 'center',
      ...SHADOW,
      shadowOpacity: 0.06,
      elevation: 2,
    },
    // 화면 하단에 남는 여백을 채우도록 "앞으로의 모험" 카드만 세로로 조금 더 키운다.
    scheduleCard: {
      paddingVertical: 34,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    iconCircleEmoji: {
      fontSize: 22,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.gray900,
      marginBottom: 6,
      textAlign: 'center',
    },
    cardSubtitle: {
      fontSize: 13,
      color: colors.gray500,
      textAlign: 'center',
      lineHeight: 18,
      fontWeight: '500',
      marginBottom: 12,
    },
    scanButton: {
      borderRadius: 999,
      paddingHorizontal: 24,
      paddingVertical: 12,
      ...SHADOW,
      shadowOpacity: 0.25,
      shadowColor: colors.purpleDeep,
      elevation: 4,
    },
    scanButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
}

function createSectionHeaderStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      marginTop: 16,
      marginBottom: 8,
    },
    emoji: {
      fontSize: 18,
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.gray900,
      letterSpacing: -0.3,
    },
  });
}
