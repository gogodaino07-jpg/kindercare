import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { ZoomableImage } from '../../features/newsletter-analysis/components/ZoomableImage';
import { getDisplayItems } from '../../hooks/useLocalChecklist';
import { EventDateGroup } from '../../hooks/useUpcomingEvents';
import { Event, EventItem } from '../../types/models';
import { formatMD, parseISODate, startOfDay, toISODate } from '../../utils/date';
import { openCoupangSearch } from '../../utils/coupang';
import { getSpecialEventTheme } from '../../utils/specialEventTheme';
import { isValidCoupangKeyword } from '../../utils/validation';
import Text from '../common/AppText';
import EventIcon from '../common/EventIcon';

export type ScheduleTab = 'today' | 'tomorrow' | 'dayAfterTomorrow';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_ZOOM_WIDTH = SCREEN_WIDTH - 80;
const PHOTO_ZOOM_HEIGHT = 380;

interface ScheduleBoardProps {
  mainEvents: Event[];
  secondaryEvents: Event[];
  laterGroups: EventDateGroup[];
  activeTab: ScheduleTab;
  onChangeTab: (tab: ScheduleTab) => void;
  onEventPress: (event: Event) => void;
  onToggleItem: (event: Event, item: EventItem) => void;
  onToggleAll: (event: Event, items: EventItem[], value: boolean) => void;
}

/** Blends a hex color toward white by `amount` (0-1) to make it a paler shade. */
function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * 뱃지/헤더 배경을 만들 때 라이트모드에서는 흰색쪽으로 밝히고(lighten), 다크모드에서는
 * 반대로 원색을 옅은 투명도로 얹어 어두운 배경 위에 은은하게 톤을 낮춘 색으로 만든다.
 * (lighten만 쓰면 다크모드에서 항상 밝은 크림색 패치가 튀어나와 부자연스러웠음)
 */
function tint(hex: string, amount: number, isDark: boolean): string {
  if (isDark) {
    const alpha = Math.round((1 - amount) * 255 * 2)
      .toString(16)
      .padStart(2, '0');
    return `${hex}${alpha}`;
  }
  return lighten(hex, amount);
}

/** "D-3" for future dates, "D-DAY" for today, "D+2" for past dates. */
function computeDday(dateISO: string): string {
  const diffDays = Math.round(
    (parseISODate(dateISO).getTime() - startOfDay(new Date()).getTime()) / 86400000
  );
  if (diffDays === 0) return 'D-DAY';
  if (diffDays > 0) return `D-${diffDays}`;
  return `D+${Math.abs(diffDays)}`;
}

function getCategoryVisual(category: string | undefined, colors: ThemeColors) {
  switch (category) {
    case '특별활동':
      return { icon: 'restaurant' as const, bg: colors.pastelBlue, accent: colors.pastelBlueAccent };
    case '행사':
      return { icon: 'event' as const, bg: colors.pastelPink, accent: colors.pastelPinkAccent };
    case '공지':
      return { icon: 'campaign' as const, bg: colors.gray100, accent: colors.gray500 };
    case '휴원/방학':
      return { icon: 'event-busy' as const, bg: colors.purpleBg, accent: colors.purple500 };
    case '준비물':
    default:
      return { icon: 'inventory-2' as const, bg: colors.pastelOrange, accent: colors.pastelOrangeAccent };
  }
}

interface CombinedRow {
  event: Event;
  dateCategory: 'today' | 'tomorrow' | 'dayAfterTomorrow' | 'upcoming';
  dateText: string;
}

export default function ScheduleBoard({
  mainEvents,
  secondaryEvents,
  laterGroups,
  activeTab,
  onChangeTab,
  onEventPress,
  onToggleItem,
  onToggleAll,
}: ScheduleBoardProps) {
  const router = useRouter();
  const { colors, resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [viewerPhotos, setViewerPhotos] = useState<string[] | null>(null);

  const dayAfterTomorrowISO = useMemo(() => toISODate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)), []);

  const combined = useMemo<CombinedRow[]>(() => {
    const rows: CombinedRow[] = [];
    for (const event of mainEvents) {
      rows.push({ event, dateCategory: 'today', dateText: `오늘 ${formatMD(event.date)}` });
    }
    for (const event of secondaryEvents) {
      rows.push({ event, dateCategory: 'tomorrow', dateText: `내일 ${formatMD(event.date)}` });
    }
    for (const group of laterGroups) {
      const dateCategory = group.date === dayAfterTomorrowISO ? 'dayAfterTomorrow' : 'upcoming';
      for (const event of group.events) {
        rows.push({ event, dateCategory, dateText: formatMD(group.date) });
      }
    }
    return rows;
  }, [mainEvents, secondaryEvents, laterGroups, dayAfterTomorrowISO]);

  const dayAfterTomorrowCount = useMemo(
    () => laterGroups.find((g) => g.date === dayAfterTomorrowISO)?.events.length ?? 0,
    [laterGroups, dayAfterTomorrowISO]
  );

  const filtered = combined.filter((row) => {
    if (activeTab === 'today') return row.dateCategory === 'today';
    if (activeTab === 'tomorrow') return row.dateCategory === 'tomorrow';
    return row.dateCategory === 'dayAfterTomorrow';
  });

  const TABS: { key: ScheduleTab; label: string }[] = [
    { key: 'today', label: `오늘 (${mainEvents.length})` },
    { key: 'tomorrow', label: `내일 (${secondaryEvents.length})` },
    { key: 'dayAfterTomorrow', label: `모레 (${dayAfterTomorrowCount})` },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="calendar-today" size={17} color={colors.peachOrangeDeep} />
          <Text style={styles.headerTitle}>알림장 일정 & 준비물</Text>
        </View>
        <Pressable onPress={() => router.push('/upload')}>
          <LinearGradient
            colors={['#6366F1', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.scanButton}
          >
            <Text style={styles.scanButtonIcon}>✨</Text>
            <Text style={styles.scanButtonText}>AI 스캔</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => onChangeTab(tab.key)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.seeAllRow} onPress={() => router.push('/calendar')}>
        <Text style={styles.seeAllText}>전체 일정 보기 ›</Text>
      </Pressable>

      {filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🏝️</Text>
          <Text style={styles.emptyTitle}>이 날은 특별한 일정이 없어요</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map(({ event, dateText }) => (
            <ScheduleCard
              key={event.id}
              event={event}
              dateText={dateText}
              colors={colors}
              styles={styles}
              isDark={isDark}
              isSoleCard={filtered.length === 1}
              onPress={() => onEventPress(event)}
              onToggleItem={onToggleItem}
              onToggleAll={onToggleAll}
              onOpenPhotos={setViewerPhotos}
            />
          ))}
        </View>
      )}

      <Modal
        visible={!!viewerPhotos}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerPhotos(null)}
      >
        {/* RN Modal은 안드로이드에서 별도 네이티브 윈도우에 렌더링돼 앱 루트의
            GestureHandlerRootView 밖에 놓이면서 핀치줌/팬 제스처가 먹지 않는다 —
            Modal 내부에 별도로 하나 더 씌워줘야 제스처가 정상 동작한다. */}
        <GestureHandlerRootView style={styles.zoomOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setViewerPhotos(null)} />
          <View style={styles.zoomCard}>
            <View style={styles.zoomHeader}>
              <View style={styles.zoomHeaderLeft}>
                <MaterialIcons name="image" size={16} color={colors.purple500} />
                <Text style={styles.zoomHeaderText}>스캔한 원본 사진</Text>
              </View>
              <Pressable onPress={() => setViewerPhotos(null)} style={styles.zoomCloseButton} hitSlop={6}>
                <MaterialIcons name="close" size={16} color={colors.gray500} />
              </Pressable>
            </View>

            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {(viewerPhotos ?? []).map((uri) => (
                <ZoomableImage key={uri} uri={uri} width={PHOTO_ZOOM_WIDTH} height={PHOTO_ZOOM_HEIGHT} />
              ))}
            </ScrollView>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

function ScheduleCard({
  event,
  dateText,
  colors,
  styles,
  isDark,
  isSoleCard,
  onPress,
  onToggleItem,
  onToggleAll,
  onOpenPhotos,
}: {
  event: Event;
  dateText: string;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  isDark: boolean;
  /** 현재 탭에 카드가 이 1건뿐일 때 — 아래 남는 여백을 활용해 메타 텍스트를 잘라내지 않고 다 보여준다. */
  isSoleCard: boolean;
  onPress: () => void;
  onToggleItem: (event: Event, item: EventItem) => void;
  onToggleAll: (event: Event, items: EventItem[], value: boolean) => void;
  onOpenPhotos: (photoUris: string[]) => void;
}) {
  const items = getDisplayItems(event);
  const checkedCount = items.filter((i) => i.completed).length;
  const allDone = items.length > 0 && checkedCount === items.length;
  const category = getCategoryVisual(event.category, colors);
  const isToday = computeDday(event.date) === 'D-DAY';
  const metaLine = [event.time, event.location].filter(Boolean).join(' · ');
  const specialTheme = getSpecialEventTheme(event.title);
  const photoUris = event.photoUris ?? [];

  return (
    <View style={[styles.card, isToday && styles.cardToday]}>
      {specialTheme ? (
        <LinearGradient
          colors={specialTheme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.specialHeader}
        >
          <View style={styles.cardHeaderLeft}>
            {isToday && (
              <View style={styles.ddayBadgeOnDark}>
                <Text style={styles.ddayBadgeTextOnDark}>D-DAY</Text>
              </View>
            )}
            <Text style={styles.dateTextOnDark}>{dateText}</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            {photoUris.length > 0 && (
              <Pressable onPress={() => onOpenPhotos(photoUris)} style={styles.photoBadgeOnDark} hitSlop={6}>
                <MaterialIcons name="image" size={13} color="#FFFFFF" />
              </Pressable>
            )}
            <View style={styles.specialLabelPill}>
              <Text style={styles.specialLabelPillText}>{specialTheme.emoji} {specialTheme.label}</Text>
            </View>
          </View>
        </LinearGradient>
      ) : (
        <View style={[styles.cardHeaderRow, isToday && styles.cardHeaderRowToday]}>
          <View style={styles.cardHeaderLeft}>
            {isToday && (
              <View style={styles.ddayBadge}>
                <Text style={styles.ddayBadgeText}>D-DAY</Text>
              </View>
            )}
            <Text style={[styles.dateText, isToday && styles.dateTextToday]}>{dateText}</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            {photoUris.length > 0 && (
              <Pressable onPress={() => onOpenPhotos(photoUris)} style={styles.photoBadge} hitSlop={6}>
                <MaterialIcons name="image" size={13} color={colors.purple500} />
              </Pressable>
            )}
            {event.category && (
              <View style={[styles.categoryBadge, { backgroundColor: tint(category.accent, 0.85, isDark) }]}>
                <Text style={[styles.categoryBadgeText, { color: category.accent }]}>{event.category}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {specialTheme && (
        <LinearGradient
          colors={specialTheme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.specialMessageBlock}
        >
          <Text style={styles.specialMessageText}>{specialTheme.message}</Text>
        </LinearGradient>
      )}

      <Pressable onPress={onPress} style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.iconCircle, { backgroundColor: tint(specialTheme ? specialTheme.gradient[0] : category.accent, 0.85, isDark) }]}>
            {specialTheme ? <Text style={styles.specialIconEmoji}>{specialTheme.emoji}</Text> : <EventIcon icon={event.icon} size={22} />}
          </View>
          <View style={styles.cardTitleTextBlock}>
            <Text style={styles.cardTitle} numberOfLines={1}>{event.title}</Text>
            {!!metaLine && (
              <Text style={styles.cardMeta} numberOfLines={isSoleCard ? undefined : 1}>
                {metaLine}
              </Text>
            )}
          </View>
          {items.length > 0 && (
            <Pressable
              onPress={() => onToggleAll(event, items, !allDone)}
              style={[styles.allDoneButton, allDone && styles.allDoneButtonActive]}
              hitSlop={8}
            >
              <MaterialIcons
                name={allDone ? 'check-circle' : 'radio-button-unchecked'}
                size={22}
                color={allDone ? colors.green500 : colors.gray400}
              />
              <Text style={[styles.allDoneButtonText, allDone && styles.allDoneButtonTextActive]}>
                {allDone ? '완료' : '확인필요'}
              </Text>
            </Pressable>
          )}
        </View>

        {event.noticeText ? (
          <View style={styles.noticeBox}>
            <MaterialIcons name="info-outline" size={14} color={colors.gray500} style={styles.noticeIcon} />
            <Text style={styles.noticeText}>{event.noticeText}</Text>
          </View>
        ) : null}
      </Pressable>

      {items.length > 0 && (
        <View style={styles.itemsBlock}>
          <View style={styles.itemsLabelRow}>
            <View style={styles.itemsLabelLeft}>
              <MaterialIcons name="check" size={14} color={colors.green500} />
              <Text style={styles.itemsLabel}>세부 체크리스트 ({checkedCount}/{items.length})</Text>
            </View>
            <Text style={styles.itemsHint}>클릭하여 체크</Text>
          </View>
          {items.map((item) => {
            const checked = !!item.completed;
            return (
              <Pressable
                key={item.id}
                onPress={() => onToggleItem(event, item)}
                style={[styles.itemRow, checked && styles.itemRowChecked]}
              >
                <MaterialIcons
                  name={checked ? 'check-box' : 'check-box-outline-blank'}
                  size={18}
                  color={checked ? colors.green500 : colors.gray400}
                />
                <Text style={[styles.itemText, checked && styles.itemTextChecked]}>{item.name}</Text>
                {!checked && isValidCoupangKeyword(item.name) && (
                  <Pressable
                    style={styles.buyButton}
                    hitSlop={6}
                    onPress={() => openCoupangSearch(item.name)}
                  >
                    <Text style={styles.buyButtonText}>구매하기</Text>
                  </Pressable>
                )}
                <View style={[styles.itemStatusPill, checked ? styles.itemStatusPillDone : styles.itemStatusPillTodo]}>
                  <Text style={[styles.itemStatusPillText, checked ? styles.itemStatusPillTextDone : styles.itemStatusPillTextTodo]}>
                    {checked ? '챙김 완료' : '준비 필요'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: { marginTop: 20, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    headerTitle: { fontSize: 16, fontWeight: '800', color: colors.gray900, letterSpacing: -0.4 },
    scanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
    },
    scanButtonIcon: { fontSize: 13 },
    scanButtonText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
    tabRow: { flexDirection: 'row', backgroundColor: colors.gray100, padding: 4, borderRadius: 14, marginBottom: 8, gap: 4 },
    seeAllRow: { alignItems: 'flex-end', marginBottom: 12 },
    seeAllText: { fontSize: 12.5, fontWeight: '700', color: colors.purple500 },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 8,
      borderRadius: 10,
    },
    tabButtonActive: { backgroundColor: colors.cardWhite, ...SHADOW, shadowOpacity: 0.08, elevation: 2 },
    tabButtonText: { fontSize: 12.5, fontWeight: '700', color: colors.gray500 },
    tabButtonTextActive: { color: colors.gray900 },
    list: { gap: 12 },
    card: {
      backgroundColor: colors.cardWhite,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...SHADOW,
      shadowOpacity: 0.05,
      elevation: 2,
    },
    cardToday: { borderColor: colors.pastelOrangeAccent, borderWidth: 1.5 },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: colors.gray50,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    cardHeaderRowToday: { backgroundColor: tint('#F97316', 0.9, isDark) },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    photoBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.purpleBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoBadgeOnDark: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ddayBadge: { backgroundColor: colors.tomorrowRed, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    ddayBadgeText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.3 },
    dateText: { fontSize: 12, fontWeight: '700', color: colors.gray600 },
    dateTextToday: { color: colors.pastelOrangeAccent },
    categoryBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
    categoryBadgeText: { fontSize: 11, fontWeight: '800' },
    specialHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    ddayBadgeOnDark: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    ddayBadgeTextOnDark: { fontSize: 10, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.3 },
    dateTextOnDark: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
    specialLabelPill: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    specialLabelPillText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
    specialMessageBlock: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 2 },
    specialMessageText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
    specialIconEmoji: { fontSize: 22 },
    cardBody: { padding: 14 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconCircle: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    cardTitleTextBlock: { flex: 1, minWidth: 0 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: colors.gray900 },
    cardMeta: { fontSize: 12, color: colors.gray500, fontWeight: '600', marginTop: 2 },
    allDoneButton: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingVertical: 6,
      paddingHorizontal: 8,
      minWidth: 64,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.gray50,
    },
    allDoneButtonActive: { backgroundColor: colors.green50, borderColor: colors.green500 },
    allDoneButtonText: { fontSize: 10, fontWeight: '700', color: colors.gray500 },
    allDoneButtonTextActive: { color: colors.green500 },
    noticeBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      marginTop: 10,
      backgroundColor: colors.gray50,
      borderRadius: 10,
      padding: 10,
    },
    noticeIcon: { marginTop: 1 },
    noticeText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
    itemsBlock: { paddingHorizontal: 14, paddingBottom: 14, gap: 6 },
    itemsLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
    itemsLabelLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    itemsLabel: { fontSize: 11.5, fontWeight: '700', color: colors.gray500 },
    itemsHint: { fontSize: 10.5, color: colors.gray400, fontWeight: '600' },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.gray50,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    itemRowChecked: { backgroundColor: colors.green50 },
    itemText: { fontSize: 13, fontWeight: '600', color: colors.gray900, flex: 1 },
    itemTextChecked: { color: colors.gray500, textDecorationLine: 'line-through' },
    buyButton: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: colors.purpleBg,
      marginRight: 6,
    },
    buyButtonText: { fontSize: 10, fontWeight: '800', color: colors.purple500 },
    itemStatusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    itemStatusPillTodo: { backgroundColor: tint(colors.pastelOrangeAccent, 0.85, isDark) },
    itemStatusPillDone: { backgroundColor: tint(colors.green500, 0.85, isDark) },
    itemStatusPillText: { fontSize: 10, fontWeight: '800' },
    itemStatusPillTextTodo: { color: colors.pastelOrangeAccent },
    itemStatusPillTextDone: { color: colors.green500 },
    emptyCard: {
      backgroundColor: colors.gray50,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      paddingVertical: 28,
      alignItems: 'center',
    },
    emptyEmoji: { fontSize: 28, marginBottom: 8 },
    emptyTitle: { fontSize: 13, fontWeight: '700', color: colors.gray600 },
    zoomOverlay: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.8)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    zoomCard: {
      width: '100%',
      maxHeight: '85%',
      backgroundColor: colors.cardWhite,
      borderRadius: 32,
      padding: 20,
      gap: 12,
    },
    zoomHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.gray100,
      paddingBottom: 10,
    },
    zoomHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    zoomHeaderText: { fontSize: 13, fontWeight: '900', color: colors.textPrimary },
    zoomCloseButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.gray100,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
