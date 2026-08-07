import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useAppData } from '../context/AppDataContext';
import { useAlert } from '../context/AlertContext';
import { useToast } from '../context/ToastContext';
import { useThemeColors } from '../context/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');

const COLORS = {
  coral: '#F2705C',
  coralSoft: '#FFE9E1',
  cream: '#FFFBF7',
  ink: '#2B2B2B',
  gray: '#8A8A8E',
  naver: '#03C75A',
  kakao: '#FEE500',
  kakaoInk: '#3C1E1E',
};

const SLIDES = [
  {
    emoji: '📸',
    badgeBg: '#FFE9E1',
    title: '가정통신문을\n사진으로 찍기만 하세요',
    subtitle: '종이 한 장, 파일 하나도\n놓치지 않고 한 번에 모아드려요',
    ctaLabel: '다음',
  },
  {
    emoji: '🤖',
    badgeBg: '#D9EEFB',
    title: 'AI가 우리 아이 나이에\n맞는 내용만 쏙쏙',
    subtitle: '여러 아이를 등록해도\n각자에게 필요한 내용만 자동으로 나눠드려요',
    ctaLabel: '다음',
  },
  {
    emoji: '🔔',
    badgeBg: '#FFEEBE',
    title: '놓치는 일정 없이\n알림까지 챙겨드려요',
    subtitle: '준비물부터 일정까지,\n전날 저녁에 미리 알려드릴게요',
    ctaLabel: '시작하기',
  },
];

// 위아래로 은은하게 떠다니는 배지 애니메이션
function FloatingBadge(props: { emoji?: string; bg?: string; image?: any }) {
  const { emoji, bg, image } = props;
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
    <Animated.View style={[styles.badge, bg ? { backgroundColor: bg } : null, { transform: [{ translateY: translateY }, { rotate: rotate }] }]}>
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
    dots.push(
      <View key={i} style={i === active ? [styles.dot, styles.dotActive] : styles.dot} />
    );
  }
  return <View style={styles.dotsRow}>{dots}</View>;
}

// ---------- 온보딩 ----------
function Onboarding(props: { onFinish: () => void }) {
  const { onFinish } = props;
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
      {index > 0 && (
        <TouchableOpacity
          style={styles.back}
          onPress={() => goTo(index - 1)}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="chevron-back" size={32} color={COLORS.ink} />
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
            <FloatingBadge emoji={slide.emoji} bg={slide.badgeBg} />
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
            <Dots total={SLIDES.length} active={index} />
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity
        style={styles.cta}
        onPress={() => {
          if (index < SLIDES.length - 1) {
            goTo(index + 1);
          } else {
            onFinish();
          }
        }}
      >
        <Text style={styles.ctaText}>{SLIDES[index].ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------- 소셜 로그인 ----------
function LoginScreen(props: { onBack: () => void; onLoginPress: (provider: string) => void; loading: boolean }) {
  const { onBack, onLoginPress, loading } = props;
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={styles.back}
        onPress={onBack}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Ionicons name="chevron-back" size={32} color={COLORS.ink} />
      </TouchableOpacity>
      <View style={styles.loginContent}>
        <FloatingBadge image={require('../assets/splash_logo.gif')} />
        <Text style={styles.title}>가족과 함께{'\n'}시작해볼까요?</Text>
        <Text style={styles.subtitle}>로그인하고 우리 아이 일정을{'\n'}가족과 편하게 나눠보세요</Text>
        <View style={styles.btnStack}>
          <TouchableOpacity
            style={[styles.btn, styles.btnGoogle, loading && { opacity: 0.7 }]}
            onPress={() => onLoginPress('google')}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.ink} />
            ) : (
              <View style={styles.btnInner}>
                <Ionicons name="logo-google" size={20} color="#EA4335" style={styles.btnIcon} />
                <Text style={styles.btnTextDark}>구글로 시작하기</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnNaver]}
            onPress={() => onLoginPress('naver')}
            disabled={loading}
          >
            <View style={styles.btnInner}>
              <View style={[styles.btnIcon, { backgroundColor: '#fff', width: 22, height: 22, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 10 }]}>
                <Text style={{ color: COLORS.naver, fontSize: 14, fontWeight: '900' }}>N</Text>
              </View>
              <Text style={styles.btnTextLight}>네이버로 시작하기</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnKakao]}
            onPress={() => onLoginPress('kakao')}
            disabled={loading}
          >
            <View style={styles.btnInner}>
              <FontAwesome name="comment" size={20} color={COLORS.kakaoInk} style={styles.btnIcon} />
              <Text style={styles.btnTextKakao}>카카오톡으로 시작하기</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 34) }]}>
        <Text style={styles.footerText}> 계속 진행 시 이용약관 및 개인정보처리방침에{'\n'}동의하는 것으로 간주됩니다 </Text>
      </View>
    </View>
  );
}

// ---------- 최상위 컴포넌트 ----------
export default function OnboardingToLogin() {
  const router = useRouter();
  const { flow } = useLocalSearchParams<{ flow?: string }>();
  const {
    completeOnboarding,
    signInWithGoogle,
    signOutGoogle,
    children,
    dataOwnerEmail,
    checkCloudDataExists,
    restoreDataFromCloud,
    checkWithdrawalStatus,
    cancelWithdrawal,
    purgeCloudData,
  } = useAppData();
  const { showAlert } = useAlert();
  const { showToast } = useToast();

  const [screen, setScreen] = useState('onboarding');
  const [loading, setLoading] = useState(false);

  const handleLoginPress = async (provider: string) => {
    if (provider !== 'google') {
      showToast('네이버/카카오 로그인은 준비 중입니다. 구글 로그인을 이용해 주세요.');
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const account = await signInWithGoogle();

      // [Withdrawal Check]
      const withdrawalDateStr = await checkWithdrawalStatus(account.email);
      if (withdrawalDateStr) {
        const withdrawalDate = new Date(withdrawalDateStr);
        const now = new Date();
        const diffTime = now.getTime() - withdrawalDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays < 7) {
          const shouldRecover = await new Promise<boolean>((resolve) => {
            showAlert({
              title: '계정 복구',
              message: '탈퇴 대기 중인 계정입니다. 탈퇴를 취소하고 모든 데이터를 복구하시겠습니까?',
              buttons: [
                { text: '취소', style: 'cancel', onPress: () => resolve(false) },
                { text: '복구', onPress: () => resolve(true) },
              ],
            });
          });

          if (shouldRecover) {
            setLoading(true);
            await cancelWithdrawal(account.email);
            showToast('✅ 계정이 성공적으로 복구되었습니다.');
          } else {
            await signOutGoogle();
            setLoading(false);
            return;
          }
        } else {
          setLoading(true);
          await purgeCloudData(account.email);
          router.push('/onboarding-child-setup');
          setLoading(false);
          return;
        }
      }

      if (flow === 'relogin' && dataOwnerEmail && account.email !== dataOwnerEmail) {
        await signOutGoogle();
        showToast('기존 데이터의 소유자가 아닙니다.');
        setLoading(false);
        return;
      }

      const hasCloudData = await checkCloudDataExists(account.email);
      if (hasCloudData) {
        const restored = await new Promise<boolean>((resolve) => {
          showAlert({
            title: '기존 데이터 불러오기',
            message: '클라우드에 저장된 아이 정보와 캘린더 일정이 있습니다. 지금 불러오시겠습니까?',
            buttons: [
              { text: '아니요', style: 'cancel', onPress: () => resolve(false) },
              { text: '예', onPress: async () => {
                try {
                  setLoading(true);
                  await restoreDataFromCloud(account.email);
                  resolve(true);
                } catch (err) {
                  showToast('❌ 데이터 복구 중 오류가 발생했습니다.');
                  resolve(false);
                }
              }},
            ],
          });
        });

        if (restored) {
          showToast('👋 데이터를 성공적으로 복구했어요!');
          setTimeout(() => router.replace('/'), 100);
          return;
        }
      }

      const hasChild = (children?.length ?? 0) > 0;
      if (hasChild) {
        completeOnboarding();
        showToast('👋 다시 오신 걸 환영해요!');
        router.replace('/');
        return;
      }

      // Default: New user flow
      router.push('/family-group-start');
    } catch (e: any) {
      if (e?.code !== '12501') {
        showToast('❌ 로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {screen === 'onboarding' ? (
        <Onboarding onFinish={() => setScreen('login')} />
      ) : (
        <LoginScreen onBack={() => setScreen('onboarding')} onLoginPress={handleLoginPress} loading={loading} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  skip: { position: 'absolute', top: 56, right: 26, zIndex: 10, height: 48, justifyContent: 'center' },
  skipText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  badge: { width: 112, height: 112, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 26, marginBottom: 8, fontSize: 21, fontWeight: '800', color: COLORS.ink, textAlign: 'center', lineHeight: 28 },
  subtitle: { marginBottom: 20, fontSize: 13.5, color: COLORS.gray, textAlign: 'center', lineHeight: 20 },
  dotsRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#E3DDD6', marginHorizontal: 3 },
  dotActive: { width: 20, backgroundColor: COLORS.coral },
  cta: { marginHorizontal: 28, marginBottom: 40, height: 56, borderRadius: 16, backgroundColor: COLORS.coral, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { position: 'absolute', top: 56, left: 16, zIndex: 10, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 34, color: COLORS.ink, fontWeight: '700', lineHeight: 40 },
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

