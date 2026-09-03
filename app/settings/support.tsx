import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import TextInput from '../../components/common/ClearableTextInput';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../../components/common/AppText';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { useThemeColors } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { stripInvalidCharacters } from '../../utils/validation';

const CONTENT_MAX_LENGTH = 500;
const SUPPORT_EMAIL = 'gogodaino07@gmail.com';
type DomainValue = 'naver.com' | 'gmail.com' | 'daum.net' | 'kakao.com' | 'custom';
const DOMAIN_OPTIONS: { value: DomainValue; label: string }[] = [
  { value: 'naver.com', label: 'naver.com' },
  { value: 'gmail.com', label: 'gmail.com' },
  { value: 'daum.net', label: 'daum.net' },
  { value: 'kakao.com', label: 'kakao.com' },
  { value: 'custom', label: '직접 입력' },
];

export default function SupportScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { googleAccount } = useAppData();

  const [accountId, accountDomain] = (googleAccount?.email ?? '').split('@');
  const matchedDomain = DOMAIN_OPTIONS.find((o) => o.value === accountDomain);

  const [emailId, setEmailId] = useState(accountId ?? '');
  const [domainOption, setDomainOption] = useState<DomainValue>(
    matchedDomain ? matchedDomain.value : accountDomain ? 'custom' : 'naver.com'
  );
  const [customDomain, setCustomDomain] = useState(!matchedDomain ? (accountDomain ?? '') : '');
  const [domainMenuOpen, setDomainMenuOpen] = useState(false);
  const [content, setContent] = useState('');

  const domainValid = domainOption === 'custom' ? customDomain.trim().includes('.') : true;
  const emailValid = emailId.trim().length > 0 && domainValid;
  const contentValid = content.trim().length > 0;
  const canSend = emailValid && contentValid;

  // 이메일 발송 백엔드가 없어서, 문의 내용을 기기의 메일 앱으로 넘겨 사용자가
  // 직접 보내게 한다 — 예전엔 여기서 아무것도 실제로 보내지 않고 성공 토스트만
  // 띄우는 미완성 상태라, 문의를 넣어도 메일이 전혀 오지 않는 버그가 있었다.
  const handleSend = () => {
    if (!canSend) return;
    const domain = domainOption === 'custom' ? customDomain.trim() : domainOption;
    const replyEmail = `${emailId.trim()}@${domain}`;
    const subject = encodeURIComponent('[킨더케어] 고객센터 문의');
    const body = encodeURIComponent(`답변받을 이메일: ${replyEmail}\n\n${content.trim()}`);
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    Linking.openURL(url).catch(() => {
      showToast('메일 앱을 열 수 없어요. 기기에 메일 앱이 설정돼 있는지 확인해주세요.');
    });
  };

  return (
    <View style={styles.screenBg}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: colors.skyBackground },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBackButton}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>답변받을 이메일</Text>
          <View style={styles.emailRow}>
            <TextInput
              style={[styles.input, styles.emailIdInput]}
              value={emailId}
              onChangeText={(text) => setEmailId(stripInvalidCharacters(text, '._-'))}
              placeholder="아이디"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />
            <Text style={styles.atSign}>@</Text>
            <Pressable
              style={[styles.input, styles.emailDomainInput]}
              onPress={() => setDomainMenuOpen(true)}
            >
              <Text style={{ color: colors.textPrimary }}>{domainOption === 'custom' ? customDomain || '직접 입력' : domainOption}</Text>
              <Text style={styles.chevron}>⌄</Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>문의 내용</Text>
          <View style={styles.contentBox}>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={(text) => setContent(stripInvalidCharacters(text).slice(0, CONTENT_MAX_LENGTH))}
              placeholder="앱 사용 중 불편했던 점이나 개선 아이디어를 남겨주세요."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={CONTENT_MAX_LENGTH}
            />
            <Text style={styles.counterText}>{content.length} / {CONTENT_MAX_LENGTH}</Text>
          </View>
        </ScrollView>

        <View style={[styles.buttonContainer, { bottom: 24 + insets.bottom }]}>
          <Text style={styles.privacyNotice}>
            문의 시 입력하신 이메일 주소는 답변 용도로만 사용됩니다.
          </Text>
          <Pressable
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Text style={styles.sendButtonText}>문의 전송하기</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal visible={domainMenuOpen} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setDomainMenuOpen(false)}>
          <View style={styles.menuCard}>
            {DOMAIN_OPTIONS.map((opt) => (
              <Pressable key={opt.value} style={styles.menuItem} onPress={() => { setDomainOption(opt.value); setDomainMenuOpen(false); }}>
                <Text style={{ color: colors.textPrimary }}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screenBg: { flex: 1, backgroundColor: colors.skyBackground },
    headerBackButton: { paddingHorizontal: 4 },
    safeArea: { flex: 1 },
    content: { padding: 20, paddingBottom: 120 },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
    sectionLabelSpaced: { marginTop: 24 },
    emailRow: { flexDirection: 'row', alignItems: 'center' },
    input: {
      backgroundColor: colors.cardWhite,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
    },
    emailIdInput: { flex: 1 },
    atSign: { fontSize: 15, fontWeight: '700', color: colors.textSecondary, marginHorizontal: 8 },
    emailDomainInput: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
    chevron: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
    contentBox: { backgroundColor: colors.gray50, borderRadius: 14, padding: 14, minHeight: 180, borderWidth: 1, borderColor: colors.border },
    contentInput: { flex: 1, fontSize: 14, color: colors.textPrimary, minHeight: 140, textAlignVertical: 'top' },
    counterText: { alignSelf: 'flex-end', fontSize: 11, color: colors.textSecondary, marginTop: 6 },
    privacyNotice: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 12,
      fontWeight: '500',
    },
    buttonContainer: { position: 'absolute', left: 20, right: 20, zIndex: 100, elevation: 5 },
    sendButton: { backgroundColor: colors.gray900, borderRadius: 16, paddingVertical: 16, alignItems: 'center', ...SHADOW },
    sendButtonDisabled: { opacity: 0.4 },
    sendButtonText: { color: colors.cardWhite, fontSize: 16, fontWeight: '700' },
    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    menuCard: { width: '80%', backgroundColor: colors.cardWhite, borderRadius: 16, padding: 10 },
    menuItem: { padding: 15, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  });
}
