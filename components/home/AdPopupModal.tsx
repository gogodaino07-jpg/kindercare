import React, { useMemo } from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Text from '../common/AppText';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';

interface AdPopupModalProps {
  visible: boolean;
  onClose: () => void;
}

const COUPANG_AD_HTML = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background-color: transparent; overflow: hidden; }
    </style>
</head>
<body>
    <script src="https://ads-partners.coupang.com/g.js"></script>
    <script>
        new PartnersCoupang.G({"id":1010655,"template":"carousel","trackingCode":"AF5391104","width":"300","height":"300","tsource":""});
    </script>
</body>
</html>
`;

export default function AdPopupModal({ visible, onClose }: AdPopupModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleNavigationStateChange = (event: any) => {
    // Prevent navigation inside WebView and open in external browser
    if (event.url && event.url !== 'about:blank' && !event.url.includes('ads-partners.coupang.com')) {
      Linking.openURL(event.url).catch((err) => console.error('Failed to open URL:', err));
      return false;
    }
    return true;
  };

  return (
    <Modal visible={visible} transparent onRequestClose={onClose} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.adHeader}>
            <Text style={styles.adTitle}>🎁 오늘의 추천 아이템</Text>
          </View>

          <View style={styles.adArea}>
            <WebView
              source={{ html: COUPANG_AD_HTML }}
              style={styles.webview}
              scrollEnabled={false}
              onShouldStartLoadWithRequest={(request) => {
                if (request.url.startsWith('http') && request.url !== 'about:blank' && !request.url.includes('ads-partners.coupang.com')) {
                  Linking.openURL(request.url).catch(() => {});
                  return false;
                }
                return true;
              }}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
              scalesPageToFit={false}
              backgroundColor="transparent"
            />
          </View>

          <Text style={styles.disclosure}>
            이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
          </Text>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>닫기</Text>
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
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.cardWhite,
      borderRadius: 24,
      padding: 16,
      alignItems: 'center',
      ...SHADOW,
    },
    adHeader: {
      marginBottom: 12,
    },
    adTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    adArea: {
      width: 300,
      height: 300,
      backgroundColor: '#F8F9FA',
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 12,
    },
    webview: {
      width: 300,
      height: 300,
      backgroundColor: 'transparent',
    },
    disclosure: {
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 14,
      paddingHorizontal: 10,
    },
    closeButton: {
      width: '100%',
      backgroundColor: colors.textPrimary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    closeButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
