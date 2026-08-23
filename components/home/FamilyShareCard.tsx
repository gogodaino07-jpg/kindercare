import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { getDisplayItems } from '../../hooks/useLocalChecklist';
import { Event } from '../../types/models';
import Text from '../common/AppText';

function hasFinalConsonant(text: string): boolean {
  const trimmed = text.trim();
  const code = trimmed.charCodeAt(trimmed.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return true;
  return (code - 0xac00) % 28 !== 0;
}

interface FamilyShareCardProps {
  /** 공유 문구를 만드는 데 쓰는 일정 목록 — 지금 보고 있는 탭(오늘/내일/모레) 기준. */
  events: Event[];
  /** "오늘"/"내일"/"모레" — 지금 보고 있는 탭에 맞춰 문구에 그대로 들어간다. */
  dayLabel: string;
}

/**
 * 홈 화면 스크롤 내용과 별개로 화면 하단에 항상 고정되는 카드 — 쿠팡 배너
 * 바로 위에 붙어서, 일정이 없어 스크롤 내용이 짧을 때도 밑에 빈 여백이
 * 생기지 않게 한다.
 */
export default function FamilyShareCard({ events, dayLabel }: FamilyShareCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleShare = () => {
    const lines = events.map((event) => {
      const items = getDisplayItems(event);
      return items.length > 0
        ? `• ${event.title}: ${items.map((i) => i.name).join(', ')}`
        : `• ${event.title}`;
    });
    const particle = hasFinalConsonant(dayLabel) ? '은' : '는';
    const message = lines.length > 0
      ? `${dayLabel} 일정이에요!\n${lines.join('\n')}`
      : `${dayLabel}${particle} 일정이 없어요!`;
    Share.share({ message }).catch(() => {});
  };

  return (
    <View style={styles.shareCard}>
      <View style={styles.shareCardLeft}>
        <View style={styles.shareIconBox}>
          <MaterialIcons name="share" size={16} color={colors.purple500} />
        </View>
        <View style={styles.shareTextBlock}>
          <Text style={styles.shareTitle}>가족과 함께 보기</Text>
          <Text style={styles.shareSubtitle}>{dayLabel} 일정과 준비물을 가족에게 전달해보세요.</Text>
        </View>
      </View>
      <Pressable style={styles.shareButton} onPress={handleShare}>
        <Text style={styles.shareButtonText}>공유</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    shareCard: {
      marginHorizontal: 20,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.purpleBg,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    shareCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
    shareIconBox: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: colors.cardWhite,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shareTextBlock: { flex: 1 },
    shareTitle: { fontSize: 13, fontWeight: '800', color: colors.gray900 },
    shareSubtitle: { fontSize: 11, fontWeight: '500', color: colors.gray500, marginTop: 2 },
    shareButton: {
      backgroundColor: colors.purple500,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    shareButtonText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  });
}
