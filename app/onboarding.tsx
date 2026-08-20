import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import Text from '../components/common/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useAppData } from '../context/AppDataContext';
import { useAlert } from '../context/AlertContext';
import { useToast } from '../context/ToastContext';
import { useThemeColors } from '../context/ThemeContext';
import { SHADOW } from '../constants/theme';
import { STAMP_BOARD_THEMES } from '../constants/stampBoardThemes';

const { width: SCREEN_W } = Dimensions.get('window');

const BG_GRADIENT = STAMP_BOARD_THEMES.blue.bgGradient;
const CTA_GRADIENT = STAMP_BOARD_THEMES.blue.stampButtonGradient;
const DOT_COLORS = ['#0EA5E9', '#EC4899', '#A855F7'];

const COLORS = {
  coral: '#F2705C',
  coralSoft: '#FFE9E1',
  cream: '#FFFFFF',
  ink: '#1E293B',
  gray: '#64748B',
  naver: '#03C75A',
  kakao: '#FEE500',
  kakaoInk: '#3C1E1E',
};

const SLIDES = [
  {
    emoji: '📸',
    badgeBg: '#FFE4E6',
    badgeBorder: '#FBCFE8',
    title: '가정통신문을\n사진으로 찍기만 하세요',
    subtitle: '종이 한 장, 파일 하나도\n놓치지 않고 한 번에 모아드려요',
    ctaLabel: '다음',
  },
  {
    emoji: '🤖',
    badgeBg: '#DBEAFE',
    badgeBorder: '#BAE6FD',
    title: 'AI가 우리 아이 나이에\n맞는 내용만 쏙쏙',
    subtitle: '여러 아이를 등록해도\n각자에게 필요한 내용만 자동으로 나눠드려요',
    ctaLabel: '다음',
  },
  {
    emoji: '🔔',
    badgeBg: '#FEF3C7',
    badgeBorder: '#FDE68A',
    title: '놓치는 일정 없이\n알림까지 챙겨드려요',
    subtitle: '준비물부터 일정까지,\n전날 저녁에 미리 알려드릴게요',
    ctaLabel: '시작하기',
  },
];

// 위아래로 은은하게 떠다니는 배지 애니메이션
function FloatingBadge(props: { emoji?: string; bg?: string; border?: string; image?: any }) {
  const { emoji, bg, border, image } = props;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] });

  return (
    <Animated.View
      style={[
        styles.badge,
        bg ? { backgroundColor: bg } : null,
        border ? { borderColor: border } : null,
        { transform: [{ translateY: translateY }, { rotate: rotate }] },
      ]}
    >
      {image ? (
        <Image source={image} style={{ width: 140, height: 140 }} resizeMode="contain" />
      ) : (
        <Text style={{ fontSize: 54 }}>{emoji}</Text>
      )}
    </Animated.View>
  );
}

function Dots(props: { total: number; active: number }) {
  const { total, active } = props;
  const dots = [];
  for (let i = 0; i < total; i++) {
    const color = DOT_COLORS[i % DOT_COLORS.length];
    dots.push(
      <View
        key={i}
        style={i === active ? [styles.dot, styles.dotActive, { backgroundColor: color }] : styles.dot}
      />
    );
  }
  return <View style={styles.dotsRow}>{dots}</View>;
}

// ---------- 온보딩 ----------
function Onboarding(props: { onFinish: () => void }) {
  const { onFinish } = props;
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goTo = (i: number) => {
    setIndex(i);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ x: i * SCREEN_W, animated: true });
    }
  };

  const onMomentumEnd = (e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setIndex(i);
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={BG_GRADIENT} style={StyleSheet.absoluteFill} />
      {index > 0 && (
        <TouchableOpacity
          style={styles.back}
          onPress={() => goTo(index - 1)}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Text style={styles.backText}>뒤로가기</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.skip} onPress={onFinish}>
        <Text style={styles.skipText}>건너뛰기</Text>
      </TouchableOpacity>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width: SCREEN_W }]}>
            <FloatingBadge emoji={slide.emoji} bg={slide.badgeBg} border={slide.badgeBorder} />
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.indicatorContainer}>
        <Dots total={SLIDES.length} active={index} />
      </View>
      <TouchableOpacity
        style={{ marginBottom: Math.max(insets.bottom, 24) + 20 }}
        onPress={() => {
          if (index < SLIDES.length - 1) {
            goTo(index + 1);
          } else {
            onFinish();
          }
        }}
      >
        <LinearGradient
          colors={CTA_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.cta, styles.ctaShadow]}
        >
          <Text style={styles.ctaText}>{SLIDES[index].ctaLabel}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ---------- 최상위 컴포넌트 ----------
export default function OnboardingToLogin() {
  const router = useRouter();

  const handleFinishOnboarding = () => {
    // Navigate to the selection screen instead of showing login buttons here
    router.push('/family-group-start');
  };

  return (
    <View style={styles.container}>
      <Onboarding onFinish={handleFinishOnboarding} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  skip: {
    position: 'absolute',
    top: 56,
    right: 26,
    zIndex: 10,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { fontSize: 13, fontWeight: '700', color: COLORS.gray },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  badge: {
    width: 128,
    height: 128,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
    shadowOpacity: 0.12,
    elevation: 4,
  },
  title: { marginTop: 26, marginBottom: 8, fontSize: 21, fontWeight: '800', color: COLORS.ink, textAlign: 'center', lineHeight: 28 },
  subtitle: { marginBottom: 20, fontSize: 13.5, color: COLORS.gray, textAlign: 'center', lineHeight: 20, fontWeight: '600' },
  indicatorContainer: { alignItems: 'center', marginBottom: 24 },
  dotsRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#CBD5E1', marginHorizontal: 3 },
  dotActive: { width: 20 },
  cta: { marginHorizontal: 28, marginBottom: 40, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaShadow: { ...SHADOW, shadowOpacity: 0.2, elevation: 5 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  back: {
    position: 'absolute',
    top: 56,
    left: 20,
    zIndex: 10,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
  },
  backText: { fontSize: 13, fontWeight: '700', color: COLORS.gray },
  loginContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  btnStack: { width: '100%', marginTop: 32 },
  btn: { width: '100%', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnIcon: { marginRight: 10 },
  btnGoogle: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E4E4E7' },
  btnNaver: { backgroundColor: COLORS.naver },
  btnKakao: { backgroundColor: COLORS.kakao, marginBottom: 0 },
  btnTextDark: { color: '#3C4043', fontSize: 15, fontWeight: '700' },
  btnTextLight: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnTextKakao: { color: COLORS.kakaoInk, fontSize: 15, fontWeight: '700' },
  footer: { paddingBottom: 34, alignItems: 'center' },
  footerText: { fontSize: 11.5, color: '#B8B2AC', textAlign: 'center', lineHeight: 17 },
});

