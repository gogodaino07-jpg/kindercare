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

/** Each menu item springs in from above, one after another, instead of all appearing at once. */
function StaggeredMenuItem({ text, index }: { text: string; index: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const chipColors = [colors.orangeLight1, colors.lightBlueBg, colors.green50, colors.pinkBg];
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: index * 90,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY }], width: '100%' }}>
      <View style={[styles.menuItemRow, { backgroundColor: chipColors[index % chipColors.length] }]}>
        <View style={styles.menuItemIconCircle}>
          <Text style={styles.menuItemIcon}>🍚</Text>
        </View>
        <Text style={styles.menuItemText}>{text}</Text>
      </View>
    </Animated.View>
  );
}

export default function MealPlanSheet({ visible, onClose }: MealPlanSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { mealPlans, selectedChild } = useAppData();
  const [expanded, setExpanded] = useState(false);
  const [sparkleTrigger, setSparkleTrigger] = useState(0);

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setExpanded(false);
      setSparkleTrigger((t) => t + 1);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const todayISO = useMemo(() => toISODate(new Date()), []);
  const todayMenu = useMemo(
    () => mealPlans.find((m) => m.childId === selectedChild?.id && m.date === todayISO),
    [mealPlans, selectedChild, todayISO]
  );

  const weekDays = useMemo(() => {
    const mondayISO = getMondayISO(new Date());
    return Array.from({ length: 5 }, (_, i) => {
      const dateISO = addDaysISO(mondayISO, i);
      const plan = mealPlans.find((m) => m.childId === selectedChild?.id && m.date === dateISO);
      return { date: dateISO, weekday: WEEKDAY_KO[parseISODate(dateISO).getDay()], plan };
    });
  }, [mealPlans, selectedChild]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View style={[styles.sheet, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <SparkleBurst trigger={sparkleTrigger} />

          <Text style={styles.title}>🍱 오늘의 급식 메뉴</Text>

          {todayMenu ? (
            <View style={styles.menuList}>
              {todayMenu.menu.map((item, idx) => (
                <StaggeredMenuItem key={`${item}-${idx}`} text={item} index={idx} />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>오늘은 등록된 식단이 없어요</Text>
          )}

          <Pressable
            style={({ pressed }) => [styles.expandButton, pressed && { opacity: 0.7 }]}
            onPress={() => setExpanded((e) => !e)}
          >
            <Text style={styles.expandButtonText}>{expanded ? '접기 ▲' : '이번주 식단 더보기 ▾'}</Text>
          </Pressable>

          {expanded && (
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
          )}

          <Pressable
            style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.8 }]}
            onPress={handleClose}
          >
            <Text style={styles.closeButtonText}>닫기</Text>
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
      backgroundColor: 'rgba(20, 24, 22, 0.45)',
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
      alignItems: 'center',
      ...SHADOW,
    },
    title: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.gray900,
      marginBottom: 12,
    },
    menuList: {
      width: '100%',
      gap: 8,
      marginBottom: 6,
    },
    menuItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    menuItemIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    menuItemIcon: {
      fontSize: 14,
    },
    menuItemText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: colors.gray900,
    },
    emptyText: {
      fontSize: 14,
      color: colors.gray500,
      fontWeight: '600',
      paddingVertical: 16,
    },
    expandButton: {
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    expandButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
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
      backgroundColor: colors.gray100,
    },
    closeButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.gray900,
    },
  });
}
