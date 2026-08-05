import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import Text from '../common/AppText';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { Event } from '../../types/models';
import { formatMD } from '../../utils/date';
import EventCard from './EventCard';

interface EventListSectionProps {
  mainEvents: Event[];
  featuredLaterEvents: Event[];
  displayType: 'TODAY' | 'TOMORROW';
  onEventPress: (event: Event) => void;
  hideSupplies?: boolean;
  hideUpcoming?: boolean;
}

export default function EventListSection({
  mainEvents,
  featuredLaterEvents,
  displayType,
  onEventPress,
  hideSupplies = false,
  hideUpcoming = false,
}: EventListSectionProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isLaterExpanded, setIsLaterExpanded] = useState(false);
  const [isMainExpanded, setIsMainExpanded] = useState(false);

  const isToday = displayType === 'TODAY';
  const themeColor = isToday ? colors.accent : colors.blue500;
  const themeBg = isToday ? colors.gray50 : colors.lightBlueBg;

  const visibleMainEvents = isMainExpanded || mainEvents.length <= 2
    ? mainEvents
    : mainEvents.slice(0, 2);

  const visibleLaterEvents = isLaterExpanded
    ? featuredLaterEvents
    : featuredLaterEvents.slice(0, 2);

  const remainingMainCount = mainEvents.length - 1;
  const hasMoreMain = mainEvents.length > 1;

  const remainingCount = featuredLaterEvents.length - 2;
  const hasMore = featuredLaterEvents.length > 2;

  return (
    <View style={styles.container}>
      {!hideSupplies && (
        <>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.titleRow}>
              <View style={styles.iconBox}>
                <MaterialIcons name="shopping-bag" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.sectionTitle}>준비물 챙기기</Text>
            </View>
          </View>

          {/* Main Card (Today or Tomorrow) */}
          <View style={[
            styles.mainCard,
            { backgroundColor: themeBg, borderLeftColor: themeColor, borderColor: isToday ? '#E5EDFF' : '#EDE9FE' },
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

              {!isToday && hasMoreMain && (
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

            {mainEvents.length > 0 ? (
              <View style={styles.cardBody}>
                {mainEvents.slice(0, 1).map((event, idx) => (
                  <React.Fragment key={`${event.id}-${isToday}`}>
                    <EventCard
                      event={event}
                      dateBadgeText={formatMD(event.date)}
                      isPlanned={true}
                      highlighted={true}
                      initiallyExpanded={true}
                      themeColor={themeColor}
                      showCoupangButton={!isToday}
                      hideCheckbox={false}
                      onPress={() => onEventPress(event)}
                    />
                  </React.Fragment>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>챙길 준비물이 없어요 😊</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Featured Later Events (Next 3 days) - Separated from the main card */}
      {!hideUpcoming && (
        featuredLaterEvents.length > 0 ? (
          <View style={styles.laterSection}>
            <View style={styles.laterHeader}>
              <View style={styles.laterTitleRow}>
                <MaterialIcons name="event-note" size={18} color={colors.textSecondary} />
                <Text style={styles.laterSectionTitle}>다가오는 일정</Text>
              </View>
              {hasMore && (
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => onEventPress(featuredLaterEvents[0])}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moreText}>
                    더보기
                  </Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={18}
                    color={colors.gray500}
                  />
                </TouchableOpacity>
              )}
            </View>

            <Animated.View layout={LinearTransition}>
              {featuredLaterEvents.slice(0, 2).map((event, idx) => (
                <Animated.View
                  key={event.id}
                  entering={idx >= 2 ? FadeInUp.duration(400).springify() : undefined}
                  exiting={FadeOutUp}
                  style={styles.laterItemWrapper}
                >
                  <EventCard
                    event={event}
                    dateBadgeText={formatMD(event.date)}
                    isPlanned={true}
                    highlighted={false}
                    showCoupangButton={true}
                    hideCheckbox={true}
                    hideExpandButton={true}
                    onPress={() => onEventPress(event)}
                  />
                  {idx < Math.min(featuredLaterEvents.length, 2) - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.gray100, marginVertical: 6 }]} />
                  )}
                </Animated.View>
              ))}
            </Animated.View>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <View style={styles.placeholderInner}>
              <MaterialIcons name="event-note" size={20} color={colors.gray300} />
              <Text style={styles.placeholderText}>다가올 일정은 오후 10시 이후에 나타납니다.</Text>
            </View>
          </View>
        )
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      marginTop: 4,
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
      color: colors.textPrimary,
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
      height: 220, // Fixed height for consistency
    },
    cardBody: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
    laterSection: {
      marginTop: 12,
      paddingHorizontal: 4,
    },
    laterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    laterTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    laterSectionTitle: {
      fontSize: 15, // Increased from 13
      fontWeight: '800',
      color: colors.textSecondary,
    },
    toggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    moreText: {
      fontSize: 12, // Increased from 11
      fontWeight: '800',
      color: colors.gray600,
    },
    laterItemWrapper: {
      marginBottom: 4, // Increased from 2
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
      borderColor: colors.gray200,
      borderStyle: 'dashed',
    },
    placeholderText: {
      fontSize: 13, // Increased from 12
      color: colors.gray500,
      fontWeight: '600',
    },
  });
}

