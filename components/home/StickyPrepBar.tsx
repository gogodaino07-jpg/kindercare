import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import Text from '../common/AppText';

interface StickyPrepBarProps {
  visible: boolean;
  top: number;
  total: number;
  checked: number;
  percent: number;
  onPress: () => void;
}

/**
 * 홈 화면의 "오늘 등원 준비물 챙기기" 배너가 스크롤로 화면(절반 이상) 밖으로
 * 나가면, 대신 화면 상단에 뜨는 얇은 진행률 띠.
 */
export default function StickyPrepBar({ visible, top, total, checked, percent, onPress }: StickyPrepBarProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  if (total === 0) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] });
  const clampedPercent = Math.max(0, Math.min(percent, 100));

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.wrap, { top, opacity: anim, transform: [{ translateY }] }]}
    >
      <Pressable onPress={onPress} style={styles.pill}>
        <View style={styles.row}>
          <View style={styles.iconBadge}>
            <MaterialIcons name="inventory" size={13} color={colors.statusGreen} />
          </View>
          <Text style={styles.title} numberOfLines={1}>
            오늘 등원 준비물 챙기기
          </Text>
          <Text style={styles.percentText}>{percent}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${clampedPercent}%` }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 50,
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    pill: {
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingTop: 9,
      paddingBottom: 8,
      ...SHADOW,
      shadowOpacity: 0.12,
      elevation: 4,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBadge: {
      width: 22,
      height: 22,
      borderRadius: 7,
      backgroundColor: colors.green50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { flex: 1, fontSize: 12.5, fontWeight: '800', color: colors.gray900 },
    percentText: { fontSize: 12.5, fontWeight: '900', color: colors.statusGreen },
    track: {
      marginTop: 7,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.green50,
      overflow: 'hidden',
    },
    trackFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: colors.statusGreen,
    },
  });
}
