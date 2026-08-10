import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { ThemeColors, SHADOW } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { Event } from '../../types/models';
import { openCoupangSearch } from '../../utils/coupang';
import { isValidCoupangKeyword } from '../../utils/validation';
import Text from '../common/AppText';

interface EventCardProps {
  event: Event;
  /** Badge text, e.g. "내일" or "7/26(일)". Omit to render no badge (used when a shared date-group header already shows it). */
  dateBadgeText?: string;
  isPlanned?: boolean;
  highlighted?: boolean;
  themeColor?: string;
  /** Shows a 🛒 "쿠팡에서 구매" button under the note, searching Coupang for it. Off by default to keep the compact Home list unchanged. */
  showCoupangButton?: boolean;
  /** Lets the note wrap across lines instead of truncating to one line with an ellipsis. Off by default to keep the compact Home list unchanged. */
  wrapNote?: boolean;
  /** Removes the checkbox and click-to-check behavior, showing a simple dot instead. */
  hideCheckbox?: boolean;
  hideExpandButton?: boolean;
  initiallyExpanded?: boolean;
  onPress: () => void;
}

export default function EventCard({
  event,
  dateBadgeText,
  isPlanned,
  highlighted,
  themeColor = '#3B82F6',
  showCoupangButton,
  wrapNote,
  hideCheckbox,
  hideExpandButton = false,
  initiallyExpanded = false,
  onPress,
}: EventCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, themeColor, !!highlighted), [colors, themeColor, highlighted]);

  const items = useMemo(() => {
    if (!event.note) return [];
    // Split by newline, or comma/dot that is NOT part of a number (thousand separator)
    return event.note
      .split(/\n|,(?!\d)|\.(?!\d)/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [event.note]);

  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  const categoryColor = useMemo(() => {
    if (event.needsReview) return colors.orange500;
    if (event.source === 'manual') return colors.tomorrowRed;
    return colors.accent;
  }, [event.source, event.needsReview, colors]);

  const toggleCheck = (index: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const hasItems = items.length > 0 || !!event.memo;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.headerRow} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          {!highlighted ? (
            <Text style={styles.blueBullet}>•</Text>
          ) : (
            <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
          )}
          {!!dateBadgeText ? (
            <View style={styles.badgeBox}>
              <Text style={styles.dateBadgeText}>{dateBadgeText}</Text>
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
        </View>

        {hasItems && !hideExpandButton && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setIsExpanded(!isExpanded)}
            activeOpacity={0.6}
          >
            <MaterialIcons
              name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={22}
              color={colors.gray400}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {isExpanded && !hideExpandButton && (
        <ScrollView
          style={styles.checklistScroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          disallowInterruption={true}
        >
          <View style={styles.checklist}>
            {items.map((item, idx) => {
              const isChecked = checkedItems.has(idx);
              return (
                <View key={idx} style={styles.checkRow}>
                  <TouchableOpacity
                    style={styles.checkLabelArea}
                    onPress={() => toggleCheck(idx)}
                    disabled={hideCheckbox}
                    activeOpacity={0.6}
                  >
                    {hideCheckbox ? (
                      <Text style={styles.bullet}>•</Text>
                    ) : (
                      <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                        {isChecked && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
                      </View>
                    )}
                    <Text style={[
                      styles.noteText,
                      isChecked && styles.noteTextChecked,
                      hideCheckbox && styles.bulletText
                    ]}>
                      {item}
                    </Text>
                  </TouchableOpacity>

                  {showCoupangButton && isValidCoupangKeyword(item) && (
                    <TouchableOpacity
                      style={[
                        styles.coupangBadge,
                        !highlighted && styles.coupangBadgeSubtle
                      ]}
                      onPress={() => openCoupangSearch(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.coupangText,
                        !highlighted && styles.coupangTextSubtle
                      ]}>
                        {highlighted ? '🛒 쿠팡주문' : '쿠팡 검색'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            {items.length === 0 && event.memo && (
              <Text style={styles.memoText}>{event.memo}</Text>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors, themeColor: string, highlighted: boolean) {
  return StyleSheet.create({
    container: {
      paddingVertical: 2, // Reduced from 4
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6, // Reduced from 8
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    categoryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 10,
    },
    badgeBox: {
      backgroundColor: colors.gray100,
      paddingHorizontal: 8, // Reduced from 10
      paddingVertical: 3, // Reduced from 4
      borderRadius: 8,
      marginRight: 8, // Reduced from 10
    },
    dateBadgeText: {
      fontSize: 13, // Premium font size
      fontWeight: '700',
      color: themeColor,
    },
    title: {
      fontSize: 15, // Adjusted to match image feel
      fontWeight: highlighted ? 'bold' : '500',
      color: colors.gray900,
    },
    blueBullet: {
      fontSize: 20,
      color: colors.blue500,
      marginRight: 8,
      lineHeight: 22,
    },
    expandButton: {
      padding: 4,
    },
    checklistScroll: {
      maxHeight: 115, // Fits ~2 items comfortably
    },
    checklist: {
      gap: 4, // Reduced from 6
      marginTop: 2, // Reduced from 4
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: highlighted ? colors.cardWhite : 'transparent',
      borderRadius: 12,
      padding: highlighted ? 10 : 0,
      borderWidth: highlighted ? 1 : 0,
      borderColor: colors.border,
      ...(highlighted ? SHADOW : {}),
      shadowOpacity: highlighted ? 0.05 : 0,
      elevation: highlighted ? 2 : 0,
    },
    checkLabelArea: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.cardWhite,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    checkboxChecked: {
      backgroundColor: themeColor,
      borderColor: themeColor,
    },
    noteText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.gray900,
    },
    noteTextChecked: {
      color: colors.textSecondary,
      textDecorationLine: 'line-through',
    },
    coupangBadge: {
      backgroundColor: colors.tomorrowRedBg,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    coupangBadgeSubtle: {
      backgroundColor: colors.gray100,
    },
    coupangText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.tomorrowRed,
    },
    coupangTextSubtle: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
    bulletItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      paddingLeft: 4,
    },
    bullet: {
      fontSize: 16,
      color: colors.gray400,
      marginRight: 8,
    },
    bulletText: {
      fontSize: 15,
      color: colors.gray900,
    },
    memoText: {
      fontSize: 14,
      color: colors.textSecondary,
      paddingLeft: 4,
    },
  });
}
