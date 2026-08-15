import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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

  if (!place) return null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/nearby-places', params: { areaCode: DEFAULT_AREA_CODE } })}
    >
      <LinearGradient
        colors={[colors.pastelOrangeAccent, colors.pastelPinkAccent, colors.purpleDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🎈 주말 나들이 추천</Text>
        </View>

        <Text style={styles.title}>{`이번 주말은\n${place.title} 어때요?`}</Text>
        <Text style={styles.subtitle}>근처 인기 나들이 장소</Text>

        <View style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>보러가기 →</Text>
        </View>

        <Text style={styles.mascot}>🧸</Text>
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
    title: {
      fontSize: 20,
      fontWeight: '900',
      color: '#FFFFFF',
      lineHeight: 26,
      letterSpacing: -0.3,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.85)',
    },
    ctaButton: {
      marginTop: 16,
      alignSelf: 'flex-start',
      backgroundColor: '#FFFFFF',
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    ctaButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.purpleDeep,
    },
    mascot: {
      position: 'absolute',
      right: 14,
      bottom: 8,
      fontSize: 46,
      transform: [{ rotate: '12deg' }],
      opacity: 0.95,
    },
  });
}
