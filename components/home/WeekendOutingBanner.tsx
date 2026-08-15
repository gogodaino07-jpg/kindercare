import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { DEFAULT_AREA_CODE, fetchNearbyPlaces, NearbyPlace } from '../../features/nearby-places';
import Text from '../common/AppText';

/**
 * Home-screen teaser for the outing-recommendation screen, naming this
 * weekend's top-recommended nearby place. The whole design leans on having a
 * real place name, so it renders nothing while loading and stays hidden if
 * the fetch comes back empty or fails — no generic fallback copy.
 */
export default function WeekendOutingBanner() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [place, setPlace] = useState<NearbyPlace | null>(null);
  const bubbleScale = useRef(new Animated.Value(0)).current;
  const bubbleWiggle = useRef(new Animated.Value(0)).current;
  const bubbleRotate = bubbleWiggle.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-10deg', '10deg'],
  });
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const ctaScale = useRef(new Animated.Value(1)).current;
  const arrowNudge = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    fetchNearbyPlaces({ areaCode: DEFAULT_AREA_CODE, category: 'all', sort: 'recommend' })
      .then((places) => {
        if (!cancelled) setPlace(places[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setPlace(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pop the speech bubble in, then keep it wiggling side-to-side with a
  // scale pulse — reads as the mascot excitedly chiming in "IT'S ME!!",
  // not just decoration.
  useEffect(() => {
    if (!place) return;
    bubbleScale.setValue(0);
    Animated.spring(bubbleScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 60,
    }).start(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(900),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(bubbleWiggle, { toValue: -1, duration: 170, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
              Animated.timing(bubbleWiggle, { toValue: 1, duration: 170, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
              Animated.timing(bubbleWiggle, { toValue: -0.6, duration: 170, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
              Animated.timing(bubbleWiggle, { toValue: 0, duration: 170, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(bubbleScale, { toValue: 1.14, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.timing(bubbleScale, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ]),
          ]),
        ])
      );
      loop.start();
      loopRef.current = loop;
    });
    return () => loopRef.current?.stop();
  }, [place, bubbleScale, bubbleWiggle]);

  // A small repeating "go" nudge on the arrow — hints that the button leads
  // somewhere, independent of the press feedback below.
  useEffect(() => {
    if (!place) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowNudge, { toValue: 5, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(arrowNudge, { toValue: 0, duration: 600, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(700),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [place, arrowNudge]);

  const handlePressIn = () => {
    Animated.spring(ctaScale, { toValue: 0.92, useNativeDriver: true, friction: 5 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(ctaScale, { toValue: 1, useNativeDriver: true, friction: 3, tension: 200 }).start();
  };
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push({ pathname: '/nearby-places', params: { areaCode: DEFAULT_AREA_CODE } });
  };

  if (!place) return null;

  return (
    <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <LinearGradient
        colors={[colors.pastelOrangeAccent, colors.pastelPinkAccent, colors.purpleDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🎈 주말 나들이 추천</Text>
        </View>

        <Text style={styles.line1}>이번 주말은</Text>
        <Text style={styles.line2}>
          <Text style={styles.placeName}>{place.title}</Text> 어때요?
        </Text>

        <Animated.View style={[styles.ctaButton, { transform: [{ scale: ctaScale }] }]}>
          <Text style={styles.ctaButtonText}>보러가기</Text>
          <Animated.View style={[styles.ctaButtonArrowWrap, { transform: [{ translateX: arrowNudge }] }]}>
            <Text style={[styles.ctaButtonArrow, styles.ctaButtonArrowShadow]}>→</Text>
            <Text style={styles.ctaButtonArrow}>→</Text>
          </Animated.View>
        </Animated.View>

        <View style={styles.mascotWrap}>
          <Animated.View
            style={[styles.bubble, { transform: [{ scale: bubbleScale }, { rotate: bubbleRotate }] }]}
          >
            <Text style={styles.bubbleText}>IT'S ME!!</Text>
            <View style={styles.bubbleTail} />
          </Animated.View>
          <Text style={styles.mascot}>🧸</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginTop: 20,
      marginHorizontal: 20,
      borderRadius: 24,
      padding: 20,
      overflow: 'hidden',
      ...SHADOW,
      shadowOpacity: 0.22,
      shadowColor: colors.purpleDeep,
      elevation: 4,
    },
    badge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
      marginBottom: 12,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    line1: {
      fontSize: 13,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.9)',
      marginBottom: 2,
    },
    line2: {
      fontSize: 21,
      fontWeight: '900',
      color: '#FFFFFF',
      lineHeight: 27,
      letterSpacing: -0.3,
    },
    placeName: {
      color: '#FEF08A',
    },
    ctaButton: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: '#FFFFFF',
      borderRadius: 999,
      paddingHorizontal: 20,
      paddingVertical: 11,
    },
    ctaButtonText: {
      fontSize: 17,
      fontWeight: '900',
      color: '#5B21B6',
    },
    ctaButtonArrowWrap: {
      marginLeft: 6,
      position: 'relative',
    },
    ctaButtonArrow: {
      fontSize: 18,
      fontWeight: '900',
      color: '#DB2777',
    },
    ctaButtonArrowShadow: {
      position: 'absolute',
      left: 0.6,
      top: 0.6,
    },
    mascotWrap: {
      position: 'absolute',
      right: 10,
      bottom: 4,
    },
    mascot: {
      fontSize: 86,
      transform: [{ rotate: '-8deg' }],
      opacity: 0.97,
    },
    bubble: {
      position: 'absolute',
      top: -42,
      left: -4,
      backgroundColor: '#FFFFFF',
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 4,
      ...SHADOW,
      shadowOpacity: 0.15,
      elevation: 3,
    },
    bubbleText: {
      fontFamily: 'Dongle_700Bold',
      fontSize: 24,
      color: colors.purpleDeep,
    },
    bubbleTail: {
      position: 'absolute',
      bottom: -6,
      left: 18,
      width: 0,
      height: 0,
      borderLeftWidth: 6,
      borderRightWidth: 2,
      borderTopWidth: 7,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: '#FFFFFF',
      transform: [{ rotate: '20deg' }],
    },
  });
}
