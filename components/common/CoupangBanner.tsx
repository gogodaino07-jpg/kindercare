import React, { useMemo, useState, useEffect } from 'react';
import { Linking, PixelRatio, StyleSheet, View, ViewStyle, useWindowDimensions, Platform } from 'react-native';
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
  const bannerHeight = 50;

  // Coupang's widget serves thumbnail images sized to the width/height we request.
  // Requesting at native pixel density (then scaling the DOM back down with CSS)
  // makes the browser rasterize the images at full resolution instead of stretching
  // low-res assets across a high-density screen — fixing the blurry thumbnail.
  const dpr = Math.min(PixelRatio.get(), 3);
  const scaledWidth = Math.round(windowWidth * dpr);
  const scaledHeight = Math.round(bannerHeight * dpr);

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
          }
          #scaleWrap {
            width: ${scaledWidth}px;
            height: ${scaledHeight}px;
            transform: scale(${1 / dpr});
            transform-origin: top left;
          }
        </style>
      </head>
      <body>
        <div id="scaleWrap">
          <script src="https://ads-partners.coupang.com/g.js"></script>
          <script>
            new PartnersCoupang.G({
              "id": 1010655,
              "template": "carousel",
              "trackingCode": "AF5391104",
              "width": "${scaledWidth}",
              "height": "${scaledHeight}"
            });
          </script>
        </div>
      </body>
    </html>
  `;

  return (
    <View style={[styles.container, style]}>
      {/* Top Border Line */}
      <View style={styles.topLine} />

      <View style={styles.contentWrapper}>
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
              onShouldStartLoadWithRequest={(request) => {
                const url = request.url;
                // 배너 위젯 자체를 그리는 데 필요한 내부 리소스(스크립트/썸네일)는 그대로 허용
                if (
                  url === 'about:blank' ||
                  url.includes('ads-partners.coupang.com') ||
                  url.includes('coupangcdn.com') ||
                  url.includes('coupang.com/thumbnails')
                ) {
                  return true;
                }
                // 실제 상품 클릭 등 외부로 나가는 이동은 인앱 WebView 안에서 열지 않고 외부 브라우저로 보낸다.
                if (url.startsWith('http')) {
                  Linking.openURL(url).catch(() => {});
                  return false;
                }
                return true;
              }}
              backgroundColor="transparent"
              androidLayerType={Platform.OS === 'android' ? 'hardware' : 'none'}
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
  legalDisclosure: {
    fontSize: 8,
    color: colors.gray400,
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
