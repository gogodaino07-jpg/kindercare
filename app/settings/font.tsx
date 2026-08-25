import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../../components/common/AppText';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { FONT_OPTIONS } from '../../constants/fontOptions';
import { useAppData } from '../../context/AppDataContext';
import { useThemeColors } from '../../context/ThemeContext';

export default function FontSettingsScreen() {
  const router = useRouter();
  const { fontChoiceId, setFontChoiceId } = useAppData();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.screenBg}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: colors.skyBackground },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBackButton}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {FONT_OPTIONS.map((option) => {
            const isSelected = option.id === fontChoiceId;
            return (
              <Pressable
                key={option.id}
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => setFontChoiceId(option.id)}
              >
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected ? (
                    <MaterialCommunityIcons name="check" size={13} color="#FFFFFF" />
                  ) : null}
                </View>
                <View style={styles.rowText}>
                  <View style={styles.rowTopLine}>
                    <Text style={[styles.rowLabel, { fontFamily: option.fontFamily ?? 'System' }]}>
                      {option.label}
                    </Text>
                    <View style={[styles.vibeBadge, isSelected && styles.vibeBadgeSelected]}>
                      <Text
                        style={[
                          styles.vibeBadgeText,
                          isSelected && styles.vibeBadgeTextSelected,
                          { fontFamily: 'System' },
                        ]}
                      >
                        {option.vibe}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.preview, { fontFamily: option.fontFamily ?? 'System' }]}>
                    7/20(월) 현장학습이 있어요
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screenBg: { flex: 1, backgroundColor: colors.skyBackground },
    headerBackButton: { paddingHorizontal: 4 },
    safeArea: { flex: 1 },
    content: { padding: 20 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardWhite,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: 'transparent',
      ...SHADOW,
    },
    rowSelected: {
      borderWidth: 2,
      borderColor: colors.accent,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    radioSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    rowText: { flex: 1, minWidth: 0 },
    rowTopLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    vibeBadge: {
      backgroundColor: colors.gray100,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
      marginLeft: 8,
    },
    vibeBadgeSelected: {
      backgroundColor: colors.lightBlueBg,
    },
    vibeBadgeText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    vibeBadgeTextSelected: {
      color: colors.accent,
    },
    rowLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    preview: {
      fontSize: 18,
      color: colors.textPrimary,
    },
  });
}
