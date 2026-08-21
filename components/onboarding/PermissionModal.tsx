import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import { SHADOW } from '../../constants/theme';
import { STAMP_BOARD_THEMES } from '../../constants/stampBoardThemes';

interface PermissionModalProps {
  visible: boolean;
  onDone: () => void;
}

const CTA_GRADIENT = STAMP_BOARD_THEMES.blue.stampButtonGradient;
const INK = '#1E293B';
const GRAY = '#64748B';
const BORDER = '#BAE6FD';

const PERMISSION_ITEMS = [
  { icon: '🔔', title: '알림', description: '준비물과 일정을 놓치지 않게 알려드려요' },
  { icon: '📷', title: '카메라', description: '가정통신문을 바로 촬영해서 올릴 수 있어요' },
];

export default function PermissionModal({ visible, onDone }: PermissionModalProps) {
  const [requesting, setRequesting] = useState(false);

  const handleAllow = async () => {
    setRequesting(true);
    try {
      await Notifications.requestPermissionsAsync();
      await ImagePicker.requestCameraPermissionsAsync();
      // Small breathing room so the transition to Home doesn't feel like an
      // abrupt jump cut right after the permission prompts close.
      await new Promise((resolve) => setTimeout(resolve, 900));
    } finally {
      setRequesting(false);
      onDone();
    }
  };

  return (
    <Modal visible={visible} transparent onRequestClose={onDone}>
      <View style={styles.overlay}>
        <View style={styles.cardShadow}>
          <View style={styles.card}>
            <Text style={styles.title}>kindercare 이용을 위해{'\n'}권한이 필요해요</Text>
            {PERMISSION_ITEMS.map((item) => (
              <View key={item.title} style={styles.itemRow}>
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <View style={styles.itemTextArea}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                </View>
              </View>
            ))}
            <View style={styles.allowButtonShadow}>
              <Pressable onPress={handleAllow} disabled={requesting}>
                <LinearGradient
                  colors={CTA_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.allowButton}
                >
                  <Text style={styles.allowButtonText}>
                    {requesting ? '설정 중...' : '권한 허용하고 시작하기'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
            <Pressable style={styles.laterButton} onPress={onDone}>
              <Text style={styles.laterButtonText}>나중에 하기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 24, 22, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  // 안드로이드 elevation은 배경 없는(투명) 뷰에서 둥근 모서리를 무시하고
  // 각진 그림자를 그려 흰 상자처럼 비치는 버그가 있어, 안드로이드에서는
  // 그림자를 끄고 iOS 전용 그림자만 유지한다.
  cardShadow: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    ...SHADOW,
    shadowOpacity: 0.08,
    elevation: 0,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2,
    borderColor: BORDER,
    borderRadius: 24,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: INK,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  itemIcon: { fontSize: 24, marginRight: 12 },
  itemTextArea: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: INK },
  itemDescription: { fontSize: 12, color: GRAY, marginTop: 2 },
  allowButtonShadow: {
    marginTop: 12,
    borderRadius: 14,
    ...SHADOW,
    shadowOpacity: 0.16,
    elevation: 0,
  },
  allowButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  allowButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  laterButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  laterButtonText: { color: GRAY, fontSize: 13, fontWeight: '600' },
});
