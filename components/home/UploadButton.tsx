import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import Text from '../common/AppText';

export default function UploadButton() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable style={styles.button} onPress={() => router.push('/upload')}>
      <Text style={styles.buttonText}>📤 우리 아이 가정통신문 올리기</Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    button: {
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 8, // 하단 마진 다시 추가
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: 'center',
      ...SHADOW,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
