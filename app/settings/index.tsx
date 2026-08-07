import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../../components/common/AppText';
import { useAlert } from '../../context/AlertContext';
import { useAppData } from '../../context/AppDataContext';
import { useAppLock } from '../../context/AppLockContext';
import { useNotificationCenter } from '../../context/NotificationCenterContext';
import { THEME_MODE_LABELS, useTheme } from '../../context/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, setMode, colors, resolvedScheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showAlert } = useAlert();
  const { resetAllData, requestWithdrawal, googleAccount, signOutGoogle } = useAppData();
  const { resetLock } = useAppLock();
  const { clearNotifications } = useNotificationCenter();

  // 섹션 타이틀(이모지 포함)과 카드를 감싸는 컴포넌트
  const SettingSection = ({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.card}>
        {children}
      </View>
    </View>
  );

  // 카드 내부의 개별 리스트 아이템 컴포넌트
  const SettingItem = ({
    title,
    subtitle,
    onPress,
    showDivider = true,
    isProfile = false,
    highlightSubtitle = false,
    rightElement
  }: {
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showDivider?: boolean;
    isProfile?: boolean;
    highlightSubtitle?: boolean;
    rightElement?: React.ReactNode;
  }) => (
    <View>
      <TouchableOpacity
        style={styles.cardItem}
        activeOpacity={onPress ? 0.7 : 1}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={{ flex: 1 }}>
          {isProfile ? (
            <>
              <View style={styles.profileNameRow}>
                <View style={styles.greenDot} />
                <Text style={styles.profileTitle}>{title}</Text>
              </View>
              <Text style={styles.profileSubtitle}>{subtitle}</Text>
            </>
          ) : (
            <>
              <Text style={styles.itemTitle}>{title}</Text>
              {subtitle && (
                <Text style={[styles.itemSubtitle, highlightSubtitle && styles.highlightText]}>
                  {subtitle}
                </Text>
              )}
            </>
          )}
        </View>
        {rightElement ? (
          rightElement
        ) : (
          <Text style={styles.arrowIcon}>›</Text>
        )}
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </View>
  );

  const handleLogout = () => {
    showAlert({
      title: '로그아웃',
      message: '구글 계정 연동을 해제할까요?',
      buttons: [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: () => {
            signOutGoogle();
            router.dismissAll();
            router.replace('/onboarding');
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
        '7일의 유예기간이 제공됩니다. 유예기간 내에 재로그인하면 복구가 가능하지만, 7일이 지나면 모든 데이터가 완전히 삭제되어 복구할 수 없습니다.',
      buttons: [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴 요청',
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
                title: '탈퇴 요청 완료',
                message: '탈퇴 요청이 정상적으로 접수되었습니다.\n\n7일 이내에 다시 로그인하시면 언제든 계정을 복구하실 수 있습니다.',
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
                message: '탈퇴 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
              });
            }
          },
        },
      ],
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.skyBackground }]}>
      <View style={[styles.container, { backgroundColor: colors.skyBackground }]}>

        {/* 스크롤 영역 */}
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >

          {/* 계정 섹션 */}
          <SettingSection emoji="👤" title="내 계정">
            <SettingItem
              title={googleAccount ? googleAccount.name : '연동된 계정 없음'}
              subtitle={googleAccount?.email}
              isProfile={true}
            />
            <SettingItem title="로그아웃" onPress={handleLogout} showDivider={false} />
          </SettingSection>

          {/* 알림 섹션 */}
          <SettingSection emoji="🔔" title="알림">
            <SettingItem title="알림 설정" onPress={() => router.push('/settings/notifications')} showDivider={false} />
          </SettingSection>

          {/* 가족 계정 섹션 */}
          <SettingSection emoji="👨‍👩‍👧" title="가족 계정">
            <SettingItem title="구성원 관리" onPress={() => router.push({ pathname: '/settings/family', params: { title: '구성원 관리' } })} />
            <SettingItem title="키 재발급" onPress={() => router.push({ pathname: '/settings/family', params: { title: '키 재발급' } })} showDivider={false} />
          </SettingSection>

          {/* 디스플레이 설정 섹션 */}
          <SettingSection emoji="🎨" title="디스플레이 설정">
            <SettingItem
              title="테마"
              rightElement={
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={styles.radioItem}
                    onPress={() => setMode('light')}
                  >
                    <View style={[styles.radioCircle, mode === 'light' && styles.radioCircleSelected]}>
                      {mode === 'light' && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.radioText, mode === 'light' && styles.radioTextSelected]}>라이트</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.radioItem}
                    onPress={() => setMode('dark')}
                  >
                    <View style={[styles.radioCircle, mode === 'dark' && styles.radioCircleSelected]}>
                      {mode === 'dark' && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.radioText, mode === 'dark' && styles.radioTextSelected]}>다크</Text>
                  </TouchableOpacity>
                </View>
              }
            />
            <SettingItem title="글씨체 설정" onPress={() => router.push('/settings/font')} />
            <SettingItem title="글자 크기 설정" onPress={() => router.push('/settings/font-size')} showDivider={false} />
          </SettingSection>

          {/* 보안 섹션 */}
          <SettingSection emoji="🔒" title="보안">
            <SettingItem title="잠금화면" onPress={() => router.push('/settings/app-lock')} showDivider={false} />
          </SettingSection>

          {/* 기타 섹션 */}
          <SettingSection emoji="📎" title="기타">
            <SettingItem title="고객센터 / 문의 및 의견 보내기" onPress={() => router.push('/settings/support')} showDivider={false} />
          </SettingSection>

          {/* 회원탈퇴 링크 */}
          <TouchableOpacity style={styles.withdrawButton} onPress={handleWithdraw}>
            <Text style={styles.withdrawText}>회원탈퇴</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 8,
    },
    section: {
      paddingHorizontal: 16,
      marginTop: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      marginLeft: 4,
    },
    sectionEmoji: {
      fontSize: 16,
      marginRight: 6,
    },
    sectionTitle: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: 'bold',
    },
    card: {
      backgroundColor: colors.cardWhite,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 8,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.02,
          shadowRadius: 8,
        },
        android: {
          elevation: 1.5,
        },
      }),
    },
    cardItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 16,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 12,
    },
    profileNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    greenDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#22C55E',
      marginRight: 6,
    },
    profileTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    profileSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    itemSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    highlightText: {
      color: colors.accent,
    },
    radioGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    radioItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    radioCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.gray400,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioCircleSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    radioText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    radioTextSelected: {
      color: colors.textPrimary,
      fontWeight: 'bold',
    },
    arrowIcon: {
      fontSize: 20,
      color: colors.gray400,
    },
    withdrawButton: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    withdrawText: {
      fontSize: 14,
      color: colors.tomorrowRed,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
  });
}
