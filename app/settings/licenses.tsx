import { Stack } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../../components/common/AppText';
import { useThemeColors } from '../../context/ThemeContext';
import { SHADOW } from '../../constants/theme';

interface LicenseItem {
  name: string;
  version: string;
  license: string;
}

const LICENSES: LicenseItem[] = [
  { name: 'React Native', version: '0.86.0', license: 'MIT' },
  { name: 'Expo', version: '57.0.7', license: 'MIT' },
  { name: 'React', version: '19.2.7', license: 'MIT' },
  { name: '@react-native-firebase/app', version: '21.0.0', license: 'Apache-2.0' },
  { name: '@react-native-firebase/auth', version: '21.0.0', license: 'Apache-2.0' },
  { name: '@react-native-firebase/firestore', version: '21.0.0', license: 'Apache-2.0' },
  { name: '@react-native-google-signin/google-signin', version: '16.1.2', license: 'MIT' },
  { name: 'expo-router', version: '57.0.7', license: 'MIT' },
  { name: 'react-native-reanimated', version: '4.5.0', license: 'MIT' },
  { name: 'react-native-gesture-handler', version: '2.32.0', license: 'MIT' },
  { name: 'react-native-webview', version: '13.16.1', license: 'MIT' },
  { name: 'react-native-svg', version: '15.15.4', license: 'MIT' },
  { name: 'expo-notifications', version: '57.0.6', license: 'MIT' },
  { name: '@expo-google-fonts/gaegu', version: '0.4.1', license: 'OFL-1.1' },
  { name: '@expo-google-fonts/jua', version: '0.4.1', license: 'OFL-1.1' },
];

export default function LicensesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen options={{ title: '오픈소스 라이선스' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>오픈소스 소프트웨어 공지</Text>
        <Text style={styles.headerSubtitle}>
          Kindercare는 다음의 오픈소스 소프트웨어를 사용하고 있습니다. 각 소프트웨어의 권리자에게 감사의 말씀을 전합니다.
        </Text>

        <View style={styles.list}>
          {LICENSES.map((item, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.libName}>{item.name}</Text>
                <Text style={styles.libVersion}>v{item.version}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.license}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            기타 상세한 라이선스 전문은 각 라이브러리의 공식 배포처를 통해 확인하실 수 있습니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.skyBackground,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 24,
    },
    list: {
      gap: 12,
    },
    card: {
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
      shadowOpacity: 0.03,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    libName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    libVersion: {
      fontSize: 12,
      color: colors.gray400,
    },
    badge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.gray100,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: colors.textSecondary,
    },
    footer: {
      marginTop: 32,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 12,
      color: colors.gray400,
      textAlign: 'center',
    },
  });
}
