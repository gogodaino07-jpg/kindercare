import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOW } from '../../constants/theme';

export default function UploadButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      style={[styles.button, { marginBottom: Math.max(insets.bottom, 12) }]}
      onPress={() => router.push('/upload')}
    >
      <Text style={styles.buttonText}>가정통신문 업로드</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOW,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
