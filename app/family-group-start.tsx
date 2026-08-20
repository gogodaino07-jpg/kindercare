import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import JoinCodeModal from '../components/onboarding/JoinCodeModal';
import Text from '../components/common/AppText';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import { SHADOW, ThemeColors } from '../constants/theme';
import { STAMP_BOARD_THEMES } from '../constants/stampBoardThemes';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';

const BG_GRADIENT = STAMP_BOARD_THEMES.blue.bgGradient;
const PRIMARY_GRADIENT = STAMP_BOARD_THEMES.blue.stampButtonGradient;

export default function FamilyGroupStartScreen() {
  const router = useRouter();
  const { regenerateFamilyKey } = useAppData();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showJoinModal, setShowJoinModal] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';

  const handleCreateNew = () => {
    router.push({ pathname: '/google-signin', params: { flow: 'create' } });
  };

  const handleJoin = (code: string) => {
    setShowJoinModal(false);
    router.push({ pathname: '/google-signin', params: { flow: 'join', code } });
  };

  const handleRelogin = () => {
    router.push({ pathname: '/google-signin', params: { flow: 'relogin' } });
  };

  return (
    <OnboardingBackground style={{ backgroundColor: 'transparent' }}>
      <LinearGradient colors={BG_GRADIENT} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <Text style={styles.title}>가족 그룹 시작하기</Text>
        <Text style={styles.subtitle}>
          처음이라면 새로 만들고, 초대받으셨다면 코드로 참여해주세요
        </Text>

        <View style={styles.primaryCardShadow}>
          <Pressable onPress={handleCreateNew}>
            <LinearGradient
              colors={PRIMARY_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryCard}
            >
              <Text style={styles.primaryCardIcon}>✨</Text>
              <View style={styles.cardTextArea}>
                <Text style={styles.primaryCardTitle}>신규 생성</Text>
                <Text style={styles.primaryCardSubtitle}>새 가족 그룹을 만들어요</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.secondaryCardShadow}>
          <Pressable style={styles.secondaryCard} onPress={() => setShowJoinModal(true)}>
            <Text style={styles.secondaryCardIcon}>🔑</Text>
            <View style={styles.cardTextArea}>
              <Text style={styles.secondaryCardTitle}>초대 코드로 참여</Text>
              <Text style={styles.secondaryCardSubtitle}>가족에게 받은 코드를 입력해요</Text>
            </View>
          </Pressable>
        </View>

        <TouchableOpacity style={styles.reloginButton} onPress={handleRelogin}>
          <Text style={styles.reloginText}>
            이미 계정이 있나요? <Text style={styles.reloginLink}>로그인하기</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>버전 {appVersion}</Text>
      </View>

      <JoinCodeModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoin}
      />
    </OnboardingBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: '#1E293B',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 13,
      color: '#64748B',
      marginBottom: 32,
      textAlign: 'center',
      fontWeight: '600',
    },
    // 안드로이드 elevation은 배경 없는(투명) 뷰에서 둥근 모서리를 무시하고
    // 각진 그림자를 그려 흰 상자처럼 비치는 버그가 있어, 안드로이드에서는
    // 그림자를 끄고 iOS 전용 그림자만 유지한다.
    primaryCardShadow: {
      borderRadius: 18,
      marginBottom: 14,
      ...SHADOW,
      shadowOpacity: 0.16,
      elevation: 0,
    },
    primaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 18,
      padding: 20,
    },
    primaryCardIcon: { fontSize: 28, marginRight: 14 },
    primaryCardTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
    primaryCardSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    secondaryCardShadow: {
      borderRadius: 18,
      ...SHADOW,
      shadowOpacity: 0.06,
      elevation: 0,
    },
    secondaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.72)',
      borderWidth: 2,
      borderColor: '#BAE6FD',
      borderRadius: 18,
      padding: 20,
    },
    secondaryCardIcon: { fontSize: 28, marginRight: 14 },
    secondaryCardTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
    secondaryCardSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '600' },
    cardTextArea: { flex: 1 },
    reloginButton: {
      marginTop: 28,
      alignItems: 'center',
      paddingVertical: 10,
    },
    reloginText: {
      fontSize: 14,
      color: '#64748B',
      fontWeight: '600',
    },
    reloginLink: {
      fontWeight: '800',
      color: '#0EA5E9',
      textDecorationLine: 'underline',
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
