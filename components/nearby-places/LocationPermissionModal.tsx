import * as Location from 'expo-location';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';

interface LocationPermissionModalProps {
  visible: boolean;
  onAllow: (granted: boolean) => void;
  onSkip: () => void;
}

export default function LocationPermissionModal({ visible, onAllow, onSkip }: LocationPermissionModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [requesting, setRequesting] = useState(false);

  const handleAllow = async () => {
    setRequesting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      onAllow(status === 'granted');
    } catch {
      onAllow(false);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconBadge}>
            <Text style={styles.icon}>📍</Text>
          </View>
          <Text style={styles.title}>가까운 나들이 장소를{'\n'}찾아드릴게요</Text>
          <Text style={styles.description}>
            현재 위치를 기반으로{'\n'}아이와 가기 좋은 장소를 추천하려면{'\n'}위치 권한이 필요해요
          </Text>
          <Pressable style={styles.allowButton} onPress={handleAllow} disabled={requesting}>
            <Text style={styles.allowButtonText}>
              {requesting ? '확인 중...' : '위치 권한 허용하기'}
            </Text>
          </Pressable>
          <Pressable style={styles.laterButton} onPress={onSkip}>
            <Text style={styles.laterButtonText}>나중에 하기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 18, 17, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.cardWhite,
      borderRadius: 30,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 26,
      paddingTop: 26,
      paddingBottom: 22,
      alignItems: 'center',
      ...SHADOW,
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
    iconBadge: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: colors.gray100,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    icon: {
      fontSize: 26,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
      lineHeight: 24,
      letterSpacing: -0.2,
    },
    description: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 18,
    },
    allowButton: {
      width: '100%',
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      ...SHADOW,
      shadowOpacity: 0.22,
      shadowColor: colors.accent,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    allowButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    laterButton: {
      marginTop: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    laterButtonText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  });
}
