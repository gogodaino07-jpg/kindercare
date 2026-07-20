import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import { COLORS, SHADOW } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';

export default function FamilyGroupStartScreen() {
  const router = useRouter();
  const { regenerateFamilyKey } = useAppData();

  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState(false);

  const handleCreateNew = () => {
    regenerateFamilyKey();
    router.push('/verify-phone');
  };

  const handleJoin = () => {
    if (!joinCode.trim()) {
      setJoinError(true);
      return;
    }
    setJoinError(false);
    router.push('/verify-phone');
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

        <Pressable
          style={styles.secondaryCard}
          onPress={() => setShowJoinInput((prev) => !prev)}
        >
          <Text style={styles.secondaryCardIcon}>🔑</Text>
          <View style={styles.cardTextArea}>
            <Text style={styles.secondaryCardTitle}>초대 코드로 참여</Text>
            <Text style={styles.secondaryCardSubtitle}>가족에게 받은 코드를 입력해요</Text>
          </View>
        </Pressable>

        {showJoinInput ? (
          <View style={styles.joinBox}>
            <TextInput
              style={styles.joinInput}
              value={joinCode}
              onChangeText={(t) => {
                setJoinCode(t);
                setJoinError(false);
              }}
              placeholder="초대 코드를 입력해주세요"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="characters"
            />
            {joinError ? <Text style={styles.errorText}>초대 코드를 입력해주세요</Text> : null}
            <Pressable style={styles.joinButton} onPress={handleJoin}>
              <Text style={styles.joinButtonText}>참여하기</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </OnboardingBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.coralPink,
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
    backgroundColor: COLORS.creamBeigeCard,
    borderRadius: 18,
    padding: 20,
    ...SHADOW,
  },
  secondaryCardIcon: { fontSize: 28, marginRight: 14 },
  secondaryCardTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  secondaryCardSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardTextArea: { flex: 1 },
  joinBox: {
    marginTop: 16,
    backgroundColor: COLORS.creamBeigeCard,
    borderRadius: 16,
    padding: 16,
    ...SHADOW,
  },
  joinInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  errorText: {
    color: COLORS.tomorrowRed,
    fontSize: 12,
    marginTop: 6,
  },
  joinButton: {
    marginTop: 12,
    backgroundColor: COLORS.peachOrange,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
