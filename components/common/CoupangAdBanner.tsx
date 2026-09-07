import React, { useMemo } from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useThemeColors } from '../../context/ThemeContext';
import Text from './AppText';

interface CoupangAdBannerProps {
  /** 쿠팡 파트너스에서 발급한 딥링크 (예: https://link.coupang.com/a/xxxxxxxx) */
  link: string;
  /** 배너 이미지 URL (쿠팡 파트너스 "HTML 태그" 코드에 들어있는 img src) */
  imageUrl: string;
  /** 원본 배너 이미지의 가로/세로 비율. 기본값은 쿠팡이 자주 주는 728x90 사이즈 기준. */
  aspectRatio?: number;
}

export default function CoupangAdBanner({ link, imageUrl, aspectRatio = 728 / 90 }: CoupangAdBannerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handlePress = () => {
    Linking.openURL(link).catch((err) => console.error('Failed to open Coupang link:', err));
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePress} style={[styles.adArea, { aspectRatio }]}>
        <Image source={{ uri: imageUrl }} style={styles.bannerImage} resizeMode="cover" />
      </Pressable>
      <Text style={styles.disclosure}>
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { width: '100%', alignItems: 'center' },
    adArea: {
      width: '100%',
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.gray100,
    },
    bannerImage: { width: '100%', height: '100%' },
    disclosure: {
      fontSize: 9,
      color: colors.textSecondary,
      marginTop: 6,
      textAlign: 'center',
      paddingHorizontal: 8,
    },
  });
}
