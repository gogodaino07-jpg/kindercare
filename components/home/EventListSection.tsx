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
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isLaterExpanded, setIsLaterExpanded] = useState(false);
  const [isMainExpanded, setIsMainExpanded] = useState(false);

  const isToday = displayType === 'TODAY';
  const themeColor = isToday ? '#F2705C' : colors.blue500;
  const themeBg = isToday ? colors.gray50 : colors.lightBlueBg;

  const visibleMainEvents = isMainExpanded || mainEvents.length <= 2
    ? mainEvents
    : mainEvents.slice(0, 2);

  const visibleLaterEvents = featuredLaterEvents.slice(0, 3);

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
                {mainEvents.length > 0 && (
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
              <ScrollView
                style={styles.cardBody}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
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
              </ScrollView>
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
        </>
      )}

      {/* Featured Later Events (Next 3 days) - Separated from the main card */}
      {!hideUpcoming && (
        featuredLaterEvents.length > 0 ? (
          <View style={styles.laterSection}>
            <View style={styles.laterHeader}>
              <View style={styles.laterTitleRow}>
                <MaterialIcons name="event-note" size={18} color="#64748B" />
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
                    color="#64748B"
                  />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              style={styles.laterScrollBody}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <Animated.View layout={LinearTransition}>
                {visibleLaterEvents.map((event, idx) => (
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
                      themeColor="#64748B"
                      showCoupangButton={true}
                      hideCheckbox={true}
                      hideExpandButton={true}
                      onPress={() => onEventPress(event)}
                    />
                    {idx < featuredLaterEvents.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: colors.gray100, marginVertical: 6 }]} />
                    )}
                  </Animated.View>
                ))}
              </Animated.View>
            </ScrollView>
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
      paddingBottom: 30, // Increased from 20 for better separation
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
      height: 200, // Reduced from 220 for better layout
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
    laterSection: {
      marginTop: 24,
      marginBottom: 20, // Added margin to avoid overlap with bottom banner
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: colors.cardWhite,
      borderRadius: 20,
      borderWidth: 1,
      borderLeftWidth: 6, // Added matching left border
      borderColor: colors.border,
      borderLeftColor: colors.gray400, // Different accent color for later events
      ...SHADOW,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      elevation: 3,
      height: 180, // Reduced from 220 to avoid banner overlap
    },
    laterScrollBody: {
      flex: 1,
    },
    laterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    laterTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    laterSectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: '#64748B',
    },
    toggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    moreText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#64748B',
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
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    placeholderText: {
      fontSize: 13, // Increased from 12
      color: colors.gray900,
      fontWeight: '600',
    },
  });
}

