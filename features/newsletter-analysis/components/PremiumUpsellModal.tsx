import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Text from '../../../components/common/AppText';

interface PremiumUpsellModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

/** 무료 스캔 소진 시 리워드 광고 대신 노출되는 프리미엄 유도 팝업. */
export const PremiumUpsellModal = ({ visible, onClose, onSubscribe }: PremiumUpsellModalProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.robotCircle}>
            <Text style={styles.robotEmoji}>🤖</Text>
          </View>

          <Text style={styles.title}>무료 스캔을 모두 사용했어요</Text>
          <Text style={styles.body}>프리미엄으로 업그레이드하면{'\n'}스캔 횟수 제한 없이 쓸 수 있어요</Text>

          <Pressable onPress={onSubscribe} style={styles.subscribeButtonWrap}>
            <LinearGradient
              colors={['#7C3AED', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.subscribeButton}
            >
              <Text style={styles.subscribeButtonText}>프리미엄 구독하기</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.closeLink}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 28,
    alignItems: 'center',
  },
  robotCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  robotEmoji: { fontSize: 32 },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  subscribeButtonWrap: { width: '100%' },
  subscribeButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  closeLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 16,
  },
});
