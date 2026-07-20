import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/theme';

export default function EmptyState() {
  return (
    <View style={styles.container}>
      <Text style={styles.illustration}>🧒📖👧</Text>
      <Text style={styles.title}>아직 등록된 게 없어요!</Text>
      <Text style={styles.subtitle}>
        가정통신문만 올려주시면{'\n'}제가 센스있게 정리해드릴게요!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustration: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
