import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/common/AppText';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { AnalysisResultStore } from '../features/newsletter-analysis';
import { ScanColors, useScanColors } from '../features/newsletter-analysis/uiColors';
import { MealPlan } from '../types/models';
import { formatMD, parseISODate, startOfDay, toISODate } from '../utils/date';
import { stripInvalidCharacters } from '../utils/validation';

interface DraftMealPlan extends Omit<MealPlan, 'id'> {
  localId: string;
}

export default function MealReviewScreen() {
  const router = useRouter();
  const { addMealPlans } = useAppData();
  const { showToast } = useToast();
  const C = useScanColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();

  const session = useMemo(() => AnalysisResultStore.getSession(), []);
  const [plans, setPlans] = useState<DraftMealPlan[]>(() =>
    (session?.mealPlans ?? []).map((m, i) => ({ ...m, localId: `meal-draft-${i}` }))
  );

  const sortedPlans = useMemo(() => [...plans].sort((a, b) => a.date.localeCompare(b.date)), [plans]);

  // 추출된 급식표 날짜가 하나도 빠짐없이 전부 오늘보다 과거면, 지난주 이전 급식표를
  // 잘못 스캔했을 가능성이 높다고 보고 경고 배너를 띄운다 — ai-review.tsx의 지난
  // 알림장 감지와 동일한 방식. 요일만 적힌 경우는 AI가 이번 주로 환산해버려서 이
  // 방식으로는 못 잡고, 문서에 실제 날짜가 인쇄돼 있던 경우만 감지된다.
  const todayISO = useMemo(() => toISODate(new Date()), []);
  const looksLikePastMealPlan = useMemo(
    () => plans.length > 0 && plans.every((p) => p.date < todayISO),
    [plans, todayISO]
  );
  const [pastNoticeDismissed, setPastNoticeDismissed] = useState(false);
  const pastNoticeInfo = useMemo(() => {
    if (!looksLikePastMealPlan || sortedPlans.length === 0) return null;
    const minDate = sortedPlans[0].date;
    const maxDate = sortedPlans[sortedPlans.length - 1].date;
    const daysAgo = Math.round(
      (startOfDay(new Date()).getTime() - parseISODate(maxDate).getTime()) / 86400000
    );
    const rangeLabel = minDate === maxDate ? formatMD(minDate) : `${formatMD(minDate)} ~ ${formatMD(maxDate)}`;
    return { rangeLabel, daysAgo };
  }, [looksLikePastMealPlan, sortedPlans]);

  const updatePlan = (localId: string, patch: Partial<DraftMealPlan>) => {
    setPlans((prev) => prev.map((p) => (p.localId === localId ? { ...p, ...patch } : p)));
  };

  const removePlan = (localId: string) => {
    setPlans((prev) => prev.filter((p) => p.localId !== localId));
  };

  const handleSave = () => {
    if (sortedPlans.length === 0) {
      router.back();
      return;
    }
    const finalized = sortedPlans.map(({ localId, ...rest }) => rest);
    addMealPlans(finalized);
    showToast(`급식표 ${finalized.length}일치를 저장했어요 🍱`);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={6}>
          <Feather name="chevron-left" size={24} color={C.slate900} />
        </Pressable>
        <Text style={styles.headerTitle}>급식표 확인</Text>
      </View>

      {pastNoticeInfo && !pastNoticeDismissed && (
        <View style={styles.pastNoticeBanner}>
          <View style={styles.pastNoticeIconCircle}>
            <Feather name="alert-triangle" size={20} color={C.amber700} />
          </View>
          <View style={styles.pastNoticeBody}>
            <View style={styles.pastNoticeTitleRow}>
              <Text style={styles.pastNoticeTitle}>지난 날짜({pastNoticeInfo.rangeLabel}) 급식표예요</Text>
              <View style={styles.pastNoticeBadge}>
                <Text style={styles.pastNoticeBadgeText}>{pastNoticeInfo.daysAgo}일 전</Text>
              </View>
            </View>
            <Text style={styles.pastNoticeSubtext}>혹시 지난 주 급식표를 잘못 스캔하신 거 아닌가요?</Text>
            <View style={styles.pastNoticeButtonRow}>
              <Pressable style={styles.pastNoticeReuploadButton} onPress={() => router.back()}>
                <Feather name="refresh-ccw" size={13} color={C.white} />
                <Text style={styles.pastNoticeReuploadButtonText}>다시 스캔하기</Text>
              </Pressable>
              <Pressable style={styles.pastNoticeContinueButton} onPress={() => setPastNoticeDismissed(true)}>
                <Text style={styles.pastNoticeContinueButtonText}>그래도 저장</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {sortedPlans.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>확인할 급식표가 없어요</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 96 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
          >
            {sortedPlans.map((plan) => (
              <MealPlanCard
                key={plan.localId}
                plan={plan}
                styles={styles}
                C={C}
                onUpdate={(patch) => updatePlan(plan.localId, patch)}
                onDelete={() => removePlan(plan.localId)}
              />
            ))}
          </ScrollView>
        )}

        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          <Pressable onPress={handleSave} disabled={sortedPlans.length === 0} style={styles.saveButtonWrap}>
            <LinearGradient
              colors={sortedPlans.length === 0 ? [C.slate300, C.slate300] : [C.violet600, C.indigo600]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButton}
            >
              <Ionicons name="checkmark-circle" size={18} color={C.white} />
              <Text style={styles.saveButtonText}>
                {sortedPlans.length > 0 ? `급식표 ${sortedPlans.length}일치 저장하기` : '저장할 급식표가 없어요'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MealPlanCard({
  plan,
  styles,
  C,
  onUpdate,
  onDelete,
}: {
  plan: DraftMealPlan;
  styles: ReturnType<typeof createStyles>;
  C: ScanColors;
  onUpdate: (patch: Partial<DraftMealPlan>) => void;
  onDelete: () => void;
}) {
  const [menuText, setMenuText] = useState(() => plan.menu.join('\n'));

  const handleMenuChange = (text: string) => {
    const cleaned = stripInvalidCharacters(text, '\n,.');
    setMenuText(cleaned);
    onUpdate({ menu: cleaned.split('\n').map((s) => s.trim()).filter(Boolean) });
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardDateBadge}>
          <Text style={styles.cardDateText}>{formatMD(plan.date)}</Text>
        </View>
        <Pressable onPress={onDelete} style={styles.cardDeleteButton} hitSlop={8}>
          <Feather name="trash-2" size={14} color={C.slate400} />
        </Pressable>
      </View>

      <Text style={styles.fieldLabel}>대표 메뉴</Text>
      <TextInput
        style={styles.mainMenuInput}
        value={plan.mainMenu ?? ''}
        onChangeText={(text) => onUpdate({ mainMenu: stripInvalidCharacters(text) || undefined })}
        placeholder="예: 안동식 간장야채찜닭"
        placeholderTextColor={C.slate400}
        maxLength={30}
      />

      <Text style={styles.fieldLabel}>전체 메뉴 (줄바꿈으로 구분)</Text>
      <TextInput
        style={styles.menuInput}
        multiline
        value={menuText}
        onChangeText={handleMenuChange}
        placeholderTextColor={C.slate400}
        maxLength={300}
      />
    </View>
  );
}

function createStyles(C: ScanColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.appBg },
    keyboardAvoider: { flex: 1 },
    header: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderBottomWidth: 1,
      borderBottomColor: C.slate100,
    },
    backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: C.slate900 },
    pastNoticeBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: C.amber50,
      borderBottomWidth: 1,
      borderBottomColor: C.amber200,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    pastNoticeIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: C.amber100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pastNoticeBody: { flex: 1, gap: 6 },
    pastNoticeTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    pastNoticeTitle: { fontSize: 14.5, fontWeight: '800', color: C.slate900 },
    pastNoticeBadge: {
      backgroundColor: C.amber100,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    pastNoticeBadgeText: { fontSize: 11, fontWeight: '800', color: C.amber800 },
    pastNoticeSubtext: { fontSize: 12.5, fontWeight: '600', color: C.slate600, lineHeight: 17 },
    pastNoticeButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    pastNoticeReuploadButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: C.amber600,
      borderRadius: 999,
      paddingVertical: 12,
    },
    pastNoticeReuploadButtonText: { fontSize: 12.5, fontWeight: '800', color: C.white },
    pastNoticeContinueButton: {
      backgroundColor: C.surface,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: C.amber200,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    pastNoticeContinueButtonText: { fontSize: 12.5, fontWeight: '800', color: C.amber700 },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 14, fontWeight: '600', color: C.slate400 },
    scrollContent: { padding: 16, gap: 14 },
    card: {
      backgroundColor: C.surface,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: C.slate100,
      gap: 10,
    },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardDateBadge: {
      backgroundColor: C.violet50,
      borderWidth: 1,
      borderColor: C.violet100,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    cardDateText: { fontSize: 12.5, fontWeight: '800', color: C.violet700 },
    cardDeleteButton: { padding: 4 },
    fieldLabel: { fontSize: 10, fontWeight: '700', color: C.slate400 },
    mainMenuInput: {
      backgroundColor: C.slate50,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.slate200,
      paddingHorizontal: 10,
      paddingVertical: 10,
      fontSize: 14,
      fontWeight: '800',
      color: C.slate900,
    },
    menuInput: {
      fontSize: 13,
      color: C.slate700,
      backgroundColor: C.slate50,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.slate200,
      padding: 10,
      lineHeight: 18,
      minHeight: 90,
      textAlignVertical: 'top',
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      backgroundColor: C.surface,
      borderTopWidth: 1,
      borderTopColor: C.slate100,
    },
    saveButtonWrap: { borderRadius: 18, overflow: 'hidden' },
    saveButton: {
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    saveButtonText: { color: C.white, fontSize: 15, fontWeight: '900' },
  });
}
