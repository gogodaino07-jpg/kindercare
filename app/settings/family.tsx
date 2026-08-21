import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Contacts from 'expo-contacts';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { calendarTheme as t } from '../../components/calendar/calendarTheme';
import Text from '../../components/common/AppText';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useAlert } from '../../context/AlertContext';
import { useAppData } from '../../context/AppDataContext';
import { useAppLock } from '../../context/AppLockContext';
import { useThemeColors } from '../../context/ThemeContext';
import { FamilyMember } from '../../types/models';
import { markExternalActionBriefly, setExternalActionActive } from '../../utils/externalAction';

function formatPhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function FamilyMembersScreen() {
  const router = useRouter();
  const { title: titleParam } = useLocalSearchParams<{ title?: string }>();
  const isManagementMode = titleParam === '구성원 관리';
  const isReissueMode = titleParam === '키 공유 / 재발급';

  const { familyKey, familyMembers, removeMember, leaveFamily, regenerateFamilyInvite, updateMemberPhone, googleAccount } =
    useAppData();
  const { showAlert } = useAlert();
  const { isLocked } = useAppLock();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [displayedKey, setDisplayedKey] = useState(familyKey);

  useEffect(() => {
    setDisplayedKey(familyKey);
  }, [familyKey]);
  const [copied, setCopied] = useState(false);
  const [phoneModalMemberId, setPhoneModalMemberId] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');

  // 실제 합류 동기화가 들어오면서 구성원이 2명 이상일 수 있어, 소유자 여부가 아니라
  // 로그인 이메일로 "나"를 정확히 찾는다(이메일이 없는 옛 로컬 전용 항목은 소유자로 폴백).
  const self =
    familyMembers.find((m) => m.email && m.email === googleAccount?.email) ??
    familyMembers.find((m) => m.isOwner) ??
    familyMembers[0];
  const phoneModalMember = familyMembers.find((m) => m.id === phoneModalMemberId);

  useEffect(() => {
    if (isLocked && phoneModalMemberId) {
      setPhoneModalMemberId(null);
      setPhoneInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked]);

  const handleReissue = async () => {
    const newKey = await regenerateFamilyInvite();
    setDisplayedKey(newKey);
    setCopied(false);
    showAlert({ title: '새 키가 발급됐어요', message: '기존 키는 더 이상 사용할 수 없어요.' });
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(displayedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showAlert({ title: '복사에 실패했어요', message: '잠시 후 다시 시도해주세요.' });
    }
  };

  const handleRemove = (memberId: string, name: string) => {
    showAlert({
      title: '내보내기',
      message: `${name}님을 그룹에서 내보낼까요?`,
      buttons: [
        { text: '취소', style: 'cancel' },
        { text: '내보내기', style: 'destructive', onPress: () => removeMember(memberId) },
      ],
    });
  };

  const handleLeave = (memberId: string) => {
    showAlert({
      title: '그룹 나가기',
      message: '정말 그룹에서 나가시겠어요?',
      buttons: [
        { text: '취소', style: 'cancel' },
        { text: '나가기', style: 'destructive', onPress: () => leaveFamily(memberId) },
      ],
    });
  };

  const openPhoneModal = (member: FamilyMember) => {
    setPhoneInput(member.phone ?? '');
    setPhoneModalMemberId(member.id);
  };

  const closePhoneModal = () => {
    setPhoneModalMemberId(null);
    setPhoneInput('');
  };

  const phoneValid = /^010-\d{4}-\d{4}$/.test(phoneInput);

  const savePhone = () => {
    if (!phoneModalMemberId || !phoneValid) return;
    updateMemberPhone(phoneModalMemberId, phoneInput);
    closePhoneModal();
  };

  const handleImportContact = async () => {
    setExternalActionActive(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        showAlert({ title: '연락처 접근 권한이 필요해요', message: '설정에서 연락처 접근을 허용해주세요.' });
        return;
      }
      const picked = await Contacts.Contact.presentPicker();
      if (!picked) return;
      const phones = await picked.getPhones();
      const number = phones[0]?.number;
      if (number) {
        setPhoneInput(formatPhoneNumber(number));
      }
    } catch {
      showAlert({ title: '연락처를 가져오지 못했어요', message: '잠시 후 다시 시도해주세요.' });
    } finally {
      setExternalActionActive(false);
    }
  };

  const handleCallOrEdit = (member: FamilyMember) => {
    showAlert({
      title: member.name,
      message: member.phone,
      buttons: [
        {
          text: '전화 걸기',
          onPress: () => {
            markExternalActionBriefly();
            Linking.openURL(`tel:${member.phone}`);
          },
        },
        { text: '번호 수정', onPress: () => openPhoneModal(member) },
        {
          text: '번호 삭제',
          style: 'destructive',
          onPress: () => updateMemberPhone(member.id, null),
        },
        { text: '취소', style: 'cancel' },
      ],
    });
  };

  return (
    <View style={styles.screenBg}>
      <Stack.Screen
        options={{
          title: titleParam ?? '가족 계정',
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
          {isReissueMode && (
            <>
              <Text style={styles.sectionLabel}>가족 키</Text>
              <View style={styles.keyCard}>
                <Text style={styles.keyText}>{displayedKey}</Text>
                <Pressable
                  style={styles.copyButton}
                  onPress={handleCopy}
                  accessibilityLabel="키 복사"
                >
                  <Text style={styles.copyButtonText}>{copied ? '✓ 복사됨' : '📋 복사하기'}</Text>
                </Pressable>
              </View>
            </>
          )}

          {isManagementMode && (
            <>
              <Text style={styles.sectionLabel}>구성원</Text>
              {familyMembers.map((member) => (
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{member.name[0]}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    {member.isOwner ? (
                      <Text style={styles.ownerBadge}>소유자</Text>
                    ) : member.role ? (
                      <Text style={styles.roleBadge}>
                        {member.role} · {member.canEdit ? '편집 가능' : '읽기 전용'}
                      </Text>
                    ) : null}
                  </View>

                  {member.phone ? (
                    <Pressable
                      style={styles.phoneIconButton}
                      onPress={() => handleCallOrEdit(member)}
                      accessibilityLabel={`${member.name} 전화`}
                    >
                      <Text style={styles.phoneIcon}>📞</Text>
                    </Pressable>
                  ) : member.isOwner ? null : (
                    <Pressable
                      style={styles.phoneAddButton}
                      onPress={() => openPhoneModal(member)}
                      accessibilityLabel={`${member.name} 전화번호 추가`}
                    >
                      <Text style={styles.phoneAddButtonText}>+ 전화번호</Text>
                    </Pressable>
                  )}

                  {self?.isOwner && !member.isOwner ? (
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => handleRemove(member.id, member.name)}
                    >
                      <Text style={styles.actionButtonText}>내보내기</Text>
                    </Pressable>
                  ) : null}
                  {!self?.isOwner && member.id === self?.id ? (
                    <Pressable style={styles.actionButton} onPress={() => handleLeave(member.id)}>
                      <Text style={styles.actionButtonText}>그룹 나가기</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </>
          )}
        </ScrollView>

        {isReissueMode && (
          <View style={[styles.buttonContainer, { bottom: 24 + insets.bottom }]}>
            <Pressable style={styles.reissueButton} onPress={handleReissue}>
              <Text style={styles.reissueButtonText}>키 재발급</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      <Modal
        visible={!!phoneModalMemberId}
        transparent
        animationType="fade"
        onRequestClose={closePhoneModal}
      >
        <KeyboardAvoidingView
          style={styles.phoneModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Backdrop is intentionally non-interactive — outside taps must
              NOT dismiss this modal (prevents accidental input loss); only
              the 취소/저장 buttons below can close it. */}
          <View style={styles.phoneModalBackdrop} />
          <View style={styles.phoneModalCard}>
            <Text style={styles.phoneModalTitle}>전화번호 등록</Text>
            {phoneModalMember && !phoneModalMember.isOwner ? (
              <Pressable style={styles.importContactButton} onPress={handleImportContact}>
                <Text style={styles.importContactButtonText}>📱 주소록에서 가져오기</Text>
              </Pressable>
            ) : null}
            <TextInput
              style={styles.phoneModalInput}
              value={phoneInput}
              onChangeText={(text) => setPhoneInput(formatPhoneNumber(text))}
              placeholder="010-0000-0000"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={13}
              autoFocus
            />
            <View style={styles.phoneModalButtonRow}>
              <Pressable style={styles.phoneModalCancelButton} onPress={closePhoneModal}>
                <Text style={styles.phoneModalCancelText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.phoneModalSaveButton, !phoneValid && styles.phoneModalSaveButtonDisabled]}
                onPress={savePhone}
                disabled={!phoneValid}
              >
                <Text style={styles.phoneModalSaveText}>저장</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screenBg: { flex: 1, backgroundColor: t.bg },
    headerBackButton: { paddingHorizontal: 4 },
    safeArea: { flex: 1, backgroundColor: t.bg },
    content: { padding: 20, paddingBottom: 120 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 8,
      marginTop: 16,
    },
    keyCard: {
      backgroundColor: colors.cardWhite,
      borderRadius: 14,
      paddingVertical: 18,
      alignItems: 'center',
      ...SHADOW,
    },
    keyText: {
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: 2,
      color: colors.accent,
    },
    copyButton: {
      marginTop: 10,
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: colors.gray100,
      borderWidth: 1,
      borderColor: colors.gray400,
    },
    copyButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.gray900,
    },
    memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardWhite,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      ...SHADOW,
    },
    memberAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.gray100,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    memberAvatarText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    memberInfo: { flex: 1 },
    memberName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    ownerBadge: {
      fontSize: 11,
      color: colors.accent,
      fontWeight: '700',
      marginTop: 2,
    },
    roleBadge: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '700',
      marginTop: 2,
    },
    phoneAddButton: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: colors.gray100,
      borderWidth: 1,
      borderColor: colors.gray400,
      marginRight: 8,
    },
    phoneAddButtonText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    phoneIconButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.green50,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    phoneIcon: {
      fontSize: 14,
    },
    actionButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.tomorrowRedBg,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.tomorrowRed,
    },
    reissueButton: {
      paddingVertical: 16,
      alignItems: 'center',
      borderRadius: 16,
      backgroundColor: colors.gray900, // Dynamic black/white
      ...SHADOW,
    },
    reissueButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.cardWhite,
    },
    buttonContainer: {
      position: 'absolute',
      left: 20,
      right: 20,
      zIndex: 100,
      elevation: 5,
    },
    phoneModalOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    phoneModalBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    phoneModalCard: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.cardWhite,
      borderRadius: 22,
      padding: 22,
      ...SHADOW,
    },
    phoneModalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 14,
    },
    importContactButton: {
      alignSelf: 'center',
      marginBottom: 14,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: colors.gray100,
      borderWidth: 1,
      borderColor: colors.gray400,
    },
    importContactButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
    },
    phoneModalInput: {
      backgroundColor: colors.gray100,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    phoneModalButtonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    phoneModalCancelButton: {
      flex: 1,
      paddingVertical: 13,
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    phoneModalCancelText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    phoneModalSaveButton: {
      flex: 1,
      paddingVertical: 13,
      alignItems: 'center',
      borderRadius: 14,
      backgroundColor: colors.gray900,
    },
    phoneModalSaveButtonDisabled: {
      opacity: 0.4,
    },
    phoneModalSaveText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.cardWhite,
    },
  });
}
