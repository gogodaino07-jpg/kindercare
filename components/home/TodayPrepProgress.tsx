import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import Text from '../common/AppText';

interface TodayPrepProgressProps {
  total: number;
  checked: number;
  percent: number;
}

/** 오늘 이벤트에 챙길 준비물이 하나도 없으면 렌더링하지 않음(프로그레스가 의미 없으므로). */
export default function TodayPrepProgress({ total, checked, percent }: TodayPrepProgressProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (total === 0) return null;

  const clampedPercent = Math.max(0, Math.min(percent, 100));

  return (
    <View style={styles.container}>
      {/* 카드 배경 자체가 진행률만큼 녹색으로 차오르는 큰 프로그레스바 역할을 한다. */}
      <LinearGradient
        colors={[colors.statusGreen, colors.green500]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { width: `${clampedPercent}%` }]}
      />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBadge}>
              <MaterialIcons name="inventory" size={18} color={colors.statusGreen} />
            </View>
            <View>
              <Text style={styles.title}>오늘 등원 준비물 챙기기</Text>
              <Text style={styles.subtitle}>총 {total}개 항목 중 {checked}개 챙김 완료</Text>
            </View>
          </View>
          <View style={styles.percentPill}>
            <Text style={styles.percentText}>{percent}%</Text>
          </View>
        </View>

        <View style={styles.gaugeTrack}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={[styles.gaugeSegment, i < checked && styles.gaugeSegmentFilled]} />
          ))}
        </View>

        {percent === 100 && (
          <View style={styles.doneRow}>
            <Text style={styles.doneText}>✨ 오늘 모든 준비물을 완벽하게 챙겼어요! 최고예요 👍</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginTop: 16,
      marginHorizontal: 20,
      borderRadius: 20,
      backgroundColor: colors.cardWhite,
      overflow: 'hidden',
      ...SHADOW,
      shadowOpacity: 0.1,
      elevation: 3,
    },
    fill: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
    },
    content: { padding: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
    iconBadge: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.75)',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 14, fontWeight: '800', color: colors.gray900 },
    subtitle: { fontSize: 11.5, color: colors.gray800, marginTop: 1, fontWeight: '600' },
    percentPill: {
      backgroundColor: 'rgba(255,255,255,0.75)',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    percentText: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.gray900,
    },
    gaugeTrack: {
      width: '100%',
      height: 10,
      flexDirection: 'row',
      gap: 4,
    },
    gaugeSegment: {
      flex: 1,
      height: '100%',
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.12)',
    },
    gaugeSegmentFilled: {
      backgroundColor: '#FDE68A',
    },
    doneRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.5)' },
    doneText: { fontSize: 12, fontWeight: '800', color: colors.gray900, textAlign: 'center' },
  });
}
