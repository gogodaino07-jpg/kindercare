import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Platform,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calendarTheme as t } from '../../components/calendar/calendarTheme';
import { formatTimeOfDay } from '../../components/settings/TimeWheelPicker';
import Text from '../../components/common/AppText';
import ClearableTextInput from '../../components/common/ClearableTextInput';
import { FONT_OPTIONS, FONT_SIZE_OPTIONS } from '../../constants/fontOptions';
import { useAlert } from '../../context/AlertContext';
import { useAppData } from '../../context/AppDataContext';
import { LockMethod, useAppLock } from '../../context/AppLockContext';
import { useNotificationCenter } from '../../context/NotificationCenterContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { THEME_MODE_LABELS, useTheme } from '../../context/ThemeContext';
import { resolveCoords } from '../../hooks/useWeeklyWeather';
import { fetchWeatherPreview } from '../../utils/weatherPreviewFetch';

const LOCK_METHOD_LABELS: Record<LockMethod, string> = {
  none: '설정 안 함',
  pin: 'PIN',
  password: '비밀번호',
  pattern: '패턴',
};

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, setMode, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showAlert } = useAlert();
  const {
    resetAllData,
    requestWithdrawal,
    googleAccount,
    signOutGoogle,
    familyKey,
    familyMembers,
    notificationSettings,
    updateNotificationSettings,
    fontChoiceId,
    fontSizeChoice,
  } = useAppData();
  const { resetLock, method } = useAppLock();
  const { clearNotifications } = useNotificationCenter();
  const { isSubscribed } = useSubscription();

  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';

  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [weatherLabel, setWeatherLabel] = useState('내 지역');
  const [weatherPreview, setWeatherPreview] = useState<{ emoji: string; tempC: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    resolveCoords()
      .then(({ coords, locationLabel }) => {
        if (!mounted) return;
        setWeatherLabel(locationLabel);
        return fetchWeatherPreview(coords.latitude, coords.longitude);
      })
      .then((preview) => {
        if (mounted && preview) setWeatherPreview({ emoji: preview.emoji, tempC: preview.tempC });
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const fontLabel = FONT_OPTIONS.find((o) => o.id === fontChoiceId)?.label ?? '기본 돋움체';
  const fontSizeOption = FONT_SIZE_OPTIONS.find((o) => o.id === fontSizeChoice) ?? FONT_SIZE_OPTIONS[2];
  const fontSizePx = Math.round(18 * fontSizeOption.scale);

  const handleCopyFamilyKey = async () => {
    try {
      await Clipboard.setStringAsync(familyKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showAlert({ title: '복사에 실패했어요', message: '잠시 후 다시 시도해주세요.' });
    }
  };

  const handleLogout = () => {
    showAlert({
      title: '로그아웃',
      message: '정말 로그아웃 하시겠어요?',
      buttons: [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            await signOutGoogle();
            router.dismissAll();
            router.replace({ pathname: '/google-signin', params: { flow: 'relogin' } });
          },
        },
      ],
    });
  };

  const handleWithdraw = () => {
    showAlert({
      title: '회원탈퇴',
      icon: '⚠️',
      message: '정말 탈퇴하시겠습니까?',
      warningMessage:
        '탈퇴 시 클라우드와 로컬의 모든 데이터가 즉시 영구 삭제되며, 더 이상 복구할 수 없습니다. 신중히 선택해 주세요.',
      buttons: [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: async () => {
            try {
              await requestWithdrawal();

              const finalizeWithdrawal = async () => {
                await resetAllData();
                await resetLock();
                clearNotifications();
                setMode('system');
                router.dismissAll();
                router.replace('/');
              };

              showAlert({
                title: '탈퇴 처리 완료',
                message: '모든 데이터가 성공적으로 삭제되었습니다. 그동안 이용해 주셔서 감사합니다.',
                onDismiss: finalizeWithdrawal,
                buttons: [
                  {
                    text: '확인',
                    onPress: finalizeWithdrawal,
                  },
                ],
              });
            } catch (err) {
              showAlert({
                title: '오류 발생',
                message: '탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
              });
            }
          },
        },
      ],
    });
  };

  const q = query.trim().toLowerCase();
  const sectionVisible = (keywords: string[]) =>
    q === '' || keywords.some((k) => k.toLowerCase().includes(q));

  const showProfile = sectionVisible(['내 계정', '로그아웃', googleAccount?.name ?? '', googleAccount?.email ?? '']);
  const showQuickCards = sectionVisible(['알림 설정', '가족 키 공유', '키 공유', '키 재발급']);
  const showMembership = sectionVisible(['프리미엄 구독', '구독', '구성원 관리', '가족 계정']);
  const showDisplay = sectionVisible([
    '디스플레이 설정',
    '테마',
    '시스템',
    '라이트',
    '다크',
    '글씨체 설정',
    '글자 크기 설정',
    '날씨 지역 설정',
  ]);
  const showSecurity = sectionVisible(['보안', '잠금화면']);
  const showEtc = sectionVisible(['고객센터', '문의', '의견', '개인정보 처리방침', '오픈소스 라이선스']);
  const noResults = !showProfile && !showQuickCards && !showMembership && !showDisplay && !showSecurity && !showEtc;

  const Row = ({
    icon,
    iconBg,
    iconColor,
    title,
    value,
    onPress,
    showDivider = true,
  }: {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    iconBg: string;
    iconColor: string;
    title: string;
    value?: string;
    onPress: () => void;
    showDivider?: boolean;
  }) => (
    <View>
      <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
        <View style={[styles.rowIconBadge, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={styles.rowTitle}>{title}</Text>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gray400} />
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </View>
  );

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
          headerRight:
            method !== 'none'
              ? () => (
                  <View style={styles.securePill}>
                    <MaterialCommunityIcons name="shield-check" size={13} color={colors.accent} />
                    <Text style={styles.securePillText}>보안 보호 중</Text>
                  </View>
                )
              : undefined,
        }}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 검색 */}
            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={18} color={colors.gray400} />
              <ClearableTextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="설정 항목 검색 (예: 고객센터, 잠금화면, 글자 크기)"
                placeholderTextColor={colors.gray400}
              />
            </View>

            {noResults && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="text-search" size={22} color={colors.gray400} />
                <Text style={styles.emptyStateText}>검색 결과가 없어요</Text>
              </View>
            )}

            {/* 계정 카드 */}
            {showProfile && (
              <View style={[styles.card, styles.profileCard]}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {(googleAccount?.name ?? '?').trim().charAt(0) || '?'}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.profileNameRow}>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {googleAccount ? googleAccount.name : '연동된 계정 없음'}
                    </Text>
                    {isSubscribed && (
                      <View style={styles.proBadge}>
                        <MaterialCommunityIcons name="lightning-bolt" size={11} color={colors.orange500} />
                        <Text style={styles.proBadgeText}>PRO</Text>
                      </View>
                    )}
                  </View>
                  {!!googleAccount?.email && (
                    <Text style={styles.profileEmail} numberOfLines={1}>
                      {googleAccount.email}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* 알림 설정 / 가족 키 공유 위젯 카드 */}
            {showQuickCards && (
              <View style={styles.quickRow}>
                <TouchableOpacity
                  style={[styles.card, styles.quickCard]}
                  activeOpacity={0.85}
                  onPress={() => router.push('/settings/notifications')}
                >
                  <View style={styles.quickCardTopRow}>
                    <View style={[styles.rowIconBadge, { backgroundColor: colors.orangeLight1 }]}>
                      <MaterialCommunityIcons name="bell-outline" size={18} color={colors.orange500} />
                    </View>
                    <Switch
                      style={styles.notifSwitch}
                      value={notificationSettings.enabled}
                      onValueChange={(v) => updateNotificationSettings({ ...notificationSettings, enabled: v })}
                      trackColor={{ true: colors.accent, false: colors.border }}
                      thumbColor={colors.cardWhite}
                    />
                  </View>
                  <Text style={styles.quickCardTitle}>알림 설정</Text>
                  <Text style={styles.quickCardSubtitle} numberOfLines={1}>
                    {notificationSettings.enabled
                      ? `${formatTimeOfDay(notificationSettings.dayBeforeTime)} 켜짐`
                      : '꺼짐'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.card, styles.quickCard]}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/settings/family', params: { title: '키 공유 / 재발급' } })}
                >
                  <View style={styles.quickCardTopRow}>
                    <View style={[styles.rowIconBadge, { backgroundColor: colors.lightBlueBg }]}>
                      <MaterialCommunityIcons name="key-variant" size={18} color={colors.accent} />
                    </View>
                    <Pressable onPress={handleCopyFamilyKey} hitSlop={6} style={styles.copyPill}>
                      <Text style={styles.copyPillText}>{copied ? '복사됨' : '복사'}</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.quickCardTitle}>가족 키 공유</Text>
                  <Text style={styles.quickCardKey} numberOfLines={1}>
                    {familyKey}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 멤버십 + 가족 계정 */}
            {showMembership && (
              <View style={styles.card}>
                <TouchableOpacity
                  style={[styles.row, styles.rowSpaceBetween]}
                  activeOpacity={0.7}
                  onPress={() => router.push('/settings/subscription')}
                >
                  <View style={styles.rowLeftGroup}>
                    <View style={[styles.rowIconBadge, { backgroundColor: colors.orangeLight1 }]}>
                      <MaterialCommunityIcons name="creation" size={17} color={colors.orange500} />
                    </View>
                    <View>
                      <Text style={styles.rowTitle}>프리미엄 구독</Text>
                      <Text
                        style={[styles.rowSubtitleInline, isSubscribed && { color: colors.accent }]}
                        numberOfLines={1}
                      >
                        {isSubscribed ? '구독 중' : '주 5회 → 주 10회·월 50회'}
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gray400} />
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={[styles.row, styles.rowSpaceBetween]}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/settings/family', params: { title: '구성원 관리' } })}
                >
                  <View style={styles.rowLeftGroup}>
                    <View style={[styles.rowIconBadge, { backgroundColor: colors.lightBlueBg }]}>
                      <MaterialCommunityIcons name="account-group-outline" size={17} color={colors.accent} />
                    </View>
                    <Text style={[styles.rowTitle, { flex: 0 }]}>구성원 관리</Text>
                  </View>
                  <View style={styles.rowRightGroup}>
                    <View style={styles.countPill}>
                      <Text style={styles.countPillText}>{familyMembers.length}명</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gray400} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* 디스플레이 설정 */}
            {showDisplay && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardHeaderTitle}>디스플레이 설정</Text>
                  <MaterialCommunityIcons name="palette-outline" size={18} color={colors.gray400} />
                </View>

                <View style={styles.segmentedControl}>
                  {(['system', 'light', 'dark'] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.segment, mode === m && styles.segmentActive]}
                      onPress={() => setMode(m)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name={m === 'system' ? 'monitor' : m === 'light' ? 'white-balance-sunny' : 'weather-night'}
                        size={14}
                        color={mode === m ? '#FFFFFF' : colors.textSecondary}
                      />
                      <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
                        {THEME_MODE_LABELS[m]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.divider} />
                <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => router.push('/settings/font')}>
                  <Text style={styles.rowTitle}>글씨체 설정</Text>
                  <Text style={styles.rowValue} numberOfLines={1}>{fontLabel}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gray400} />
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => router.push('/settings/font-size')}
                >
                  <Text style={styles.rowTitle}>글자 크기 설정</Text>
                  <Text style={styles.rowValue} numberOfLines={1}>
                    {fontSizeOption.label} ({fontSizePx}px)
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gray400} />
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => router.push('/settings/weather-region')}
                >
                  <Text style={styles.rowTitle}>날씨 지역 설정</Text>
                  <Text style={styles.rowValue} numberOfLines={1}>
                    {weatherLabel}
                    {weatherPreview ? ` ${weatherPreview.emoji} ${weatherPreview.tempC}°` : ''}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gray400} />
                </TouchableOpacity>
              </View>
            )}

            {/* 보안 */}
            {showSecurity && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>보안</Text>
                <View style={styles.card}>
                  <Row
                    icon="lock-outline"
                    iconBg={colors.tomorrowRedBg}
                    iconColor={colors.tomorrowRed}
                    title="잠금화면"
                    value={LOCK_METHOD_LABELS[method]}
                    onPress={() => router.push('/settings/app-lock')}
                    showDivider={false}
                  />
                </View>
              </View>
            )}

            {/* 기타 */}
            {showEtc && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>기타</Text>
                <View style={styles.card}>
                  <TouchableOpacity style={styles.plainRow} activeOpacity={0.7} onPress={() => router.push('/settings/support')}>
                    <Text style={styles.rowTitle}>고객센터 / 문의 및 의견 보내기</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gray400} />
                  </TouchableOpacity>
                  <View style={styles.divider} />
                  <TouchableOpacity style={styles.plainRow} activeOpacity={0.7} onPress={() => router.push('/settings/privacy')}>
                    <Text style={styles.rowTitle}>개인정보 처리방침</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gray400} />
                  </TouchableOpacity>
                  <View style={styles.divider} />
                  <TouchableOpacity style={styles.plainRow} activeOpacity={0.7} onPress={() => router.push('/settings/licenses')}>
                    <Text style={styles.rowTitle}>오픈소스 라이선스</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gray400} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.versionContainer}>
              <Text style={styles.versionText}>버전 정보 v{appVersion}</Text>
            </View>

            <View style={styles.footerLinkRow}>
              <TouchableOpacity onPress={handleLogout}>
                <Text style={styles.footerLinkText}>로그아웃</Text>
              </TouchableOpacity>
              <Text style={styles.footerLinkDivider}>|</Text>
              <TouchableOpacity onPress={handleWithdraw}>
                <Text style={styles.footerLinkText}>회원탈퇴</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    screenBg: { flex: 1, backgroundColor: t.bg },
    headerBackButton: { paddingHorizontal: 4 },
    safeArea: { flex: 1 },
    container: { flex: 1 },
    scrollContent: { paddingTop: 8, paddingHorizontal: 16 },
    securePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.lightBlueBg,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginRight: 4,
    },
    securePillText: { fontSize: 11.5, fontWeight: '700', color: colors.accent },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.cardWhite,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 16,
    },
    searchInput: { flex: 1, fontSize: 13, color: colors.textPrimary, padding: 0 },
    emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyStateText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
    card: {
      backgroundColor: colors.cardWhite,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 8,
      marginBottom: 16,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8 },
        android: { elevation: 1.5 },
      }),
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
    },
    avatarCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.lightBlueBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: { fontSize: 18, fontWeight: '800', color: colors.accent },
    profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    profileName: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, flexShrink: 1 },
    proBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.orangeLight1,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    proBadgeText: { fontSize: 10, fontWeight: '800', color: colors.orange500 },
    profileEmail: { fontSize: 12.5, color: colors.textSecondary, fontWeight: '500' },
    quickRow: { flexDirection: 'row', gap: 12 },
    quickCard: { flex: 1, padding: 14 },
    quickCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    notifSwitch: { transform: [{ scaleX: 1.18 }, { scaleY: 1.05 }] },
    quickCardTitle: { fontSize: 13.5, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 },
    quickCardSubtitle: { fontSize: 11.5, color: colors.textSecondary, fontWeight: '600' },
    quickCardKey: { fontSize: 15, fontWeight: '800', color: colors.accent, letterSpacing: 0.5 },
    copyPill: {
      backgroundColor: colors.gray100,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    copyPillText: { fontSize: 10.5, fontWeight: '700', color: colors.textSecondary },
    rowIconBadge: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 16,
    },
    rowSpaceBetween: { justifyContent: 'space-between' },
    rowLeftGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowRightGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rowSubtitleInline: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
    plainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 16,
    },
    rowTitle: { fontSize: 14.5, fontWeight: '700', color: colors.textPrimary, flex: 1 },
    rowValue: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginRight: 2 },
    divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 12 },
    countPill: { backgroundColor: colors.lightBlueBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    countPillText: { fontSize: 12, fontWeight: '800', color: colors.accent },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingTop: 6,
      paddingBottom: 12,
    },
    cardHeaderTitle: { fontSize: 13.5, fontWeight: '800', color: colors.textSecondary },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.gray100,
      borderRadius: 999,
      padding: 4,
      marginHorizontal: 8,
      marginBottom: 8,
    },
    segment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 9,
      borderRadius: 999,
    },
    segmentActive: { backgroundColor: colors.accent },
    segmentText: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
    segmentTextActive: { color: '#FFFFFF', fontWeight: '800' },
    sectionBlock: { marginBottom: 0 },
    sectionLabel: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary, marginLeft: 10, marginBottom: 8 },
    versionContainer: { alignItems: 'center', marginTop: 8 },
    versionText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    footerLinkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
    footerLinkText: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
    footerLinkDivider: { fontSize: 13, color: colors.border, fontWeight: '400' },
  });
}
