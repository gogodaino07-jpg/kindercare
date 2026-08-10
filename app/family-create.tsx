import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/common/AppText';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export default function FamilyCreateScreen() {
  const router = useRouter();
  const { familyKey } = useAppData();
  const { showToast } = useToast();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleNext = () => {
    // Already logged in from onboarding screen.
    router.push('/onboarding-child-setup');
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(familyKey);
    // Removed duplicate toast as requested
  };

  return (
    <OnboardingBackground>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} hitSlop={8} onPress={() => router.back()}>
            <Text style={styles.backText}>뒤로가기</Text>
          </Pressable>
        </View>

        <View style={styles.topSection}>
          <Text style={styles.title}>새로운 가족 그룹 생성</Text>
          <Text style={styles.subtitle}>
            우리 가족만의 소중한 공간을 만들고 아이의 일정을 함께 관리해 보세요.
          </Text>
        </View>

        <View style={styles.spacer} />

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>발급된 가족 초대 코드</Text>

          <View style={styles.codeWrapper}>
            <Text style={styles.codeText}>{familyKey}</Text>
          </View>

          <Pressable style={styles.smallCopyButton} onPress={handleCopy}>
            <Text style={styles.smallCopyButtonText}>복사하기</Text>
          </Pressable>

          <Text style={styles.codeDescription}>
            이 코드는 나중에 가족을 초대할 때{"\n"}다시 확인할 수 있어요.
          </Text>
        </View>

        <View style={styles.spacer} />
        <View style={styles.spacer} />

        <Pressable style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>다음</Text>
        </Pressable>
      </View>
    </OnboardingBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    backButton: {
      paddingVertical: 8,
      paddingHorizontal: 4,
      marginLeft: -4,
    },
    backText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    topSection: {
      marginBottom: 32,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
      textAlign: 'center',
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
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    codeText: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.coralPink,
      letterSpacing: 2,
    },
    smallCopyButton: {
      backgroundColor: colors.gray50,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    smallCopyButtonText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
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
      backgroundColor: colors.coralPink,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      ...SHADOW,
    },
    nextButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
