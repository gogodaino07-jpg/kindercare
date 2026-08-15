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
    <Modal visible={visible} transparent onRequestClose={onSkip}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>📍</Text>
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
      backgroundColor: 'rgba(20, 24, 22, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.creamBeigeCard,
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      ...SHADOW,
    },
    icon: {
      fontSize: 40,
      marginBottom: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 10,
      lineHeight: 24,
    },
    description: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 20,
    },
    allowButton: {
      width: '100%',
      backgroundColor: colors.coralPink,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
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
