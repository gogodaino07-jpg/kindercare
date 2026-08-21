import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { getDisplayItems } from '../../hooks/useLocalChecklist';
import { Event } from '../../types/models';
import Text from '../common/AppText';

interface FamilyShareCardProps {
  /** 공유 문구를 만드는 데 쓰는 오늘 일정 목록. */
  mainEvents: Event[];
}

/**
 * 홈 화면 스크롤 내용과 별개로 화면 하단에 항상 고정되는 카드 — 쿠팡 배너
 * 바로 위에 붙어서, 일정이 없어 스크롤 내용이 짧을 때도 밑에 빈 여백이
 * 생기지 않게 한다.
 */
export default function FamilyShareCard({ mainEvents }: FamilyShareCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleShare = () => {
    const lines = mainEvents.flatMap((event) => {
      const items = getDisplayItems(event);
      return items.length > 0 ? [`• ${event.title}: ${items.map((i) => i.name).join(', ')}`] : [];
    });
    const message = lines.length > 0
      ? `오늘 챙길 준비물이에요!\n${lines.join('\n')}`
      : '오늘은 따로 챙길 준비물이 없어요!';
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
          <Text style={styles.shareSubtitle}>오늘 챙길 준비물을 가족에게 전달해보세요.</Text>
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
