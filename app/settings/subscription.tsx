import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { calendarTheme as t } from '../../components/calendar/calendarTheme';
import Text from '../../components/common/AppText';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useAlert } from '../../context/AlertContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useThemeColors } from '../../context/ThemeContext';
import {
  FREE_WEEKLY_LIMIT,
  PREMIUM_MONTHLY_LIMIT,
  PREMIUM_WEEKLY_LIMIT,
} from '../../features/newsletter-analysis';

const BENEFITS = [
  { icon: 'bolt' as const, text: `스캔 횟수 대폭 확대 (주 ${PREMIUM_WEEKLY_LIMIT}회 · 월 ${PREMIUM_MONTHLY_LIMIT}회)` },
  { icon: 'block' as const, text: '홈 화면 진입 시 뜨는 추천 팝업 광고 제거' },
  { icon: 'movie-filter' as const, text: '스캔할 때마다 뜨던 광고 시청 없이 바로 분석' },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const { isSubscribed, isBillingConfigured, managementURL, refresh } = useSubscription();
  const { showAlert } = useAlert();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!isBillingConfigured) {
      setLoadingOfferings(false);
      return;
    }
    Purchases.getOfferings()
      .then((offerings) => {
        setMonthlyPackage(offerings.current?.monthly ?? offerings.current?.availablePackages[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingOfferings(false));
  }, [isBillingConfigured]);

  const handlePurchase = async () => {
    if (!monthlyPackage || purchasing) return;
    setPurchasing(true);
    try {
      await Purchases.purchasePackage(monthlyPackage);
      await refresh();
      showAlert({ title: '구독 완료!', message: '프리미엄 혜택이 바로 적용됐어요.', icon: '🎉' });
    } catch (err: any) {
      if (err?.code !== Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        showAlert({ title: '결제에 실패했어요', message: '잠시 후 다시 시도해주세요.' });
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (!isBillingConfigured || restoring) return;
    setRestoring(true);
    try {
      await Purchases.restorePurchases();
      await refresh();
      showAlert({ title: '복원 완료', message: '구매 내역을 확인했어요.' });
    } catch {
      showAlert({ title: '복원에 실패했어요', message: '잠시 후 다시 시도해주세요.' });
    } finally {
      setRestoring(false);
    }
  };

  const handleManage = () => {
    const url = managementURL ?? 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.screenBg}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: t.bg },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBackButton}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={t.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerCard}>
            <Text style={styles.headerEmoji}>💎</Text>
            <Text style={styles.headerTitle}>프리미엄 구독</Text>
            <Text style={styles.headerPrice}>월 990원</Text>
          </View>

          <View style={styles.benefitsCard}>
            {BENEFITS.map((b) => (
              <View key={b.text} style={styles.benefitRow}>
                <MaterialIcons name={b.icon} size={20} color={colors.purple500} />
                <Text style={styles.benefitText}>{b.text}</Text>
              </View>
            ))}
            <Text style={styles.freeNote}>무료 이용 시 스캔은 1주일 최대 {FREE_WEEKLY_LIMIT}회까지예요.</Text>
          </View>

          {isSubscribed ? (
            <View style={styles.statusCard}>
              <MaterialIcons name="verified" size={22} color={colors.green500} />
              <Text style={styles.statusText}>프리미엄 구독 중이에요</Text>
              <Pressable style={styles.manageButton} onPress={handleManage}>
                <Text style={styles.manageButtonText}>구독 관리 / 해지</Text>
              </Pressable>
            </View>
          ) : !isBillingConfigured ? (
            <Text style={styles.preparingText}>구독 결제 기능을 준비 중이에요. 곧 만나요!</Text>
          ) : loadingOfferings ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={colors.purple500} />
          ) : (
            <Pressable style={styles.purchaseButton} onPress={handlePurchase} disabled={purchasing || !monthlyPackage}>
              {purchasing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.purchaseButtonText}>
                  {monthlyPackage ? `${monthlyPackage.product.priceString}에 구독하기` : '구독 상품을 준비 중이에요'}
                </Text>
              )}
            </Pressable>
          )}

          {isBillingConfigured && (
            <Pressable style={styles.restoreButton} onPress={handleRestore} disabled={restoring}>
              <Text style={styles.restoreButtonText}>{restoring ? '복원 중...' : '구매 복원하기'}</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screenBg: { flex: 1, backgroundColor: t.bg },
    headerBackButton: { paddingHorizontal: 4 },
    safeArea: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    headerCard: {
      alignItems: 'center',
      backgroundColor: colors.purpleBg,
      borderRadius: 20,
      paddingVertical: 28,
      marginBottom: 16,
    },
    headerEmoji: { fontSize: 36, marginBottom: 8 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: colors.gray900 },
    headerPrice: { fontSize: 15, fontWeight: '800', color: colors.purple500, marginTop: 4 },
    benefitsCard: {
      backgroundColor: colors.cardWhite,
      borderRadius: 18,
      padding: 18,
      gap: 12,
      marginBottom: 16,
      ...SHADOW,
      shadowOpacity: 0.05,
      elevation: 2,
    },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    benefitText: { flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.gray900 },
    freeNote: { fontSize: 11.5, fontWeight: '600', color: colors.gray500, marginTop: 4 },
    statusCard: {
      alignItems: 'center',
      backgroundColor: colors.cardWhite,
      borderRadius: 18,
      padding: 20,
      gap: 10,
      ...SHADOW,
      shadowOpacity: 0.05,
      elevation: 2,
    },
    statusText: { fontSize: 14.5, fontWeight: '800', color: colors.gray900 },
    manageButton: { marginTop: 4, paddingVertical: 8, paddingHorizontal: 16 },
    manageButtonText: { fontSize: 13, fontWeight: '700', color: colors.purple500 },
    preparingText: {
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '600',
      color: colors.gray500,
      marginTop: 12,
    },
    purchaseButton: {
      backgroundColor: colors.purple500,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      ...SHADOW,
      shadowOpacity: 0.15,
      elevation: 3,
    },
    purchaseButtonText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
    restoreButton: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
    restoreButtonText: { fontSize: 12.5, fontWeight: '700', color: colors.gray500 },
  });
}
