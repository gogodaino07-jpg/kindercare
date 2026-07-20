import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import { COLORS, SHADOW } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';

export default function FamilyMembersScreen() {
  const { familyKey, familyMembers, removeMember, leaveFamily, regenerateFamilyKey } =
    useAppData();
  const [displayedKey, setDisplayedKey] = useState(familyKey);
  const [copied, setCopied] = useState(false);

  const self = familyMembers.find((m) => m.isOwner) ?? familyMembers[0];

  const handleReissue = () => {
    const newKey = regenerateFamilyKey();
    setDisplayedKey(newKey);
    setCopied(false);
    Alert.alert('새 키가 발급됐어요', '기존 키는 더 이상 사용할 수 없어요.');
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(displayedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      Alert.alert('복사에 실패했어요', '잠시 후 다시 시도해주세요.');
    }
  };

  const handleRemove = (memberId: string, name: string) => {
    Alert.alert('내보내기', `${name}님을 그룹에서 내보낼까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '내보내기', style: 'destructive', onPress: () => removeMember(memberId) },
    ]);
  };

  const handleLeave = (memberId: string) => {
    Alert.alert('그룹 나가기', '정말 그룹에서 나가시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '나가기', style: 'destructive', onPress: () => leaveFamily(memberId) },
    ]);
  };

  return (
    <ScreenBackground>
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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  keyCard: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    ...SHADOW,
  },
  keyText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    color: COLORS.accent,
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
    color: COLORS.textPrimary,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardWhite,
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
    color: COLORS.textPrimary,
  },
  memberInfo: { flex: 1 },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  ownerBadge: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '700',
    marginTop: 2,
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
    color: COLORS.tomorrowRed,
  },
  reissueButton: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.cardWhite,
    ...SHADOW,
  },
  reissueButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
