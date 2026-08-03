import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import JoinCodeModal from '../components/onboarding/JoinCodeModal';
import Text from '../components/common/AppText';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';

export default function FamilyGroupStartScreen() {
  const router = useRouter();
  const { regenerateFamilyKey } = useAppData();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showJoinModal, setShowJoinModal] = useState(false);

  const handleCreateNew = () => {
    regenerateFamilyKey();
    router.push('/family-create');
  };

  const handleJoin = (_code: string) => {
    setShowJoinModal(false);
    router.push({ pathname: '/google-signin', params: { flow: 'join' } });
  };

  return (
    <OnboardingBackground>
      <View style={styles.content}>
        <Text style={styles.title}>가족 그룹 시작하기</Text>
        <Text style={styles.subtitle}>
          처음이라면 새로 만들고, 초대받으셨다면 코드로 참여해주세요
        </Text>

        <Pressable style={styles.primaryCard} onPress={handleCreateNew}>
          <Text style={styles.primaryCardIcon}>✨</Text>
          <View style={styles.cardTextArea}>
            <Text style={styles.primaryCardTitle}>신규 생성</Text>
            <Text style={styles.primaryCardSubtitle}>새 가족 그룹을 만들어요</Text>
          </View>
        </Pressable>

        <Pressable style={styles.secondaryCard} onPress={() => setShowJoinModal(true)}>
          <Text style={styles.secondaryCardIcon}>🔑</Text>
          <View style={styles.cardTextArea}>
            <Text style={styles.secondaryCardTitle}>초대 코드로 참여</Text>
            <Text style={styles.secondaryCardSubtitle}>가족에게 받은 코드를 입력해요</Text>
          </View>
        </Pressable>

        <Pressable style={styles.reloginButton} onPress={() => router.push({ pathname: '/google-signin', params: { flow: 'relogin' } })}>
          <Text style={styles.reloginText}>이미 계정이 있으신가요? <Text style={styles.reloginLink}>재로그인</Text></Text>
        </Pressable>
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
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 32,
      textAlign: 'center',
    },
    primaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.coralPink,
      borderRadius: 18,
      padding: 20,
      marginBottom: 14,
      ...SHADOW,
    },
    primaryCardIcon: { fontSize: 28, marginRight: 14 },
    primaryCardTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
    primaryCardSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    secondaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.coralPink,
      borderRadius: 18,
      padding: 20,
      ...SHADOW,
    },
    secondaryCardIcon: { fontSize: 28, marginRight: 14 },
    secondaryCardTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
    secondaryCardSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    cardTextArea: { flex: 1 },
    reloginButton: {
      marginTop: 28,
      alignItems: 'center',
      paddingVertical: 10,
    },
    reloginText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    reloginLink: {
      fontWeight: '800',
      color: colors.accent,
      textDecorationLine: 'underline',
    },
  });
}
