import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Text from '../common/AppText';
import { openCoupangSearch } from '../../utils/coupang';
import { calendarTheme as t } from './calendarTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BuyModalProps {
  visible: boolean;
  itemName: string | null;
  onClose: () => void;
  onMarkOrdered: () => void;
}

export default function BuyModal({ visible, itemName, onClose, onMarkOrdered }: BuyModalProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);

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

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(30, 27, 46, 0.45)',
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
