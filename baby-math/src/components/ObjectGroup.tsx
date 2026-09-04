// 사물(이모지)을 개수만큼 그려 주는 컴포넌트
// 뺄셈에서는 뒤쪽 몇 개를 흐리게 + X 표시해서 "빠진 것"을 보여준다.
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../constants/theme';

interface Props {
  emoji: string;
  count: number;
  /** 뒤에서부터 이만큼은 "빠진 것"으로 표시 */
  removed?: number;
  size?: number;
  maxPerRow?: number;
  style?: ViewStyle;
}

export default function ObjectGroup({
  emoji,
  count,
  removed = 0,
  size = 44,
  maxPerRow = 5,
  style,
}: Props) {
  const items = Array.from({ length: count }, (_, i) => i);
  const removedFrom = count - removed;

  return (
    <View style={[styles.wrap, { maxWidth: (size + 10) * maxPerRow }, style]}>
      {items.map((i) => {
        const isRemoved = i >= removedFrom;
        return (
          <View key={i} style={[styles.slot, { width: size + 8, height: size + 8 }]}>
            <Text style={[{ fontSize: size }, isRemoved && styles.removedEmoji]}>{emoji}</Text>
            {isRemoved && <Text style={[styles.cross, { fontSize: size * 0.9 }]}>✖️</Text>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slot: { alignItems: 'center', justifyContent: 'center' },
  removedEmoji: { opacity: 0.28 },
  cross: {
    position: 'absolute',
    opacity: 0.75,
    color: colors.wrong,
  },
});
