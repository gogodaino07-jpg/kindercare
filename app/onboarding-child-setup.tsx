import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, Image } from 'react-native';
import AvatarPickerModal from '../components/child-profile/AvatarPickerModal';
import PermissionModal from '../components/onboarding/PermissionModal';
import PhotoCropModal from '../components/child-profile/PhotoCropModal';
import Text from '../components/common/AppText';
import ClearableTextInput from '../components/common/ClearableTextInput';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import { SHADOW } from '../constants/theme';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useAppLock } from '../context/AppLockContext';
import { ChildAge } from '../types/models';
import { ageFromBirthdate, toISODate } from '../utils/date';
import { stripInvalidCharacters } from '../utils/validation';

const AGE_OPTIONS: ChildAge[] = [2, 3, 4, 5, 6, 7];
const AVATAR_RING_GRADIENT = ['#BAE6FD', '#DBEAFE', '#C7D2FE'] as const;
// 캐릭터 선택 기능을 없애고 사진(앨범/카메라)만 받기로 하면서, 사진이
// 없을 때 보여줄 기본 아이콘도 고정 이모지 하나로 단순화했다.
const DEFAULT_AVATAR_EMOJI = '🧒';
const DEFAULT_AVATAR_BG = '#E0E7FF';
// 아이 프로필 수정 화면(child-profile.tsx)과 톤을 맞추기 위해 그 화면의
// 라이트 테마 색상 값을 그대로 가져와 쓴다. 이 화면은 온보딩 체인이라
// 의도적으로 항상 라이트 고정이라 useThemeColors()는 쓰지 않는다.
const INK = '#2B3A45'; // colors.textPrimary
const GRAY = '#6B7C89'; // colors.textSecondary
const ACCENT_BLUE = '#4A90D9'; // colors.accent
const ERROR_RED = '#E4574C'; // colors.tomorrowRed
const BORDER = '#DCE8F0'; // colors.border
const GIRL_ROSE = '#FB7185';
const GRAY_50 = '#F9FAFB'; // colors.gray50
const GRAY_400 = '#9CA3AF'; // colors.gray400
const NO_CLASS_BG = '#F3E8FF'; // colors.purpleBg
const NO_CLASS_BORDER = '#8B5CF6'; // colors.purple500
const NO_CLASS_TEXT = '#8B5CF6'; // colors.purple500

function formatBirthdate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function OnboardingChildSetupScreen() {
  const router = useRouter();
  const { addChild, completeOnboarding } = useAppData();
  const { showAlert } = useAlert();
  const { setPickerActive } = useAppLock();

  const scrollViewRef = useRef<ScrollView>(null);
  const classNameInputRef = useRef<TextInput>(null);
  const scrollToClassNameInput = () => {
    // 반 이름 입력란은 폼의 마지막 필드라, 정확한 좌표를 재는 것보다
    // 스크롤 끝으로 이동시키는 편이 New Architecture에서 더 안정적으로 동작함.
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const maxDate = useMemo(() => {
    // ageFromBirthdate가 출생연도만으로 나이를 계산하므로(월/일 무시), 만 2세(연나이)에
    // 해당하는 출생연도 전체(예: 2026년 기준 2023년생)를 선택할 수 있도록 연말까지 허용.
    const cutoffYear = new Date().getFullYear() - 3;
    return new Date(cutoffYear, 11, 31);
  }, []);

  // 날짜 선택기가 아직 값이 없을 때 보여줄 기본 위치. maxDate(연말)를 그대로 쓰면
  // 신규 등록 시 "12월"이 뜨는 게 어색해서, 선택 가능 범위 안에서 자연스러운
  // "3년 전 오늘"을 기본값으로 따로 둔다.
  const defaultPickerDate = useMemo(() => {
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
  const [givenName, setGivenName] = useState('');
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [age, setAge] = useState<ChildAge | null>(null);
  const [className, setClassName] = useState('');
  const [hasNoClass, setHasNoClass] = useState(false);
  const [allergiesText, setAllergiesText] = useState('');
  const [showPicker, setShowPicker] = useState(Platform.OS === 'web');
  const [error, setError] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Profile Photo States
  const [pendingAsset, setPendingAsset] = useState<ImagePickerAsset | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const canCreate = !!name.trim() && !!birthdate && !!age && !!className.trim();

  // 이름을 2글자 이상 입력하면, 아직 애칭을 직접 안 정했을 때만 마지막
  // 두 글자를 기본 애칭으로 제안해준다 (예: "김서준" → "서준"). 예전엔
  // "givenName이 비어있는지"로만 판단해서, 이름이 2글자가 되는 순간
  // (예: "김서") 한 번 자동으로 채워지고 나면 그 뒤로 글자를 더 입력해도
  // (예: "김서준") givenName이 이미 채워져 있다는 이유로 다시 갱신되지
  // 않아 성이 포함된 "김서"에서 멈춰버리는 버그가 있었다 — 사용자가 직접
  // 수정하기 전까지는 계속 최신 이름 기준으로 갱신되도록 별도 플래그로 추적.
  const givenNameTouchedRef = useRef(false);
  const handleNameChange = (t: string) => {
    const cleaned = stripInvalidCharacters(t);
    setName(cleaned);
    setError(false);
    if (cleaned.trim().length >= 2 && !givenNameTouchedRef.current) {
      setGivenName(cleaned.trim().slice(-2));
    }
  };

  const toggleNoClass = () => {
    if (!hasNoClass) {
      setClassName('없음');
      setHasNoClass(true);
    } else {
      setClassName('');
      setHasNoClass(false);
    }
    setError(false);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert({ title: '카메라 권한이 필요해요', message: '설정에서 카메라 접근을 허용해주세요.' });
      return;
    }
    setPickerActive(true);
    try {
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 1 });
      if (!result.canceled && result.assets[0]) setPendingAsset(result.assets[0]);
    } finally {
      setPickerActive(false);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({ title: '사진첩 권한이 필요해요', message: '설정에서 사진첩 접근을 허용해주세요.' });
      return;
    }
    setPickerActive(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 1,
        mediaTypes: ['images'],
        ...(Platform.OS === 'android' ? { legacy: true } : null),
      });
      if (!result.canceled && result.assets[0]) setPendingAsset(result.assets[0]);
    } finally {
      setPickerActive(false);
    }
  };

  // "프로필 생성 완료" 버튼을 누르면 바로 저장하고, 축하 모달은 저장 결과를
  // 보여주는 용도로만 쓴다 — 예전엔 이 모달에서 "확인"을 한 번 더 눌러야
  // 실제로 저장됐는데, 이미 끝난 일을 한 번 더 확인시키는 불필요한 클릭이라
  // 없앴다.
  const handleCreate = () => {
    if (!canCreate || !birthdate || !age) {
      setError(true);
      return;
    }
    setError(false);
    Keyboard.dismiss();

    const trimmedClassName = className.trim();
    const allergies = allergiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    addChild({
      name: name.trim(),
      givenName: givenName.trim() || undefined,
      age,
      birthdate: toISODate(birthdate),
      className: trimmedClassName === '없음' ? undefined : trimmedClassName,
      photoUri: photoUri ?? undefined,
      avatarEmoji: photoUri ? undefined : DEFAULT_AVATAR_EMOJI,
      allergies: allergies.length > 0 ? allergies : undefined,
    });
    setShowSuccessModal(true);
  };

  const handleSuccessConfirm = () => {
    setShowSuccessModal(false);
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
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        ref={scrollViewRef}
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

        <View style={styles.photoSection}>
          <View style={styles.avatarWrap}>
            <LinearGradient colors={AVATAR_RING_GRADIENT} style={styles.avatarRing}>
              <Pressable
                style={[styles.avatarInner, { backgroundColor: photoUri ? '#FFFFFF' : DEFAULT_AVATAR_BG }]}
                onPress={() => setShowAvatarModal(true)}
                accessibilityLabel="프로필 사진 선택"
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photo} />
                ) : (
                  <Text style={styles.avatarEmoji}>{DEFAULT_AVATAR_EMOJI}</Text>
                )}
              </Pressable>
            </LinearGradient>
            <Pressable
              style={styles.cameraBadge}
              onPress={() => setShowAvatarModal(true)}
              accessibilityLabel="사진 변경하기"
            >
              <Feather name="camera" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <View style={styles.fieldsWrap}>
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Feather name="user" size={13} color={ACCENT_BLUE} />
              <Text style={styles.label}>이름 *</Text>
            </View>
            <ClearableTextInput
              style={[styles.input, error && !name.trim() && styles.inputInvalid]}
              value={name}
              onChangeText={handleNameChange}
              maxLength={10}
              placeholder="아이 이름을 입력해주세요"
              placeholderTextColor={GRAY}
            />
            {error && !name.trim() ? (
              <Text style={styles.errorText}>아이 이름을 입력해주세요</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRowBetween}>
              <View style={styles.labelRow}>
                <Feather name="heart" size={13} color={GIRL_ROSE} />
                <Text style={styles.label}>우리가 불러줄 이름</Text>
              </View>
              <Text style={styles.labelHint}>예: 김서준 → 서준</Text>
            </View>
            <ClearableTextInput
              style={styles.input}
              value={givenName}
              onChangeText={(t) => {
                givenNameTouchedRef.current = true;
                setGivenName(stripInvalidCharacters(t));
              }}
              maxLength={10}
              placeholder="예: 서준이, 준이"
              placeholderTextColor={GRAY}
            />
          </View>

          <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Feather name="calendar" size={13} color={ACCENT_BLUE} />
            <Text style={styles.label}>생년월일 *</Text>
          </View>
          {Platform.OS === 'web' ? (
            <DateTimePicker
              value={birthdate ?? defaultPickerDate}
              mode="date"
              maximumDate={maxDate}
              minimumDate={minDate}
              themeVariant="light"
              accentColor={ACCENT_BLUE}
              onChange={(_, selected) => {
                if (selected) {
                  setBirthdate(selected);
                  setAge(ageFromBirthdate(selected));
                }
              }}
            />
          ) : (
            <>
              <Pressable
                style={[styles.input, styles.dateButton, error && !birthdate && styles.inputInvalid]}
                onPress={() => setShowPicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {birthdate ? formatBirthdate(birthdate) : '생년월일을 선택해주세요'}
                </Text>
                <Feather name="chevron-down" size={16} color={GRAY} />
              </Pressable>
              {showPicker ? (
                <DateTimePicker
                  value={birthdate ?? defaultPickerDate}
                  mode="date"
                  maximumDate={maxDate}
                  minimumDate={minDate}
                  display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  themeVariant="light"
                  accentColor={ACCENT_BLUE}
                  onChange={(event, selected) => {
                    setShowPicker(Platform.OS === 'ios');
                    if (selected) {
                      setBirthdate(selected);
                      setAge(ageFromBirthdate(selected));
                    }
                  }}
                />
              ) : null}
            </>
          )}
          {error && !birthdate ? (
            <Text style={styles.errorText}>생년월일을 선택해주세요</Text>
          ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Feather name="hash" size={13} color={ACCENT_BLUE} />
              <Text style={styles.label}>나이 (생년월일 기준 자동 계산, 직접 선택 가능)</Text>
            </View>
            <View style={styles.chipRow}>
              {AGE_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.chip, age === option && styles.chipSelected]}
                  onPress={() => setAge(option)}
                >
                  <Text style={[styles.chipText, age === option && styles.chipTextSelected]}>{option}세</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
          <View style={styles.labelRowBetween}>
            <View style={styles.labelRow}>
              <Feather name="home" size={13} color={ACCENT_BLUE} />
              <Text style={styles.label}>반 이름 *</Text>
            </View>
            <Pressable
              onPress={toggleNoClass}
              style={[styles.noClassChip, hasNoClass && styles.noClassChipActive]}
            >
              <Text style={[styles.noClassChipText, hasNoClass && styles.noClassChipTextActive]}>
                {hasNoClass ? '✓ 반 없음 선택됨' : '반 없음'}
              </Text>
            </Pressable>
          </View>
          <ClearableTextInput
            ref={classNameInputRef}
            style={[
              styles.input,
              hasNoClass && styles.inputDisabled,
              error && !className.trim() && styles.inputInvalid,
            ]}
            editable={!hasNoClass}
            value={className}
            onChangeText={(t) => {
              setClassName(stripInvalidCharacters(t));
              setError(false);
            }}
            onFocus={scrollToClassNameInput}
            placeholder={hasNoClass ? '반 구분이 없습니다' : '예: 병아리반, 7세반'}
            placeholderTextColor={GRAY}
          />
          <Text style={styles.hintText}>반 구분이 없으면 '반 없음'을 눌러주세요</Text>
          {error && !className.trim() ? (
            <Text style={styles.errorText}>반 이름을 입력해주세요</Text>
          ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Feather name="alert-triangle" size={13} color={ERROR_RED} />
              <Text style={styles.label}>알레르기 정보 (선택)</Text>
            </View>
            <ClearableTextInput
              style={styles.input}
              value={allergiesText}
              onChangeText={setAllergiesText}
              onFocus={scrollToClassNameInput}
              placeholder="예: 새우, 계란, 우유"
              placeholderTextColor={GRAY}
            />
            <Text style={styles.hintText}>쉼표(,)로 구분해서 입력하면 급식 메뉴에 있을 때 강조해서 알려드려요</Text>
          </View>
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
      </KeyboardAvoidingView>

      <AvatarPickerModal
        visible={showAvatarModal}
        onPickCamera={() => {
          setShowAvatarModal(false);
          openCamera();
        }}
        onPickGallery={() => {
          setShowAvatarModal(false);
          openGallery();
        }}
        onClose={() => setShowAvatarModal(false)}
      />
      <PhotoCropModal
        asset={pendingAsset}
        onCancel={() => setPendingAsset(null)}
        onApply={(uri) => {
          setPhotoUri(uri);
          setPendingAsset(null);
        }}
      />

      {showSuccessModal && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Feather name="gift" size={28} color={ACCENT_BLUE} />
            </View>
            <Text style={styles.successTitle}>프로필 등록 완료!</Text>
            <Text style={styles.successSubtitle}>우리 아이의 새로운 기록 공간이 준비되었습니다.</Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={[styles.summaryAvatar, { backgroundColor: photoUri ? '#FFFFFF' : DEFAULT_AVATAR_BG }]}>
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={styles.summaryAvatarPhoto} />
                  ) : (
                    <Text style={styles.summaryAvatarEmoji}>{DEFAULT_AVATAR_EMOJI}</Text>
                  )}
                </View>
                <View style={styles.summaryHeaderText}>
                  <View style={styles.summaryNameRow}>
                    <Text style={styles.summaryName}>{name}</Text>
                    {givenName ? <Text style={styles.summaryNickname}>({givenName})</Text> : null}
                  </View>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>생년월일</Text>
                <Text style={styles.summaryRowValue}>{birthdate ? formatBirthdate(birthdate) : '-'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>소속 반</Text>
                <Text style={styles.summaryRowValue}>{hasNoClass ? '반 없음' : className || '반 없음'}</Text>
              </View>
            </View>

            <Pressable style={styles.confirmButtonFull} onPress={handleSuccessConfirm}>
              <Text style={styles.confirmButtonText}>확인</Text>
            </Pressable>
          </View>
        </View>
      )}

      <PermissionModal visible={showPermissionModal} onDone={handlePermissionDone} />
    </OnboardingBackground>
  );
}

const styles = StyleSheet.create({
    keyboardAvoider: { flex: 1 },
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
      color: GRAY,
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
      color: INK,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 13,
      color: GRAY,
      lineHeight: 20,
      textAlign: 'center',
      fontWeight: '600',
    },
    photoSection: {
      alignItems: 'center',
      marginBottom: 32,
    },
    avatarWrap: {
      width: 104,
      height: 104,
    },
    avatarRing: {
      width: 104,
      height: 104,
      borderRadius: 52,
      padding: 3,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
      shadowOpacity: 0.12,
    },
    avatarInner: {
      width: '100%',
      height: '100%',
      borderRadius: 49,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    avatarEmoji: {
      fontSize: 42,
    },
    photo: {
      width: '100%',
      height: '100%',
    },
    cameraBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: INK,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
      ...SHADOW,
    },
    // 아이 프로필 수정 화면(child-profile.tsx)과 같은 톤으로, 필드들을 감싸던
    // 테두리 카드를 없애고 배경 위에 바로 놓는다.
    fieldsWrap: {
      width: '100%',
    },
    fieldGroup: {
      marginBottom: 14,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    labelRowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: GRAY,
    },
    labelHint: {
      fontSize: 11,
      fontWeight: '600',
      color: GRAY,
    },
    noClassChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: BORDER,
    },
    noClassChipActive: {
      backgroundColor: NO_CLASS_BG,
      borderColor: NO_CLASS_BORDER,
    },
    noClassChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: GRAY,
    },
    noClassChipTextActive: {
      color: NO_CLASS_TEXT,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: BORDER,
      ...SHADOW,
      shadowOpacity: 0.03,
    },
    chipSelected: { backgroundColor: INK, borderColor: INK },
    chipText: { fontSize: 14, fontWeight: '600', color: GRAY },
    chipTextSelected: { color: '#FFFFFF' },
    input: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: INK,
      borderWidth: 1,
      borderColor: BORDER,
      ...SHADOW,
      shadowOpacity: 0.03,
    },
    inputDisabled: {
      backgroundColor: GRAY_50,
      color: GRAY,
    },
    inputInvalid: {
      borderColor: ERROR_RED,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dateButtonText: {
      fontSize: 15,
      color: INK,
    },
    errorText: {
      color: ERROR_RED,
      fontSize: 12,
      marginTop: 4,
    },
    hintText: {
      color: GRAY,
      fontSize: 12,
      marginTop: 4,
    },
    // 아이 프로필 수정 화면의 "저장하기" 버튼과 같은 톤(진한 남색 단색)으로 맞춘다.
    completeButton: {
      marginHorizontal: 24,
      marginBottom: 24,
      backgroundColor: INK,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
      shadowColor: INK,
      shadowOpacity: 0.3,
      elevation: 5,
    },
    completeButtonDisabled: {
      backgroundColor: GRAY_400,
      opacity: 0.6,
    },
    completeButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    successOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    successCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      ...SHADOW,
      shadowOpacity: 0.2,
    },
    successIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: NO_CLASS_BG,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: BORDER,
      marginBottom: 14,
    },
    successTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: INK,
      marginBottom: 4,
    },
    successSubtitle: {
      fontSize: 12,
      color: GRAY,
      textAlign: 'center',
      marginBottom: 18,
    },
    summaryCard: {
      width: '100%',
      backgroundColor: '#FAFBFD',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#F1F5F9',
      padding: 14,
      marginBottom: 18,
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingBottom: 10,
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },
    summaryAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: BORDER,
    },
    summaryAvatarPhoto: {
      width: '100%',
      height: '100%',
    },
    summaryAvatarEmoji: {
      fontSize: 22,
    },
    summaryHeaderText: {
      flex: 1,
    },
    summaryNameRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    summaryName: {
      fontSize: 15,
      fontWeight: '800',
      color: INK,
    },
    summaryNickname: {
      fontSize: 11,
      color: GRAY,
      fontWeight: '600',
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 3,
    },
    summaryRowLabel: {
      fontSize: 12,
      color: GRAY,
      fontWeight: '600',
    },
    summaryRowValue: {
      fontSize: 12,
      color: INK,
      fontWeight: '700',
    },
    confirmButtonFull: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 14,
      backgroundColor: ACCENT_BLUE,
      ...SHADOW,
      shadowOpacity: 0.16,
    },
    confirmButtonText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
});
