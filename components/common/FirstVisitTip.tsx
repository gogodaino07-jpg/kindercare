import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
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
}

/**
 * 새로운 화면(캘린더, 급식 시트 등)에 처음 들어왔을 때 한 번만 뜨는 간단한
 * 안내 배너. "확인"을 누르면 로컬에 기록해 다음부터는 다시 뜨지 않는다
 * (단, 앱 삭제 후 재설치하면 로컬 기록도 사라져 다시 뜬다).
 */
export default function FirstVisitTip({ tutorialKey, title, description, emoji = '💡', noHorizontalMargin, onVisibleChange }: FirstVisitTipProps) {
  const colors = useThemeColors();
  const styles = useMemoStyles(colors);
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    let cancelled = false;
    hasSeenTutorial(tutorialKey).then((seen) => {
      if (cancelled || seen) return;
      setVisible(true);
      onVisibleChange?.(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialKey]);

  const dismiss = () => {
    markTutorialSeen(tutorialKey).catch(() => {});
    onVisibleChange?.(false);
    Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setVisible(false));
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.wrap, noHorizontalMargin && styles.wrapNoMargin, { opacity, transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.textCol}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={8} style={styles.closeButton}>
          <Feather name="x" size={16} color={colors.gray400} />
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
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.accent,
      paddingVertical: 12,
      paddingHorizontal: 14,
      ...SHADOW,
      shadowOpacity: 0.1,
      elevation: 2,
    },
    emoji: { fontSize: 18, marginTop: 1 },
    textCol: { flex: 1, minWidth: 0 },
    title: { fontSize: 13.5, fontWeight: '800', color: colors.gray900, marginBottom: 2 },
    description: { fontSize: 12, fontWeight: '600', color: colors.gray500, lineHeight: 17 },
    closeButton: { padding: 2 },
  });
}
