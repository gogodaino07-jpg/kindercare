import * as Clipboard from 'expo-clipboard';
import * as Contacts from 'expo-contacts';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
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
  const { title: titleParam } = useLocalSearchParams<{ title?: string }>();
  const { familyKey, familyMembers, removeMember, leaveFamily, regenerateFamilyKey, updateMemberPhone } =
    useAppData();
  const { showAlert } = useAlert();
  const { isLocked } = useAppLock();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [displayedKey, setDisplayedKey] = useState(familyKey);
  const [copied, setCopied] = useState(false);
  const [phoneModalMemberId, setPhoneModalMemberId] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');

  const self = familyMembers.find((m) => m.isOwner) ?? familyMembers[0];
  const phoneModalMember = familyMembers.find((m) => m.id === phoneModalMemberId);

  useEffect(() => {
    if (isLocked && phoneModalMemberId) {
      setPhoneModalMemberId(null);
      setPhoneInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked]);

  const handleReissue = () => {
    const newKey = regenerateFamilyKey();
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

  const savePhone = () => {
    if (!phoneModalMemberId) return;
    const trimmed = phoneInput.trim();
    if (!trimmed) return;
    updateMemberPhone(phoneModalMemberId, trimmed);
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
    <ScreenBackground>
      <Stack.Screen options={{ title: titleParam ?? '가족 계정' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.content}>
          <Text style={styles.sectionLabel}>가족 키</Text>
          <View style={styles.keyCard}>
            <Text style={styles.keyText}>{displayedKey}</Text>
            <Pressable style={styles.copyButton} onPress={handleCopy} accessibilityLabel="키 복사">
              <Text style={styles.copyButtonText}>{copied ? '✓ 복사됨' : '📋 복사하기'}</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>구성원</Text>
          {familyMembers.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>{member.name[0]}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                {member.isOwner ? <Text style={styles.ownerBadge}>소유자</Text> : null}
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

          <Pressable style={styles.reissueButton} onPress={handleReissue}>
            <Text style={styles.reissueButtonText}>키 재발급</Text>
          </Pressable>
        </View>
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
              onChangeText={setPhoneInput}
              placeholder="010-0000-0000"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              maxLength={13}
              autoFocus
            />
            <View style={styles.phoneModalButtonRow}>
              <Pressable style={styles.phoneModalCancelButton} onPress={closePhoneModal}>
                <Text style={styles.phoneModalCancelText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.phoneModalSaveButton, !phoneInput.trim() && styles.phoneModalSaveButtonDisabled]}
                onPress={savePhone}
                disabled={!phoneInput.trim()}
              >
                <Text style={styles.phoneModalSaveText}>저장</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
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
      backgroundColor: '#EEF2F5',
    },
    copyButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
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
      backgroundColor: '#EEF2F5',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
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
    phoneAddButton: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: '#EEF2F5',
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
      backgroundColor: '#EAF6EE',
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
      backgroundColor: '#FDECEA',
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.tomorrowRed,
    },
    reissueButton: {
      marginTop: 24,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 14,
      backgroundColor: colors.cardWhite,
      ...SHADOW,
    },
    reissueButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    phoneModalOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    phoneModalBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(20, 24, 22, 0.5)',
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
      backgroundColor: '#EEF2F5',
    },
    importContactButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
    },
    phoneModalInput: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1.5,
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
      backgroundColor: colors.accent,
    },
    phoneModalSaveButtonDisabled: {
      opacity: 0.4,
    },
    phoneModalSaveText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}
