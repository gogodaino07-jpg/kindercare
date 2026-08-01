import React, { useMemo } from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../context/ThemeContext';
import Text from './AppText';

const COUPANG_LINK = 'https://link.coupang.com/a/fHdMU98clE';
const COUPANG_BANNER_IMAGE =
  'https://ads-partners.coupang.com/banners/1010650?trackingCode=AF5391104&subId=&traceId=V0-301-5f4982b43e2b4522-I1010650&w=728&h=90';

export default function CoupangAdBanner() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);

  const handlePress = () => {
    Linking.openURL(COUPANG_LINK).catch((err) => console.error('Failed to open Coupang link:', err));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.disclosure}>
        이 앱은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </Text>
      <Pressable onPress={handlePress} style={styles.adArea}>
        <Image
          source={{ uri: COUPANG_BANNER_IMAGE }}
          style={styles.bannerImage}
          resizeMode="contain"
        />
      </Pressable>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>, bottomInset: number) {
  return StyleSheet.create({
    container: {
      width: '100%',
      alignItems: 'center',
      backgroundColor: colors.skyBackground,
      paddingTop: 4,
      paddingBottom: Math.max(bottomInset, 12) + 4,
    },
    disclosure: {
      fontSize: 9,
      color: colors.textSecondary,
      marginBottom: 2,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    adArea: {
      width: '100%',
      height: 52, // 높이를 배너 비율에 맞춰 조정
      backgroundColor: colors.cardWhite,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    bannerImage: {
      width: '100%',
      height: '100%',
    },
  });
}
