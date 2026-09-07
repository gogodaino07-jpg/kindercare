import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useThemeColors } from '../../context/ThemeContext';
import Text from './AppText';

interface CoupangAdBannerProps {
  /** 쿠팡 파트너스에서 발급한 딥링크 (예: https://link.coupang.com/a/xxxxxxxx) */
  link: string;
  /** 배너 이미지 URL (쿠팡 파트너스 "HTML 태그" 코드에 들어있는 img src) */
  imageUrl: string;
  /** 원본 배너 이미지의 가로/세로 비율. 기본값은 쿠팡이 자주 주는 728x90 사이즈 기준. */
  aspectRatio?: number;
  /** 배너 위에 붙는 작은 타이틀. */
  title?: string;
}

export default function CoupangAdBanner({
  link,
  imageUrl,
  aspectRatio = 728 / 90,
  title = '오늘의 특가',
}: CoupangAdBannerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [adWidth, setAdWidth] = useState(0);

  // 카드가 뜰 때 살짝 커지며 나타나는 등장 애니메이션 — 정적인 이미지 한 장이
  // 아니라 "고급스럽게 등장하는" 느낌을 준다.
  const entranceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(entranceAnim, {
      toValue: 1,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [entranceAnim]);

  // 배너 이미지 위로 빛이 대각선으로 한 번씩 훑고 지나가는 반짝임 효과.
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!adWidth) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(2600),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [adWidth, shimmerAnim]);

  const shimmerWidth = Math.max(60, adWidth * 0.4);
  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-shimmerWidth - 40, adWidth + 40],
  });

  const handlePress = () => {
    Linking.openURL(link).catch((err) => console.error('Failed to open Coupang link:', err));
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: entranceAnim,
          transform: [{ scale: entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons name="tag-outline" size={14} color={colors.orange500} />
        </View>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.adPill}>
          <Text style={styles.adPillText}>AD</Text>
        </View>
      </View>

      <Pressable
        onPress={handlePress}
        style={[styles.adArea, { aspectRatio }]}
        onLayout={(e) => setAdWidth(e.nativeEvent.layout.width)}
      >
        <Image source={{ uri: imageUrl }} style={styles.bannerImage} resizeMode="cover" />
        {adWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shimmerBand,
              { width: shimmerWidth, transform: [{ translateX: shimmerTranslateX }, { rotate: '20deg' }] },
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
      </Pressable>

      <Text style={styles.disclosure}>
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </Text>
    </Animated.View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { width: '100%' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    iconBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.orangeLight1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { flex: 1, fontSize: 13.5, fontWeight: '800', color: colors.textPrimary },
    adPill: {
      backgroundColor: colors.gray100,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    adPillText: { fontSize: 9.5, fontWeight: '800', color: colors.gray400, letterSpacing: 0.3 },
    adArea: {
      width: '100%',
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.gray100,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bannerImage: { width: '100%', height: '100%' },
    shimmerBand: { position: 'absolute', top: '-30%', height: '160%' },
    disclosure: {
      fontSize: 9,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
      paddingHorizontal: 8,
    },
  });
}
