import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, Image } from 'react-native';
import AvatarPickerModal, { DEFAULT_AVATARS } from '../components/child-profile/AvatarPickerModal';
import PermissionModal from '../components/onboarding/PermissionModal';
import PhotoCropModal from '../components/child-profile/PhotoCropModal';
import Text from '../components/common/AppText';
import ClearableTextInput from '../components/common/ClearableTextInput';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import { SHADOW } from '../constants/theme';
import { STAMP_BOARD_THEMES } from '../constants/stampBoardThemes';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useAppLock } from '../context/AppLockContext';
import { ChildAge } from '../types/models';
import { ageFromBirthdate, toISODate } from '../utils/date';
import { stripInvalidCharacters } from '../utils/validation';

const CTA_GRADIENT = STAMP_BOARD_THEMES.blue.stampButtonGradient;
const AVATAR_RING_GRADIENT = ['#BAE6FD', '#DBEAFE', '#C7D2FE'] as const;
const INK = '#1E293B';
const GRAY = '#64748B';
const ACCENT_BLUE = '#0EA5E9';
const ERROR_RED = '#E4574C';
const BORDER = '#E2E8F0';
const GIRL_ROSE = '#FB7185';
const NO_CLASS_BG = '#DBEAFE';
const NO_CLASS_BORDER = '#93C5FD';
const NO_CLASS_TEXT = '#1D4ED8';

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
  const [className, setClassName] = useState('');
  const [hasNoClass, setHasNoClass] = useState(false);
  const [showPicker, setShowPicker] = useState(Platform.OS === 'web');
  const [error, setError] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Profile Photo States
  const [pendingAsset, setPendingAsset] = useState<ImagePickerAsset | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState(DEFAULT_AVATARS[0].id);
  const selectedAvatar = useMemo(
    () => DEFAULT_AVATARS.find((a) => a.id === selectedAvatarId) ?? DEFAULT_AVATARS[0],
    [selectedAvatarId]
  );

  const canCreate = !!name.trim() && !!birthdate && !!className.trim();

  // 이름을 2글자 이상 입력하면, 아직 애칭을 직접 안 정했을 때만 마지막
  // 두 글자를 기본 애칭으로 제안해준다 (예: "김서준" → "서준").
  const handleNameChange = (t: string) => {
    const cleaned = stripInvalidCharacters(t);
    setName(cleaned);
    setError(false);
    if (cleaned.trim().length >= 2 && !givenName) {
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

  // "프로필 생성 완료" 버튼: 아직 저장하지 않고, 축하 모달로 입력 내용을
  // 먼저 보여준 뒤 그 모달의 "확인"에서 실제로 저장한다.
  const handleCreate = () => {
    if (!canCreate || !birthdate) {
      setError(true);
      return;
    }
    setError(false);
    Keyboard.dismiss();
    setShowSuccessModal(true);
  };

  const handleConfirmCreate = () => {
    if (!birthdate) return;
    const trimmedClassName = className.trim();
    addChild({
      name: name.trim(),
      givenName: givenName.trim() || undefined,
      age: ageFromBirthdate(birthdate),
      birthdate: toISODate(birthdate),
      className: trimmedClassName === '없음' ? undefined : trimmedClassName,
      photoUri: photoUri ?? undefined,
      avatarEmoji: photoUri ? undefined : selectedAvatar.emoji,
    });
    setShowSuccessModal(false);
    setShowPermissionModal(true);
  };

  const handleResetForm = () => {
    setName('');
    setGivenName('');
    setBirthdate(null);
    setClassName('');
    setHasNoClass(false);
    setPhotoUri(null);
    setSelectedAvatarId(DEFAULT_AVATARS[0].id);
    setShowSuccessModal(false);
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
                style={[styles.avatarInner, { backgroundColor: photoUri ? '#FFFFFF' : selectedAvatar.bg }]}
                onPress={() => setShowAvatarModal(true)}
                accessibilityLabel="프로필 사진 또는 캐릭터 선택"
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photo} />
                ) : (
                  <Text style={styles.avatarEmoji}>{selectedAvatar.emoji}</Text>
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

        <View style={styles.cardShadow}>
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Feather name="user" size={13} color={ACCENT_BLUE} />
              <Text style={styles.label}>이름</Text>
              <Text style={styles.requiredMark}>*</Text>
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
              onChangeText={(t) => setGivenName(stripInvalidCharacters(t))}
              maxLength={10}
              placeholder="예: 서준이, 준이"
              placeholderTextColor={GRAY}
            />
            {name.trim().length >= 2 && givenName ? (
              <View style={styles.sparkleHint}>
                <Feather name="star" size={11} color={ACCENT_BLUE} />
                <Text style={styles.sparkleHintText}>앱에서 "{givenName}"(으)로 다정하게 부를게요!</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Feather name="calendar" size={13} color={ACCENT_BLUE} />
            <Text style={styles.label}>생년월일</Text>
          </View>
          {Platform.OS === 'web' ? (
            <DateTimePicker
              value={birthdate ?? defaultPickerDate}
              mode="date"
              maximumDate={maxDate}
              minimumDate={minDate}
              themeVariant="light"
              accentColor={ACCENT_BLUE}
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

          <View style={styles.fieldGroup}>
          <View style={styles.labelRowBetween}>
            <View style={styles.labelRow}>
              <Feather name="home" size={13} color={ACCENT_BLUE} />
              <Text style={styles.label}>반 이름</Text>
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
        </View>
        </View>

        <View style={styles.spacer} />
        <View style={styles.spacer} />
      </ScrollView>

      <View style={[styles.completeButtonShadow, !canCreate && styles.completeButtonDisabled]}>
        <Pressable onPress={handleCreate} disabled={!canCreate}>
          <LinearGradient
            colors={CTA_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.completeButton}
          >
            <Text style={styles.completeButtonText}>프로필 생성 완료</Text>
          </LinearGradient>
        </Pressable>
      </View>
      </KeyboardAvoidingView>

      <AvatarPickerModal
        visible={showAvatarModal}
        avatars={DEFAULT_AVATARS}
        selectedId={photoUri ? '' : selectedAvatarId}
        onSelect={(avatar) => {
          setSelectedAvatarId(avatar.id);
          setPhotoUri(null);
          setShowAvatarModal(false);
        }}
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
                <View style={[styles.summaryAvatar, { backgroundColor: photoUri ? '#FFFFFF' : selectedAvatar.bg }]}>
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={styles.summaryAvatarPhoto} />
                  ) : (
                    <Text style={styles.summaryAvatarEmoji}>{selectedAvatar.emoji}</Text>
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

            <View style={styles.successButtonRow}>
              <Pressable style={styles.resetButton} onPress={handleResetForm}>
                <Feather name="rotate-ccw" size={14} color={GRAY} />
                <Text style={styles.resetButtonText}>다시 작성</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={handleConfirmCreate}>
                <Text style={styles.confirmButtonText}>확인</Text>
              </Pressable>
            </View>
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
    // 안드로이드 elevation은 배경 없는(투명) 뷰에서 둥근 모서리를 무시하고
    // 각진 그림자를 그려 흰 상자처럼 비치는 버그가 있어, 안드로이드에서는
    // 그림자를 끄고 iOS 전용 그림자만 유지한다.
    cardShadow: {
      borderRadius: 20,
      ...SHADOW,
      shadowOpacity: 0.08,
      elevation: 0,
    },
    card: {
      backgroundColor: 'rgba(255,255,255,0.72)',
      borderWidth: 2,
      borderColor: '#BAE6FD',
      borderRadius: 20,
      padding: 24,
    },
    fieldGroup: {
      marginBottom: 18,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    labelRowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: INK,
    },
    requiredMark: {
      fontSize: 13,
      fontWeight: '700',
      color: ACCENT_BLUE,
    },
    labelHint: {
      fontSize: 11,
      fontWeight: '600',
      color: GRAY,
    },
    sparkleHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 6,
      marginBottom: 2,
      paddingHorizontal: 2,
    },
    sparkleHintText: {
      fontSize: 11,
      fontWeight: '600',
      color: ACCENT_BLUE,
      flexShrink: 1,
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
    input: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: INK,
      borderWidth: 1.5,
      borderColor: BORDER,
    },
    inputDisabled: {
      backgroundColor: '#F1F5F9',
      color: GRAY,
    },
    inputInvalid: {
      borderColor: ERROR_RED,
    },
    dateButton: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: BORDER,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dateButtonText: {
      fontSize: 15,
      color: INK,
      fontWeight: '600',
    },
    errorText: {
      color: ERROR_RED,
      fontSize: 12,
      marginTop: 10,
    },
    hintText: {
      color: GRAY,
      fontSize: 12,
      marginTop: 6,
    },
    completeButtonShadow: {
      marginHorizontal: 24,
      marginBottom: 24,
      borderRadius: 16,
      ...SHADOW,
      shadowOpacity: 0.16,
      elevation: 0,
    },
    completeButton: {
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
      backgroundColor: '#EFF6FF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#DBEAFE',
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
    successButtonRow: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
    },
    resetButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: BORDER,
    },
    resetButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: GRAY,
    },
    confirmButton: {
      flex: 1,
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
