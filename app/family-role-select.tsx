import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/common/AppText';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import { SHADOW } from '../constants/theme';
import { STAMP_BOARD_THEMES } from '../constants/stampBoardThemes';
import { useAppData } from '../context/AppDataContext';

const BG_GRADIENT = STAMP_BOARD_THEMES.blue.bgGradient;
const CTA_GRADIENT = STAMP_BOARD_THEMES.blue.stampButtonGradient;

const ROLE_OPTIONS = [
  { label: '엄마', emoji: '👩' },
  { label: '아빠', emoji: '👨' },
  { label: '할머니', emoji: '👵' },
  { label: '할아버지', emoji: '👴' },
  { label: '외삼촌', emoji: '🧑' },
  { label: '기타', emoji: '🙂' },
];

// 초대 코드로 합류를 마친 직후에만 들어오는 필수 선택 화면 — 건너뛰기 없음
// (다른 온보딩 필수 입력 화면들과 동일한 패턴). 여기서 고른 역할이 편집 권한을
// 결정한다(엄마/아빠만 바로 편집 가능 — context/AppDataContext.tsx의 EDIT_ROLES).
export default function FamilyRoleSelectScreen() {
  const router = useRouter();
  const { setMemberRole, completeOnboarding } = useAppData();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await setMemberRole(selected);
    } finally {
      completeOnboarding();
      router.dismissAll();
      router.replace('/');
    }
  };

  return (
    <OnboardingBackground style={{ backgroundColor: 'transparent' }}>
      <LinearGradient colors={BG_GRADIENT} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.title}>어떤 분으로 참여하시나요?</Text>
          <Text style={styles.subtitle}>
            역할에 따라 일정을 볼 수만 있는지,{'\n'}추가·수정도 할 수 있는지가 정해져요.
          </Text>
        </View>

        <View style={styles.grid}>
          {ROLE_OPTIONS.map((opt) => {
            const isSelected = selected === opt.label;
            return (
              <Pressable
                key={opt.label}
                style={[styles.roleCard, isSelected && styles.roleCardSelected]}
                onPress={() => setSelected(opt.label)}
              >
                <Text style={styles.roleEmoji}>{opt.emoji}</Text>
                <Text style={[styles.roleLabel, isSelected && styles.roleLabelSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.spacer} />

        <View style={[styles.nextButtonShadow, !selected && styles.nextButtonDisabled]}>
          <Pressable onPress={handleConfirm} disabled={!selected || saving}>
            <LinearGradient
              colors={CTA_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButton}
            >
              <Text style={styles.nextButtonText}>{saving ? '설정 중...' : '시작하기'}</Text>
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
    paddingTop: 48,
  },
  topSection: {
    marginBottom: 32,
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
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  roleCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 2,
    borderColor: '#BAE6FD',
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  roleCardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0EA5E9',
    ...SHADOW,
    shadowOpacity: 0.14,
    elevation: 0,
  },
  roleEmoji: {
    fontSize: 32,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  roleLabelSelected: {
    color: '#0369A1',
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  nextButtonShadow: {
    borderRadius: 16,
    marginBottom: 24,
    ...SHADOW,
    shadowOpacity: 0.16,
    elevation: 0,
  },
  nextButtonDisabled: {
    opacity: 0.4,
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
