import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import Text from './common/AppText';

interface InAppUpdateSheetProps {
  visible: boolean;
  onUpdatePress: () => void;
  onLaterPress: () => void;
}

/**
 * 플렉시블 인앱 업데이트 완료(다운로드 끝) 시 뜨는 바텀시트.
 * 업데이트는 이미 백그라운드로 다 받아놓은 상태라, 여기서는 "재시작해서 적용"
 * 안내만 하면 된다 — 강제(Immediate)가 아니라서 뒤로가기/바깥 탭으로 닫아도
 * 앱은 계속 쓸 수 있고, 다음에 앱을 재시작하면 Play Core가 알아서 적용한다.
 */
export default function InAppUpdateSheet({ visible, onUpdatePress, onLaterPress }: InAppUpdateSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors, resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';
  const styles = useMemo(() => createStyles(colors, insets.bottom, isDark), [colors, insets.bottom, isDark]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLaterPress} statusBarTranslucent>
      <View style={styles.overlayContainer}>
        <Pressable style={styles.overlay} onPress={onLaterPress} />

        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          <Text style={styles.icon}>🎉</Text>
          <Text style={styles.title}>새 버전이 준비됐어요</Text>
          <Text style={styles.subtitle}>
            업데이트 다운로드가 끝났어요.{'\n'}지금 재시작하면 바로 적용돼요.
          </Text>

          <Pressable style={styles.primaryButton} onPress={onUpdatePress}>
            <Text style={styles.primaryButtonText}>재시작해서 적용</Text>
          </Pressable>
          <Pressable style={styles.laterButton} onPress={onLaterPress}>
            <Text style={styles.laterButtonText}>나중에</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, bottomInset: number, isDark: boolean) {
  return StyleSheet.create({
    overlayContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    sheet: {
      backgroundColor: colors.skyBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingTop: 12,
      paddingBottom: 20 + bottomInset,
      alignItems: 'center',
      ...(isDark && { borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }),
      ...SHADOW,
    },
    dragHandle: {
      width: 36,
      height: 4,
      backgroundColor: colors.gray100,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    icon: {
      fontSize: 32,
      marginBottom: 8,
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.gray900,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 13.5,
      fontWeight: '500',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    primaryButton: {
      alignSelf: 'stretch',
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 14,
      marginBottom: 8,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    laterButton: {
      alignSelf: 'stretch',
      alignItems: 'center',
      paddingVertical: 12,
    },
    laterButtonText: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.textSecondary,
    },
  });
}
