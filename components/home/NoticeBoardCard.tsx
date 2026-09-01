import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

function NoticeRow({
  event,
  onPress,
  styles,
  colors,
  showDivider,
}: {
  event: Event;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  showDivider?: boolean;
}) {
  return (
    <Pressable style={[styles.row, showDivider && styles.rowDivider]} onPress={onPress}>
      <View style={styles.rowDateBadge}>
        <Text style={styles.rowDate}>{formatMD(event.date).split('(')[0]}</Text>
      </View>
      <Text style={styles.rowText} numberOfLines={1}>
        {event.noticeText || event.title}
      </Text>
      <MaterialCommunityIcons name="chevron-right" size={16} color={colors.gray400} />
    </Pressable>
  );
}

/** 캘린더 일정과 별개로, 특정 날짜에 매이지 않는 "공지" 카테고리 일정만 모아 보여주는 홈 화면 카드 — 가장 가까운 1건만 배너에, 나머지는 더보기 팝업으로. */
export default function NoticeBoardCard({ notices, onPressNotice }: NoticeBoardCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showAll, setShowAll] = useState(false);

  if (notices.length === 0) return null;

  const featured = notices[0];

  const handlePressFeatured = () => onPressNotice(featured);
  const handlePressInModal = (event: Event) => {
    setShowAll(false);
    onPressNotice(event);
  };

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
        <Pressable onPress={() => setShowAll(true)} style={styles.moreButton} hitSlop={6}>
          <Text style={styles.moreButtonText}>전체보기</Text>
          <MaterialCommunityIcons name="chevron-right" size={14} color={colors.gray500} />
        </Pressable>
      </View>

      <View style={styles.list}>
        <NoticeRow event={featured} onPress={handlePressFeatured} styles={styles} colors={colors} />
      </View>

      <Modal visible={showAll} transparent animationType="fade" onRequestClose={() => setShowAll(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAll(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <MaterialCommunityIcons name="bullhorn" size={16} color={colors.blue500} />
                <Text style={styles.modalHeaderText}>공지사항 전체 ({notices.length})</Text>
              </View>
              <Pressable onPress={() => setShowAll(false)} style={styles.modalCloseButton} hitSlop={6}>
                <MaterialCommunityIcons name="close" size={16} color={colors.gray400} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {notices.map((event, i) => (
                <NoticeRow
                  key={event.id}
                  event={event}
                  onPress={() => handlePressInModal(event)}
                  styles={styles}
                  colors={colors}
                  showDivider={i < notices.length - 1}
                />
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
      borderRadius: 18,
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
    moreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    moreButtonText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.gray500,
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
    rowDateBadge: {
      backgroundColor: colors.blue100,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    rowDate: {
      fontSize: 11.5,
      fontWeight: '800',
      color: colors.blue500,
    },
    rowText: {
      flex: 1,
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.gray900,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 400,
      maxHeight: '75%',
      backgroundColor: colors.cardWhite,
      borderRadius: 24,
      padding: 18,
      gap: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    modalHeaderText: { fontSize: 14, fontWeight: '900', color: colors.gray900 },
    modalCloseButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.gray100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalList: {
      backgroundColor: colors.gray50,
      borderRadius: 14,
    },
  });
}
