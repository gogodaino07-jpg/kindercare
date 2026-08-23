import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calendarTheme as t } from '../../components/calendar/calendarTheme';
import Text from '../../components/common/AppText';
import TextInput from '../../components/common/ClearableTextInput';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { WeatherLeaf, WEATHER_REGION_TREE } from '../../constants/weatherRegionTree';
import { useAlert } from '../../context/AlertContext';
import { useThemeColors } from '../../context/ThemeContext';
import { invalidateWeatherCache, resolveCoords } from '../../hooks/useWeeklyWeather';
import { useWeatherFavorites, WeatherFavoriteSlot } from '../../hooks/useWeatherFavorites';
import { StoredWeatherRegion, useWeatherRegion } from '../../hooks/useWeatherRegion';
import { fetchWeatherPreview, WeatherPreview } from '../../utils/weatherPreviewFetch';

interface SearchHit {
  label: string;
  latitude: number;
  longitude: number;
}

export default function WeatherRegionSettingsScreen() {
  const router = useRouter();
  const { region, setRegion } = useWeatherRegion();
  const { slots, saveToSlot, addSlot, renameSlot, removeSlot } = useWeatherFavorites();
  // 즐겨찾기 칸 추가/이름 변경용 작은 모달 — mode가 'add'면 새 칸 추가, slotId가 있으면 이름 변경.
  const [labelModal, setLabelModal] = useState<{ mode: 'add' | 'rename'; slotId?: string; draft: string } | null>(
    null
  );
  const { showAlert } = useAlert();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // 지금 화면 상단 카드에 보여줄 "적용된 지역"의 실시간 날씨.
  const [preview, setPreview] = useState<WeatherPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [displayLabel, setDisplayLabel] = useState(region?.label ?? '내 위치');
  // GPS 자동 모드일 때 새로고침 버튼을 누르면 이 값을 올려서 아래 useEffect를 다시 태운다
  // (region이 이미 null이면 setRegion(null)을 다시 불러도 상태가 안 바뀌어 재조회가 안 되기 때문).
  const [gpsRefreshTick, setGpsRefreshTick] = useState(0);

  // 즐겨찾기 각 칸의 실시간 기온(설정된 칸만).
  const [favoriteTemps, setFavoriteTemps] = useState<Record<string, number | null>>({});

  // 3단계 피커에서 지금 펼쳐보고 있는 시/도·시/군/구 (아직 확정 선택은 아님 — 동을
  // 눌러야 실제로 적용된다).
  const [openProvinceIdx, setOpenProvinceIdx] = useState(0);
  const [openDistrictIdx, setOpenDistrictIdx] = useState<number | null>(0);
  // 1단계(시/도) 칩 목록 접기/펼치기 — 이미 골랐으면 접어서 화면을 아낄 수 있게.
  const [provinceCollapsed, setProvinceCollapsed] = useState(false);

  // 화면 진입/지역 변경 시 상단 미리보기 카드를 갱신 — 자동(GPS) 모드면 실제 위치를 다시 구해온다.
  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    (async () => {
      let latitude: number;
      let longitude: number;
      let label: string;
      if (region) {
        latitude = region.latitude;
        longitude = region.longitude;
        label = region.label;
      } else {
        const resolved = await resolveCoords();
        latitude = resolved.coords.latitude;
        longitude = resolved.coords.longitude;
        label = resolved.locationLabel;
      }
      if (cancelled) return;
      setDisplayLabel(label);
      const result = await fetchWeatherPreview(latitude, longitude);
      if (!cancelled) {
        setPreview(result);
        setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [region, gpsRefreshTick]);

  // 지금 적용된 지역이 트리 데이터 안에 있으면, 피커를 그 경로(시/도 -> 시/군/구)로
  // 자동으로 열어서 보여준다 — 처음 들어왔을 때 내가 고른 동네가 어디쯤인지 바로 보이게.
  useEffect(() => {
    if (!region) return;
    for (let pIdx = 0; pIdx < WEATHER_REGION_TREE.length; pIdx++) {
      const province = WEATHER_REGION_TREE[pIdx];
      if (!province.districts) continue;
      const dIdx = province.districts.findIndex((d) => region.label.startsWith(`${province.name} ${d.name}`));
      if (dIdx !== -1) {
        setOpenProvinceIdx(pIdx);
        setOpenDistrictIdx(dIdx);
        return;
      }
    }
    const pIdx = WEATHER_REGION_TREE.findIndex((p) => !p.districts && region.label.startsWith(p.name));
    if (pIdx !== -1) {
      setOpenProvinceIdx(pIdx);
      setOpenDistrictIdx(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region?.label]);

  // 즐겨찾기에 저장된 칸들의 기온도 같이 불러온다.
  useEffect(() => {
    slots.forEach((slot) => {
      if (!slot.region) return;
      fetchWeatherPreview(slot.region.latitude, slot.region.longitude).then((result) => {
        setFavoriteTemps((prev) => ({ ...prev, [slot.id]: result?.tempC ?? null }));
      });
    });
  }, [slots]);

  const applyRegion = (next: StoredWeatherRegion | null) => {
    setRegion(next);
    invalidateWeatherCache();
    setQuery('');
  };

  const applyDong = (pathLabel: string, leaf: WeatherLeaf) => {
    applyRegion({ label: `${pathLabel} ${leaf.name}`, latitude: leaf.latitude, longitude: leaf.longitude });
  };

  const applyAuto = () => applyRegion(null);

  // 즐겨찾기 칸: 비어있으면 지금 지역을 저장, 채워져 있으면 그 지역으로 바로 전환.
  const handleFavoritePress = (slot: WeatherFavoriteSlot) => {
    if (slot.region) {
      applyRegion(slot.region);
      return;
    }
    if (!region) {
      showAlert({ title: '자동(GPS) 위치는 저장할 수 없어요', message: '먼저 지역을 직접 선택한 뒤 즐겨찾기에 저장해주세요.' });
      return;
    }
    saveToSlot(slot.id, region);
  };

  const handleFavoriteOverwrite = (slot: WeatherFavoriteSlot) => {
    if (!region) {
      showAlert({ title: '자동(GPS) 위치는 저장할 수 없어요', message: '먼저 지역을 직접 선택한 뒤 즐겨찾기에 저장해주세요.' });
      return;
    }
    saveToSlot(slot.id, region);
  };

  const handleFavoriteDelete = (slot: WeatherFavoriteSlot) => {
    showAlert({
      title: `'${slot.label}' 칸 삭제`,
      message: '즐겨찾기 칸 자체를 목록에서 지울까요?',
      buttons: [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => removeSlot(slot.id) },
      ],
    });
  };

  const openAddSlotModal = () => setLabelModal({ mode: 'add', draft: '' });
  const openRenameModal = (slot: WeatherFavoriteSlot) =>
    setLabelModal({ mode: 'rename', slotId: slot.id, draft: slot.label });

  const confirmLabelModal = () => {
    if (!labelModal) return;
    const trimmed = labelModal.draft.trim();
    if (!trimmed) return;
    if (labelModal.mode === 'add') addSlot(trimmed);
    else if (labelModal.slotId) renameSlot(labelModal.slotId, trimmed);
    setLabelModal(null);
  };

  // 로컬 데이터(트리) 안에서 실시간으로 매칭되는 동/구 이름을 찾아 즉시 보여준다 —
  // 네트워크 없이 타이핑하는 즉시 뜨는 결과. 여기 없는 동네는 검색 버튼으로 실제 지오코딩.
  const localHits = useMemo<SearchHit[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const hits: SearchHit[] = [];
    for (const province of WEATHER_REGION_TREE) {
      if (province.districts) {
        for (const dist of province.districts) {
          if (dist.name.includes(q)) {
            hits.push({ label: `${province.name} ${dist.name}`, latitude: dist.latitude, longitude: dist.longitude });
          }
          for (const dg of dist.dongs) {
            if (dg.name.includes(q)) {
              hits.push({
                label: `${province.name} ${dist.name} ${dg.name}`,
                latitude: dg.latitude,
                longitude: dg.longitude,
              });
            }
          }
        }
      }
      if (province.dongs) {
        for (const dg of province.dongs) {
          if (dg.name.includes(q)) {
            hits.push({ label: `${province.name} ${dg.name}`, latitude: dg.latitude, longitude: dg.longitude });
          }
        }
      }
    }
    return hits.slice(0, 8);
  }, [query]);

  const handleSelectHit = (hit: SearchHit) => {
    applyRegion({ label: hit.label, latitude: hit.latitude, longitude: hit.longitude });
  };

  // 로컬 데이터에 없는 동네는 실제 지오코딩으로 찾는다(기존 검색 기능 그대로 유지).
  const handleSearchSubmit = async () => {
    const trimmed = query.trim();
    if (!trimmed || searching) return;
    if (localHits.length > 0) {
      handleSelectHit(localHits[0]);
      return;
    }
    setSearching(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert({ title: '위치 권한이 필요해요', message: '동/구 검색을 사용하려면 위치 권한을 허용해주세요.' });
        return;
      }
      const results = await Location.geocodeAsync(trimmed);
      if (results.length === 0) {
        showAlert({ title: '위치를 찾지 못했어요', message: '다른 동/구 이름으로 다시 검색해주세요.' });
        return;
      }
      applyRegion({ label: trimmed, latitude: results[0].latitude, longitude: results[0].longitude });
    } catch {
      showAlert({ title: '검색 중 문제가 발생했어요', message: '잠시 후 다시 시도해주세요.' });
    } finally {
      setSearching(false);
    }
  };

  // "대전 서구 둔산동"처럼 공백으로 이어진 라벨을 "대전 서구"(작게) + "둔산동"(크게)로
  // 나눠서 미리보기 카드에 위계감 있게 보여준다 — 한 줄로 뭉쳐 보이던 걸 개선.
  const previewLabelParts = useMemo(() => {
    const words = displayLabel.trim().split(/\s+/);
    if (words.length <= 1) return { path: '', leaf: displayLabel };
    return { path: words.slice(0, -1).join(' '), leaf: words[words.length - 1] };
  }, [displayLabel]);

  const openProvince = WEATHER_REGION_TREE[openProvinceIdx];
  const openDistrict =
    openProvince.districts && openDistrictIdx !== null ? openProvince.districts[openDistrictIdx] : null;

  const breadcrumb = [openProvince.name, openDistrict?.name].filter(Boolean).join(' ');

  return (
    <View style={styles.screenBg}>
      <Stack.Screen
        options={{
          title: '날씨 지역 설정',
          headerStyle: { backgroundColor: t.bg },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBackButton}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={t.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.subtitle}>
            홈 화면에 표시할 동네를 설정합니다. 세부 동 단위까지 선택할 수 있어요.
          </Text>

          {/* 검색창 */}
          <View style={styles.searchRow}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="동/구 이름 검색 (예: 배곧동, 분당구)"
              placeholderTextColor={colors.textSecondary}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color={colors.accent} style={styles.searchSpinner} />}
          </View>
          {localHits.length > 0 && (
            <View style={styles.searchResultsCard}>
              {localHits.map((hit) => (
                <Pressable key={hit.label} style={styles.searchResultRow} onPress={() => handleSelectHit(hit)}>
                  <MaterialCommunityIcons name="map-marker-outline" size={15} color={colors.textSecondary} />
                  <Text style={styles.searchResultText}>{hit.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* 현재 설정된 지역 + 실시간 미리보기 */}
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewCard}
          >
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>{region ? '선택된 지역' : 'GPS 위치 사용 중'}</Text>
            </View>
            <View style={styles.previewBottomRow}>
              <View style={styles.previewLabelBlock}>
                {previewLabelParts.path ? (
                  <Text style={styles.previewLabelPath} numberOfLines={1}>
                    {previewLabelParts.path}
                  </Text>
                ) : null}
                <Text style={styles.previewLabelLeaf} numberOfLines={1}>
                  {previewLabelParts.leaf}
                </Text>
              </View>
              {previewLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : preview ? (
                <View style={styles.previewWeather}>
                  <Text style={styles.previewEmoji}>{preview.emoji}</Text>
                  <View>
                    <Text style={styles.previewTemp}>{preview.tempC}°</Text>
                    <Text style={styles.previewCondition}>{preview.label}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.previewCondition}>날씨를 불러오지 못했어요</Text>
              )}
            </View>
          </LinearGradient>

          {/* GPS 자동 설정 */}
          <Pressable style={styles.gpsCard} onPress={applyAuto}>
            <View style={styles.gpsIconBadge}>
              <MaterialCommunityIcons name="navigation-variant-outline" size={18} color={colors.accent} />
            </View>
            <View style={styles.gpsTextArea}>
              <Text style={styles.gpsTitle}>자동 (기기 위치/GPS 사용)</Text>
              <Text style={styles.gpsSubtitle}>내 위치 기반 실시간 날씨 자동 조회</Text>
            </View>
            {region === null ? (
              <Pressable
                onPress={() => setGpsRefreshTick((v) => v + 1)}
                hitSlop={8}
                style={styles.gpsRefreshButton}
              >
                <MaterialCommunityIcons name="refresh" size={18} color={colors.accent} />
              </Pressable>
            ) : (
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
            )}
          </Pressable>

          {/* 3단계 지역 피커 */}
          <View style={styles.pickerCard}>
            <View style={styles.pickerTopRow}>
              <Text style={styles.pickerTitle}>지역 단계별 선택</Text>
              <View style={styles.breadcrumbPill}>
                <Text style={styles.breadcrumbText} numberOfLines={1}>{breadcrumb}</Text>
              </View>
            </View>

            <Pressable
              style={styles.stepLabelRow}
              onPress={() => setProvinceCollapsed((v) => !v)}
              hitSlop={6}
            >
              <Text style={[styles.stepLabel, { marginBottom: 0 }]}>1단계: 시/도</Text>
              <View style={styles.stepCollapseHint}>
                {provinceCollapsed && (
                  <Text style={styles.stepCollapseHintText}>{openProvince.name}</Text>
                )}
                <MaterialCommunityIcons
                  name={provinceCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={16}
                  color={colors.textSecondary}
                />
              </View>
            </Pressable>
            {!provinceCollapsed && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {WEATHER_REGION_TREE.map((province, idx) => {
                    const isOpen = idx === openProvinceIdx;
                    return (
                      <Pressable
                        key={province.name}
                        style={[styles.provinceChip, isOpen && styles.provinceChipActive]}
                        onPress={() => {
                          setOpenProvinceIdx(idx);
                          setOpenDistrictIdx(province.districts ? 0 : null);
                        }}
                      >
                        <Text style={[styles.provinceChipText, isOpen && styles.provinceChipTextActive]}>
                          {province.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {openProvince.districts && (
              <>
                <View style={styles.stepDivider} />
                <Text style={styles.stepLabel}>2단계: 시/군/구</Text>
                <View style={styles.districtWrap}>
                  {openProvince.districts.map((dist, idx) => {
                    const isOpen = idx === openDistrictIdx;
                    return (
                      <Pressable
                        key={dist.name}
                        style={[styles.districtChip, isOpen && styles.districtChipActive]}
                        onPress={() => setOpenDistrictIdx(idx)}
                      >
                        <Text style={[styles.districtChipText, isOpen && styles.districtChipTextActive]}>
                          {dist.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <View style={styles.stepDivider} />
            <Text style={styles.stepLabel}>3단계: 읍/면/동 선택</Text>
            <View style={styles.dongGrid}>
              {(openDistrict?.dongs ?? openProvince.dongs ?? []).map((leaf) => {
                const isSelected = displayLabel === `${breadcrumb} ${leaf.name}`;
                return (
                  <Pressable
                    key={leaf.name}
                    style={[styles.dongCard, isSelected && styles.dongCardActive]}
                    onPress={() => applyDong(breadcrumb, leaf)}
                  >
                    <Text style={[styles.dongCardText, isSelected && styles.dongCardTextActive]} numberOfLines={1}>
                      {leaf.name}
                    </Text>
                    {isSelected && <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 즐겨찾기 */}
          <View style={styles.favoritesCard}>
            <View style={styles.favoritesTopRow}>
              <Text style={styles.pickerTitle}>자주 찾는 동네</Text>
              <Pressable onPress={openAddSlotModal} hitSlop={8} style={styles.favoriteAddButton}>
                <MaterialCommunityIcons name="plus" size={16} color={colors.accent} />
                <Text style={styles.favoriteAddButtonText}>칸 추가</Text>
              </Pressable>
            </View>
            {slots.map((slot) => (
              <View key={slot.id} style={styles.favoriteRow}>
                <Pressable style={styles.favoriteMain} onPress={() => handleFavoritePress(slot)}>
                  <MaterialCommunityIcons
                    name={slot.region ? 'star' : 'star-outline'}
                    size={18}
                    color={slot.region ? '#F59E0B' : colors.textSecondary}
                  />
                  <Text style={styles.favoriteLabel}>{slot.label}</Text>
                  <Text style={styles.favoriteValue} numberOfLines={1}>
                    {slot.region ? slot.region.label : '지금 지역을 여기에 저장'}
                  </Text>
                </Pressable>
                {slot.region && favoriteTemps[slot.id] != null && (
                  <Text style={styles.favoriteTemp}>{favoriteTemps[slot.id]}°</Text>
                )}
                {slot.region && (
                  <Pressable onPress={() => handleFavoriteOverwrite(slot)} hitSlop={8} style={styles.favoriteEditButton}>
                    <MaterialCommunityIcons name="refresh" size={14} color={colors.textSecondary} />
                  </Pressable>
                )}
                <Pressable onPress={() => openRenameModal(slot)} hitSlop={8} style={styles.favoriteEditButton}>
                  <MaterialCommunityIcons name="pencil-outline" size={14} color={colors.textSecondary} />
                </Pressable>
                <Pressable onPress={() => handleFavoriteDelete(slot)} hitSlop={8} style={styles.favoriteEditButton}>
                  <MaterialCommunityIcons name="trash-can-outline" size={14} color={colors.tomorrowRed} />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* 즐겨찾기 칸 추가/이름 변경 모달 */}
      <Modal visible={!!labelModal} animationType="fade" transparent onRequestClose={() => setLabelModal(null)}>
        <KeyboardAvoidingView
          style={styles.labelModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.labelModalCard}>
            <Text style={styles.labelModalTitle}>
              {labelModal?.mode === 'add' ? '새 즐겨찾기 칸' : '이름 바꾸기'}
            </Text>
            <TextInput
              style={styles.labelModalInput}
              value={labelModal?.draft ?? ''}
              onChangeText={(text) => setLabelModal((prev) => (prev ? { ...prev, draft: text } : prev))}
              placeholder="예: 할머니댁, 유치원"
              placeholderTextColor={colors.textSecondary}
              maxLength={10}
              autoFocus
            />
            {labelModal?.mode === 'add' && (
              <View style={styles.labelPresetRow}>
                {['집', '회사', '학교', '기타'].map((preset) => (
                  <Pressable
                    key={preset}
                    style={styles.labelPresetChip}
                    onPress={() => setLabelModal((prev) => (prev ? { ...prev, draft: preset } : prev))}
                  >
                    <Text style={styles.labelPresetChipText}>{preset}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <View style={styles.labelModalActions}>
              <Pressable style={styles.labelModalCancel} onPress={() => setLabelModal(null)}>
                <Text style={styles.labelModalCancelText}>취소</Text>
              </Pressable>
              <Pressable style={styles.labelModalConfirm} onPress={confirmLabelModal}>
                <Text style={styles.labelModalConfirmText}>
                  {labelModal?.mode === 'add' ? '추가' : '저장'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screenBg: { flex: 1, backgroundColor: t.bg },
    headerBackButton: { paddingHorizontal: 4 },
    safeArea: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48, gap: 16 },
    subtitle: {
      fontSize: 12.5,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: -4,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      paddingHorizontal: 14,
      ...SHADOW,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 14,
      color: colors.textPrimary,
    },
    searchSpinner: { marginLeft: 6 },
    searchResultsCard: {
      backgroundColor: colors.cardWhite,
      borderRadius: 14,
      overflow: 'hidden',
      marginTop: -8,
      ...SHADOW,
    },
    searchResultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchResultText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    previewCard: {
      borderRadius: 24,
      padding: 20,
      ...SHADOW,
      shadowOpacity: 0.2,
      shadowColor: '#2563EB',
    },
    previewBadge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 12,
    },
    previewBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
    previewBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 56,
    },
    previewLabelBlock: { flex: 1, marginRight: 12 },
    previewLabelPath: {
      fontSize: 12.5,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.75)',
      marginBottom: 2,
    },
    previewLabelLeaf: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    previewWeather: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    previewEmoji: { fontSize: 30 },
    previewTemp: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'right' },
    previewCondition: { fontSize: 11.5, fontWeight: '600', color: 'rgba(255,255,255,0.85)', textAlign: 'right' },
    gpsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.cardWhite,
      borderRadius: 18,
      padding: 16,
      ...SHADOW,
    },
    gpsIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.lightBlueBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gpsTextArea: { flex: 1 },
    gpsRefreshButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.lightBlueBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gpsTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    gpsSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    pickerCard: {
      backgroundColor: colors.cardWhite,
      borderRadius: 22,
      padding: 18,
      ...SHADOW,
    },
    pickerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    pickerTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
    breadcrumbPill: {
      maxWidth: '55%',
      backgroundColor: colors.lightBlueBg,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    breadcrumbText: { fontSize: 11.5, fontWeight: '700', color: colors.accent },
    stepLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
    stepLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    stepCollapseHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    stepCollapseHintText: { fontSize: 12.5, fontWeight: '700', color: colors.accent },
    stepDivider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
    chipScroll: { marginHorizontal: -4 },
    chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
    provinceChip: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: colors.gray100,
    },
    provinceChipActive: { backgroundColor: colors.accent },
    provinceChipText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    provinceChipTextActive: { color: '#FFFFFF' },
    districtWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    districtChip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: colors.gray50,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    districtChipActive: {
      backgroundColor: colors.lightBlueBg,
      borderColor: colors.accent,
    },
    districtChipText: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },
    districtChipTextActive: { color: colors.accent, fontWeight: '800' },
    dongGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    dongCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '47%',
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.gray50,
    },
    dongCardActive: { backgroundColor: colors.accent },
    dongCardText: { fontSize: 13.5, fontWeight: '700', color: colors.textPrimary },
    dongCardTextActive: { color: '#FFFFFF' },
    favoritesCard: {
      backgroundColor: colors.cardWhite,
      borderRadius: 22,
      padding: 18,
      gap: 4,
      ...SHADOW,
    },
    favoritesTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    favoriteAddButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.lightBlueBg,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    favoriteAddButtonText: { fontSize: 11.5, fontWeight: '700', color: colors.accent },
    favoriteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    favoriteMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minWidth: 0,
    },
    favoriteLabel: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
    favoriteValue: { flex: 1, fontSize: 12.5, fontWeight: '500', color: colors.textSecondary },
    favoriteTemp: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginLeft: 8 },
    favoriteEditButton: {
      marginLeft: 6,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.gray100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    labelModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15,18,17,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    labelModalCard: {
      width: '100%',
      backgroundColor: colors.cardWhite,
      borderRadius: 24,
      padding: 22,
    },
    labelModalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 14 },
    labelModalInput: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    labelPresetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    labelPresetChip: {
      backgroundColor: colors.gray100,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    labelPresetChipText: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
    labelModalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    labelModalCancel: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 14,
      backgroundColor: colors.gray100,
      alignItems: 'center',
    },
    labelModalCancelText: { fontSize: 14.5, fontWeight: '700', color: colors.textSecondary },
    labelModalConfirm: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: 'center',
    },
    labelModalConfirmText: { fontSize: 14.5, fontWeight: '700', color: '#FFFFFF' },
  });
}
