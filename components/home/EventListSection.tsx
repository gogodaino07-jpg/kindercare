import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import PremiumCalendarIcon from '../common/PremiumCalendarIcon';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import Text from '../common/AppText';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { Event } from '../../types/models';
import { formatMD, WEEKDAY_KO, parseISODate } from '../../utils/date';
import EventCard from './EventCard';
import { WeatherDay } from '../../hooks/useWeeklyWeather';
import { EventDateGroup } from '../../hooks/useUpcomingEvents';
import { describeShortTip } from '../../utils/weatherCode';


interface EventListSectionProps {
  mainEvents: Event[];
  laterGroups?: EventDateGroup[];
  displayType: 'TODAY' | 'TOMORROW';
  weatherDays?: WeatherDay[];
  onEventPress: (event: Event) => void;
  hideSupplies?: boolean;
  hideUpcoming?: boolean;
}

export function SuppliesSection({
  mainEvents,
  displayType,
  onEventPress,
}: {
  mainEvents: Event[];
  displayType: 'TODAY' | 'TOMORROW';
  onEventPress: (event: Event) => void;
}) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isToday = displayType === 'TODAY';
  const themeColor = isToday ? '#F2705C' : colors.blue500;
  const themeBg = isToday ? colors.gray50 : colors.lightBlueBg;
  const hasMoreMain = mainEvents.length > 1;

  return (
    <View style={styles.suppliesContainer}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <Text style={{ fontSize: 18 }}>🛍️</Text>
          </View>
          <Text style={styles.sectionTitle}>준비물 챙기기</Text>
        </View>

        {!isToday && mainEvents.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/upload')}
            style={styles.aiScanButtonTop}
          >
            <Text style={[styles.aiScanTextTop, { color: '#E05A48' }]}>
              ✨ AI 스캔
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={18}
              color="#E05A48"
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={[
        styles.mainCard,
        { backgroundColor: themeBg, borderLeftColor: themeColor, borderColor: colors.border },
      ]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeftGroup}>
            <View style={[styles.tomorrowBadge, { backgroundColor: themeColor }]}>
              <Text style={styles.tomorrowBadgeText}>{displayType}</Text>
            </View>
            <Text style={[styles.cardHeaderText, { color: themeColor }]}>
              {isToday ? '오늘' : '내일'} 챙겨야 할 것들
            </Text>
          </View>

          <View style={styles.headerRightGroup}>
            {isToday && mainEvents.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/upload')}
                style={styles.aiScanButton}
              >
                <Text style={[styles.aiScanText, { color: themeColor }]}>
                  ✨ AI 스캔
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={16}
                  color={themeColor}
                />
              </TouchableOpacity>
            )}

            {hasMoreMain && (
              <TouchableOpacity
                onPress={() => onEventPress(mainEvents[0])}
                style={styles.mainToggleButton}
              >
                <Text style={[styles.mainMoreText, { color: themeColor }]}>
                  더보기
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={18}
                  color={themeColor}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {mainEvents.length > 0 ? (
          <View style={styles.cardBody}>
            {mainEvents.map((event, idx) => (
              <React.Fragment key={`${event.id}-${isToday}`}>
                <EventCard
                  event={event}
                  dateBadgeText={formatMD(event.date)}
                  isPlanned={true}
                  highlighted={true}
                  initiallyExpanded={idx === 0}
                  themeColor={themeColor}
                  showCoupangButton={!isToday}
                  hideCheckbox={false}
                  onPress={() => onEventPress(event)}
                />
                {idx < mainEvents.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 8 }]} />}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCtaContainer}>
            <Text style={styles.emptyCtaTitle}>
              {isToday ? '오늘' : '내일'} 챙길 준비물이 무엇인가요?
            </Text>
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: colors.tomorrowRed }]}
              onPress={() => router.push('/upload')}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>가정통신문 스캔하기</Text>
            </TouchableOpacity>
            <Text style={styles.emptyCtaSubtitle}>
              AI가 일정이랑 준비물을 쏙쏙 찾아드려요!
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function UpcomingHeader() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.upcomingHeaderContainer}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.titleRow}>
          <PremiumCalendarIcon size={22} />
          <Text style={styles.sectionTitle}>다가오는 일정</Text>
        </View>
      </View>
    </View>
  );
}

export function UpcomingDateHeader({
  date,
  weather,
}: {
  date: string;
  weather?: WeatherDay;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.laterHeaderContainer}>
      <View style={styles.headerRow1}>
        <Text style={styles.laterSectionTitle}>
          {formatMD(date)}
        </Text>
        {weather && (
          <View style={styles.weatherInline}>
            <Text style={styles.weatherEmoji}>{weather.emoji}</Text>
            <Text style={styles.weatherTemp}>{weather.tempMax}°</Text>
          </View>
        )}
      </View>

      {weather && (
        <Text style={styles.weatherTipText}>
          {describeShortTip(weather.label)}
        </Text>
      )}
    </View>
  );
}

export function UpcomingDateContent({
  events,
  onEventPress,
}: {
  events: Event[];
  onEventPress: (event: Event) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.laterContentList}>
      {events.map((event, idx) => (
        <View key={event.id} style={idx > 0 ? { marginTop: 16 } : undefined}>
          <EventCard
            event={event}
            isPlanned={true}
            highlighted={false}
            themeColor="#64748B"
            showCoupangButton={true}
            hideCheckbox={true}
            hideExpandButton={true}
            onPress={() => onEventPress(event)}
          />
        </View>
      ))}
    </View>
  );
}

export function UpcomingDateCard({
  group,
  weather,
  isHighlighted,
  onLayout,
  onEventPress,
}: {
  group: EventDateGroup;
  weather?: WeatherDay;
  isHighlighted?: boolean;
  onLayout?: (y: number) => void;
  onEventPress: (event: Event) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.upcomingDateCardContainer,
        isHighlighted && { borderColor: '#4A8FE7', borderWidth: 2.5 }
      ]}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}
    >
      <UpcomingDateHeader date={group.date} weather={weather} />
      <UpcomingDateContent events={group.events} onEventPress={onEventPress} />
    </View>
  );
}

export default function EventListSection({
  mainEvents,
  laterGroups = [],
  displayType,
  weatherDays = [],
  onEventPress,
  hideSupplies = false,
  hideUpcoming = false,
}: EventListSectionProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasUpcoming = laterGroups.length > 0;

  return (
    <View style={styles.container}>
      {!hideSupplies && (
        <SuppliesSection
          mainEvents={mainEvents}
          displayType={displayType}
          onEventPress={onEventPress}
        />
      )}

      {!hideUpcoming && (
        <View style={styles.upcomingArea}>
          <UpcomingHeader />

          {hasUpcoming ? (
            laterGroups.map((group) => (
              <UpcomingDateCard
                key={group.date}
                group={group}
                weather={weatherDays.find((d) => d.date === group.date)}
                onEventPress={onEventPress}
              />
            ))
          ) : (
            <View style={[styles.upcomingDateCardContainer, styles.emptyContainer]}>
              <Text style={styles.emptyText}>다가올 일정이 없습니다.</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}


function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginTop: 4,
    },
    suppliesContainer: {
      paddingHorizontal: 20,
    },
    upcomingHeaderContainer: {
      paddingHorizontal: 20,
      marginTop: 24,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconBox: {
      backgroundColor: colors.tomorrowRed,
      padding: 6,
      borderRadius: 12,
      ...SHADOW,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.gray900,
      letterSpacing: -0.5,
    },
    mainCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderLeftWidth: 6,
      padding: 12,
      ...SHADOW,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      elevation: 3,
      borderColor: colors.border,
      minHeight: 180,
    },
    cardBody: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyCtaContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 8,
    },
    emptyCtaTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.gray900,
      marginBottom: 14,
    },
    ctaButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 999,
      ...SHADOW,
      shadowOpacity: 0.2,
      elevation: 4,
      marginBottom: 10,
    },
    ctaButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
    },
    emptyCtaSubtitle: {
      fontSize: 11,
      color: colors.gray500,
      fontWeight: '600',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      paddingLeft: 4,
    },
    headerLeftGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerRightGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    aiScanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 0,
    },
    aiScanText: {
      fontSize: 12,
      fontWeight: '800',
    },
    mainToggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    mainMoreText: {
      fontSize: 12,
      fontWeight: '800',
    },
    tomorrowBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    tomorrowBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: 'bold',
      letterSpacing: 0.5,
    },
    cardHeaderText: {
      fontSize: 14,
      fontWeight: 'bold',
    },
    upcomingArea: {
      // Container for upcoming sections
    },
    upcomingDateCardContainer: {
      marginHorizontal: 20,
      marginTop: 12,
      marginBottom: 8,
      paddingHorizontal: 20,
      paddingVertical: 18,
      backgroundColor: '#F9F9FB',
      borderRadius: 20,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
        },
        android: {
          // Soft shadow instead of hard line
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.02,
          shadowRadius: 5,
        },
      }),
    },
    laterHeaderContainer: {
      marginBottom: 16,
    },
    laterContentList: {
      flex: 1,
      paddingLeft: 4, // Align with bullet points
    },
    headerRow1: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    weatherInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    weatherEmoji: {
      fontSize: 16,
      opacity: 0.7,
    },
    weatherTemp: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.gray900,
      opacity: 0.8,
    },
    weatherTipText: {
      fontSize: 13,
      color: colors.gray400,
      fontWeight: '500',
    },
    laterSectionTitle: {
      fontSize: 17,
      fontWeight: 'bold',
      color: colors.gray900,
    },
    divider: {
      height: 1,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.gray400,
      paddingVertical: 12,
      fontSize: 13,
    },
    placeholderContainer: {
      marginTop: 12,
      paddingHorizontal: 4,
      height: 75, // Increased from 60
      justifyContent: 'center',
    },
    placeholderInner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.gray50,
      borderRadius: 14,
      padding: 16, // Increased from 12
      gap: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    placeholderText: {
      fontSize: 13, // Increased from 12
      color: colors.gray900,
      fontWeight: '600',
    },
    aiScanButtonTop: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FDE9E6',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      ...SHADOW,
      elevation: 2,
    },
    aiScanTextTop: {
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: -0.3,
    },
  });
}

