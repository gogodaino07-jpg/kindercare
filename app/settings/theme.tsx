import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calendarTheme as t } from '../../components/calendar/calendarTheme';
import Text from '../../components/common/AppText';
import { SHADOW } from '../../constants/theme';
import { THEME_MODE_LABELS, ThemeMode, useTheme } from '../../context/ThemeContext';

const OPTIONS: ThemeMode[] = ['system', 'light', 'dark'];

export default function ThemeSettingsScreen() {
  const router = useRouter();
  const { mode, setMode, colors } = useTheme();

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
        <View style={styles.content}>
          {OPTIONS.map((option) => {
            const isSelected = option === mode;
            return (
              <Pressable
                key={option}
                style={[
                  styles.row,
                  { backgroundColor: colors.cardWhite },
                  isSelected && { borderColor: colors.accent, borderWidth: 2 },
                ]}
                onPress={() => setMode(option)}
              >
                <View style={[styles.radio, { borderColor: isSelected ? colors.accent : colors.border }]}>
                  {isSelected ? <View style={[styles.radioDot, { backgroundColor: colors.accent }]} /> : null}
                </View>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                  {THEME_MODE_LABELS[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenBg: { flex: 1, backgroundColor: t.bg },
  headerBackButton: { paddingHorizontal: 4 },
  safeArea: { flex: 1 },
  content: { padding: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    ...SHADOW,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
