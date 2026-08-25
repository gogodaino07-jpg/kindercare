import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../context/ThemeContext';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const PRIVACY_URL = 'https://gogodaino07-jpg.github.io/kindercare/privacy.html';

  // Inject JavaScript to optimize for mobile view
  const injectedJavaScript = `
    (function() {
      // Force viewport settings
      var meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.getElementsByTagName('head')[0].appendChild(meta);

      // Enhance readability
      document.body.style.fontSize = '16px';
      document.body.style.lineHeight = '1.6';
      document.body.style.padding = '20px';
      document.body.style.wordBreak = 'break-all';
      document.body.style.backgroundColor = 'white';

      // Remove horizontal margins if any
      document.body.style.margin = '0';
    })();
    true;
  `;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: '개인정보 처리방침',
          headerStyle: { backgroundColor: colors.skyBackground },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBackButton}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        <WebView
          source={{ uri: PRIVACY_URL }}
          injectedJavaScript={injectedJavaScript}
          javaScriptEnabled={true}
          scalesPageToFit={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}
          style={styles.webview}
        />
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.skyBackground,
    },
    headerBackButton: {
      paddingHorizontal: 4,
    },
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    webview: {
      flex: 1,
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
    },
  });
}
