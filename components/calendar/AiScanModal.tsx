import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Text from '../common/AppText';
import { useAlert } from '../../context/AlertContext';
import { calendarTheme as t } from './calendarTheme';

interface AiScanModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AiScanModal({ visible, onClose }: AiScanModalProps) {
  const { showAlert } = useAlert();
  const [scanning, setScanning] = useState(false);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      rotation.value = 0;
      rotation.value = withRepeat(withTiming(360, { duration: 1600, easing: Easing.linear }), -1);
    } else {
      setScanning(false);
    }
  }, [visible, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleStart = () => {
    setScanning(true);
    // 실제 분석 연동은 이번 작업 범위 밖 — 목업 완료 알림만 표시.
    setTimeout(() => {
      setScanning(false);
      onClose();
      showAlert({ title: '스캔 완료!', message: '가정통신문 분석이 완료됐어요.', icon: '✨' });
    }, 1400);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Animated.View style={spinStyle}>
            <MaterialCommunityIcons name="creation" size={40} color={t.violet} />
          </Animated.View>
          <Text style={styles.title}>AI 스캔</Text>
          <Text style={styles.description}>가정통신문 사진을 분석해서{'\n'}자동으로 일정을 등록해요.</Text>

          <Pressable style={styles.primaryButton} onPress={handleStart} disabled={scanning}>
            <Text style={styles.primaryButtonText}>{scanning ? '분석 중...' : '스캔 시작'}</Text>
          </Pressable>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 46, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: t.cardWhite,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: t.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    color: t.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: t.violet,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeButton: {
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: t.textSecondary,
  },
});
