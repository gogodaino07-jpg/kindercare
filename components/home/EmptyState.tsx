import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';

export default function EmptyState() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
      color: colors.gray900,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.gray900,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
