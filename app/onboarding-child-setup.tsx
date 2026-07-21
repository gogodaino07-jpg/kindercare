import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import PermissionModal from '../components/onboarding/PermissionModal';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import { COLORS, SHADOW } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { ChildAge } from '../types/models';

/** Calendar age from a birthdate, clamped into the app's supported 3~7 range. */
function ageFromBirthdate(birthdate: Date): ChildAge {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age -= 1;
  }
  return Math.min(7, Math.max(3, age)) as ChildAge;
}

function formatBirthdate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function OnboardingChildSetupScreen() {
  const router = useRouter();
  const { addChild, completeOnboarding } = useAppData();

  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(Platform.OS === 'web');
  const [error, setError] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const canCreate = !!name.trim() && !!birthdate;

  const handleCreate = () => {
    if (!canCreate || !birthdate) {
      setError(true);
      return;
    }
    setError(false);
    addChild({ name: name.trim(), age: ageFromBirthdate(birthdate) });
    setShowPermissionModal(true);
  };

  const handlePermissionDone = () => {
    setShowPermissionModal(false);
    completeOnboarding();
    router.replace('/');
  };

  return (
    <OnboardingBackground>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>아이 프로필 설정</Text>
        <Text style={styles.subtitle}>우리 아이 정보를 알려주세요</Text>

        <View style={styles.card}>
          <Text style={styles.label}>이름</Text>
          <TextInput
            style={[styles.input, error && !name.trim() && styles.inputInvalid]}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(false);
            }}
            placeholder="아이 이름을 입력해주세요"
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.label}>생년월일</Text>
          {Platform.OS === 'web' ? (
            <DateTimePicker
              value={birthdate ?? new Date()}
              mode="date"
              onChange={(_, selected) => selected && setBirthdate(selected)}
            />
          ) : (
            <>
              <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
                <Text style={styles.dateButtonText}>
                  {birthdate ? formatBirthdate(birthdate) : '생년월일을 선택해주세요'}
                </Text>
              </Pressable>
              {showPicker ? (
                <DateTimePicker
                  value={birthdate ?? new Date()}
                  mode="date"
                  maximumDate={new Date()}
                  onChange={(event, selected) => {
                    setShowPicker(Platform.OS === 'ios');
                    if (selected) setBirthdate(selected);
                  }}
                />
              ) : null}
            </>
          )}

          {error ? <Text style={styles.errorText}>이름과 생년월일을 모두 입력해주세요</Text> : null}
        </View>

        <Pressable
          style={[styles.completeButton, !canCreate && styles.completeButtonDisabled]}
          onPress={handleCreate}
          disabled={!canCreate}
        >
          <Text style={styles.completeButtonText}>프로필 생성 완료</Text>
        </Pressable>
      </ScrollView>

      <PermissionModal visible={showPermissionModal} onDone={handlePermissionDone} />
    </OnboardingBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 40 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  card: {
    backgroundColor: COLORS.creamBeigeCard,
    borderRadius: 18,
    padding: 20,
    ...SHADOW,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputInvalid: {
    borderColor: COLORS.tomorrowRed,
  },
  dateButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.tomorrowRed,
    fontSize: 12,
    marginTop: 10,
  },
  completeButton: {
    marginTop: 24,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.4,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
