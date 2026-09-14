import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Image, Linking, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Text from './AppText';

export const ALIEXPRESS_LEGAL_DISCLOSURE_TEXT =
  '이 포스팅은 알리익스프레스 제휴 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';

interface AliExpressProduct {
  image: any;
  title: string;
  price: string;
  originalPrice: string;
  discount: string;
  link: string;
}

// 알리익스프레스 Ad Center > Hot Deals에서 개별 상품을 "Promote now"로
// 골라 발급받은 트래킹 링크 목록. 알리익스프레스는 쿠팡처럼 실시간 위젯
// 스크립트를 제공하지 않아, 직접 고른 상품 몇 개를 배너에 랜덤 노출하고
// 클릭 시 각 상품의 트래킹 링크로 이동시키는 방식으로 구현했다.
const PRODUCTS: AliExpressProduct[] = [
  {
    image: require('../../assets/images/aliexpress/product1.jpg'),
    title: '불빛이 나는 키보드 키체인 스트레스 해소 장난감',
    price: 'KRW 1,500',
    originalPrice: 'KRW 2,886',
    discount: '48%',
    link: 'https://s.click.aliexpress.com/e/_c3EMcZpT',
  },
  {
    image: require('../../assets/images/aliexpress/product2.jpg'),
    title: '냉장고용 3단 회전식 계란 보관 용기',
    price: 'KRW 1,500',
    originalPrice: 'KRW 4,038',
    discount: '63%',
    link: 'https://s.click.aliexpress.com/e/_c3sEK1gh',
  },
  {
    image: require('../../assets/images/aliexpress/product3.jpg'),
    title: '미끄럼 방지 각질 제거 족욕 마사지 매트',
    price: 'KRW 1,000',
    originalPrice: 'KRW 2,302',
    discount: '57%',
    link: 'https://s.click.aliexpress.com/e/_c378fH0Z',
  },
  {
    image: require('../../assets/images/aliexpress/product4.jpg'),
    title: '원육 20% 소갈비탕 650g x 10팩',
    price: 'KRW 32,421',
    originalPrice: 'KRW 93,900',
    discount: '65%',
    link: 'https://s.click.aliexpress.com/e/_c3kGJHYt',
  },
  {
    image: require('../../assets/images/aliexpress/product5.jpg'),
    title: '점보 치즈 큐브 스트레스 볼 스퀴즈 장난감',
    price: 'KRW 1,500',
    originalPrice: 'KRW 4,397',
    discount: '66%',
    link: 'https://s.click.aliexpress.com/e/_c4WJ3reV',
  },
  {
    image: require('../../assets/images/aliexpress/product6.jpg'),
    title: 'LED 귀 왁스 제거 핀셋 안전 귀 청소 도구',
    price: 'KRW 1,500',
    originalPrice: 'KRW 2,341',
    discount: '36%',
    link: 'https://s.click.aliexpress.com/e/_c3T2cdgv',
  },
  {
    image: require('../../assets/images/aliexpress/product7.jpg'),
    title: '폼 비행기 발사기 야외 장난감',
    price: 'KRW 1,500',
    originalPrice: 'KRW 2,236',
    discount: '33%',
    link: 'https://s.click.aliexpress.com/e/_c3DVUtAH',
  },
];

interface AliExpressBannerProps {
  style?: ViewStyle;
}

/**
 * AliExpressBanner Component
 * 알리익스프레스는 쿠팡과 달리 실시간 위젯 스크립트가 없어, 직접 고른
 * 상품 목록 중 하나를 마운트 시 랜덤으로 노출하고 발급받은 트래킹
 * 링크로 연결하는 방식으로 구현했다.
 */
export default function AliExpressBanner({ style }: AliExpressBannerProps) {
  const product = useMemo(() => PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)], []);

  const handlePress = () => {
    Linking.openURL(product.link).catch(() => {});
  };

  return (
    <Pressable onPress={handlePress} style={[styles.container, style]}>
      <LinearGradient
        colors={['#FF3D00', '#FF7A00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View style={styles.imageWrap}>
          <Image source={product.image} style={styles.image} resizeMode="cover" />
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{product.discount}</Text>
          </View>
        </View>
        <View style={styles.textCol}>
          <Text style={styles.brand}>알리익스프레스 특가</Text>
          <Text style={styles.title} numberOfLines={2}>{product.title}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{product.price}</Text>
            <Text style={styles.originalPrice}>{product.originalPrice}</Text>
          </View>
        </View>
        <View style={styles.ctaButton}>
          <Text style={styles.ctaText}>구매</Text>
          <Feather name="chevron-right" size={13} color="#FF3D00" />
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
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  imageWrap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  image: { width: '100%', height: '100%' },
  discountBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  discountText: { fontSize: 10, fontWeight: '800', color: '#FF3D00' },
  textCol: { flex: 1, minWidth: 0 },
  brand: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  title: { fontSize: 13.5, fontWeight: '800', color: '#FFFFFF', lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  price: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  originalPrice: {
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textDecorationLine: 'line-through',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  ctaText: { fontSize: 12.5, fontWeight: '800', color: '#FF3D00' },
});
