import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';

/** Reserves space for the future Coupang Partners banner (WebView) — placeholder box only for now. */
export default function AdBannerPlaceholder() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.boxText}>광고 배너 자리</Text>
      </View>
      <Text style={styles.disclosure}>
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginHorizontal: 20,
      marginVertical: 8,
    },
    box: {
      height: 60,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardWhite,
    },
    boxText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    disclosure: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
  });
}
