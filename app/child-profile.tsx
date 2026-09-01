import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useNavigation, Stack } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  TouchableOpacity,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AvatarPickerModal, { DEFAULT_AVATARS } from '../components/child-profile/AvatarPickerModal';
import PhotoCropModal from '../components/child-profile/PhotoCropModal';
import ScreenBackground from '../components/ScreenBackground';
import Text from '../components/common/AppText';
import ClearableTextInput from '../components/common/ClearableTextInput';
import { SHADOW, type ThemeColors } from '../constants/theme';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useAppLock } from '../context/AppLockContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { ChildAge } from '../types/models';
import { stripInvalidCharacters } from '../utils/validation';
import { ageFromBirthdate, toISODate, parseISODate } from '../utils/date';

const AGE_OPTIONS: ChildAge[] = [2, 3, 4, 5, 6, 7];
const AVATAR_RING_GRADIENT = ['#BAE6FD', '#DBEAFE', '#C7D2FE'] as const;
const GIRL_ROSE = '#FB7185';

function formatBirthdate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}


export default function ChildProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { children, addChild, updateChild, deleteChild } = useAppData();
  const { showAlert } = useAlert();
  const { setPickerActive } = useAppLock();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const { childId } = useLocalSearchParams<{ childId?: string }>();

  const scrollViewRef = useRef<ScrollView>(null);
  const classNameInputRef = useRef<TextInput>(null);
  const scrollToClassNameInput = () => {
    // 반 이름 입력란은 폼의 마지막 필드라, 정확한 좌표를 재는 것보다
    // 스크롤 끝으로 이동시키는 편이 New Architecture에서 더 안정적으로 동작함.
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };
  const editingChild = childId ? children.find((c) => c.id === childId) : undefined;

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

  const [pendingAsset, setPendingAsset] = useState<ImagePickerAsset | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(editingChild?.photoUri ?? null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState(
    DEFAULT_AVATARS.find((a) => a.emoji === editingChild?.avatarEmoji)?.id ?? DEFAULT_AVATARS[0].id
  );
  const selectedAvatar = useMemo(
    () => DEFAULT_AVATARS.find((a) => a.id === selectedAvatarId) ?? DEFAULT_AVATARS[0],
    [selectedAvatarId]
  );
  const [name, setName] = useState(editingChild?.name ?? '');
  const [givenName, setGivenName] = useState(editingChild?.givenName ?? '');

  const initialBirthdate = editingChild?.birthdate ? parseISODate(editingChild.birthdate) : null;
  const [birthdate, setBirthdate] = useState<Date | null>(initialBirthdate);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [age, setAge] = useState<ChildAge | null>(editingChild?.age ?? null);
  const [className, setClassName] = useState(
    editingChild ? editingChild.className ?? '없음' : ''
  );
  const [hasNoClass, setHasNoClass] = useState(editingChild ? !editingChild.className : false);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // 진입 시점 값 스냅샷 — 저장 없이 뒤로가기 시도할 때 변경 여부를 판단하는 기준.
  const initialSnapshot = useRef({
    name: editingChild?.name ?? '',
    givenName: editingChild?.givenName ?? '',
    className: editingChild ? editingChild.className ?? '없음' : '',
    age: editingChild?.age ?? null,
    birthdate: editingChild?.birthdate ?? null,
    photoUri: editingChild?.photoUri ?? null,
  }).current;
  const justSavedRef = useRef(false);

  const hasUnsavedChanges =
    name !== initialSnapshot.name ||
    givenName !== initialSnapshot.givenName ||
    className !== initialSnapshot.className ||
    age !== initialSnapshot.age ||
    (birthdate ? toISODate(birthdate) : null) !== initialSnapshot.birthdate ||
    photoUri !== initialSnapshot.photoUri;

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (justSavedRef.current || !hasUnsavedChanges) return;

      e.preventDefault();
      showAlert({
        title: '변경사항을 저장하지 않았어요',
        message: '지금 나가면 수정한 내용이 사라져요. 그래도 나가시겠어요?',
        buttons: [
          { text: '계속 수정', style: 'cancel' },
          { text: '나가기', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ],
      });
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges, showAlert]);

  const handleBirthdateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setBirthdate(selectedDate);
      const calculatedAge = ageFromBirthdate(selectedDate);
      setAge(calculatedAge);
    }
  };

  // 이름을 2글자 이상 입력하면, 아직 애칭을 직접 안 정했을 때만 마지막
  // 두 글자를 기본 애칭으로 제안해준다 (예: "김서준" → "서준"). 예전엔
  // "givenName이 비어있는지"로만 판단해서, 이름이 2글자가 되는 순간
  // (예: "김서") 한 번 자동으로 채워지고 나면 그 뒤로 글자를 더 입력해도
  // (예: "김서준") givenName이 이미 채워져 있다는 이유로 다시 갱신되지
  // 않아 성이 포함된 "김서"에서 멈춰버리는 버그가 있었다 — 사용자가 직접
  // 수정하기 전까지는 계속 최신 이름 기준으로 갱신되도록 별도 플래그로 추적.
  // 기존 아이를 수정하는 경우엔 이미 등록된 애칭을 덮어쓰면 안 되므로 true로 시작.
  const givenNameTouchedRef = useRef(!!editingChild?.givenName);
  const handleNameChange = (t: string) => {
    const cleaned = stripInvalidCharacters(t);
    setName(cleaned);
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
  };

  const nameValid = name.trim().length > 0;
  const classNameValid = className.trim().length > 0;
  const canSave = nameValid && !!age && classNameValid;
  const showErrors = attemptedSave && !canSave;

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

  const buildInput = () => ({
    name: name.trim(),
    givenName: givenName.trim() || undefined,
    age: age as ChildAge,
    className: className.trim() === '없음' ? undefined : className.trim(),
    photoUri: photoUri ?? undefined,
    birthdate: birthdate ? toISODate(birthdate) : undefined,
    avatarEmoji: photoUri ? undefined : selectedAvatar.emoji,
  });

  // 기존 아이 수정은 바로 저장하고, 신규 추가는 축하 모달에서 "확인"을
  // 눌러야 실제로 저장되도록 한다(다시 작성으로 취소 가능).
  const handleSave = () => {
    if (!canSave || !age) {
      setAttemptedSave(true);
      return;
    }
    if (editingChild) {
      updateChild(editingChild.id, buildInput());
      justSavedRef.current = true;
      showToast('저장이 완료되었습니다.');
      router.back();
      return;
    }
    Keyboard.dismiss();
    setShowSuccessModal(true);
  };

  const handleConfirmCreate = () => {
    addChild(buildInput());
    justSavedRef.current = true;
    setShowSuccessModal(false);
    showToast('저장이 완료되었습니다.');
    router.back();
  };

  const handleResetForm = () => {
    setName('');
    setGivenName('');
    givenNameTouchedRef.current = false;
    setBirthdate(null);
    setAge(null);
    setClassName('');
    setHasNoClass(false);
    setPhotoUri(null);
    setSelectedAvatarId(DEFAULT_AVATARS[0].id);
    setShowSuccessModal(false);
  };

  const isMainChild = editingChild && children[0]?.id === editingChild.id;

  const handleDelete = () => {
    if (!editingChild) return;
    showAlert({
      title: '아이 프로필 삭제',
      message: `정말 이 아이 프로필을 삭제하시겠습니까?\n${editingChild.name}`,
      buttons: [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            deleteChild(editingChild.id);
            justSavedRef.current = true;
            router.back();
          },
        },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: '아이 프로필 설정',
          headerStyle: { backgroundColor: colors.skyBackground },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBackButton}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.avatarWrap}>
          <LinearGradient colors={AVATAR_RING_GRADIENT} style={styles.avatarRing}>
            <Pressable
              style={[styles.avatarInner, { backgroundColor: photoUri ? colors.cardWhite : selectedAvatar.bg }]}
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
            <Feather name="camera" size={14} color={colors.cardWhite} />
          </Pressable>
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Feather name="user" size={13} color={colors.accent} />
            <Text style={styles.label}>이름 *</Text>
          </View>
          <ClearableTextInput
            style={[styles.input, attemptedSave && !nameValid && styles.inputInvalid]}
            value={name}
            onChangeText={handleNameChange}
            maxLength={10}
            placeholder="이름을 입력해주세요"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.field}>
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
            onChangeText={(text) => {
              givenNameTouchedRef.current = true;
              setGivenName(stripInvalidCharacters(text));
            }}
            maxLength={10}
            placeholder="예: 김서준 → 서준"
            placeholderTextColor={colors.textSecondary}
          />
          {name.trim().length >= 2 && givenName ? (
            <View style={styles.sparkleHint}>
              <Feather name="star" size={11} color={colors.accent} />
              <Text style={styles.sparkleHintText}>앱에서 "{givenName}"(으)로 다정하게 부를게요!</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Feather name="calendar" size={13} color={colors.accent} />
            <Text style={styles.label}>생년월일 *</Text>
          </View>
          <Pressable
            style={[styles.input, styles.dateButton, attemptedSave && !birthdate && styles.inputInvalid]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.dateText, !birthdate && { color: colors.textSecondary }]}>
              {birthdate ? formatBirthdate(birthdate) : '생년월일을 선택해주세요'}
            </Text>
            <Feather name="chevron-down" size={16} color={colors.textSecondary} />
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={birthdate ?? defaultPickerDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
              maximumDate={maxDate}
              minimumDate={minDate}
              themeVariant="light"
              accentColor={colors.textPrimary}
              onChange={handleBirthdateChange}
            />
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>나이 (생년월일 기준 자동 계산, 직접 선택 가능)</Text>
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

        <View style={styles.field}>
          <View style={styles.labelRowBetween}>
            <View style={styles.labelRow}>
              <Feather name="home" size={13} color={colors.accent} />
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
              attemptedSave && !classNameValid && styles.inputInvalid,
            ]}
            editable={!hasNoClass}
            value={className}
            onChangeText={(text) => setClassName(stripInvalidCharacters(text))}
            onFocus={scrollToClassNameInput}
            placeholder={hasNoClass ? '반 구분이 없습니다' : '예: 병아리반, 7세반'}
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={styles.fieldHint}>반 구분이 없으면 '반 없음'을 눌러주세요</Text>
        </View>

        {showErrors && <Text style={styles.summaryErrorText}>이름, 나이, 반 이름을 모두 입력해주세요</Text>}

        {editingChild && !isMainChild && (
          <Pressable style={styles.deleteLink} onPress={handleDelete}>
            <Text style={styles.deleteLinkText}>아이 프로필 삭제</Text>
          </Pressable>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Action Button (Save) - Positioned exactly like Calendar */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.saveButton, !canSave && attemptedSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>저장하기</Text>
        </TouchableOpacity>
      </View>

      <AvatarPickerModal
        visible={showAvatarModal}
        avatars={DEFAULT_AVATARS}
        selectedId={photoUri ? '' : selectedAvatarId}
        onSelect={(avatar) => {
          setSelectedAvatarId(avatar.id);
          setPhotoUri(null);
          setShowAvatarModal(false);
        }}
        onPickCamera={() => { setShowAvatarModal(false); openCamera(); }}
        onPickGallery={() => { setShowAvatarModal(false); openGallery(); }}
        onClose={() => setShowAvatarModal(false)}
      />
      <PhotoCropModal
        asset={pendingAsset}
        onCancel={() => setPendingAsset(null)}
        onApply={(uri) => { setPhotoUri(uri); setPendingAsset(null); }}
      />

      {showSuccessModal && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Feather name="gift" size={28} color={colors.accent} />
            </View>
            <Text style={styles.successTitle}>프로필 등록 완료!</Text>
            <Text style={styles.successSubtitle}>우리 아이의 새로운 기록 공간이 준비되었습니다.</Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={[styles.summaryAvatar, { backgroundColor: photoUri ? colors.cardWhite : selectedAvatar.bg }]}>
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
                <Feather name="rotate-ccw" size={14} color={colors.textSecondary} />
                <Text style={styles.resetButtonText}>다시 작성</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={handleConfirmCreate}>
                <Text style={styles.confirmButtonText}>확인</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const PHOTO_SIZE = 120;

function createStyles(colors: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.skyBackground,
    },
    headerBackButton: {
      paddingHorizontal: 4,
    },
    keyboardAvoider: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 8,
      alignItems: 'center',
      paddingBottom: 100 + bottomInset,
    },
    avatarWrap: {
      width: PHOTO_SIZE,
      height: PHOTO_SIZE,
      marginBottom: 18,
    },
    avatarRing: {
      width: PHOTO_SIZE,
      height: PHOTO_SIZE,
      borderRadius: PHOTO_SIZE / 2,
      padding: 3,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
      shadowOpacity: 0.12,
    },
    avatarInner: {
      width: '100%',
      height: '100%',
      borderRadius: (PHOTO_SIZE - 6) / 2,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: colors.cardWhite,
    },
    avatarEmoji: { fontSize: 44 },
    photo: {
      width: PHOTO_SIZE,
      height: PHOTO_SIZE,
      borderRadius: PHOTO_SIZE / 2,
    },
    cameraBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.textPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.cardWhite,
      ...SHADOW,
    },
    field: { width: '100%', marginBottom: 14 },
    label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    labelRowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    labelHint: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
    sparkleHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, paddingHorizontal: 2 },
    sparkleHintText: { fontSize: 11, fontWeight: '600', color: colors.accent, flexShrink: 1 },
    fieldHint: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    noClassChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: colors.cardWhite,
      borderWidth: 1,
      borderColor: colors.border,
    },
    noClassChipActive: { backgroundColor: colors.purpleBg, borderColor: colors.purple500 },
    noClassChipText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
    noClassChipTextActive: { color: colors.purple500 },
    input: {
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
      shadowOpacity: 0.03,
    },
    inputDisabled: { backgroundColor: colors.gray50, color: colors.textSecondary },
    inputInvalid: { borderColor: colors.tomorrowRed },
    dateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dateText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: colors.cardWhite,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
      shadowOpacity: 0.03,
    },
    chipSelected: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
    chipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    chipTextSelected: { color: colors.cardWhite },
    summaryErrorText: { color: colors.tomorrowRed, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8 },
    deleteLink: { marginTop: 16, paddingVertical: 10 },
    deleteLinkText: { color: colors.tomorrowRed, fontSize: 14, fontWeight: '700', textAlign: 'center' },
    fabContainer: {
      position: 'absolute',
      bottom: 20 + bottomInset,
      left: 20,
      right: 20,
      zIndex: 100,
    },
    saveButton: {
      backgroundColor: colors.textPrimary,
      paddingVertical: 16,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
      shadowColor: colors.textPrimary,
      shadowOpacity: 0.3,
      elevation: 5,
    },
    saveButtonDisabled: { backgroundColor: colors.gray400, opacity: 0.6 },
    saveButtonText: { color: colors.cardWhite, fontSize: 16, fontWeight: 'bold' },
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
      backgroundColor: colors.cardWhite,
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
      backgroundColor: colors.purpleBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    successTitle: { fontSize: 19, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
    successSubtitle: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginBottom: 18 },
    summaryCard: {
      width: '100%',
      backgroundColor: colors.skyBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
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
      borderBottomColor: colors.border,
    },
    summaryAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryAvatarPhoto: { width: '100%', height: '100%' },
    summaryAvatarEmoji: { fontSize: 22 },
    summaryHeaderText: { flex: 1 },
    summaryNameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    summaryName: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
    summaryNickname: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
    summaryRowLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    summaryRowValue: { fontSize: 12, color: colors.textPrimary, fontWeight: '700' },
    successButtonRow: { flexDirection: 'row', gap: 10, width: '100%' },
    resetButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    resetButtonText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    confirmButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 14,
      backgroundColor: colors.accent,
      ...SHADOW,
      shadowOpacity: 0.16,
    },
    confirmButtonText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  });
}
