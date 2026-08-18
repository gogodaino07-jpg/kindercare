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

  return (
    <LinearGradient
      colors={[colors.statusGreen, colors.green500]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <MaterialIcons name="inventory" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.title}>오늘 등원 준비물 챙기기</Text>
            <Text style={styles.subtitle}>총 {total}개 항목 중 {checked}개 챙김 완료</Text>
          </View>
        </View>
        <Text style={styles.percentText}>{percent}%</Text>
      </View>

      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${percent}%` }]} />
      </View>

      {percent === 100 && (
        <View style={styles.doneRow}>
          <Text style={styles.doneText}>✨ 오늘 모든 준비물을 완벽하게 챙겼어요! 최고예요 👍</Text>
        </View>
      )}
    </LinearGradient>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginTop: 16,
      marginHorizontal: 20,
      borderRadius: 20,
      padding: 16,
      ...SHADOW,
      shadowOpacity: 0.12,
      elevation: 3,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
    iconBadge: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
    subtitle: { fontSize: 11.5, color: 'rgba(255,255,255,0.85)', marginTop: 1, fontWeight: '600' },
    percentText: {
      fontSize: 17,
      fontWeight: '900',
      color: '#FFFFFF',
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      overflow: 'hidden',
    },
    gaugeTrack: {
      width: '100%',
      height: 10,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.18)',
      overflow: 'hidden',
    },
    gaugeFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: '#FDE68A',
    },
    doneRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)' },
    doneText: { fontSize: 12, fontWeight: '800', color: '#FDE68A', textAlign: 'center' },
  });
}
