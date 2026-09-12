import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { getDisplayItems } from '../../hooks/useLocalChecklist';
import { EventDateGroup } from '../../hooks/useUpcomingEvents';
import { Child, Event, EventItem } from '../../types/models';
import { formatMD, parseISODate, startOfDay, toISODate } from '../../utils/date';
import { openCoupangSearch } from '../../utils/coupang';
import { getSpecialEventTheme } from '../../utils/specialEventTheme';
import { isValidCoupangKeyword } from '../../utils/validation';
import Text from '../common/AppText';
import TextInput from '../common/ClearableTextInput';
import EventIcon from '../common/EventIcon';
import PhotoViewerModal from '../common/PhotoViewerModal';

export type ScheduleTab = 'today' | 'tomorrow' | 'dayAfterTomorrow';

interface ScheduleBoardProps {
  mainEvents: Event[];
  secondaryEvents: Event[];
  laterGroups: EventDateGroup[];
  activeTab: ScheduleTab;
  onChangeTab: (tab: ScheduleTab) => void;
  onEventPress: (event: Event) => void;
  onToggleItem: (event: Event, item: EventItem) => void;
  onToggleAll: (event: Event, items: EventItem[], value: boolean) => void;
  /** 선택된 아이 기준으로 이미 필터링된 mainEvents/secondaryEvents/laterGroups와 달리,
   *  "전체보기" 토글을 위해 등록된 모든 아이의 일정을 한꺼번에 봐야 해서 별도로 받는다. */
  allEvents: Event[];
  /** 무료 한도로 잠긴 아이는 호출부에서 미리 걸러서 넘겨준다(프로필 등록 순서 유지). */
  unlockedChildren: Child[];
}

interface ChildPrepSection {
  child: Child;
  entries: { event: Event; item: EventItem }[];
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
  allEvents,
  unlockedChildren,
}: ScheduleBoardProps) {
  const router = useRouter();
  const { colors, resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [viewerPhotos, setViewerPhotos] = useState<string[] | null>(null);
  // 아이가 2명 이상일 때만 의미가 있는 토글이라 기본은 항상 "선택된 아이 1명 보기"이고,
  // 화면을 벗어나면(재마운트되면) 그냥 이 초기값으로 돌아가면 되므로 별도 저장은 안 한다.
  const [showAllChildren, setShowAllChildren] = useState(false);
  const [coupangQuery, setCoupangQuery] = useState('');

  const todayISO = useMemo(() => toISODate(new Date()), []);
  const tomorrowISO = useMemo(() => toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000)), []);
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

  const isEmpty = filtered.length === 0;

  // "전체보기"는 지금 선택된 탭(오늘/내일/모레)이 가리키는 그 날짜 하나를 기준으로,
  // 등록된 모든(잠기지 않은) 아이의 그날 준비물을 아이별로 묶어서 보여준다.
  const activeTabDateISO =
    activeTab === 'today' ? todayISO : activeTab === 'tomorrow' ? tomorrowISO : dayAfterTomorrowISO;

  const childSections = useMemo<ChildPrepSection[]>(() => {
    return unlockedChildren
      .map((child) => {
        const childEvents = allEvents.filter((e) => e.childId === child.id && e.date === activeTabDateISO);
        const entries = childEvents.flatMap((event) =>
          getDisplayItems(event).map((item) => ({ event, item }))
        );
        return { child, entries };
      })
      .filter((section) => section.entries.length > 0);
  }, [unlockedChildren, allEvents, activeTabDateISO]);

  const canShowAllChildren = unlockedChildren.length > 1;
  const displayIsEmpty = showAllChildren && canShowAllChildren ? childSections.length === 0 : isEmpty;

  const handleCoupangSearch = () => {
    const query = coupangQuery.trim();
    if (!query) return;
    openCoupangSearch(query);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBlock, displayIsEmpty && styles.topBlockEmpty]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="calendar-today" size={17} color={colors.peachOrangeDeep} />
            <Text style={styles.headerTitle}>알림장 일정 & 준비물</Text>
          </View>
          <View style={styles.headerRight}>
            {canShowAllChildren && (
              <Pressable
                onPress={() => setShowAllChildren((v) => !v)}
                style={styles.moreButton}
                hitSlop={6}
              >
                <Text style={styles.moreButtonText}>{showAllChildren ? '1명 보기' : '전체보기'}</Text>
                <Feather name="chevron-right" size={14} color={colors.gray500} />
              </Pressable>
            )}
            {!displayIsEmpty && (
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
            )}
          </View>
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

        {displayIsEmpty ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🏝️</Text>
            <Text style={styles.emptyTitle}>이 날은 특별한 일정이 없어요</Text>
            <Text style={styles.emptySubtitle}>
              선생님이 보내주신 알림장이 있다면{'\n'}스캔해서 일정을 바로 등록해보세요
            </Text>
            <Pressable onPress={() => router.push('/upload')}>
              <LinearGradient
                colors={['#6366F1', '#9333EA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyScanButton}
              >
                <Text style={styles.emptyScanButtonIcon}>✨</Text>
                <Text style={styles.emptyScanButtonText}>AI로 알림장 스캔하기</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : showAllChildren && canShowAllChildren ? (
          <ScrollView style={styles.childScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <View style={styles.list}>
              {childSections.map(({ child, entries }) => (
                <ChildPrepSection
                  key={child.id}
                  child={child}
                  entries={entries}
                  colors={colors}
                  styles={styles}
                  onToggleItem={onToggleItem}
                />
              ))}
            </View>
          </ScrollView>
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
                onPress={() => onEventPress(event)}
                onToggleItem={onToggleItem}
                onToggleAll={onToggleAll}
                onOpenPhotos={setViewerPhotos}
              />
            ))}
          </View>
        )}

        <View style={styles.coupangSearchRow}>
          <TextInput
            style={styles.coupangSearchInput}
            value={coupangQuery}
            onChangeText={setCoupangQuery}
            placeholder="필요한 준비물을 검색해서 쿠팡으로"
            placeholderTextColor={colors.gray400}
            returnKeyType="search"
            onSubmitEditing={handleCoupangSearch}
          />
          <Pressable
            style={[styles.coupangSearchButton, !coupangQuery.trim() && styles.coupangSearchButtonDisabled]}
            onPress={handleCoupangSearch}
            disabled={!coupangQuery.trim()}
            hitSlop={6}
          >
            <Feather name="search" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.seeAllRow} onPress={() => router.push('/calendar')}>
        <View style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>전체 일정 보기</Text>
          <Feather name="chevron-right" size={16} color={colors.gray900} />
        </View>
      </Pressable>

      <PhotoViewerModal photos={viewerPhotos} onClose={() => setViewerPhotos(null)} />
    </View>
  );
}

function ScheduleCard({
  event,
  dateText,
  colors,
  styles,
  isDark,
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
    <View style={[styles.card, isToday && styles.cardToday, isToday && { borderColor: tint(category.accent, 0.45, isDark) }]}>
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
                <Feather name="image" size={13} color="#FFFFFF" />
              </Pressable>
            )}
            <View style={styles.specialLabelPill}>
              <Text style={styles.specialLabelPillText}>{specialTheme.emoji} {specialTheme.label}</Text>
            </View>
          </View>
        </LinearGradient>
      ) : (
        <View style={[styles.cardHeaderRow, isToday && { backgroundColor: tint(category.accent, 0.9, isDark) }]}>
          <View style={styles.cardHeaderLeft}>
            {isToday && (
              <View style={styles.ddayBadge}>
                <Text style={styles.ddayBadgeText}>D-DAY</Text>
              </View>
            )}
            <Text style={[styles.dateText, isToday && { color: category.accent }]}>{dateText}</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            {photoUris.length > 0 && (
              <Pressable onPress={() => onOpenPhotos(photoUris)} style={styles.photoBadge} hitSlop={6}>
                <Feather name="image" size={13} color={colors.purple500} />
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
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: tint(specialTheme ? specialTheme.gradient[0] : category.accent, 0.85, isDark) },
            ]}
          >
            {specialTheme ? (
              <Text style={styles.specialIconEmoji}>{specialTheme.emoji}</Text>
            ) : (
              <EventIcon icon={event.icon} size={22} />
            )}
          </View>
          <View style={styles.cardTitleTextBlock}>
            <Text style={styles.cardTitle} numberOfLines={1}>{event.title}</Text>
            {!!metaLine && (
              <Text style={styles.cardMeta} numberOfLines={1}>
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
          {items.map((item) => (
            <PrepItemRow
              key={item.id}
              event={event}
              item={item}
              colors={colors}
              styles={styles}
              onToggleItem={onToggleItem}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/** 체크박스 탭으로 개별 완료/해제하는 준비물 한 줄 — 오늘/내일/모레 탭의 일정 카드와
 *  "전체보기"의 아이별 섹션이 똑같은 인터랙션을 쓰도록 공용으로 뺐다. */
function PrepItemRow({
  event,
  item,
  colors,
  styles,
  onToggleItem,
}: {
  event: Event;
  item: EventItem;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  onToggleItem: (event: Event, item: EventItem) => void;
}) {
  const checked = !!item.completed;
  return (
    <Pressable
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
        <Pressable style={styles.buyButton} hitSlop={6} onPress={() => openCoupangSearch(item.name)}>
          <Text style={styles.buyButtonText}>구매하기</Text>
        </Pressable>
      )}
      <View style={[styles.itemStatusPill, checked ? styles.itemStatusPillDone : styles.itemStatusPillTodo]}>
        <Text
          style={[
            styles.itemStatusPillText,
            checked ? styles.itemStatusPillTextDone : styles.itemStatusPillTextTodo,
          ]}
        >
          {checked ? '챙김 완료' : '준비 필요'}
        </Text>
      </View>
    </Pressable>
  );
}

/** "전체보기" 상태에서 아이 한 명 몫의 섹션 — 프로필 사진/이름으로 구분하고, 그 아래
 *  체크리스트는 ScheduleCard와 동일한 PrepItemRow를 그대로 재사용한다. */
function ChildPrepSection({
  child,
  entries,
  colors,
  styles,
  onToggleItem,
}: {
  child: Child;
  entries: { event: Event; item: EventItem }[];
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  onToggleItem: (event: Event, item: EventItem) => void;
}) {
  const checkedCount = entries.filter(({ item }) => item.completed).length;
  const label = child.givenName?.trim() || child.name || '아이';

  return (
    <View style={styles.childSection}>
      <View style={styles.childSectionHeader}>
        {child.photoUri ? (
          <Image source={{ uri: child.photoUri }} style={styles.childAvatar} />
        ) : (
          <View style={styles.childAvatarPlaceholder}>
            <Text style={styles.childAvatarEmoji}>{child.avatarEmoji ?? '🧒'}</Text>
          </View>
        )}
        <Text style={styles.childSectionName} numberOfLines={1}>{label}</Text>
        <Text style={styles.childSectionCount}>
          {checkedCount}/{entries.length}
        </Text>
      </View>
      <View style={styles.childSectionItems}>
        {entries.map(({ event, item }) => (
          <PrepItemRow
            key={`${event.id}-${item.id}`}
            event={event}
            item={item}
            colors={colors}
            styles={styles}
            onToggleItem={onToggleItem}
          />
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    // 일정이 화면을 다 채우지 못할 때, 남는 세로 공간이 topBlock과 "전체 일정 보기"
    // 버튼 사이에 생기도록(justifyContent: space-between) 해서 버튼이 화면 하단에
    // 붙게 한다(부모 스크롤뷰의 contentContainerStyle에 flexGrow:1이 있어야 동작함
    // — app/index.tsx 참고). 일정이 많아 이미 화면을 넘치면 평소처럼 스크롤된다.
    // minHeight로 바닥선을 고정해, 홈 화면 콘텐츠가 이미 화면보다 길어 flex:1이
    // 여유 공간을 못 받는 상황에서도 "오늘 1개" 탭과 "내일 0개" 탭의 전체 높이가
    // 카드 유무에 따라 들쭉날쭉해지지 않게 한다.
    container: { marginTop: 20, paddingHorizontal: 20, flex: 1, minHeight: 280, justifyContent: 'space-between' },
    topBlock: {},
    // 일정이 없는 날엔 topBlock을 남는 세로 공간까지 늘려서, 그 안의 emptyCard도
    // 같이 커지게 한다 — 점선 카드가 작게 뜨고 그 밑에 빈 공간만 남는 걸 방지.
    topBlockEmpty: { flex: 1 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    headerTitle: { fontSize: 16, fontWeight: '800', color: colors.gray900, letterSpacing: -0.4 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    // NoticeBoardCard의 "전체보기" 텍스트 링크와 같은 톤으로 통일.
    moreButton: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    moreButtonText: { fontSize: 12.5, fontWeight: '700', color: colors.gray500 },
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
    seeAllRow: { alignItems: 'center', marginTop: 16 },
    seeAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.cardWhite,
      borderRadius: 999,
      paddingHorizontal: 20,
      paddingVertical: 12,
      ...SHADOW,
      shadowOpacity: 0.08,
      elevation: 2,
    },
    seeAllText: { fontSize: 14, fontWeight: '800', color: colors.gray900 },
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
    cardToday: { borderWidth: 1.5 },
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
      flex: 1,
      backgroundColor: colors.gray50,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      paddingVertical: 28,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyEmoji: { fontSize: 40, marginBottom: 12 },
    emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.gray600 },
    emptySubtitle: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.gray500,
      textAlign: 'center',
      lineHeight: 18,
      marginTop: 8,
      marginBottom: 20,
    },
    emptyScanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 999,
      ...SHADOW,
      shadowOpacity: 0.15,
      shadowColor: '#6366F1',
      elevation: 3,
    },
    emptyScanButtonIcon: { fontSize: 14 },
    emptyScanButtonText: { fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' },
    // "전체보기" 상태에서 아이별 섹션이 여러 개라 길어지면, 전체 화면 스크롤과 겹치지
    // 않도록 카드 내부에서만 스크롤되게 높이를 고정한다.
    childScroll: { maxHeight: 360 },
    childSection: { marginBottom: 14 },
    childSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    childAvatar: { width: 26, height: 26, borderRadius: 13 },
    childAvatarPlaceholder: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.gray100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    childAvatarEmoji: { fontSize: 14 },
    childSectionName: { flex: 1, fontSize: 13.5, fontWeight: '800', color: colors.gray900 },
    childSectionCount: { fontSize: 12, fontWeight: '700', color: colors.gray500 },
    childSectionItems: { gap: 6 },
    coupangSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 14,
    },
    coupangSearchInput: {
      flex: 1,
      backgroundColor: colors.gray50,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 13,
      color: colors.gray900,
    },
    coupangSearchButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.gray900,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coupangSearchButtonDisabled: { opacity: 0.4 },
  });
}
