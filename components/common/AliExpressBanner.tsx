import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Linking, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Text from './AppText';

export const ALIEXPRESS_LEGAL_DISCLOSURE_TEXT =
  '이 포스팅은 알리익스프레스 제휴 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';

// 링크 변환기(Link Generator)로 발급받은 홈페이지 트래킹 링크. 알리익스프레스는
// 쿠팡처럼 실시간 위젯 스크립트를 제공하지 않고 고정 이미지 배너(주로 정사각형에
// 가까운 비율)만 지원해서, 앱 디자인에 맞는 가로형 배너는 직접 만들고 클릭 시
// 이 트래킹 링크로 이동시키는 방식으로 구현했다.
const ALIEXPRESS_TRACKING_LINK = 'https://s.click.aliexpress.com/e/_c2wHVzEl';

interface AliExpressBannerProps {
  style?: ViewStyle;
}

/**
 * AliExpressBanner Component
 * 알리익스프레스는 쿠팡과 달리 실시간 위젯 스크립트가 없어, 자체 디자인한
 * 배너에 발급받은 트래킹 링크를 연결하는 방식으로 구현했다.
 * 다크모드와 무관하게 항상 고정 톤(브랜드 컬러)으로 노출한다.
 */
export default function AliExpressBanner({ style }: AliExpressBannerProps) {
  const handlePress = () => {
    Linking.openURL(ALIEXPRESS_TRACKING_LINK).catch(() => {});
  };

  return (
    <Pressable onPress={handlePress} style={[styles.container, style]}>
      <LinearGradient
        colors={['#FF3D00', '#FF7A00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>🛍️</Text>
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>해외 인기템, 최저가로 쇼핑하기</Text>
          <Text style={styles.subtitle} numberOfLines={1}>알리익스프레스에서 지금 확인해보세요</Text>
        </View>
        <View style={styles.ctaButton}>
          <Text style={styles.ctaText}>바로가기</Text>
          <Feather name="chevron-right" size={14} color="#FF3D00" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 22 },
  textCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 14.5, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ctaText: { fontSize: 12.5, fontWeight: '800', color: '#FF3D00' },
});
