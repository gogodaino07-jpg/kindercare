import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import Text from '../common/AppText';

const DIGIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

interface PinPadProps {
  colors: ThemeColors;
  value: string;
  length: number;
  error?: boolean;
  onKeyPress: (key: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'del') => void;
  /** '0' 왼쪽 자리에 넣을 커스텀 버튼 — 실제 잠금 해제 화면의 지문 버튼용. 없으면 빈 칸. */
  bottomLeftSlot?: React.ReactNode;
}

/** 잠금 설정 화면과 실제 잠금 해제 화면이 서로 다른 UI(입력창 vs 키패드)로
 *  보이지 않도록, 둘 다 이 숫자 키패드를 공유해서 쓴다. */
export default function PinPad({ colors, value, length, error, onKeyPress, bottomLeftSlot }: PinPadProps) {
  const dotColor = error ? colors.tomorrowRed : colors.accent;
  return (
    <View>
      <View style={styles.dotsRow}>
        {Array.from({ length }, (_, i) => (
          <View
            key={i}
            style={[
              styles.pinDot,
              { borderColor: dotColor },
              i < value.length && { backgroundColor: dotColor },
            ]}
          />
        ))}
      </View>
      <View style={styles.keypad}>
        {DIGIT_KEYS.map((key) => (
          <Pressable key={key} style={styles.key} onPress={() => onKeyPress(key as any)}>
            <Text style={[styles.keyText, { color: colors.textPrimary }]}>{key}</Text>
          </Pressable>
        ))}
        <View style={styles.key}>{bottomLeftSlot}</View>
        <Pressable style={styles.key} onPress={() => onKeyPress('0')}>
          <Text style={[styles.keyText, { color: colors.textPrimary }]}>0</Text>
        </Pressable>
        <Pressable style={styles.key} onPress={() => onKeyPress('del')}>
          <Text style={[styles.keyText, { color: colors.textPrimary }]}>⌫</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  pinDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    marginHorizontal: 12,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    justifyContent: 'center',
  },
  key: {
    width: '33.33%',
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '600',
  },
});
