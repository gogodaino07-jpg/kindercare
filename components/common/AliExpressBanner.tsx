import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Linking, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Text from './AppText';

const ROTATE_INTERVAL_MS = 3000;
const FADE_DURATION_MS = 250;

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
  {
    image: require('../../assets/images/aliexpress/product8.jpg'),
    title: '어린이 집중력 훈련 미로 게임북 (32페이지)',
    price: 'KRW 1,500',
    originalPrice: 'KRW 1,829',
    discount: '18%',
    link: 'https://s.click.aliexpress.com/e/_c3Deoy5X',
  },
  {
    image: require('../../assets/images/aliexpress/product9.jpg'),
    title: 'LED 키보드 키체인 피젯 스트레스 해소 장난감',
    price: 'KRW 1,500',
    originalPrice: 'KRW 2,434',
    discount: '38%',
    link: 'https://s.click.aliexpress.com/e/_c3lu8IhJ',
  },
  {
    image: require('../../assets/images/aliexpress/product10.jpg'),
    title: '스파이더맨 니트 방한 장갑',
    price: 'KRW 1,173',
    originalPrice: 'KRW 4,333',
    discount: '73%',
    link: 'https://s.click.aliexpress.com/e/_c3SSWBwH',
  },
  {
    image: require('../../assets/images/aliexpress/product11.jpg'),
    title: '크리스마스 롤 스티커 320개',
    price: 'KRW 1,500',
    originalPrice: 'KRW 2,467',
    discount: '39%',
    link: 'https://s.click.aliexpress.com/e/_c2QVxJsZ',
  },
  {
    image: require('../../assets/images/aliexpress/product12.jpg'),
    title: '스마트 그리기 로봇 (유아 지능 조기교육)',
    price: 'KRW 41,994',
    originalPrice: 'KRW 90,989',
    discount: '54%',
    link: 'https://s.click.aliexpress.com/e/_c4OpLVI9',
  },
  {
    image: require('../../assets/images/aliexpress/product13.jpg'),
    title: '만화 미니 풀백 크롤링 자동차 장난감',
    price: 'KRW 3,580',
    originalPrice: 'KRW 3,580',
    discount: '0%',
    link: 'https://s.click.aliexpress.com/e/_c4LMeaKD',
  },
  {
    image: require('../../assets/images/aliexpress/product14.jpg'),
    title: '키즈 알파카 라마 동물 후드 점프수트',
    price: 'KRW 28,650',
    originalPrice: 'KRW 59,687',
    discount: '52%',
    link: 'https://s.click.aliexpress.com/e/_c4UPoKtX',
  },
  {
    image: require('../../assets/images/aliexpress/product15.jpg'),
    title: '몬테소리 감각 활동 바쁜책 (스티커북)',
    price: 'KRW 17,150',
    originalPrice: 'KRW 34,300',
    discount: '50%',
    link: 'https://s.click.aliexpress.com/e/_c3cO58Hn',
  },
  {
    image: require('../../assets/images/aliexpress/product16.jpg'),
    title: '몬테소리 기하학 모양 분류 나무 퍼즐',
    price: 'KRW 1,500',
    originalPrice: 'KRW 1,500',
    discount: '0%',
    link: 'https://s.click.aliexpress.com/e/_c3llcwGz',
  },
  {
    image: require('../../assets/images/aliexpress/product17.jpg'),
    title: '스퀴시 슬로우 리바운드 도넛 냉장고 자석',
    price: 'KRW 2,600',
    originalPrice: 'KRW 5,652',
    discount: '54%',
    link: 'https://s.click.aliexpress.com/e/_c38VqgP7',
  },
  {
    image: require('../../assets/images/aliexpress/product18.jpg'),
    title: '아기 발 측정기 (신발 사이즈 측정)',
    price: 'KRW 2,340',
    originalPrice: 'KRW 4,875',
    discount: '52%',
    link: 'https://s.click.aliexpress.com/e/_c4EEvqTT',
  },
  {
    image: require('../../assets/images/aliexpress/product19.jpg'),
    title: '만화 자동차 어린이 훈련용 젓가락',
    price: 'KRW 1,500',
    originalPrice: 'KRW 5,061',
    discount: '70%',
    link: 'https://s.click.aliexpress.com/e/_c3ypocXx',
  },
  {
    image: require('../../assets/images/aliexpress/product20.jpg'),
    title: '아기 과일 푸드 피더 & 아이스크림 몰드',
    price: 'KRW 6,970',
    originalPrice: 'KRW 15,152',
    discount: '54%',
    link: 'https://s.click.aliexpress.com/e/_c4pBRmTb',
  },
  {
    image: require('../../assets/images/aliexpress/product21.jpg'),
    title: '아기 과일 실리콘 공급기 젖꼭지',
    price: 'KRW 3,380',
    originalPrice: 'KRW 7,511',
    discount: '55%',
    link: 'https://s.click.aliexpress.com/e/_c4berwS1',
  },
  {
    image: require('../../assets/images/aliexpress/product22.jpg'),
    title: '베이비 실리콘 흡착 식판 그릇',
    price: 'KRW 2,900',
    originalPrice: 'KRW 9,062',
    discount: '68%',
    link: 'https://s.click.aliexpress.com/e/_c3us4ZRB',
  },
  {
    image: require('../../assets/images/aliexpress/product23.jpg'),
    title: '카시트용 방수 어린이 식사 트레이',
    price: 'KRW 13,959',
    originalPrice: 'KRW 34,918',
    discount: '60%',
    link: 'https://s.click.aliexpress.com/e/_c4t75m33',
  },
  {
    image: require('../../assets/images/aliexpress/product24.jpg'),
    title: '어린이 헤어 왁스 스틱 (잔머리 정리)',
    price: 'KRW 3,220',
    originalPrice: 'KRW 7,156',
    discount: '55%',
    link: 'https://s.click.aliexpress.com/e/_c3QbTse1',
  },
  {
    image: require('../../assets/images/aliexpress/product25.jpg'),
    title: '어린이용 접이식 여행 카트 보행기',
    price: 'KRW 22,492',
    originalPrice: 'KRW 29,204',
    discount: '23%',
    link: 'https://s.click.aliexpress.com/e/_c4SjaAbx',
  },
  {
    image: require('../../assets/images/aliexpress/product26.jpg'),
    title: '1-12 숫자 따라쓰기 연습장 (32페이지)',
    price: 'KRW 1,500',
    originalPrice: 'KRW 3,150',
    discount: '52%',
    link: 'https://s.click.aliexpress.com/e/_c3TMr1zL',
  },
  {
    image: require('../../assets/images/aliexpress/product27.jpg'),
    title: '자동차 안전벨트 클립 연장 플러그',
    price: 'KRW 3,000',
    originalPrice: 'KRW 6,519',
    discount: '54%',
    link: 'https://s.click.aliexpress.com/e/_c3gQGtlb',
  },
  {
    image: require('../../assets/images/aliexpress/product28.jpg'),
    title: '리얼리스틱 헤어메트 크랩 피규어',
    price: 'KRW 1,500',
    originalPrice: 'KRW 3,323',
    discount: '55%',
    link: 'https://s.click.aliexpress.com/e/_c3QH8SbL',
  },
  {
    image: require('../../assets/images/aliexpress/product29.jpg'),
    title: '전면 장착형 자전거 어린이 안전 시트',
    price: 'KRW 85,842',
    originalPrice: 'KRW 99,267',
    discount: '14%',
    link: 'https://s.click.aliexpress.com/e/_c3iKxMjb',
  },
  {
    image: require('../../assets/images/aliexpress/product30.jpg'),
    title: '어린이 차량 색칠 공부책 (48페이지)',
    price: 'KRW 1,500',
    originalPrice: 'KRW 3,726',
    discount: '60%',
    link: 'https://s.click.aliexpress.com/e/_c3Fxzivn',
  },
  {
    image: require('../../assets/images/aliexpress/product31.jpg'),
    title: '아기 젖꼭지 클립 (이름 각인 가능)',
    price: 'KRW 6,940',
    originalPrice: 'KRW 7,225',
    discount: '4%',
    link: 'https://s.click.aliexpress.com/e/_c358RD3X',
  },
  {
    image: require('../../assets/images/aliexpress/product32.jpg'),
    title: '아기 머리끈 100~200개 세트 (면 소재)',
    price: 'KRW 1,500',
    originalPrice: 'KRW 4,122',
    discount: '64%',
    link: 'https://s.click.aliexpress.com/e/_c4cq5Wr7',
  },
];

interface AliExpressBannerProps {
  style?: ViewStyle;
}

/**
 * AliExpressBanner Component
 * 알리익스프레스는 쿠팡과 달리 실시간 위젯 스크립트가 없어, 직접 고른
 * 상품 목록을 마운트 시 랜덤 순서로 섞은 뒤 일정 간격으로 자동 전환하며
 * 노출하고, 클릭 시 현재 노출 중인 상품의 트래킹 링크로 연결한다.
 */
export default function AliExpressBanner({ style }: AliExpressBannerProps) {
  const order = useRef(shuffle(PRODUCTS)).current;
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const product = order[index];

  useEffect(() => {
    if (order.length <= 1) return;
    const timer = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_DURATION_MS, useNativeDriver: true }).start(() => {
        setIndex((prev) => (prev + 1) % order.length);
        Animated.timing(opacity, { toValue: 1, duration: FADE_DURATION_MS, useNativeDriver: true }).start();
      });
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [order, opacity]);

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
        <View style={styles.bannerContent}>
          <Animated.View style={[styles.imageWrap, { opacity }]}>
            <Image source={product.image} style={styles.image} resizeMode="cover" />
            {product.discount !== '0%' && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{product.discount}</Text>
              </View>
            )}
          </Animated.View>
          <View style={styles.textCol}>
            <Text style={styles.brand}>알리익스프레스 특가</Text>
            <Animated.View style={{ opacity }}>
              <Text style={styles.title} numberOfLines={2}>{product.title}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{product.price}</Text>
                {product.discount !== '0%' && (
                  <Text style={styles.originalPrice}>{product.originalPrice}</Text>
                )}
              </View>
            </Animated.View>
          </View>
          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>구매하기</Text>
            <Feather name="chevron-right" size={13} color="#FF3D00" />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  banner: {
    paddingVertical: 20,
    paddingHorizontal: 14,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageWrap: {
    width: 78,
    height: 78,
    borderRadius: 17,
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
    paddingVertical: 9,
  },
  ctaText: { fontSize: 12.5, fontWeight: '800', color: '#FF3D00' },
});
