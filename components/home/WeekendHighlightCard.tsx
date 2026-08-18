import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { fetchNearbyPlaces, NearbyPlace } from '../../features/nearby-places';
import { resolveCoords } from '../../hooks/useWeeklyWeather';
import { parseISODate, toISODate } from '../../utils/date';
import { getHolidayInfo, getHolidayName } from '../../utils/holidays';
import { openYeogiSearch } from '../../utils/travelLinks';
import Text from '../common/AppText';

let placeCache: { dateKey: string; place: NearbyPlace | null } | null = null;

/** 나들이 추천 장소를 하루 한 번만 조회해서 캐시해둔다(같은 날 홈 재방문 시 API 재호출 방지). */
async function loadWeekendPlace(): Promise<NearbyPlace | null> {
  const dateKey = toISODate(new Date());
  if (placeCache && placeCache.dateKey === dateKey) return placeCache.place;
  try {
    const { coords } = await resolveCoords();
    const places = await fetchNearbyPlaces({ coords, category: 'leisure', sort: 'distance' });
    const place = places.find((p) => p.imageUrl) ?? places[0] ?? null;
    placeCache = { dateKey, place };
    return place;
  } catch {
    placeCache = { dateKey, place: null };
    return null;
  }
}

function formatDistance(meters?: number): string | null {
  if (meters === undefined) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/** "설날 연휴" -> "설날" 처럼 소개 문구에 쓸 자연스러운 이름으로 다듬어준다. */
function shortHolidayName(name: string): string {
  return name.replace(/\s*연휴$/, '');
}

type Target =
  | { iso: string; dayLabel: string; kind: 'holiday'; holidayName: string }
  | { iso: string; dayLabel: string; kind: 'weekend' };

/** 내일/모레가 공휴일이면 소개 카드를, 평범한 주말이면 나들이 추천 카드를 보여준다. 평일이면 아무것도 렌더링하지 않는다. */
export default function WeekendHighlightCard() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const target = useMemo<Target | null>(() => {
    const tomorrowISO = toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const dayAfterISO = toISODate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
    for (const [iso, dayLabel] of [[tomorrowISO, '내일'], [dayAfterISO, '모레']] as const) {
      const holidayName = getHolidayName(iso);
      if (holidayName) return { iso, dayLabel, kind: 'holiday', holidayName };
      const weekday = parseISODate(iso).getDay();
      if (weekday === 0 || weekday === 6) return { iso, dayLabel, kind: 'weekend' };
    }
    return null;
  }, []);

  const [place, setPlace] = useState<NearbyPlace | null | undefined>(undefined);

  useEffect(() => {
    if (target?.kind !== 'weekend') return;
    let mounted = true;
    loadWeekendPlace().then((p) => {
      if (mounted) setPlace(p);
    });
    return () => {
      mounted = false;
    };
  }, [target?.kind]);

  if (!target) return null;

  if (target.kind === 'holiday') {
    const info = getHolidayInfo(target.holidayName);
    const displayName = shortHolidayName(target.holidayName);
    return (
      <View style={styles.card}>
        <Text style={styles.title}>🎉 {target.dayLabel}은 {displayName}이에요</Text>
        {info && (
          <View style={styles.infoBlock}>
            <Text style={styles.line}>{info.summary}</Text>
            {!!info.activity && <Text style={styles.line}>🎈 {info.activity}</Text>}
            {!!info.food && <Text style={styles.line}>🍽️ {info.food}</Text>}
          </View>
        )}
      </View>
    );
  }

  // 로딩 중엔 자리를 차지하지 않아 레이아웃이 튀지 않게 함
  if (place === undefined) return null;

  if (place === null) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>🧭 {target.dayLabel} 주말엔 아이와 나들이 어때요?</Text>
        <Text style={styles.line}>가까운 곳부터 천천히 둘러보는 것도 좋아요.</Text>
      </View>
    );
  }

  const distance = formatDistance(place.distanceMeters);

  return (
    <Pressable style={styles.card} onPress={() => openYeogiSearch(place.title)}>
      <Text style={styles.title}>🧭 {target.dayLabel} 주말엔 여기 어때요?</Text>
      <View style={styles.placeRow}>
        {place.imageUrl ? (
          <Image source={{ uri: place.imageUrl }} style={styles.placeImage} />
        ) : (
          <View style={[styles.placeImage, styles.placeImagePlaceholder]}>
            <MaterialCommunityIcons name="image-off-outline" size={20} color={colors.gray400} />
          </View>
        )}
        <View style={styles.placeTextBlock}>
          <Text style={styles.placeTitle} numberOfLines={1}>{place.title}</Text>
          <Text style={styles.placeAddress} numberOfLines={1}>
            {place.address}{distance ? ` · ${distance}` : ''}
          </Text>
        </View>
      </View>
      <Text style={styles.linkHint}>여기어때에서 보기 →</Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      marginTop: 16,
      marginHorizontal: 20,
      backgroundColor: colors.cardWhite,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
      shadowOpacity: 0.05,
      elevation: 2,
    },
    title: { fontSize: 14, fontWeight: '800', color: colors.gray900 },
    infoBlock: { marginTop: 8, gap: 4 },
    line: { fontSize: 12.5, fontWeight: '600', color: colors.gray600, lineHeight: 18 },
    placeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
    placeImage: { width: 56, height: 56, borderRadius: 14 },
    placeImagePlaceholder: { backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center' },
    placeTextBlock: { flex: 1, minWidth: 0 },
    placeTitle: { fontSize: 13.5, fontWeight: '800', color: colors.gray900 },
    placeAddress: { fontSize: 11.5, fontWeight: '600', color: colors.gray500, marginTop: 2 },
    linkHint: { fontSize: 11.5, fontWeight: '700', color: colors.accent, marginTop: 10, textAlign: 'right' },
  });
}
