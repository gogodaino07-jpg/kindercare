import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';

interface PermissionModalProps {
  visible: boolean;
  onDone: () => void;
}

const PERMISSION_ITEMS = [
  { icon: '🔔', title: '알림', description: '준비물과 일정을 놓치지 않게 알려드려요' },
  { icon: '📷', title: '카메라', description: '가정통신문을 바로 촬영해서 올릴 수 있어요' },
];

export default function PermissionModal({ visible, onDone }: PermissionModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          <Pressable style={styles.allowButton} onPress={handleAllow} disabled={requesting}>
            <Text style={styles.allowButtonText}>
              {requesting ? '설정 중...' : '권한 허용하고 시작하기'}
            </Text>
          </Pressable>
          <Pressable style={styles.laterButton} onPress={onDone}>
            <Text style={styles.laterButtonText}>나중에 하기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(20, 24, 22, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.creamBeigeCard,
      borderRadius: 24,
      padding: 24,
      ...SHADOW,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
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
    itemTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    itemDescription: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    allowButton: {
      marginTop: 12,
      backgroundColor: colors.coralPink,
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
    laterButtonText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  });
}
