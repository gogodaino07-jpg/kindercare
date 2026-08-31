import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { Event } from '../../types/models';
import { formatMD } from '../../utils/date';
import Text from '../common/AppText';

interface NoticeBoardCardProps {
  /** category가 "공지"인 일정만, 날짜 오름차순으로 미리 걸러서 넘겨준다. */
  notices: Event[];
  onPressNotice: (event: Event) => void;
}

const MAX_VISIBLE = 3;

/** 캘린더 일정과 별개로, 특정 날짜에 매이지 않는 "공지" 카테고리 일정만 모아 보여주는 홈 화면 카드. */
export default function NoticeBoardCard({ notices, onPressNotice }: NoticeBoardCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (notices.length === 0) return null;

  const visible = notices.slice(0, MAX_VISIBLE);
  const moreCount = notices.length - visible.length;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <LinearGradient
          colors={['#3B82F6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBadge}
        >
          <MaterialCommunityIcons name="bullhorn" size={20} color="#FFFFFF" />
        </LinearGradient>
        <Text style={styles.title}>공지사항</Text>
      </View>

      <View style={styles.list}>
        {visible.map((event, i) => (
          <Pressable
            key={event.id}
            style={[styles.row, i < visible.length - 1 && styles.rowDivider]}
            onPress={() => onPressNotice(event)}
          >
            <Text style={styles.rowDate}>{formatMD(event.date).split('(')[0]}</Text>
            <Text style={styles.rowText} numberOfLines={1}>
              {event.noticeText || event.title}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={colors.gray400} />
          </Pressable>
        ))}
      </View>

      {moreCount > 0 && <Text style={styles.moreText}>+{moreCount}개 더보기</Text>}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginTop: 16,
      marginHorizontal: 20,
      borderRadius: 20,
      backgroundColor: colors.lightBlueBg,
      padding: 16,
      ...SHADOW,
      shadowOpacity: 0.08,
      elevation: 2,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    iconBadge: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW,
      shadowColor: '#3B82F6',
      shadowOpacity: 0.35,
      elevation: 3,
    },
    title: {
      flex: 1,
      fontSize: 15.5,
      fontWeight: '800',
      color: colors.gray900,
    },
    list: {
      backgroundColor: 'rgba(255,255,255,0.6)',
      borderRadius: 14,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    rowDate: {
      fontSize: 11.5,
      fontWeight: '800',
      color: colors.blue500,
      minWidth: 34,
    },
    rowText: {
      flex: 1,
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.gray900,
    },
    moreText: {
      marginTop: 8,
      fontSize: 11,
      fontWeight: '700',
      color: colors.gray500,
      textAlign: 'center',
    },
  });
}
