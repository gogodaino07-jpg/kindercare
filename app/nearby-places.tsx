import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import Text from '../components/common/AppText';
import LocationPermissionModal from '../components/nearby-places/LocationPermissionModal';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';
import {
  AREA_OPTIONS,
  CATEGORY_OPTIONS,
  Coords,
  DEFAULT_AREA_CODE,
  fetchNearbyPlaces,
  NearbyPlace,
  PlaceCategory,
  PlaceSort,
} from '../features/nearby-places';
import { withExternalAction } from '../utils/externalAction';
import { openYeogiSearch } from '../utils/travelLinks';

function formatDistance(meters?: number): string | null {
  if (meters === undefined) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/** Matches a reverse-geocoded province/metro name (e.g. "인천광역시") to an AREA_OPTIONS code. */
function matchAreaCode(regionName?: string | null): string | undefined {
  if (!regionName) return undefined;
  const normalized = regionName.replace(/(특별자치시|특별자치도|광역시|특별시|자치도|도)$/, '');
  return AREA_OPTIONS.find((a) => normalized.startsWith(a.label) || a.label.startsWith(normalized))?.code;
}

/**
 * A fresh GPS fix can occasionally take a long time on a second/third request
 * in a row (the OS location provider throttles rapid repeated high-accuracy
 * requests). Races it against a timeout and falls back to the last known
 * position so repeated taps stay snappy instead of hanging.
 */
async function getPositionWithFallback(): Promise<Location.LocationObject> {
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<Location.LocationObject>((_, reject) =>
        setTimeout(() => reject(new Error('location-timeout')), 6000)
      ),
    ]);
  } catch {
    const cached = await Location.getLastKnownPositionAsync();
    if (cached) return cached;
    throw new Error('위치를 가져오지 못했어요');
  }
}

export default function NearbyPlacesScreen() {
  const router = useRouter();
  const { areaCode: initialAreaCode } = useLocalSearchParams<{ areaCode?: string }>();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [coords, setCoords] = useState<Coords | undefined>(undefined);
  const [areaCode, setAreaCode] = useState(initialAreaCode || DEFAULT_AREA_CODE);
  const [category, setCategory] = useState<PlaceCategory>('all');
  const [sort, setSort] = useState<PlaceSort>('recommend');

  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [gpsAreaName, setGpsAreaName] = useState<string | null>(null);

  // When coords is set, the area filter doesn't affect the fetch at all (the
  // API call switches to a radius search around the coords) — excluding it
  // from `effectiveAreaCode` keeps `load`'s identity stable while GPS resolves
  // the matching region in the background, so that update doesn't trigger a
  // redundant second fetch on top of the one coords already triggered.
  const effectiveAreaCode = coords ? undefined : areaCode;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchNearbyPlaces({
        coords,
        areaCode: effectiveAreaCode,
        category,
        sort,
      });
      setPlaces(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '나들이 장소를 불러오지 못했어요');
    } finally {
      setLoading(false);
    }
  }, [coords, effectiveAreaCode, category, sort]);

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
      const position = await withExternalAction(getPositionWithFallback);
      const nextCoords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoords(nextCoords);
      setSort('distance');
      Location.reverseGeocodeAsync(nextCoords)
        .then(([place]) => {
          setGpsAreaName(place?.district || place?.city || null);
          const matchedCode = matchAreaCode(place?.region);
          if (matchedCode) setAreaCode(matchedCode);
        })
        .catch(() => setGpsAreaName(null));
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

  // On first open (no explicit area passed in, e.g. from the weekend-outing
  // banner), silently use the device's already-granted location instead of
  // defaulting to Seoul — but only if permission was already granted; this
  // must never itself trigger the permission prompt, which stays a
  // user-initiated action via the refresh button.
  useEffect(() => {
    if (initialAreaCode) return;
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') resolveLocation();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const provinceLabel = AREA_OPTIONS.find((a) => a.code === areaCode)?.label ?? '서울';
  const areaDisplayName = coords && gpsAreaName ? `${provinceLabel} ${gpsAreaName}` : provinceLabel;

  return (
    <ScreenBackground>
      <LinearGradient
        colors={[colors.pastelOrangeAccent, colors.pastelPinkAccent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroHeader, { paddingTop: insets.top + 10 }]}
      >
        <Text style={styles.heroTitle}>나들이 장소 추천</Text>
        <Pressable
          style={styles.closeButton}
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityLabel="닫기"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </LinearGradient>

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.locationStatusBar}>
            <Text style={styles.locationStatusText} numberOfLines={1}>
              현재 위치:{'  '}<Text style={styles.locationStatusAreaBold}>{areaDisplayName}</Text> 근처
            </Text>
            <Pressable onPress={handlePressLocate} disabled={locating} hitSlop={10}>
              {locating ? (
                <ActivityIndicator size="small" color="#7C3AED" />
              ) : (
                <Text style={styles.locationRefreshIcon}>⟳</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.dropdownRow}>
            <Dropdown
              label="지역"
              options={AREA_OPTIONS.map((area) => ({ value: area.code, label: area.label }))}
              selectedValue={areaCode}
              selectedLabel={AREA_OPTIONS.find((a) => a.code === areaCode)?.label ?? (coords ? '현재 위치' : '지역')}
              onSelect={handleSelectArea}
              colors={colors}
            />
            <Dropdown
              label="카테고리"
              options={CATEGORY_OPTIONS.map((opt) => ({ value: opt.id, label: opt.label }))}
              selectedValue={category}
              selectedLabel={CATEGORY_OPTIONS.find((opt) => opt.id === category)?.label ?? '전체'}
              onSelect={(value) => setCategory(value as PlaceCategory)}
              colors={colors}
            />
          </View>

          <FilterSection title="정렬" colors={colors}>
            <Chip label="추천순" selected={sort === 'recommend'} onPress={() => setSort('recommend')} colors={colors} />
            <Chip
              label="거리순"
              selected={sort === 'distance'}
              onPress={() => (coords ? setSort('distance') : handlePressLocate())}
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

function Dropdown({
  label,
  options,
  selectedValue,
  selectedLabel,
  onSelect,
  colors,
}: {
  label: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  selectedLabel: string;
  onSelect: (value: string) => void;
  colors: ThemeColors;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable style={styles.dropdownButton} onPress={() => setOpen(true)}>
        <Text style={styles.dropdownLabel}>{label}</Text>
        <View style={styles.dropdownValueRow}>
          <Text style={styles.dropdownValue} numberOfLines={1}>
            {selectedLabel}
          </Text>
          <Text style={styles.dropdownChevron}>▾</Text>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dropdownOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.dropdownSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.dropdownSheetTitle}>{label} 선택</Text>
            <ScrollView>
              {options.map((opt) => {
                const selected = opt.value === selectedValue;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.dropdownOption, selected && styles.dropdownOptionSelected]}
                    onPress={() => {
                      onSelect(opt.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, selected && styles.dropdownOptionTextSelected]}>
                      {opt.label}
                    </Text>
                    {selected && <Text style={styles.dropdownCheck}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
        <Pressable
          style={[styles.cardButton, styles.cardButtonYeogi]}
          onPress={() => openYeogiSearch(place.title)}
        >
          <Text style={styles.cardButtonYeogiText}>여기어때에서 보기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    heroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 14,
      paddingHorizontal: 24,
      ...SHADOW,
      shadowOpacity: 0.15,
      shadowColor: colors.pastelPinkAccent,
      elevation: 3,
    },
    closeButton: {
      position: 'absolute',
      right: 16,
      bottom: 14,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    heroTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.3,
    },
    locationStatusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardWhite,
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 14,
      marginBottom: 20,
      ...SHADOW,
      shadowOpacity: 0.08,
      elevation: 2,
    },
    locationStatusText: {
      flexShrink: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    locationStatusAreaBold: {
      fontWeight: '900',
      color: colors.textPrimary,
    },
    locationRefreshIcon: {
      fontSize: 20,
      fontWeight: '800',
      color: '#7C3AED',
      marginLeft: 10,
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
    cardButton: {
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
    dropdownRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    dropdownButton: {
      flex: 1,
      backgroundColor: colors.cardWhite,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    dropdownLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 2,
    },
    dropdownValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dropdownValue: {
      flexShrink: 1,
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    dropdownChevron: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 6,
    },
    dropdownOverlay: {
      flex: 1,
      backgroundColor: 'rgba(20, 24, 22, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    dropdownSheet: {
      width: '100%',
      maxWidth: 360,
      maxHeight: '70%',
      backgroundColor: colors.skyBackground,
      borderRadius: 20,
      padding: 16,
      ...SHADOW,
    },
    dropdownSheetTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.gray900,
      marginBottom: 10,
      textAlign: 'center',
    },
    dropdownOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 12,
    },
    dropdownOptionSelected: {
      backgroundColor: colors.lightBlueBg,
    },
    dropdownOptionText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    dropdownOptionTextSelected: {
      color: colors.blue500,
      fontWeight: '800',
    },
    dropdownCheck: {
      fontSize: 14,
      color: colors.blue500,
      fontWeight: '800',
    },
  });
}
