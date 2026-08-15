import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, View, ViewStyle, useWindowDimensions, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAppData } from '../../context/AppDataContext';
import { useThemeColors } from '../../context/ThemeContext';
import Text from './AppText';

interface CoupangBannerProps {
  style?: ViewStyle;
}

/**
 * CoupangBanner Component
 * Uses official Coupang Partners script via WebView for maximum stability and correct tracking.
 */
export default function CoupangBanner({ style }: CoupangBannerProps) {
  const { width: windowWidth } = useWindowDimensions();
  const { googleAccount } = useAppData();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Reset readiness when account changes to force a clean reload
    setIsReady(false);
    const timer = setTimeout(() => setIsReady(true), 0);
    return () => clearTimeout(timer);
  }, [googleAccount?.email]);

  // Adjusting dimensions for the WebView container
  const bannerHeight = 56;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
          }
        </style>
      </head>
      <body>
        <script src="https://ads-partners.coupang.com/g.js"></script>
        <script>
          new PartnersCoupang.G({
            "id": 1010655,
            "template": "carousel",
            "trackingCode": "AF5391104",
            "width": "${windowWidth}",
            "height": "${bannerHeight}"
          });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={[styles.container, style]}>
      {/* Top Border Line */}
      <View style={styles.topLine} />

      <View style={styles.contentWrapper}>
        <View style={styles.disclosureContainer}>
          <Text style={styles.disclosure}>ⓘ 광고</Text>
        </View>

        <View style={[styles.webviewContainer, { height: bannerHeight }]}>
          {isReady ? (
            <WebView
              key={`coupang-banner-${windowWidth}-${googleAccount?.email || 'guest'}`}
              originWhitelist={['*']}
              source={{ html: htmlContent, baseUrl: 'https://ads-partners.coupang.com' }}
              style={styles.webview}
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              backgroundColor="transparent"
              androidLayerType={Platform.OS === 'android' ? 'software' : 'none'}
              domStorageEnabled={true}
              javaScriptEnabled={true}
              mixedContentMode="always"
              thirdPartyCookiesEnabled={true}
              allowFileAccess={true}
              userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36"
            />
          ) : (
            <View style={[styles.webview, { height: bannerHeight, backgroundColor: 'transparent' }]} />
          )}
        </View>

        <Text style={styles.legalDisclosure}>
          이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
        </Text>
      </View>

      <View style={styles.bottomLine} />
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.cardWhite,
  },
  topLine: {
    height: 1,
    backgroundColor: '#F0F1F3',
    width: '100%',
  },
  contentWrapper: {
    paddingVertical: 4,
    position: 'relative',
    alignItems: 'center',
  },
  bottomLine: {
    height: 1,
    backgroundColor: '#F0F1F3',
    width: '100%',
  },
  webviewContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  disclosureContainer: {
    position: 'absolute',
    top: 4,
    right: 20,
    zIndex: 10,
  },
  disclosure: {
    fontSize: 9,
    color: colors.gray400,
  },
  legalDisclosure: {
    fontSize: 8,
    color: colors.gray400,
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
