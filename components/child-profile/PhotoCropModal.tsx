import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { ImagePickerAsset } from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View, Image } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Text from '../common/AppText';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';

const VIEWPORT = 280;
const MIN_SCALE = 1;
const MAX_SCALE = 5;

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

interface PhotoCropModalProps {
  asset: ImagePickerAsset | null;
  onCancel: () => void;
  onApply: (croppedUri: string) => void;
}

export default function PhotoCropModal({ asset, onCancel, onApply }: PhotoCropModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [saving, setSaving] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const imgW = asset?.width ?? 1;
  const imgH = asset?.height ?? 1;
  // "Cover fit" base scale so the image fully fills the square viewport before any pinch zoom.
  const baseScale = useMemo(() => Math.max(VIEWPORT / imgW, VIEWPORT / imgH), [imgW, imgH]);
  const baseWidth = imgW * baseScale;
  const baseHeight = imgH * baseScale;

  useEffect(() => {
    // Reset pan/zoom whenever a new photo is loaded into the cropper.
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [asset?.uri]);

  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      const nextScale = scale.value;
      const effectiveScale = baseScale * nextScale;
      const maxX = Math.max((imgW * effectiveScale - VIEWPORT) / 2, 0);
      const maxY = Math.max((imgH * effectiveScale - VIEWPORT) / 2, 0);

      translateX.value = clamp(savedTranslateX.value + e.translationX, -maxX, maxX);
      translateY.value = clamp(savedTranslateY.value + e.translationY, -maxY, maxY);
    }).onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const nextScale = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
      scale.value = nextScale;

      const effectiveScale = baseScale * nextScale;
      const maxX = Math.max((imgW * effectiveScale - VIEWPORT) / 2, 0);
      const maxY = Math.max((imgH * effectiveScale - VIEWPORT) / 2, 0);

      translateX.value = clamp(translateX.value, -maxX, maxX);
      translateY.value = clamp(translateY.value, -maxY, maxY);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleApply = async () => {
    if (!asset) return;
    setSaving(true);
    try {
      const effectiveScale = baseScale * scale.value;
      const cropSize = VIEWPORT / effectiveScale;
      const centerXInImage = imgW / 2 - translateX.value / effectiveScale;
      const centerYInImage = imgH / 2 - translateY.value / effectiveScale;
      const originX = clamp(centerXInImage - cropSize / 2, 0, imgW - cropSize);
      const originY = clamp(centerYInImage - cropSize / 2, 0, imgH - cropSize);

      // 1. Manipulate and render
      const manipulator = ImageManipulator.manipulate(asset.uri);
      const imageRef = await manipulator
        .crop({
          originX: Math.round(originX),
          originY: Math.round(originY),
          width: Math.round(cropSize),
          height: Math.round(cropSize),
        })
        .resize({ width: 512, height: 512 })
        .renderAsync();

      if (!imageRef) throw new Error('이미지 편집 엔진 초기화 실패');

      // 2. Save to temporary cache
      const tempResult = await imageRef.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.8
      });

      if (!tempResult?.uri) throw new Error('편집된 이미지 저장 실패');

      // 3. Move to permanent directory
      const permanentUri = `${FileSystem.documentDirectory}profile_${Date.now()}.jpg`;
      await FileSystem.copyAsync({
        from: tempResult.uri,
        to: permanentUri
      });

      // 4. Success callback
      onApply(permanentUri);
    } catch (err: any) {
      console.error('Failed to crop image:', err);
      Alert.alert(
        '이미지 저장 실패',
        '사진을 처리하는 중 오류가 발생했어요. 다시 시도해 주세요.\n(' + (err.message || 'Unknown error') + ')'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!asset} onRequestClose={onCancel} animationType="slide">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={styles.viewportWrapper}>
            <GestureDetector gesture={composedGesture}>
              <View style={styles.viewport}>
                {asset ? (
                  <Animated.View style={[animatedImageStyle, { width: baseWidth, height: baseHeight }]}>
                    <Image
                      source={{ uri: asset.uri }}
                      style={{ width: baseWidth, height: baseHeight }}
                    />
                  </Animated.View>
                ) : null}
              </View>
            </GestureDetector>
            <View pointerEvents="none" style={styles.ring} />
          </View>
          <Text style={styles.hint}>
            손가락으로 밀어서 위치를 옮기고,{'\n'}두 손가락으로 확대·축소해보세요 ✨
          </Text>
          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={onCancel} disabled={saving}>
              <Text style={styles.secondaryButtonText}>다시 선택</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleApply} disabled={saving}>
              <Text style={styles.primaryButtonText}>{saving ? '저장 중...' : '적용'}</Text>
            </Pressable>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#111417',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    viewportWrapper: {
      width: VIEWPORT,
      height: VIEWPORT,
    },
    viewport: {
      width: VIEWPORT,
      height: VIEWPORT,
      borderRadius: VIEWPORT / 2,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000',
    },
    ring: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: VIEWPORT,
      height: VIEWPORT,
      borderRadius: VIEWPORT / 2,
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.85)',
    },
    hint: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 13,
      textAlign: 'center',
      marginTop: 24,
      paddingHorizontal: 20,
    },
    buttonRow: {
      flexDirection: 'row',
      marginTop: 32,
      gap: 12,
    },
    secondaryButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    secondaryButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    primaryButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 999,
      backgroundColor: colors.accent,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
