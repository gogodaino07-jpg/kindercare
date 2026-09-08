import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { getDisplayItems } from '../../hooks/useLocalChecklist';
import { Child, Event } from '../../types/models';
import { toISODate } from '../../utils/date';
import Text from '../common/AppText';

interface MultiChildPrepSummaryProps {
  /** 잠긴(무료 한도 초과) 아이는 호출부에서 미리 걸러서 넘겨준다. */
  children: Child[];
  events: Event[];
  selectedChildId: string | undefined;
  onSelectChild: (childId: string) => void;
}

/** 다자녀 가정에서 아이를 매번 전환하지 않고도 "오늘 누가 준비물을 덜 챙겼는지" 한눈에 보게 하는 요약 바.
 *  아이가 1명뿐이면(=전환할 대상이 없으면) 아무 의미가 없으므로 호출부에서 렌더링하지 않는다. */
export default function MultiChildPrepSummary({
  children: kids,
  events,
  selectedChildId,
  onSelectChild,
}: MultiChildPrepSummaryProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const todayISO = useMemo(() => toISODate(new Date()), []);

  const summaries = useMemo(
    () =>
      kids.map((child) => {
        const items = events
          .filter((e) => e.childId === child.id && e.date === todayISO)
          .flatMap((e) => getDisplayItems(e));
        const checked = items.filter((i) => i.completed).length;
        return { child, total: items.length, checked };
      }),
    [kids, events, todayISO]
  );

  // 아무도 오늘 챙길 준비물이 없으면 굳이 보여줄 필요가 없다.
  if (!summaries.some((s) => s.total > 0)) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {summaries.map(({ child, total, checked }) => {
        const isSelected = child.id === selectedChildId;
        const isDone = total > 0 && checked === total;
        const label = child.givenName?.trim() || child.name || '아이';
        return (
          <Pressable
            key={child.id}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelectChild(child.id)}
          >
            <Text style={[styles.name, isSelected && styles.nameSelected]} numberOfLines={1}>
              {label}
            </Text>
            {total > 0 ? (
              <View style={[styles.countPill, isDone && styles.countPillDone]}>
                <Text style={[styles.countText, isDone && styles.countTextDone]}>
                  {isDone ? '✓' : `${checked}/${total}`}
                </Text>
              </View>
            ) : (
              <View style={styles.countPill}>
                <Text style={styles.countTextMuted}>-</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 8,
      paddingHorizontal: 20,
      marginTop: 12,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.cardWhite,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingLeft: 12,
      paddingRight: 6,
      paddingVertical: 6,
    },
    chipSelected: {
      borderColor: colors.statusGreen,
      backgroundColor: colors.green50,
    },
    name: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.gray600,
      maxWidth: 72,
    },
    nameSelected: {
      color: colors.gray900,
      fontWeight: '800',
    },
    countPill: {
      minWidth: 30,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.gray50,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    countPillDone: {
      backgroundColor: colors.statusGreen,
    },
    countText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.gray600,
    },
    countTextDone: {
      color: '#FFFFFF',
    },
    countTextMuted: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.gray400,
    },
  });
}
