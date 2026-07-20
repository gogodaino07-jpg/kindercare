import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/theme';
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

function Column<T extends string | number>({
  items,
  labelFor,
  selected,
  onSelect,
}: {
  items: T[];
  labelFor: (item: T) => string;
  selected: T;
  onSelect: (item: T) => void;
}) {
  return (
    <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
      {items.map((item) => {
        const isSelected = item === selected;
        return (
          <Pressable key={String(item)} style={styles.item} onPress={() => onSelect(item)}>
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
  return (
    <View style={styles.container}>
      <Column
        items={PERIODS.map((p) => p.value)}
        labelFor={(v) => PERIODS.find((p) => p.value === v)?.label ?? ''}
        selected={value.period}
        onSelect={(period) => onChange({ ...value, period })}
      />
      <Column
        items={HOURS}
        labelFor={(h) => String(h)}
        selected={value.hour}
        onSelect={(hour) => onChange({ ...value, hour })}
      />
      <Column
        items={MINUTES}
        labelFor={(m) => String(m).padStart(2, '0')}
        selected={value.minute}
        onSelect={(minute) => onChange({ ...value, minute })}
      />
    </View>
  );
}

export function formatTimeOfDay(time: TimeOfDay): string {
  const periodLabel = PERIODS.find((p) => p.value === time.period)?.label ?? '';
  return `${periodLabel} ${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 140,
    backgroundColor: '#F5F8FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  column: {
    flex: 1,
  },
  item: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  itemText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  itemTextSelected: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.accent,
  },
});
