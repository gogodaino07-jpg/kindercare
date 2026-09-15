import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { hasSeenTutorial, markTutorialSeen } from '../../utils/tutorialStorage';
import Text from './AppText';

interface FirstVisitTipProps {
  /** AsyncStorage에 저장할 고유 키 (화면별로 다르게). */
  tutorialKey: string;
  title: string;
  description: string;
  emoji?: string;
  /** 모달/시트처럼 이미 좌우 여백이 있는 컨테이너 안에 넣을 때 marginHorizontal을 뺀다. */
  noHorizontalMargin?: boolean;
  /** 이 팁이 보이기/사라지기 시작할 때 알려준다 — 부모가 배경을 같이 딤 처리하고 싶을 때 사용. */
  onVisibleChange?: (visible: boolean) => void;
  /** 급식 시트처럼 공간이 좁은 곳에서 카드 여백/아이콘을 한 단계 줄인다. */
  compact?: boolean;
}

/**
 * 새로운 화면(캘린더, 급식 시트 등)에 처음 들어왔을 때 한 번만 뜨는 안내 배너.
 * 게임 튜토리얼처럼 눈에 띄도록 등장 시 바운스 + 은은하게 계속 맥동하는
 * 글로우, 살짝 통통 튀는 아이콘 배지를 넣었다. "확인!" 또는 X를 누르면
 * 로컬에 기록해 다음부터는 다시 뜨지 않는다(단, 앱 삭제 후 재설치하면 로컬
 * 기록도 사라져 다시 뜬다).
 */
export default function FirstVisitTip({ tutorialKey, title, description, emoji = '💡', noHorizontalMargin, onVisibleChange, compact }: FirstVisitTipProps) {
  const colors = useThemeColors();
  const styles = useMemoStyles(colors);
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    hasSeenTutorial(tutorialKey).then((seen) => {
      if (cancelled || seen) return;
      setVisible(true);
      onVisibleChange?.(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(bounce, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(bounce, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ])
      ).start();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialKey]);

  const dismiss = () => {
    markTutorialSeen(tutorialKey).catch(() => {});
    onVisibleChange?.(false);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.9, duration: 150, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  if (!visible) return null;

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.4] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const iconBounce = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const iconRotate = bounce.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] });

  return (
    <Animated.View
      style={[styles.wrap, noHorizontalMargin && styles.wrapNoMargin, { opacity, transform: [{ scale }] }]}
      pointerEvents="box-none"
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
      />

      <View style={[styles.card, compact && styles.cardCompact]}>
        <Pressable onPress={dismiss} hitSlop={8} style={styles.closeButton}>
          <Feather name="x" size={16} color={colors.gray400} />
        </Pressable>

        <View style={styles.headerRow}>
          <Animated.View style={[styles.iconBadgeWrap, { transform: [{ translateY: iconBounce }, { rotate: iconRotate }] }]}>
            <LinearGradient
              colors={[colors.purple500, colors.purpleDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.iconBadge, compact && styles.iconBadgeCompact]}
            >
              <Text style={[styles.emoji, compact && styles.emojiCompact]}>{emoji}</Text>
            </LinearGradient>
          </Animated.View>
          <View style={styles.textCol}>
            <View style={styles.titleRow}>
              <View style={styles.tipPill}>
                <Text style={styles.tipPillText}>TIP</Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
            </View>
            <Text style={styles.description}>{description}</Text>
          </View>
        </View>

        <Pressable onPress={dismiss} style={({ pressed }) => [styles.ctaWrap, compact && styles.ctaWrapCompact, pressed && styles.ctaWrapPressed]}>
          <LinearGradient
            colors={[colors.purple500, colors.purpleDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.cta, compact && styles.ctaCompact]}
          >
            <Text style={styles.ctaText}>알겠어요!</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function useMemoStyles(colors: ThemeColors) {
  return React.useMemo(() => createStyles(colors), [colors]);
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      marginHorizontal: 20,
      marginTop: 10,
      marginBottom: 4,
    },
    wrapNoMargin: {
      marginHorizontal: 0,
    },
    glow: {
      position: 'absolute',
      top: -4,
      left: -4,
      right: -4,
      bottom: -4,
      borderRadius: 24,
      backgroundColor: colors.purple500,
    },
    card: {
      backgroundColor: colors.cardWhite,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.purpleBg,
      paddingVertical: 16,
      paddingHorizontal: 16,
      ...SHADOW,
      shadowOpacity: 0.16,
      shadowColor: colors.purpleDeep,
      elevation: 4,
    },
    cardCompact: {
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    closeButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      padding: 4,
      zIndex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingRight: 18,
    },
    iconBadgeWrap: {},
    iconBadge: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
      shadowOpacity: 0.25,
      shadowColor: colors.purpleDeep,
      elevation: 3,
    },
    iconBadgeCompact: {
      width: 32,
      height: 32,
      borderRadius: 11,
    },
    emoji: { fontSize: 19 },
    emojiCompact: { fontSize: 15 },
    textCol: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
    tipPill: {
      backgroundColor: colors.purple500,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    tipPillText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
    title: { fontSize: 14, fontWeight: '800', color: colors.gray900, flexShrink: 1 },
    description: { fontSize: 12.5, fontWeight: '600', color: colors.gray500, lineHeight: 18 },
    ctaWrap: {
      marginTop: 14,
      borderRadius: 999,
      alignSelf: 'stretch',
    },
    ctaWrapCompact: {
      marginTop: 10,
    },
    ctaWrapPressed: { opacity: 0.85 },
    cta: {
      paddingVertical: 11,
      borderRadius: 999,
      alignItems: 'center',
    },
    ctaCompact: {
      paddingVertical: 9,
    },
    ctaText: { fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' },
  });
}
