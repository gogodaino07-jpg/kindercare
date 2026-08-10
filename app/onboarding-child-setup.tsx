import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import PermissionModal from '../components/onboarding/PermissionModal';
import Text from '../components/common/AppText';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { ChildAge } from '../types/models';
import { ageFromBirthdate, toISODate } from '../utils/date';

function formatBirthdate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function OnboardingChildSetupScreen() {
  const router = useRouter();
  const { addChild, completeOnboarding } = useAppData();
  const { showAlert } = useAlert();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    return d;
  }, []);

  const minDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 8);
    return d;
  }, []);

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
    addChild({
      name: name.trim(),
      age: ageFromBirthdate(birthdate),
      birthdate: toISODate(birthdate)
    });
    setShowPermissionModal(true);
  };

  const handlePermissionDone = () => {
    setShowPermissionModal(false);
    completeOnboarding();
    // Clear the onboarding/verification screens from history so hardware
    // back from Home exits the app instead of stepping back through them.
    router.dismissAll();
    router.replace('/');
  };

  return (
    <OnboardingBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} hitSlop={8} onPress={() => router.back()}>
            <Text style={styles.backText}>뒤로가기</Text>
          </Pressable>
        </View>

        <View style={styles.topSection}>
          <Text style={styles.title}>새로운 아이 프로필 설정</Text>
          <Text style={styles.subtitle}>우리 아이 정보를 알려주세요</Text>
        </View>

        <View style={styles.spacer} />

        <View style={styles.card}>
          <Text style={styles.label}>이름</Text>
          <TextInput
            style={[styles.input, error && !name.trim() && styles.inputInvalid]}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(false);
            }}
            maxLength={10}
            placeholder="아이 이름을 입력해주세요"
            placeholderTextColor={colors.textSecondary}
          />
          {error && !name.trim() ? (
            <Text style={styles.errorText}>아이 이름을 입력해주세요</Text>
          ) : null}

          <Text style={styles.label}>생년월일</Text>
          {Platform.OS === 'web' ? (
            <DateTimePicker
              value={birthdate ?? maxDate}
              mode="date"
              maximumDate={maxDate}
              minimumDate={minDate}
              themeVariant="light"
              accentColor={colors.coralPink}
              onChange={(_, selected) => selected && setBirthdate(selected)}
            />
          ) : (
            <>
              <Pressable
                style={[styles.dateButton, error && !birthdate && styles.inputInvalid]}
                onPress={() => setShowPicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {birthdate ? formatBirthdate(birthdate) : '생년월일을 선택해주세요'}
                </Text>
              </Pressable>
              {showPicker ? (
                <DateTimePicker
                  value={birthdate ?? maxDate}
                  mode="date"
                  maximumDate={maxDate}
                  minimumDate={minDate}
                  display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  themeVariant="light"
                  accentColor={colors.coralPink}
                  onChange={(event, selected) => {
                    setShowPicker(Platform.OS === 'ios');
                    if (selected) setBirthdate(selected);
                  }}
                />
              ) : null}
            </>
          )}
          {error && !birthdate ? (
            <Text style={styles.errorText}>생년월일을 선택해주세요</Text>
          ) : null}
        </View>

        <View style={styles.spacer} />
        <View style={styles.spacer} />
      </ScrollView>

      <Pressable
        style={[styles.completeButton, !canCreate && styles.completeButtonDisabled]}
        onPress={handleCreate}
        disabled={!canCreate}
      >
        <Text style={styles.completeButtonText}>프로필 생성 완료</Text>
      </Pressable>

      <PermissionModal visible={showPermissionModal} onDone={handlePermissionDone} />
    </OnboardingBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 20,
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
    spacer: {
      flex: 1,
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
    card: {
      backgroundColor: colors.creamBeigeCard,
      borderRadius: 20,
      padding: 24,
      ...SHADOW,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    inputInvalid: {
      borderColor: colors.tomorrowRed,
    },
    dateButton: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    dateButtonText: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    errorText: {
      color: colors.tomorrowRed,
      fontSize: 12,
      marginTop: 10,
    },
    completeButton: {
      marginHorizontal: 24,
      marginBottom: 24,
      backgroundColor: colors.coralPink,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      ...SHADOW,
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
}
