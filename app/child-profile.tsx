import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import PhotoCropModal from '../components/child-profile/PhotoCropModal';
import PhotoSourceSheet from '../components/child-profile/PhotoSourceSheet';
import ScreenBackground from '../components/ScreenBackground';
import { SHADOW, type ThemeColors } from '../constants/theme';
import { useAlert } from '../context/AlertContext';
import { useAppData } from '../context/AppDataContext';
import { useAppLock } from '../context/AppLockContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { ChildAge } from '../types/models';
import { stripInvalidCharacters } from '../utils/validation';

const AGE_OPTIONS: ChildAge[] = [3, 4, 5, 6, 7];
const COUPANG_LINK = 'https://link.coupang.com/a/fHdMU98clE';

export default function ChildProfileScreen() {
  const router = useRouter();
  const { children, addChild, updateChild } = useAppData();
  const { showAlert } = useAlert();
  const { setPickerActive } = useAppLock();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const editingChild = childId ? children.find((c) => c.id === childId) : undefined;

  const [pendingAsset, setPendingAsset] = useState<ImagePickerAsset | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(editingChild?.photoUri ?? null);
  const [showSourceSheet, setShowSourceSheet] = useState(false);
  const [name, setName] = useState(editingChild?.name ?? '');
  const [age, setAge] = useState<ChildAge | null>(editingChild?.age ?? null);
  const [className, setClassName] = useState(editingChild?.className ?? '');
  const [attemptedSave, setAttemptedSave] = useState(false);

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
    const input = { name: name.trim(), age, className: className.trim(), photoUri: photoUri ?? undefined };
    if (editingChild) updateChild(editingChild.id, input);
    else addChild(input);
    showToast('저장이 완료되었습니다.');
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: '아이 프로필 설정' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          <Text style={styles.label}>나이 *</Text>
          <View style={styles.chipRow}>
            {AGE_OPTIONS.map((option) => (
              <Pressable key={option} style={[styles.chip, age === option && styles.chipSelected]} onPress={() => setAge(option)}>
                <Text style={[styles.chipText, age === option && styles.chipTextSelected]}>{option}세</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>반 이름 *</Text>
          <TextInput
            style={[styles.input, attemptedSave && !classNameValid && styles.inputInvalid]}
            value={className}
            onChangeText={(text) => setClassName(stripInvalidCharacters(text))}
            placeholder="예: 병아리반"
            placeholderTextColor="#94A3B8"
          />
        </View>

        {showErrors && <Text style={styles.summaryErrorText}>이름, 나이, 반 이름을 모두 입력해주세요</Text>}
      </ScrollView>

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

      {/* Coupang Banner - Positioned exactly like Calendar */}
      <TouchableOpacity
        style={styles.adBannerContainer}
        activeOpacity={0.9}
        onPress={() => Linking.openURL(COUPANG_LINK).catch(() => {})}
      >
        <View style={styles.adDecoCircle1} />
        <View style={styles.adDecoCircle2} />
        <View style={styles.adContent}>
          <View style={styles.adLeftContent}>
            <Text style={styles.adIconEmoji}>🎁</Text>
            <View style={styles.adTextGroup}>
              <Text style={styles.adSubText}>놓치면 후회하는 특가!</Text>
              <Text style={styles.adMainText}>국민 육아템 세일전</Text>
            </View>
          </View>
          <View style={styles.adButton}>
            <Text style={styles.adButtonText}>바로가기 🚀</Text>
          </View>
        </View>
      </TouchableOpacity>

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
      backgroundColor: '#F8FAFC',
    },
    content: {
      padding: 24,
      alignItems: 'center',
      paddingBottom: 220 + bottomInset,
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
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#E2E8F0',
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
      backgroundColor: '#1E293B',
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
    },
    cameraBadgeIcon: { fontSize: 16 },
    field: { width: '100%', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
    input: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: '#1E293B',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...SHADOW,
      shadowOpacity: 0.03,
    },
    inputInvalid: { borderColor: '#FDA4AF' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...SHADOW,
      shadowOpacity: 0.03,
    },
    chipSelected: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
    chipText: { fontSize: 14, fontWeight: '600', color: '#475569' },
    chipTextSelected: { color: '#FFFFFF' },
    summaryErrorText: { color: '#E11D48', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8 },
    fabContainer: {
      position: 'absolute',
      bottom: 104 + bottomInset,
      left: 20,
      right: 20,
      zIndex: 100,
    },
    saveButton: {
      backgroundColor: '#1E293B',
      paddingVertical: 16,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
      shadowColor: '#1E293B',
      shadowOpacity: 0.3,
      elevation: 5,
    },
    saveButtonDisabled: { backgroundColor: '#94A3B8', opacity: 0.6 },
    saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    adBannerContainer: {
      position: 'absolute',
      bottom: 24 + bottomInset,
      left: 20,
      right: 20,
      backgroundColor: '#297FCA',
      borderRadius: 20,
      overflow: 'hidden',
      ...SHADOW,
      shadowColor: '#297FCA',
      shadowOpacity: 0.4,
      elevation: 6,
      zIndex: 100,
    },
    adDecoCircle1: {
      position: 'absolute',
      top: -40,
      right: -20,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    adDecoCircle2: {
      position: 'absolute',
      bottom: -30,
      left: -20,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    adContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    adLeftContent: { flexDirection: 'row', alignItems: 'center' },
    adIconEmoji: { fontSize: 32, marginRight: 14 },
    adTextGroup: { flexDirection: 'column' },
    adSubText: { fontSize: 12, fontWeight: '900', color: '#FDE047', marginBottom: 4 },
    adMainText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
    adButton: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    adButtonText: { color: '#297FCA', fontSize: 14, fontWeight: '900' }
  });
}
