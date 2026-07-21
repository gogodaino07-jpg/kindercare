import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import { COLORS } from '../constants/theme';

interface Slide {
  icon: string;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    icon: '📸',
    title: '가정통신문을 사진으로 찍기만 하세요',
    description: '종이 한 장, 파일 하나도 놓치지 않고 한 번에 모아드려요',
  },
  {
    icon: '🤖',
    title: 'AI가 우리 아이 나이에 맞는 내용만 쏙쏙',
    description: '여러 아이를 등록해도 각자에게 필요한 내용만 자동으로 나눠드려요',
  },
  {
    icon: '🔔',
    title: '놓치는 일정 없이 알림까지 챙겨드려요',
    description: '준비물부터 일정까지, 전날 저녁에 미리 알려드릴게요',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLastSlide = activeIndex === SLIDES.length - 1;

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const goNext = () => {
    if (isLastSlide) {
      router.replace('/family-group-start');
      return;
    }
    const nextIndex = activeIndex + 1;
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setActiveIndex(nextIndex);
  };

  return (
    <OnboardingBackground>
      <View style={styles.skipRow}>
        <Pressable onPress={() => router.replace('/family-group-start')}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.centerArea}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          style={styles.scroll}
        >
          {SLIDES.map((slide) => (
            <View key={slide.title} style={[styles.slide, { width }]}>
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>{slide.icon}</Text>
              </View>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dotsRow}>
          {SLIDES.map((slide, i) => (
            <View key={slide.title} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      </View>

      <Pressable style={styles.nextButton} onPress={goNext}>
        <Text style={styles.nextButtonText}>{isLastSlide ? '시작하기' : '다음'}</Text>
      </Pressable>
    </OnboardingBackground>
  );
}

const styles = StyleSheet.create({
  skipRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  skipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.creamBeigeCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    backgroundColor: COLORS.coralPink,
    width: 18,
  },
  nextButton: {
    marginHorizontal: 24,
    marginTop: 28,
    marginBottom: 24,
    backgroundColor: COLORS.peachOrange,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
