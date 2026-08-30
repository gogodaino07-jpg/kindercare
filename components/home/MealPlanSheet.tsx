import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { useThemeColors } from '../../context/ThemeContext';
import { formatMD, parseISODate, startOfDay, toISODate, WEEKDAY_KO } from '../../utils/date';
import Text from '../common/AppText';

interface MealPlanSheetProps {
  visible: boolean;
  onClose: () => void;
}

/** Monday of the week containing `date`, as an ISO string. */
function getMondayISO(date: Date): string {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}

function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

const AMBER_SOFT = '#FEF3C7';
const AMBER_SOFT_BORDER = '#FDE68A';
const AMBER_DEEP = '#B45309';

const SPARKLE_COUNT = 8;

/** A little "뿅" of sparkles that burst outward from the center once when `trigger` changes — kept subtle, not confetti-levels of busy. */
function SparkleBurst({ trigger }: { trigger: number }) {
  const anims = useRef(Array.from({ length: SPARKLE_COUNT }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (trigger === 0) return;
    anims.forEach((a) => a.setValue(0));
    Animated.stagger(
      35,
      anims.map((a) =>
        Animated.timing(a, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      )
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <View style={sparkleStyles.container} pointerEvents="none">
      {anims.map((a, i) => {
        const angle = (i / SPARKLE_COUNT) * Math.PI * 2;
        const distance = 110;
        const translateX = a.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * distance] });
        const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * distance] });
        const opacity = a.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });
        const scale = a.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1.5, 0.6] });
        return (
          <Animated.Text
            key={i}
            style={[sparkleStyles.sparkle, { opacity, transform: [{ translateX }, { translateY }, { scale }] }]}
          >
            ✨
          </Animated.Text>
        );
      })}
    </View>
  );
}

const sparkleStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 36,
    left: 0,
    right: 0,
    height: 0,
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
    fontSize: 32,
  },
});

export default function MealPlanSheet({ visible, onClose }: MealPlanSheetProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { mealPlans, selectedChild } = useAppData();
  const [expanded, setExpanded] = useState(false);
  const [sparkleTrigger, setSparkleTrigger] = useState(0);
  // 0 = 이번주, +1 = 다음주 ... 유치원이 다음주 식단표를 며칠 전에 미리 공지하는
  // 경우가 흔해서, "이번주"에는 저장된 식단이 하나도 없는데 "다음주"에는 있으면
  // 스캔한 급식표가 안 보인다는 오해를 사기 쉽다 — 시트를 열 때 자동으로 데이터가
  // 있는 주로 넘어가 준다.
  const [weekOffset, setWeekOffset] = useState(0);

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      const baseMonday = getMondayISO(new Date());
      const weekHasPlan = (mondayISO: string) =>
        Array.from({ length: 5 }, (_, i) => addDaysISO(mondayISO, i)).some((dateISO) =>
          mealPlans.some((m) => m.childId === selectedChild?.id && m.date === dateISO)
        );

      if (!weekHasPlan(baseMonday) && weekHasPlan(addDaysISO(baseMonday, 7))) {
        setWeekOffset(1);
        setExpanded(true);
      } else {
        setWeekOffset(0);
        setExpanded(false);
      }

      setSparkleTrigger((t) => t + 1);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, scaleAnim, opacityAnim]);

  const todayISO = useMemo(() => toISODate(new Date()), []);
  const todayMenu = useMemo(
    () => mealPlans.find((m) => m.childId === selectedChild?.id && m.date === todayISO),
    [mealPlans, selectedChild, todayISO]
  );
  const todayDateLabel = useMemo(() => {
    const d = parseISODate(todayISO);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_KO[d.getDay()]}요일)`;
  }, [todayISO]);

  const weekDays = useMemo(() => {
    const mondayISO = addDaysISO(getMondayISO(new Date()), weekOffset * 7);
    return Array.from({ length: 5 }, (_, i) => {
      const dateISO = addDaysISO(mondayISO, i);
      const plan = mealPlans.find((m) => m.childId === selectedChild?.id && m.date === dateISO);
      return { date: dateISO, weekday: WEEKDAY_KO[parseISODate(dateISO).getDay()], plan };
    });
  }, [mealPlans, selectedChild, weekOffset]);

  const weekRangeLabel = useMemo(() => {
    const mondayISO = addDaysISO(getMondayISO(new Date()), weekOffset * 7);
    const fridayISO = addDaysISO(mondayISO, 4);
    const rangeText = `${formatMD(mondayISO).split('(')[0]}~${formatMD(fridayISO).split('(')[0]}`;
    if (weekOffset === 0) return `이번주 (${rangeText})`;
    if (weekOffset === 1) return `다음주 (${rangeText})`;
    if (weekOffset === -1) return `지난주 (${rangeText})`;
    return weekOffset > 0 ? `${weekOffset}주 후 (${rangeText})` : `${-weekOffset}주 전 (${rangeText})`;
  }, [weekOffset]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleAiScan = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      onClose();
      router.push('/meal-scan');
    });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View style={[styles.sheet, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <SparkleBurst trigger={sparkleTrigger} />

          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Text style={styles.headerIconEmoji}>🍴</Text>
              </View>
              <View style={styles.headerTextCol}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>오늘의 급식 메뉴</Text>
                  {!!todayMenu && (
                    <Pressable style={styles.aiPillButton} onPress={handleAiScan} hitSlop={4}>
                      <Ionicons name="sparkles" size={12} color={AMBER_DEEP} />
                      <Text style={styles.aiPillButtonText}>AI 분석</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={styles.dateSubtitle}>{todayDateLabel}</Text>
              </View>
            </View>
            <Pressable hitSlop={8} onPress={handleClose}>
              <MaterialIcons name="close" size={22} color={colors.gray400} />
            </Pressable>
          </View>

          {todayMenu ? (
            <View style={styles.mealCard}>
              <View style={styles.mealCardTag}>
                <Text style={styles.mealCardTagText}>점심 식단</Text>
              </View>
              <Text style={styles.mealCardText}>{todayMenu.menu.join(', ')}</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.emptyText}>오늘은 등록된 식단이 없어요</Text>
              <Pressable style={styles.aiScanButton} onPress={handleAiScan}>
                <Ionicons name="sparkles" size={16} color={AMBER_DEEP} />
                <Text style={styles.aiScanButtonText}>급식표 AI 분석</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.expandButton, pressed && { opacity: 0.7 }]}
            onPress={() => setExpanded((e) => !e)}
          >
            <Text style={styles.expandButtonText}>{expanded ? '접기 ▲' : '이번주 식단 더보기 ▾'}</Text>
          </Pressable>

          {expanded && (
            <>
            <View style={styles.weekNavRow}>
              <Pressable onPress={() => setWeekOffset((w) => w - 1)} hitSlop={8} style={styles.weekNavButton}>
                <MaterialIcons name="chevron-left" size={18} color={colors.gray500} />
              </Pressable>
              <Text style={styles.weekNavLabel}>{weekRangeLabel}</Text>
              <Pressable onPress={() => setWeekOffset((w) => w + 1)} hitSlop={8} style={styles.weekNavButton}>
                <MaterialIcons name="chevron-right" size={18} color={colors.gray500} />
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekScroll}
            >
              {weekDays.map((d) => {
                const isToday = d.date === todayISO;
                return (
                  <View key={d.date} style={[styles.weekCard, isToday && styles.weekCardToday]}>
                    <View style={[styles.weekCardDateHeader, isToday && styles.weekCardDateHeaderToday]}>
                      <Text style={[styles.weekCardDate, isToday && styles.weekCardDateToday]}>
                        {d.weekday} · {formatMD(d.date).split('(')[0]}
                      </Text>
                    </View>
                    {d.plan ? (
                      d.plan.menu.map((item, i) => (
                        <Text key={i} style={styles.weekCardMenuItem}>
                          {item}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.weekCardEmpty}>식단 없음</Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            </>
          )}

          <Pressable
            style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.85 }]}
            onPress={handleClose}
          >
            <Text style={styles.closeButtonText}>확인 완료</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    sheet: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.cardWhite,
      borderRadius: 28,
      paddingTop: 26,
      paddingBottom: 20,
      paddingHorizontal: 22,
      alignItems: 'stretch',
      ...SHADOW,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
    headerIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.orangeLight1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconEmoji: { fontSize: 18 },
    headerTextCol: { flexShrink: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    title: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.gray900,
    },
    aiPillButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: AMBER_SOFT,
      borderWidth: 1,
      borderColor: AMBER_SOFT_BORDER,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    aiPillButtonText: {
      fontSize: 11,
      fontWeight: '800',
      color: AMBER_DEEP,
    },
    dateSubtitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.gray500,
      marginTop: 2,
    },
    mealCard: {
      width: '100%',
      backgroundColor: colors.orangeLight1,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.pastelOrange,
      padding: 16,
      marginBottom: 6,
    },
    mealCardTag: {
      alignSelf: 'flex-start',
      backgroundColor: colors.pastelOrange,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 10,
    },
    mealCardTagText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: colors.peachOrangeDeep,
    },
    mealCardText: {
      fontSize: 14.5,
      fontWeight: '700',
      lineHeight: 21,
      color: colors.gray900,
    },
    emptyText: {
      fontSize: 14,
      color: colors.gray500,
      fontWeight: '600',
      paddingVertical: 16,
      textAlign: 'center',
    },
    aiScanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      width: '100%',
      backgroundColor: AMBER_SOFT,
      borderWidth: 1,
      borderColor: AMBER_SOFT_BORDER,
      borderRadius: 14,
      paddingVertical: 12,
    },
    aiScanButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: AMBER_DEEP,
    },
    expandButton: {
      alignSelf: 'center',
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    expandButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
    },
    weekNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 4,
      marginBottom: 4,
    },
    weekNavButton: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekNavLabel: {
      fontSize: 12.5,
      fontWeight: '800',
      color: colors.gray900,
      minWidth: 120,
      textAlign: 'center',
    },
    weekScroll: {
      gap: 10,
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    weekCard: {
      width: 148,
      backgroundColor: colors.gray50,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    weekCardToday: {
      backgroundColor: colors.lightBlueBg,
      borderColor: colors.blue100,
    },
    weekCardDateHeader: {
      marginHorizontal: -14,
      marginTop: -14,
      paddingVertical: 8,
      marginBottom: 10,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.border,
    },
    weekCardDateHeaderToday: {
      borderBottomColor: colors.blue100,
    },
    weekCardDate: {
      fontSize: 13.5,
      fontWeight: '900',
      color: colors.gray900,
      textAlign: 'center',
    },
    weekCardDateToday: {
      color: colors.blue500,
    },
    weekCardMenuItem: {
      fontSize: 12.5,
      lineHeight: 17,
      color: colors.gray900,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 5,
    },
    weekCardEmpty: {
      fontSize: 12,
      color: colors.gray400,
      fontStyle: 'italic',
      textAlign: 'center',
    },
    closeButton: {
      marginTop: 16,
      width: '100%',
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      backgroundColor: colors.pastelOrangeAccent,
    },
    closeButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
}
