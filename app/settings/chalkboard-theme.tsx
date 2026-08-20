import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calendarTheme as t } from '../../components/calendar/calendarTheme';
import Text from '../../components/common/AppText';
import ChalkboardPreview from '../../components/settings/ChalkboardPreview';
import { CHALKBOARD_THEMES } from '../../constants/chalkboardThemes';
import { ThemeColors } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { useThemeColors } from '../../context/ThemeContext';

export default function ChalkboardThemeScreen() {
  const router = useRouter();
  const { chalkboardThemeId, setChalkboardThemeId } = useAppData();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selectedTheme =
    CHALKBOARD_THEMES.find((ct) => ct.id === chalkboardThemeId) ?? CHALKBOARD_THEMES[0];

  return (
    <View style={styles.screenBg}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: t.bg },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBackButton}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={t.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>팝업 테마</Text>
          <Text style={styles.subtitle}>원하는 색상 조합을 골라주세요</Text>
          <View style={styles.grid}>
            {CHALKBOARD_THEMES.map((theme) => {
              const isSelected = theme.id === chalkboardThemeId;
              return (
                <Pressable
                  key={theme.id}
                  style={styles.item}
                  onPress={() => setChalkboardThemeId(theme.id)}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: theme.frame },
                      isSelected && styles.swatchSelected,
                    ]}
                  >
                    <View style={[styles.swatchInner, { backgroundColor: theme.board }]} />
                    {isSelected ? <Text style={styles.checkIcon}>✓</Text> : null}
                  </View>
                  <Text style={styles.label}>{theme.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <ChalkboardPreview theme={selectedTheme} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screenBg: { flex: 1, backgroundColor: t.bg },
    headerBackButton: { paddingHorizontal: 4 },
    safeArea: { flex: 1 },
    content: { padding: 20, alignItems: 'center' },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 16,
    },
    item: {
      width: '22%',
      alignItems: 'center',
    },
    swatch: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatchSelected: {
      borderWidth: 3,
      borderColor: colors.accent,
    },
    swatchInner: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    checkIcon: {
      position: 'absolute',
      color: colors.cardWhite,
      fontWeight: '800',
      fontSize: 14,
    },
    label: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 6,
      textAlign: 'center',
    },
  });
}
