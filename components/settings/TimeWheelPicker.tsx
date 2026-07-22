import React, { useEffect, useMemo, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { TimeOfDay } from '../../types/models';

interface TimeWheelPickerProps {
  value: TimeOfDay;
  onChange: (value: TimeOfDay) => void;
}

const PERIODS: { label: string; value: TimeOfDay['period'] }[] = [
  { label: '오전', value: 'AM' },
  { label: '오후', value: 'PM' },
];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 3;
const COLUMN_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const SPACER_HEIGHT = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

function Column<T extends string | number>({
  items,
  labelFor,
  selected,
  onSelect,
  styles,
}: {
  items: T[];
  labelFor: (item: T) => string;
  selected: T;
  onSelect: (item: T) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = items.indexOf(selected);

  useEffect(() => {
    const index = items.indexOf(selected);
    if (index >= 0) {
      scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
    }
    // Only re-run when the externally-driven value changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    const item = items[clamped];
    if (item !== undefined && item !== selected) {
      onSelect(item);
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.column}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      contentContainerStyle={{ paddingVertical: SPACER_HEIGHT }}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      contentOffset={{ x: 0, y: Math.max(0, selectedIndex) * ITEM_HEIGHT }}
    >
      {items.map((item) => {
        const isSelected = item === selected;
        return (
          <Pressable
            key={String(item)}
            style={styles.item}
            onPress={() => {
              const index = items.indexOf(item);
              scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
              onSelect(item);
            }}
          >
            <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
              {labelFor(item)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function TimeWheelPicker({ value, onChange }: TimeWheelPickerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.selectionIndicator} />
      <Column
        items={PERIODS.map((p) => p.value)}
        labelFor={(v) => PERIODS.find((p) => p.value === v)?.label ?? ''}
        selected={value.period}
        onSelect={(period) => onChange({ ...value, period })}
        styles={styles}
      />
      <Column
        items={HOURS}
        labelFor={(h) => String(h)}
        selected={value.hour}
        onSelect={(hour) => onChange({ ...value, hour })}
        styles={styles}
      />
      <Column
        items={MINUTES}
        labelFor={(m) => String(m).padStart(2, '0')}
        selected={value.minute}
        onSelect={(minute) => onChange({ ...value, minute })}
        styles={styles}
      />
    </View>
  );
}

export function formatTimeOfDay(time: TimeOfDay): string {
  const periodLabel = PERIODS.find((p) => p.value === time.period)?.label ?? '';
  return `${periodLabel} ${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      height: COLUMN_HEIGHT,
      backgroundColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
    },
    selectionIndicator: {
      position: 'absolute',
      top: SPACER_HEIGHT,
      left: 0,
      right: 0,
      height: ITEM_HEIGHT,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    column: {
      flex: 1,
    },
    item: {
      height: ITEM_HEIGHT,
      justifyContent: 'center',
      alignItems: 'center',
    },
    itemText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    itemTextSelected: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.accent,
    },
  });
}
