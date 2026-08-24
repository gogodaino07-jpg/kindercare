import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/common/AppText';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import { SHADOW } from '../constants/theme';
import { STAMP_BOARD_THEMES } from '../constants/stampBoardThemes';
import { useAppData } from '../context/AppDataContext';

const BG_GRADIENT = STAMP_BOARD_THEMES.blue.bgGradient;
const CTA_GRADIENT = STAMP_BOARD_THEMES.blue.stampButtonGradient;

export default function FamilyCreateScreen() {
  const router = useRouter();
  const { familyKey } = useAppData();

  const handleNext = () => {
    // Already logged in from onboarding screen.
    router.push('/onboarding-child-setup');
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(familyKey);
  };

  return (
    <OnboardingBackground style={{ backgroundColor: 'transparent' }}>
      <LinearGradient colors={BG_GRADIENT} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} hitSlop={8} onPress={() => router.back()}>
            <Text style={styles.backText}>뒤로가기</Text>
          </Pressable>
        </View>

        <View style={styles.topSpacer} />

        <View style={styles.topSection}>
          <Text style={styles.title}>새로운 가족 그룹 생성</Text>
          <Text style={styles.subtitle}>
            우리 가족만의 소중한 공간을 만들고{'\n'}아이의 일정을 함께 관리해 보세요.
          </Text>
        </View>

        <View style={styles.spacer} />

        <View style={styles.codeCardShadow}>
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>발급된 가족 초대 코드</Text>

            <View style={styles.codeWrapper}>
              <Text style={styles.codeText}>{familyKey}</Text>
            </View>

            <Pressable style={styles.smallCopyButton} onPress={handleCopy}>
              <Text style={styles.smallCopyButtonText}>복사하기</Text>
            </Pressable>

            <Text style={styles.codeDescription}>
              이 코드는 나중에 가족을 초대할 때{'\n'}다시 확인할 수 있어요.
            </Text>
          </View>
        </View>

        <View style={styles.spacer} />
        <View style={styles.spacer} />

        <View style={styles.nextButtonShadow}>
          <Pressable onPress={handleNext}>
            <LinearGradient
              colors={CTA_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButton}
            >
              <Text style={styles.nextButtonText}>다음</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </OnboardingBackground>
  );
}

const styles = StyleSheet.create({
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
    color: '#64748B',
  },
  topSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 14,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  // 안드로이드 elevation은 배경 없는(투명) 뷰에서 둥근 모서리를 무시하고
  // 각진 그림자를 그려 흰 상자처럼 비치는 버그가 있어, 안드로이드에서는
  // 그림자를 끄고 iOS 전용 그림자만 유지한다.
  codeCardShadow: {
    borderRadius: 20,
    ...SHADOW,
    shadowOpacity: 0.08,
    elevation: 0,
  },
  codeCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 2,
    borderColor: '#BAE6FD',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 16,
  },
  codeWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0EA5E9',
    letterSpacing: 2,
  },
  smallCopyButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  smallCopyButtonText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  codeDescription: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  spacer: {
    flex: 1,
  },
  topSpacer: {
    flex: 1,
  },
  nextButtonShadow: {
    borderRadius: 16,
    marginBottom: 24,
    ...SHADOW,
    shadowOpacity: 0.16,
    elevation: 0,
  },
  nextButton: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
