import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter, useNavigation, Stack } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
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
import { calendarTheme as t } from '../components/calendar/calendarTheme';
import PhotoCropModal from '../components/child-profile/PhotoCropModal';
import PhotoSourceSheet from '../components/child-profile/PhotoSourceSheet';
import ScreenBackground from '../components/ScreenBackground';
import Text from '../components/common/AppText';
import { SHADOW, type ThemeColors } from '../constants/theme';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useAppLock } from '../context/AppLockContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { ChildAge } from '../types/models';
import { stripInvalidCharacters } from '../utils/validation';
import { ageFromBirthdate, toISODate, parseISODate } from '../utils/date';

const AGE_OPTIONS: ChildAge[] = [3, 4, 5, 6, 7];

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
  const [showSourceSheet, setShowSourceSheet] = useState(false);
  const [name, setName] = useState(editingChild?.name ?? '');

  const initialBirthdate = editingChild?.birthdate ? parseISODate(editingChild.birthdate) : null;
  const [birthdate, setBirthdate] = useState<Date | null>(initialBirthdate);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [age, setAge] = useState<ChildAge | null>(editingChild?.age ?? null);
  const [className, setClassName] = useState(
    editingChild ? editingChild.className ?? '없음' : ''
  );
  const [attemptedSave, setAttemptedSave] = useState(false);

  // 진입 시점 값 스냅샷 — 저장 없이 뒤로가기 시도할 때 변경 여부를 판단하는 기준.
  const initialSnapshot = useRef({
    name: editingChild?.name ?? '',
    className: editingChild ? editingChild.className ?? '없음' : '',
    age: editingChild?.age ?? null,
    birthdate: editingChild?.birthdate ?? null,
    photoUri: editingChild?.photoUri ?? null,
  }).current;
  const justSavedRef = useRef(false);

  const hasUnsavedChanges =
    name !== initialSnapshot.name ||
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
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, quality: 1, mediaTypes: ['images'] });
      if (!result.canceled && result.assets[0]) setPendingAsset(result.assets[0]);
    } finally {
      setPickerActive(false);
    }
  };

  const handleSave = () => {
    if (!canSave || !age) {
      setAttemptedSave(true);
      return;
    }
    const trimmedClassName = className.trim();
    const input = {
      name: name.trim(),
      age,
      className: trimmedClassName === '없음' ? undefined : trimmedClassName,
      photoUri: photoUri ?? undefined,
      birthdate: birthdate ? toISODate(birthdate) : undefined
    };
    if (editingChild) updateChild(editingChild.id, input);
    else addChild(input);
    justSavedRef.current = true;
    showToast('저장이 완료되었습니다.');
    router.back();
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
          headerStyle: { backgroundColor: t.bg },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBackButton}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={t.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.photoContainer} onPress={() => setShowSourceSheet(true)}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : (
            <View style={styles.photoPlaceholder}><Text style={styles.photoPlaceholderIcon}>🧒</Text></View>
          )}
          <View style={styles.cameraBadge}><Text style={styles.cameraBadgeIcon}>📷</Text></View>
        </Pressable>

        <View style={styles.field}>
          <Text style={styles.label}>이름 *</Text>
          <TextInput
            style={[styles.input, attemptedSave && !nameValid && styles.inputInvalid]}
            value={name}
            onChangeText={(text) => setName(stripInvalidCharacters(text))}
            maxLength={10}
            placeholder="이름을 입력해주세요"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>생년월일 *</Text>
          <Pressable
            style={[styles.input, attemptedSave && !birthdate && styles.inputInvalid]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.dateText, !birthdate && { color: '#94A3B8' }]}>
              {birthdate ? formatBirthdate(birthdate) : '생년월일을 선택해주세요'}
            </Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={birthdate ?? maxDate}
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
          <Text style={styles.label}>반 이름 *</Text>
          <TextInput
            ref={classNameInputRef}
            style={[styles.input, attemptedSave && !classNameValid && styles.inputInvalid]}
            value={className}
            onChangeText={(text) => setClassName(stripInvalidCharacters(text))}
            onFocus={scrollToClassNameInput}
            placeholder="예: 병아리반, 7세반"
            placeholderTextColor="#94A3B8"
          />
          <Text style={styles.fieldHint}>반 구분이 없으면 '없음'이라고 입력해주세요</Text>
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

      <PhotoSourceSheet
        visible={showSourceSheet}
        onCancel={() => setShowSourceSheet(false)}
        onPickCamera={() => { setShowSourceSheet(false); openCamera(); }}
        onPickGallery={() => { setShowSourceSheet(false); openGallery(); }}
      />
      <PhotoCropModal
        asset={pendingAsset}
        onCancel={() => setPendingAsset(null)}
        onApply={(uri) => { setPhotoUri(uri); setPendingAsset(null); }}
      />
    </SafeAreaView>
  );
}

const PHOTO_SIZE = 120;

function createStyles(colors: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: t.bg,
    },
    headerBackButton: {
      paddingHorizontal: 4,
    },
    keyboardAvoider: {
      flex: 1,
    },
    content: {
      padding: 24,
      alignItems: 'center',
      paddingBottom: 100 + bottomInset,
    },
    photoContainer: {
      width: PHOTO_SIZE,
      height: PHOTO_SIZE,
      marginBottom: 32,
    },
    photo: {
      width: PHOTO_SIZE,
      height: PHOTO_SIZE,
      borderRadius: PHOTO_SIZE / 2,
    },
    photoPlaceholder: {
      width: PHOTO_SIZE,
      height: PHOTO_SIZE,
      borderRadius: PHOTO_SIZE / 2,
      backgroundColor: colors.cardWhite,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    photoPlaceholderIcon: { fontSize: 40 },
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
      ...SHADOW,
    },
    cameraBadgeIcon: { fontSize: 16 },
    field: { width: '100%', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
    fieldHint: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
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
    inputInvalid: { borderColor: colors.tomorrowRed },
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
  });
}
