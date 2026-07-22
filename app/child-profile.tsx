import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhotoCropModal from '../components/child-profile/PhotoCropModal';
import PhotoSourceSheet from '../components/child-profile/PhotoSourceSheet';
import ScreenBackground from '../components/ScreenBackground';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { ChildAge } from '../types/models';

const AGE_OPTIONS: ChildAge[] = [3, 4, 5, 6, 7];

export default function ChildProfileScreen() {
  const router = useRouter();
  const { children, addChild, updateChild } = useAppData();
  const { showToast } = useToast();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const editingChild = childId ? children.find((c) => c.id === childId) : undefined;

  const [pendingAsset, setPendingAsset] = useState<ImagePickerAsset | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(editingChild?.photoUri ?? null);
  const [showSourceSheet, setShowSourceSheet] = useState(false);
  const [name, setName] = useState(editingChild?.name ?? '');
  const [age, setAge] = useState<ChildAge | null>(editingChild?.age ?? null);
  const [className, setClassName] = useState(editingChild?.className ?? '');

  const nameValid = name.trim().length > 0;
  const classNameValid = className.trim().length > 0;
  const canSave = nameValid && !!age && classNameValid;

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('카메라 권한이 필요해요', '설정에서 카메라 접근을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 1 });
    if (!result.canceled && result.assets[0]) {
      setPendingAsset(result.assets[0]);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('사진첩 권한이 필요해요', '설정에서 사진첩 접근을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 1,
      mediaTypes: ['images'],
    });
    if (!result.canceled && result.assets[0]) {
      setPendingAsset(result.assets[0]);
    }
  };

  const handlePickPhoto = () => {
    setShowSourceSheet(true);
  };

  const handleSave = () => {
    if (!canSave || !age) {
      return;
    }
    const input = {
      name: name.trim(),
      age,
      className: className.trim(),
      photoUri: photoUri ?? undefined,
    };
    if (editingChild) {
      updateChild(editingChild.id, input);
    } else {
      addChild(input);
    }
    showToast('저장이 완료되었습니다.');
    router.back();
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.photoContainer} onPress={handlePickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderIcon}>🧒</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraBadgeIcon}>📷</Text>
            </View>
          </Pressable>

          <View style={styles.field}>
            <Text style={styles.label}>이름 *</Text>
            <TextInput
              style={[styles.input, !nameValid && styles.inputInvalid]}
              value={name}
              onChangeText={setName}
              placeholder="이름을 입력해주세요"
              placeholderTextColor={colors.textSecondary}
            />
            {!nameValid ? <Text style={styles.errorText}>이름을 입력해주세요</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>나이 *</Text>
            <View style={[styles.chipRow, !age && styles.chipRowInvalid]}>
              {AGE_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.chip, age === option && styles.chipSelected]}
                  onPress={() => setAge(option)}
                >
                  <Text style={[styles.chipText, age === option && styles.chipTextSelected]}>
                    {option}세
                  </Text>
                </Pressable>
              ))}
            </View>
            {!age ? <Text style={styles.errorText}>나이를 선택해주세요</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>반 이름 *</Text>
            <TextInput
              style={[styles.input, !classNameValid && styles.inputInvalid]}
              value={className}
              onChangeText={setClassName}
              placeholder="예: 병아리반"
              placeholderTextColor={colors.textSecondary}
            />
            {!classNameValid ? (
              <Text style={styles.errorText}>반 이름을 입력해주세요</Text>
            ) : null}
          </View>
        </ScrollView>

        {!canSave ? (
          <Text style={styles.summaryErrorText}>
            이름, 나이, 반 이름을 모두 입력해야 저장할 수 있어요
          </Text>
        ) : null}

        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveButtonText}>저장</Text>
        </Pressable>
      </SafeAreaView>

      <PhotoSourceSheet
        visible={showSourceSheet}
        onCancel={() => setShowSourceSheet(false)}
        onPickCamera={() => {
          setShowSourceSheet(false);
          openCamera();
        }}
        onPickGallery={() => {
          setShowSourceSheet(false);
          openGallery();
        }}
      />

      <PhotoCropModal
        asset={pendingAsset}
        onCancel={() => setPendingAsset(null)}
        onApply={(uri) => {
          setPhotoUri(uri);
          setPendingAsset(null);
        }}
      />
    </ScreenBackground>
  );
}

const PHOTO_SIZE = 120;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    content: {
      padding: 24,
      alignItems: 'center',
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
    photoPlaceholderIcon: {
      fontSize: 40,
    },
    cameraBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
    },
    cameraBadgeIcon: {
      fontSize: 16,
    },
    field: {
      width: '100%',
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.cardWhite,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1.5,
      borderColor: 'transparent',
      ...SHADOW,
    },
    inputInvalid: {
      borderColor: colors.tomorrowRed,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      borderRadius: 12,
    },
    chipRowInvalid: {
      borderWidth: 1.5,
      borderColor: colors.tomorrowRed,
      padding: 6,
      margin: -6,
    },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: colors.cardWhite,
      ...SHADOW,
    },
    chipSelected: {
      backgroundColor: colors.accent,
    },
    chipText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    chipTextSelected: {
      color: '#FFFFFF',
    },
    errorText: {
      color: colors.tomorrowRed,
      fontSize: 12,
      marginTop: 8,
    },
    summaryErrorText: {
      color: colors.tomorrowRed,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 8,
      marginHorizontal: 20,
    },
    saveButton: {
      marginHorizontal: 20,
      marginBottom: 16,
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      ...SHADOW,
    },
    saveButtonDisabled: {
      backgroundColor: colors.border,
      opacity: 0.7,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
