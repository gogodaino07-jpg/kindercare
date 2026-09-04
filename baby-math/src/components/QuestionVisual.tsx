// 문제의 시각 자료 (사물 그림 / 큰 숫자 / 덧셈·뺄셈 그림)
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, radius, spacing } from '../constants/theme';
import { Visual } from '../lib/questions';
import ObjectGroup from './ObjectGroup';

export default function QuestionVisual({ visual }: { visual: Visual }) {
  if (visual.type === 'none') return null;

  return (
    <Animated.View entering={FadeIn.duration(240)} style={styles.wrap}>
      {visual.type === 'objects' && (
        <ObjectGroup emoji={visual.emoji} count={visual.count} size={46} maxPerRow={5} />
      )}

      {visual.type === 'number' && <Text style={styles.bigNumber}>{visual.value}</Text>}

      {visual.type === 'operation' && (
        <View style={styles.row}>
          <View style={styles.group}>
            <ObjectGroup emoji={visual.emoji} count={visual.left} size={38} maxPerRow={3} />
          </View>
          <Text style={styles.operator}>{visual.op}</Text>
          <View style={styles.group}>
            <ObjectGroup emoji={visual.emoji} count={visual.right} size={38} maxPerRow={3} />
          </View>
        </View>
      )}

      {visual.type === 'takeaway' && (
        <ObjectGroup
          emoji={visual.emoji}
          count={visual.total}
          removed={visual.remove}
          size={40}
          maxPerRow={5}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  group: {
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.sm,
  },
  operator: { fontSize: 44, fontWeight: '900', color: colors.primaryDeep },
  bigNumber: { fontSize: 110, fontWeight: '900', color: colors.primaryDeep },
});
