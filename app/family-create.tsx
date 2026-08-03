import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/common/AppText';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import GoogleLogo from '../components/common/GoogleLogo';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';

export default function FamilyCreateScreen() {
  const router = useRouter();
  const { familyKey } = useAppData();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleNext = () => {
    router.push({ pathname: '/google-signin', params: { flow: 'create' } });
  };

  return (
    <OnboardingBackground>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🏠</Text>
        </View>
        <Text style={styles.title}>새로운 가족 그룹 생성</Text>
        <Text style={styles.subtitle}>
          우리 가족만의 소중한 공간을 만들고{"\n"}아이의 일정을 함께 관리해 보세요.
        </Text>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>발급된 가족 초대 코드</Text>
          <View style={styles.codeWrapper}>
            <Text style={styles.codeText}>{familyKey}</Text>
          </View>
          <Text style={styles.codeDescription}>
            이 코드는 나중에 가족을 초대할 때{"\n"}다시 확인할 수 있어요.
          </Text>
        </View>

        <View style={styles.spacer} />

        <Pressable style={styles.nextButton} onPress={handleNext}>
          <View style={styles.googleLogoWrapper}>
            <GoogleLogo size={20} />
          </View>
          <Text style={styles.nextButtonText}>Google 계정으로 시작하기</Text>
        </Pressable>
      </View>
    </OnboardingBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      flex: 1,
      paddingHorizontal: 28,
      paddingTop: 20,
      alignItems: 'center',
    },
    iconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.creamBeigeCard,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      ...SHADOW,
    },
    icon: {
      fontSize: 48,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 40,
    },
    codeCard: {
      width: '100%',
      backgroundColor: colors.creamBeigeCard,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      ...SHADOW,
    },
    codeLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 16,
    },
    codeWrapper: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 30,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    codeText: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.coralPink,
      letterSpacing: 2,
    },
    codeDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    spacer: {
      flex: 1,
    },
    nextButton: {
      width: '100%',
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
      ...SHADOW,
    },
    googleLogoWrapper: {
      marginRight: 10,
    },
    nextButtonText: {
      color: '#1F1F1F',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
