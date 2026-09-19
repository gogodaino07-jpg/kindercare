import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SHADOW } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import Text from '../common/AppText';
import GoogleLogo from '../common/GoogleLogo';

interface GuestLoginModalProps {
  visible: boolean;
  onClose: () => void;
  /** 로그인(+게스트 데이터 이관)까지 성공적으로 끝났을 때 호출 — 원래 하려던 동작을 이어서 진행. */
  onSuccess: () => void;
}

const INK = '#1E293B';
const GRAY = '#64748B';
const BORDER = '#E2E8F0';

/**
 * 로그인 없이 온보딩을 마친 게스트가 AI 스캔처럼 계정이 꼭 필요한 동작을 시도할 때
 * 띄우는 로그인 시트. 닫기를 누르면 그 동작만 취소되고 게스트 상태로 계속 쓸 수 있다.
 */
export default function GuestLoginModal({ visible, onClose, onSuccess }: GuestLoginModalProps) {
  const { signInWithGoogle, adoptGuestDataToAccount } = useAppData();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const account = await signInWithGoogle();
      await adoptGuestDataToAccount(account.email);
      onSuccess();
    } catch (e: any) {
      const errorCode = String(e?.code || '');
      const isCancel = ['12501', '12502', '13', '7', '10', '12500'].includes(errorCode);
      if (!isCancel) {
        showToast('로그인 중 문제가 생겼어요. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.cardShadow}>
            <View style={styles.card}>
              <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={20} color={GRAY} />
              </Pressable>
              <Text style={styles.icon}>🔒</Text>
              <Text style={styles.title}>로그인하고 계속하기</Text>
              <Text style={styles.subtitle}>
                AI 분석 결과를 안전하게 보관하고{'\n'}다른 기기에서도 이어보려면 로그인이 필요해요
              </Text>

              <Pressable style={styles.googleButton} onPress={handleGoogleSignIn} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.googleButtonInner}>
                    <View style={styles.googleLogoBadge}>
                      <GoogleLogo size={16} />
                    </View>
                    <Text style={styles.googleButtonText}>Google로 로그인</Text>
                  </View>
                )}
              </Pressable>
              <Pressable style={styles.laterButton} onPress={onClose}>
                <Text style={styles.laterButtonText}>다음에 할게요</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 23, 42, 0.5)' },
  cardShadow: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    ...SHADOW,
    shadowOpacity: 0.12,
    elevation: 0,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  closeButton: { position: 'absolute', top: 14, right: 14, zIndex: 1 },
  icon: { fontSize: 32, marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '800', color: INK, marginBottom: 6 },
  subtitle: { fontSize: 12.5, color: GRAY, marginBottom: 20, textAlign: 'center', lineHeight: 18 },
  googleButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C2331',
    borderWidth: 1,
    borderColor: BORDER,
  },
  googleButtonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  googleLogoBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleButtonText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' },
  laterButton: { marginTop: 10, paddingVertical: 6 },
  laterButtonText: { fontSize: 13, color: GRAY, fontWeight: '600' },
});
