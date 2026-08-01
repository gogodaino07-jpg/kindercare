import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import GoogleLogo from '../components/common/GoogleLogo';
import Text from '../components/common/AppText';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export default function GoogleSignInScreen() {
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
  } = useAppData();
  const { showAlert } = useAlert();
  const { showToast } = useToast();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [toastActive, setToastActive] = useState(false);

  const handleGoogleSignIn = async () => {
    if (loading || toastActive) return;
    setLoading(true);
    try {
      const account = await signInWithGoogle();

      // [Strict User Separation]
      // In the 'relogin' flow, we verify if the signed-in account matches
      // the email that originally created the local data on this device.
      if (flow === 'relogin' && dataOwnerEmail && account.email !== dataOwnerEmail) {
        await signOutGoogle();
        showToast('기존 데이터의 소유자가 아닙니다.');
        setToastActive(true);
        setTimeout(() => setToastActive(false), 2500);
        return;
      }

      // [Cloud Data Recovery]
      // Check if there's data on the cloud for this user.
      const hasCloudData = await checkCloudDataExists(account.email);
      if (hasCloudData) {
        const restored = await new Promise<boolean>((resolve) => {
          showAlert({
            title: '기존 데이터 불러오기',
            message: '클라우드에 저장된 아이 정보와 캘린더 일정이 있습니다. 지금 불러오시겠습니까?\n\n(잠금화면 등 보안 설정과 앱 설정은 기기 보호를 위해 복구되지 않습니다.)',
            buttons: [
              {
                text: '아니요',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: '예',
                onPress: async () => {
                  try {
                    // Stay in loading state during restoration
                    setLoading(true);
                    await restoreDataFromCloud(account.email);
                    resolve(true);
                  } catch (err) {
                    console.error('Restore Error:', err);
                    showToast('❌ 데이터 복구 중 오류가 발생했습니다.');
                    resolve(false);
                  }
                },
              },
            ],
          });
        });

        if (restored) {
          showToast('👋 데이터를 성공적으로 복구했어요!');
          // Give React state a moment to propagate before navigation
          setTimeout(() => {
            router.replace('/');
          }, 100);
          return;
        }
      }

      // Even for returning flows, check if they actually have a child profile
      // before dumping them on Home; otherwise, a fresh/deleted account
      // through relogin/join flow would hit an empty home state prematurely.
      const hasChild = (children?.length ?? 0) > 0;

      if (hasChild) {
        completeOnboarding();
        showToast(flow === 'join' ? '☁️ 클라우드 데이터를 자동 동기화했어요' : '👋 다시 오신 걸 환영해요!');
        router.replace('/');
        return;
      }

      if (flow === 'relogin') {
        showToast('기존 로그인 사용자가 아닙니다.');
        setToastActive(true);
        setTimeout(() => setToastActive(false), 2500);
        return;
      }

      router.push('/onboarding-child-setup');
    } catch (e: any) {
      // Robust check for cancellation to prevent the error toast on back/cancel.
      const errorCode = String(e?.code || '');
      const errorMessage = String(e?.message || '').toLowerCase();

      // [Extreme Cancel Detection]
      // Catch everything that looks like a user-initiated cancellation.
      const isCancel =
        errorCode === '12501' ||
        errorCode === '12502' ||
        errorCode === '13' ||
        errorCode === '7' ||
        errorCode === '10' ||
        errorCode === '12500' ||
        errorCode === String(statusCodes.SIGN_IN_CANCELLED) ||
        errorCode === 'SIGN_IN_CANCELLED' ||
        errorMessage.includes('cancel') ||
        errorMessage.includes('cancelled') ||
        errorMessage.includes('12501') ||
        errorMessage.includes('user back') ||
        errorMessage.includes('dismiss') ||
        errorMessage.includes('닫기') ||
        errorMessage.includes('뒤로') ||
        errorMessage.includes('취소') ||
        errorMessage.includes('sign_in_cancelled') ||
        errorMessage.includes('user_cancelled') ||
        errorMessage.includes('developer_error') ||
        errorMessage.includes('user_back');

      if (!isCancel) {
        showToast('❌ 로그인 중 오류가 발생했습니다.');
        // Disable the button while the toast is visible to prevent duplicate attempts
        setToastActive(true);
        setTimeout(() => setToastActive(false), 2500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingBackground>
      <Pressable style={styles.backButton} hitSlop={8} onPress={() => router.back()}>
        <Text style={styles.backIcon}>‹</Text>
      </Pressable>

      <View style={styles.content}>
        <Image
          source={require('../assets/logo_icon.jpg')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.title}>Kindercare 시작하기</Text>
        <Text style={styles.subtitle}>Google 계정으로 1초 만에 시작하세요</Text>

        <Pressable
          style={[
            styles.googleButton,
            (loading || toastActive) && styles.googleButtonDisabled
          ]}
          onPress={handleGoogleSignIn}
          disabled={loading || toastActive}
        >
          {loading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <>
              <View style={styles.googleLogoWrapper}>
                <GoogleLogo size={20} />
              </View>
              <Text style={styles.googleButtonText}>Google 계정으로 1초 만에 시작하기</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>
          가입 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
        </Text>
      </View>
    </OnboardingBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
      marginTop: 4,
    },
    backIcon: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    logoImage: {
      width: 180,
      height: 180,
      marginBottom: 10,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 36,
      textAlign: 'center',
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
      ...SHADOW,
    },
    googleButtonDisabled: {
      opacity: 0.7,
    },
    googleLogoWrapper: {
      marginRight: 12,
    },
    googleButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#1F1F1F',
    },
    disclaimer: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 18,
      lineHeight: 16,
    },
  });
}
