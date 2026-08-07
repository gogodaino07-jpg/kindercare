import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import Text from '../common/AppText';

export default function AiScanSection() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.orangeLight1 }]}>
        <View style={styles.leftContent}>
          <View style={styles.header}>
            <Text style={styles.emoji}>🪄</Text>
            <Text style={styles.title}>AI 가정통신문 간편 스캔</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>최대 5장</Text>
            </View>
          </View>
          <Text style={styles.description} numberOfLines={1}>
            준비물과 일정을 자동으로 쏙쏙 정리해 드려요!
          </Text>
        </View>

        <Pressable
          style={styles.uploadButton}
          onPress={() => router.push('/upload')}
        >
          <MaterialIcons name="cloud-upload" size={24} color={colors.orange500} />
          <Text style={styles.uploadButtonText}>업로드</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      marginTop: 12, // Added spacing between sections
    },
    card: {
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: colors.orangeBorder,
      paddingHorizontal: 20,
      paddingVertical: 18, // Increased: larger than ad banner (16)
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      elevation: 2,
      shadowColor: colors.orange500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    leftContent: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      gap: 8,
    },
    emoji: {
      fontSize: 18, // Increased
    },
    title: {
      fontSize: 16, // Increased: matches/exceeds ad banner main text
      fontWeight: '900',
      color: colors.gray900,
      letterSpacing: -0.5,
    },
    badge: {
      backgroundColor: colors.orange500,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: 9,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    description: {
      fontSize: 12, // Increased
      color: colors.gray900,
      fontWeight: '600',
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardWhite,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.orangeBorder,
      gap: 6,
      elevation: 2,
      shadowColor: colors.orangeBorder,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    uploadButtonText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.orange500,
    },
  });
}
