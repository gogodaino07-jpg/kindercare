import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import Text from '../../components/common/AppText';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

const CONTENT_MAX_LENGTH = 500;

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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [emailId, setEmailId] = useState('');
  const [domainOption, setDomainOption] = useState<DomainValue>('naver.com');
  const [customDomain, setCustomDomain] = useState('');
  const [domainMenuOpen, setDomainMenuOpen] = useState(false);
  const [content, setContent] = useState('');

  const domainValid =
    domainOption === 'custom' ? customDomain.trim().includes('.') : true;
  const emailValid = emailId.trim().length > 0 && domainValid;
  const contentValid = content.trim().length > 0;
  const canSend = emailValid && contentValid;

  const handleSelectDomain = (value: DomainValue) => {
    setDomainOption(value);
    if (value === 'custom') setCustomDomain('');
    setDomainMenuOpen(false);
  };

  const handleSend = () => {
    if (!canSend) return;
    showToast('문의가 성공적으로 접수되었습니다.');
    router.back();
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>답변받을 이메일</Text>
          <View style={styles.emailRow}>
            <TextInput
              style={[styles.input, styles.emailIdInput]}
              value={emailId}
              onChangeText={setEmailId}
              placeholder="아이디"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.atSign}>@</Text>
            {domainOption === 'custom' ? (
              <View style={[styles.input, styles.emailDomainInput, styles.domainCustomRow]}>
                <TextInput
                  style={styles.domainCustomInput}
                  value={customDomain}
                  onChangeText={setCustomDomain}
                  placeholder="도메인 입력"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={() => setDomainMenuOpen(true)}
                  accessibilityLabel="도메인 선택"
                  hitSlop={8}
                >
                  <Text style={styles.chevron}>⌄</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[styles.input, styles.emailDomainInput, styles.domainDisplay]}
                onPress={() => setDomainMenuOpen(true)}
                accessibilityLabel="도메인 선택"
              >
                <Text style={styles.domainDisplayText} numberOfLines={1}>
                  {domainOption}
                </Text>
                <Text style={styles.chevron}>⌄</Text>
              </Pressable>
            )}
          </View>

          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>문의 내용</Text>
          <View style={styles.contentBox}>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={(text) => setContent(text.slice(0, CONTENT_MAX_LENGTH))}
              placeholder="앱 사용 중 불편했던 점이나 개선 아이디어를 자유롭게 남겨주세요."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={CONTENT_MAX_LENGTH}
              textAlignVertical="top"
            />
            <Text style={styles.counterText}>
              {content.length} / {CONTENT_MAX_LENGTH}
            </Text>
          </View>
        </ScrollView>

        <Pressable
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Text style={styles.sendButtonText}>문의 전송하기</Text>
        </Pressable>
      </SafeAreaView>

      <Modal
        visible={domainMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDomainMenuOpen(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setDomainMenuOpen(false)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            {DOMAIN_OPTIONS.map((option, idx) => {
              const isSelected = option.value === domainOption;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.menuItem,
                    idx < DOMAIN_OPTIONS.length - 1 && styles.menuItemDivider,
                  ]}
                  onPress={() => handleSelectDomain(option.value)}
                >
                  <Text style={[styles.menuItemText, isSelected && styles.menuItemTextSelected]}>
                    {option.label}
                  </Text>
                  {isSelected ? <Text style={styles.menuCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: { padding: 20 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    sectionLabelSpaced: {
      marginTop: 24,
    },
    emailRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: {
      backgroundColor: colors.cardWhite,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.textPrimary,
      ...SHADOW,
    },
    emailIdInput: {
      flex: 1,
    },
    atSign: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textSecondary,
      marginHorizontal: 8,
    },
    emailDomainInput: {
      flex: 1,
    },
    domainDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    domainDisplayText: {
      flexShrink: 1,
      fontSize: 14,
      color: colors.textPrimary,
    },
    domainCustomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    domainCustomInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      padding: 0,
    },
    chevron: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
      marginLeft: 6,
    },
    contentBox: {
      backgroundColor: '#F1F3F5',
      borderRadius: 14,
      padding: 14,
      minHeight: 180,
    },
    contentInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      minHeight: 140,
    },
    counterText: {
      alignSelf: 'flex-end',
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 6,
    },
    sendButton: {
      marginHorizontal: 20,
      marginBottom: 16,
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      ...SHADOW,
    },
    sendButtonDisabled: {
      opacity: 0.4,
    },
    sendButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(30, 41, 59, 0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    menuCard: {
      width: '100%',
      maxWidth: 280,
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      paddingVertical: 6,
      ...SHADOW,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 18,
    },
    menuItemDivider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    menuItemTextSelected: {
      fontWeight: '700',
      color: colors.accent,
    },
    menuCheck: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.accent,
    },
  });
}
