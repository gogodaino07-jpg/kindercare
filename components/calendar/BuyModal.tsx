import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Text from '../common/AppText';
import { CoupangProduct, fetchCoupangProducts, openCoupangProduct, openCoupangSearch } from '../../utils/coupang';
import { useCalendarTheme } from './useCalendarTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
/** 시트가 너무 길어지지 않도록 추천 상품은 이만큼만 보여준다. */
const MAX_PRODUCTS = 3;
const PARTNERS_DISCLOSURE =
  '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';

interface BuyModalProps {
  visible: boolean;
  itemName: string | null;
  onClose: () => void;
  onMarkOrdered: () => void;
}

export default function BuyModal({ visible, itemName, onClose, onMarkOrdered }: BuyModalProps) {
  const t = useCalendarTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const [products, setProducts] = useState<CoupangProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (!visible || !itemName) return;
    // 느린 응답이 다른 준비물 시트에 뒤늦게 덮어쓰지 않도록 취소 플래그로 막는다.
    let cancelled = false;
    setProducts([]);
    setLoadingProducts(true);
    fetchCoupangProducts(itemName).then((result) => {
      if (cancelled) return;
      setProducts(result.slice(0, MAX_PRODUCTS));
      setLoadingProducts(false);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, itemName]);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : SCREEN_HEIGHT, { duration: visible ? 300 : 250 });
  }, [visible, translateY]);

  const handleClose = () => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
      runOnJS(onClose)();
    });
  };

  const dragStart = useSharedValue(0);
  const gesture = Gesture.Pan()
    .onStart(() => {
      dragStart.value = translateY.value;
    })
    .onUpdate((e) => {
      const next = dragStart.value + e.translationY;
      if (next > 0) translateY.value = next;
    })
    .onEnd((e) => {
      if (e.velocityY > 500 || e.translationY > 120) {
        handleClose();
      } else {
        translateY.value = withTiming(0, { duration: 250 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, SCREEN_HEIGHT], [1, 0]),
  }));

  if (!itemName) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.overlayContainer}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={{ flex: 1 }} onPress={handleClose} />
        </Animated.View>

        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.sheet, sheetStyle]}>
            <View style={styles.dragHandle} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>준비물 바로 구매</Text>
              <Pressable onPress={handleClose} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={20} color={t.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.itemCard}>
              <MaterialCommunityIcons name="shopping-outline" size={18} color={t.violet} />
              <Text style={styles.itemName}>{itemName}</Text>
            </View>

            {loadingProducts ? (
              <View style={styles.productList}>
                {Array.from({ length: MAX_PRODUCTS }).map((_, i) => (
                  <View key={i} style={styles.productRow}>
                    <View style={[styles.productImage, styles.skeleton]} />
                    <View style={styles.productInfo}>
                      <View style={[styles.skeletonLine, { width: '85%' }]} />
                      <View style={[styles.skeletonLine, { width: '40%' }]} />
                    </View>
                  </View>
                ))}
              </View>
            ) : products.length > 0 ? (
              <View style={styles.productList}>
                {products.map((p) => (
                  <Pressable key={p.id} style={styles.productRow} onPress={() => openCoupangProduct(p.url)}>
                    <Image source={{ uri: p.image }} style={styles.productImage} />
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2}>
                        {p.name}
                      </Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.productPrice}>{p.price.toLocaleString('ko-KR')}원</Text>
                        {p.isRocket && <Text style={styles.rocketText}>로켓배송</Text>}
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={t.textMuted} />
                  </Pressable>
                ))}
                <Text style={styles.disclosure}>{PARTNERS_DISCLOSURE}</Text>
              </View>
            ) : null}

            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                openCoupangSearch(itemName);
              }}
            >
              <Text style={styles.primaryButtonText}>쿠팡 로켓배송으로 보러가기</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                onMarkOrdered();
                handleClose();
              }}
            >
              <Text style={styles.secondaryButtonText}>이미 주문했어요 (완료로 변경)</Text>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

function createStyles(t: import('./calendarTheme').CalendarTheme) {
  return StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    backgroundColor: t.cardWhite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingTop: 12,
    paddingBottom: 32,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: t.gray200,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: t.textPrimary,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.violetBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 18,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
    color: t.violetDeep,
  },
  productList: {
    marginBottom: 14,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: t.textPrimary,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: t.textPrimary,
  },
  rocketText: {
    fontSize: 11,
    fontWeight: '700',
    color: t.violet,
  },
  skeleton: {
    backgroundColor: t.gray100,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: t.gray100,
  },
  disclosure: {
    fontSize: 10.5,
    color: t.textMuted,
    marginTop: 6,
    lineHeight: 15,
  },
  primaryButton: {
    backgroundColor: t.violet,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: t.textSecondary,
  },
  });
}
