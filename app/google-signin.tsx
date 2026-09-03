import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View, TouchableOpacity, Animated } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import Constants from 'expo-constants';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import GoogleLogo from '../components/common/GoogleLogo';
import Text from '../components/common/AppText';
import { SHADOW, ThemeColors } from '../constants/theme';
import { STAMP_BOARD_THEMES } from '../constants/stampBoardThemes';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

const BG_GRADIENT = STAMP_BOARD_THEMES.blue.bgGradient;

export default function GoogleSignInScreen() {
  const router = useRouter();
  const { flow, code } = useLocalSearchParams<{ flow?: string; code?: string }>();
  const {
    completeOnboarding,
    signInWithGoogle,
    signOutGoogle,
    signInWithKakao,
    signOutKakao,
    children,
    dataOwnerEmail,
    resetAllData,
    regenerateFamilyKey,
    createFamilyInvite,
    joinFamilyByCode,
    checkCloudDataExists,
    checkOnboardingStatus,
    checkFamilyOwnerEmail,
    restoreFamilyMembership,
    restoreDataFromCloud,
    checkWithdrawalStatus,
    cancelWithdrawal,
    purgeCloudData,
  } = useAppData();
  const { showAlert } = useAlert();
  const { showToast } = useToast();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [toastActive, setToastActive] = useState(false);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Floating movement (up and down)
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    // Pulse effect (scale slightly)
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel([float, pulse]).start();

    return () => {
      floatAnim.stopAnimation();
      pulseAnim.stopAnimation();
    };
  }, []);

  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';

  const handleGoogleSignIn = async () => {
    if (loading || toastActive) return;
    setLoading(true);
    try {
      const account = await signInWithGoogle();

      // [Withdrawal Check]
      // 즉시 탈퇴 정책으로 변경됨에 따라 유예기간 확인 및 복구 로직 제거
      const withdrawalDateStr = await checkWithdrawalStatus(account.email);
      if (withdrawalDateStr) {
        // 이미 탈퇴 처리된 계정인 경우 클라우드 데이터 잔여분이 있다면 정리
        setLoading(true);
        await purgeCloudData(account.email);
        console.log('🗑️ Legacy withdrawal data found. Cloud data purged.');
      }

      // [Device Ownership Check]
      // Local data is just a device-level cache for whoever was last signed in.
      // Switching to a different account silently clears it — the new account's
      // own data (cloud restore or a fresh start) takes over right after, so
      // there's nothing here worth interrupting the user to confirm.
      if (dataOwnerEmail && account.email !== dataOwnerEmail) {
        setLoading(true);
        await resetAllData({ preserveAccount: true });
      }

      // [Flow Logic]
      const hasOnboardedCloud = await checkOnboardingStatus(account.email);
      const hasCloudData = await checkCloudDataExists(account.email);

      // 1. Re-login Flow
      if (flow === 'relogin') {
        // 초대 코드로 합류해둔 가족이 있는지 먼저 확인 — 이 계정이 합류하기 전에
        // 독자적으로 온보딩을 마친 이력이 있으면 아래 hasCloudData 분기가 그 예전
        // 데이터부터 복원해버려서, 로그아웃 후 재로그인할 때마다 가족 공유 데이터
        // 대신 자기 자신의 옛 데이터가 보이는 문제로 이어진다.
        const memberOwnerEmail = await checkFamilyOwnerEmail(account.email);
        if (memberOwnerEmail) {
          await restoreFamilyMembership(memberOwnerEmail);
          completeOnboarding();
          showToast('👋 다시 오신 걸 환영해요!');
          setTimeout(() => { router.dismissAll(); router.replace('/'); }, 100);
          return;
        }

        if (hasCloudData) {
          if (hasOnboardedCloud) {
            try {
              setLoading(true);
              await restoreDataFromCloud(account.email);
              showToast('👋 다시 오신 걸 환영해요!');
              setTimeout(() => { router.dismissAll(); router.replace('/'); }, 100);
              return;
            } catch (err) {
              console.error('Auto Restore Error:', err);
            }
          }

          const restored = await new Promise<boolean>((resolve) => {
            showAlert({
              title: '기존 데이터 불러오기',
              message: '클라우드에 저장된 아이 정보와 캘린더 일정이 있습니다. 지금 불러오시겠습니까?\n\n(잠금화면 등 보안 설정과 앱 설정은 기기 보호를 위해 복구되지 않습니다.)',
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
            setTimeout(() => { router.dismissAll(); router.replace('/'); }, 100);
            return;
          }
        }

        const hasChild = (children?.length ?? 0) > 0;
        if (hasChild) {
          completeOnboarding();
          router.replace('/');
          return;
        }

        // [Fix] 이미 계정이 있는 경로(relogin)로 들어왔으나, 데이터가 없는 신규 계정인 경우 차단
        if (!hasCloudData && !hasChild) {
          showToast('가입 한 계정이 아닙니다');
          await signOutGoogle();
          setLoading(false);
          return;
        }

        router.push('/onboarding-child-setup');
        return;
      }

      // 2. New Group Creation Flow
      if (flow === 'create') {
        const newKey = regenerateFamilyKey();
        await createFamilyInvite(newKey);
        router.push('/family-create');
        return;
      }

      // 3. Join with Code Flow
      if (flow === 'join') {
        const joined = !!code && (await joinFamilyByCode(code, account));
        if (!joined) {
          showToast('❌ 유효하지 않은 초대 코드예요. 다시 시도해 주세요.');
          router.replace('/family-group-start');
          return;
        }
        // 공유된 가족 데이터를 그대로 쓰므로 아이 등록 화면은 건너뛰고, 역할(엄마/아빠/할머니 등)만 고른다.
        router.push({ pathname: '/family-role-select' });
        return;
      }

      // 4. Default Fallback
      const hasChild = (children?.length ?? 0) > 0;
      if (hasChild) {
        completeOnboarding();
        router.replace('/');
      } else {
        router.push('/onboarding-child-setup');
      }

    } catch (e: any) {
      const errorCode = String(e?.code || '');
      const errorMessage = String(e?.message || '').toLowerCase();
      const errorString = String(e || '').toLowerCase();

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
        errorMessage.includes('dismiss') ||
        errorMessage.includes('닫기') ||
        errorMessage.includes('뒤로') ||
        errorMessage.includes('취소') ||
        errorMessage.includes('사용자 취소') ||
        errorMessage.includes('user_back') ||
        errorMessage.includes('user back') ||
        errorString.includes('cancel') ||
        errorString.includes('back') ||
        errorString.includes('dismiss') ||
        errorString.includes('12501') ||
        errorString.includes('13') ||
        errorString.includes('10');

      if (!isCancel) {
        showToast(`❌ 로그인 오류 (${errorCode}): 다시 시도해 주세요.`);
        setToastActive(true);
        setTimeout(() => setToastActive(false), 2500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoSignIn = async () => {
    if (loading || toastActive) return;
    setLoading(true);
    try {
      const account = await signInWithKakao();

      // [Withdrawal Check]
      const withdrawalDateStr = await checkWithdrawalStatus(account.email);
      if (withdrawalDateStr) {
        setLoading(true);
        await purgeCloudData(account.email);
        console.log('🗑️ Legacy withdrawal data found (Kakao). Cloud data purged.');
      }

      // [Device Ownership Check]
      // Local data is just a device-level cache for whoever was last signed in.
      // Switching to a different account silently clears it — see the Google
      // handler above for the full reasoning.
      if (dataOwnerEmail && account.email !== dataOwnerEmail) {
        setLoading(true);
        await resetAllData({ preserveAccount: true });
      }

      // [Flow Logic]
      const hasOnboardedCloud = await checkOnboardingStatus(account.email);
      const hasCloudData = await checkCloudDataExists(account.email);

      // 1. Re-login Flow
      if (flow === 'relogin') {
        // 초대 코드로 합류해둔 가족이 있는지 먼저 확인 — 이 계정이 합류하기 전에
        // 독자적으로 온보딩을 마친 이력이 있으면 아래 hasCloudData 분기가 그 예전
        // 데이터부터 복원해버려서, 로그아웃 후 재로그인할 때마다 가족 공유 데이터
        // 대신 자기 자신의 옛 데이터가 보이는 문제로 이어진다.
        const memberOwnerEmail = await checkFamilyOwnerEmail(account.email);
        if (memberOwnerEmail) {
          await restoreFamilyMembership(memberOwnerEmail);
          completeOnboarding();
          showToast('👋 다시 오신 걸 환영해요!');
          setTimeout(() => { router.dismissAll(); router.replace('/'); }, 100);
          return;
        }

        if (hasCloudData) {
          if (hasOnboardedCloud) {
            try {
              setLoading(true);
              await restoreDataFromCloud(account.email);
              showToast('👋 다시 오신 걸 환영해요!');
              setTimeout(() => { router.dismissAll(); router.replace('/'); }, 100);
              return;
            } catch (err) {
              console.error('Auto Restore Error:', err);
            }
          }

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
            setTimeout(() => { router.dismissAll(); router.replace('/'); }, 100);
            return;
          }
        }

        const hasChild = (children?.length ?? 0) > 0;
        if (hasChild) {
          completeOnboarding();
          router.replace('/');
          return;
        }

        // [Fix] 이미 계정이 있는 경로(relogin)이나 데이터가 없는 경우 차단
        if (!hasCloudData && !hasChild) {
          showToast('가입 한 계정이 아닙니다');
          await signOutKakao();
          setLoading(false);
          return;
        }

        router.push('/onboarding-child-setup');
        return;
      }

      // 2. New Group Creation Flow
      if (flow === 'create') {
        const newKey = regenerateFamilyKey();
        await createFamilyInvite(newKey);
        router.push('/family-create');
        return;
      }

      // 3. Join with Code Flow
      if (flow === 'join') {
        const joined = !!code && (await joinFamilyByCode(code, account));
        if (!joined) {
          showToast('❌ 유효하지 않은 초대 코드예요. 다시 시도해 주세요.');
          router.replace('/family-group-start');
          return;
        }
        // 공유된 가족 데이터를 그대로 쓰므로 아이 등록 화면은 건너뛰고, 역할(엄마/아빠/할머니 등)만 고른다.
        router.push({ pathname: '/family-role-select' });
        return;
      }

      // 4. Default Fallback
      const hasChild = (children?.length ?? 0) > 0;
      if (hasChild) {
        completeOnboarding();
        router.replace('/');
      } else {
        router.push('/onboarding-child-setup');
      }

    } catch (e: any) {
      // Kakao specific cancel codes or generic errors
      const errorMessage = String(e?.message || '').toLowerCase();
      if (!errorMessage.includes('cancel') && !errorMessage.includes('user_cancelled')) {
        const friendlyMessage =
          e?.code === 'auth/account-exists-with-different-credential' && e?.message
            ? `❌ ${e.message}`
            : `❌ 카카오 로그인 오류 (${e?.code || 'unknown'}): 다시 시도해 주세요.`;
        showToast(friendlyMessage);
        setToastActive(true);
        setTimeout(() => setToastActive(false), 2500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProviderLogin = (provider: string) => {
    showToast(`${provider === 'naver' ? '네이버' : '카카오톡'} 로그인은 준비 중입니다. 구글 로그인을 이용해 주세요.`);
  };

  return (
    <OnboardingBackground style={{ backgroundColor: 'transparent' }}>
      <LinearGradient colors={BG_GRADIENT} style={StyleSheet.absoluteFill} />
      {router.canGoBack() && (
        <Pressable style={styles.backButton} hitSlop={8} onPress={() => router.back()}>
          <Text style={styles.backText}>뒤로가기</Text>
        </Pressable>
      )}

      <View style={styles.content}>
        <Animated.Image
          source={require('../assets/logo_pure_chick_transparent.png')}
          style={[
            styles.logoImage,
            {
              transform: [
                { translateY: floatAnim },
                { scale: pulseAnim }
              ]
            }
          ]}
          resizeMode="contain"
        />
        <Text style={styles.title}>Kindercare 시작하기</Text>
        <Text style={styles.subtitle}>가족과 함께하는 일상의 시작,{'\n'}소셜 계정으로 1초 만에 가입하세요</Text>

        <View style={styles.btnStack}>
          <Pressable
            style={[
              styles.btn,
              styles.btnGoogle,
              (loading || toastActive) && styles.googleButtonDisabled
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading || toastActive}
          >
            {loading ? (
              <ActivityIndicator color="#3C4043" />
            ) : (
              <View style={styles.btnInner}>
                <GoogleLogo size={20} />
                <Text style={styles.btnTextDark}>구글로 시작하기</Text>
              </View>
            )}
          </Pressable>

          <TouchableOpacity
            style={[styles.btn, styles.btnKakao]}
            onPress={handleKakaoSignIn}
          >
            <View style={styles.btnInner}>
              <FontAwesome name="comment" size={20} color="#3C1E1E" style={styles.btnIcon} />
              <Text style={styles.btnTextKakao}>카카오톡으로 시작하기</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          가입 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
        </Text>
      </View>

      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>버전 {appVersion}</Text>
      </View>
    </OnboardingBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backButton: {
      height: 36,
      paddingHorizontal: 14,
      marginLeft: 16,
      marginTop: 8,
      borderRadius: 18,
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    backText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#64748B',
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    logoImage: {
      width: 168,
      height: 168,
      marginBottom: 10,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: '#1E293B',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: '#64748B',
      marginBottom: 32,
      textAlign: 'center',
      lineHeight: 20,
      fontWeight: '600',
    },
    btnStack: {
      width: '100%',
      gap: 12,
      marginBottom: 24,
    },
    btn: {
      width: '100%',
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
    },
    btnInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnIcon: {
      marginRight: 10,
    },
    btnGoogle: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E4E4E7',
    },
    btnKakao: {
      backgroundColor: '#FEE500',
    },
    btnTextDark: {
      color: '#3C4043',
      fontSize: 15,
      fontWeight: '700',
      marginLeft: 10,
    },
    btnTextLight: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    btnTextKakao: {
      color: '#3C1E1E',
      fontSize: 15,
      fontWeight: '700',
    },
    googleButtonDisabled: {
      opacity: 0.7,
    },
    disclaimer: {
      fontSize: 11,
      color: '#64748B',
      textAlign: 'center',
      marginTop: 18,
      lineHeight: 16,
    },
    versionContainer: {
      paddingBottom: 20,
      alignItems: 'center',
    },
    versionText: {
      fontSize: 12,
      color: '#64748B',
      fontWeight: '500',
      opacity: 0.5,
    },
  });
}
