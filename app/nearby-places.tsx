import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import Text from '../components/common/AppText';
import LocationPermissionModal from '../components/nearby-places/LocationPermissionModal';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';
import {
  AREA_OPTIONS,
  CATEGORY_OPTIONS,
  Coords,
  fetchNearbyPlaces,
  NearbyPlace,
  PlaceCategory,
  PlaceSort,
} from '../features/nearby-places';
import { withExternalAction } from '../utils/externalAction';
import { openYanoljaSearch, openYeogiSearch } from '../utils/travelLinks';

const DEFAULT_AREA_CODE = '1'; // 서울

function formatDistance(meters?: number): string | null {
  if (meters === undefined) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function NearbyPlacesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [coords, setCoords] = useState<Coords | undefined>(undefined);
  const [areaCode, setAreaCode] = useState(DEFAULT_AREA_CODE);
  const [category, setCategory] = useState<PlaceCategory>('all');
  const [sort, setSort] = useState<PlaceSort>('recommend');

  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchNearbyPlaces({
        coords,
        areaCode: coords ? undefined : areaCode,
        category,
        sort,
      });
      setPlaces(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '나들이 장소를 불러오지 못했어요');
    } finally {
      setLoading(false);
    }
  }, [coords, areaCode, category, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePressLocate = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      await resolveLocation();
    } else {
      setPermissionModalVisible(true);
    }
  };

  const resolveLocation = async () => {
    setLocating(true);
    try {
      const position = await withExternalAction(() =>
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      );
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setSort('distance');
    } catch {
      setError('현재 위치를 가져오지 못했어요');
    } finally {
      setLocating(false);
    }
  };

  const handlePermissionResult = (granted: boolean) => {
    setPermissionModalVisible(false);
    if (granted) {
      resolveLocation();
    }
  };

  const handleSelectArea = (code: string) => {
    setAreaCode(code);
    setCoords(undefined);
    setSort('recommend');
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable style={styles.locateButton} onPress={handlePressLocate} disabled={locating}>
            {locating ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Text style={styles.locateButtonText}>
                📍 {coords ? '현재 위치로 다시 찾기' : '현재 위치로 찾기'}
              </Text>
            )}
          </Pressable>

          <FilterSection title="지역" colors={colors}>
            {AREA_OPTIONS.map((area) => (
              <Chip
                key={area.code}
                label={area.label}
                selected={!coords && areaCode === area.code}
                onPress={() => handleSelectArea(area.code)}
                colors={colors}
              />
            ))}
          </FilterSection>

          <FilterSection title="카테고리" colors={colors}>
            {CATEGORY_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={category === opt.id}
                onPress={() => setCategory(opt.id)}
                colors={colors}
              />
            ))}
          </FilterSection>

          <FilterSection title="정렬" colors={colors}>
            <Chip label="추천순" selected={sort === 'recommend'} onPress={() => setSort('recommend')} colors={colors} />
            <Chip
              label="거리순"
              selected={sort === 'distance'}
              onPress={() => coords && setSort('distance')}
              disabled={!coords}
              colors={colors}
            />
          </FilterSection>

          <View style={styles.listSection}>
            {loading ? (
              <ActivityIndicator style={styles.loadingIndicator} color={colors.accent} />
            ) : error ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>😥</Text>
                <Text style={styles.emptyText}>{error}</Text>
              </View>
            ) : places.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🗺️</Text>
                <Text style={styles.emptyText}>추천할 장소를 찾지 못했어요{'\n'}다른 지역이나 카테고리로 시도해보세요</Text>
              </View>
            ) : (
              places.map((place) => <PlaceCard key={place.contentId} place={place} colors={colors} />)
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <LocationPermissionModal
        visible={permissionModalVisible}
        onAllow={handlePermissionResult}
        onSkip={() => setPermissionModalVisible(false)}
      />
    </ScreenBackground>
  );
}

function FilterSection({
  title,
  colors,
  children,
}: {
  title: string;
  colors: ThemeColors;
  children: React.ReactNode;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {children}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
  disabled,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  colors: ThemeColors;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function PlaceCard({ place, colors }: { place: NearbyPlace; colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const distance = formatDistance(place.distanceMeters);

  return (
    <View style={styles.card}>
      {place.imageUrl ? (
        <Image source={{ uri: place.imageUrl }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Text style={styles.cardImagePlaceholderEmoji}>🏞️</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {place.title}
        </Text>
        <Text style={styles.cardAddress} numberOfLines={1}>
          {place.address}
          {distance ? ` · ${distance}` : ''}
        </Text>
        <View style={styles.cardButtonRow}>
          <Pressable
            style={[styles.cardButton, styles.cardButtonYeogi]}
            onPress={() => openYeogiSearch(place.title)}
          >
            <Text style={styles.cardButtonYeogiText}>여기어때에서 보기</Text>
          </Pressable>
          <Pressable
            style={[styles.cardButton, styles.cardButtonYanolja]}
            onPress={() => openYanoljaSearch(place.title)}
          >
            <Text style={styles.cardButtonYanoljaText}>야놀자에서 보기</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    locateButton: {
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.accent,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 20,
      ...SHADOW,
      shadowOpacity: 0.08,
    },
    locateButtonText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.accent,
    },
    filterSection: {
      marginBottom: 16,
    },
    filterTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    chipRow: {
      gap: 8,
      paddingRight: 8,
    },
    chip: {
      backgroundColor: colors.gray100,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipSelected: {
      backgroundColor: colors.accent,
    },
    chipDisabled: {
      opacity: 0.4,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    chipTextSelected: {
      color: '#FFFFFF',
    },
    listSection: {
      marginTop: 4,
    },
    loadingIndicator: {
      marginTop: 40,
    },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: 48,
    },
    emptyEmoji: {
      fontSize: 36,
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
    },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
      ...SHADOW,
      shadowOpacity: 0.06,
    },
    cardImage: {
      width: 84,
      height: 84,
      borderRadius: 12,
    },
    cardImagePlaceholder: {
      backgroundColor: colors.gray100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardImagePlaceholderEmoji: {
      fontSize: 28,
    },
    cardBody: {
      flex: 1,
      marginLeft: 12,
      justifyContent: 'space-between',
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    cardAddress: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
      marginBottom: 8,
    },
    cardButtonRow: {
      flexDirection: 'row',
      gap: 6,
    },
    cardButton: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: 'center',
    },
    cardButtonYeogi: {
      backgroundColor: colors.pinkBg,
    },
    cardButtonYeogiText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.pinkText,
    },
    cardButtonYanolja: {
      backgroundColor: colors.lightBlueBg,
    },
    cardButtonYanoljaText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.blue500,
    },
  });
}
