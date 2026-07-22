import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONT_OPTIONS } from '../../constants/fontOptions';
import { ThemeColors } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { useThemeColors } from '../../context/ThemeContext';
import { ChalkboardTheme } from '../../constants/chalkboardThemes';

interface ChalkboardPreviewProps {
  theme: ChalkboardTheme;
}

/** Small live mockup of the blackboard popup so a chosen theme's colors are visible before leaving the screen. */
export default function ChalkboardPreview({ theme }: ChalkboardPreviewProps) {
  const { fontChoiceId } = useAppData();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fontFamily = FONT_OPTIONS.find((f) => f.id === fontChoiceId)?.fontFamily;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>미리보기</Text>
      <View style={[styles.frame, { backgroundColor: theme.frame }]}>
        <View style={[styles.board, { backgroundColor: theme.board }]}>
          <Text style={[styles.date, { fontFamily }]}>7/20(월)</Text>
          <Text style={[styles.title, { fontFamily }]}>🎨 미리보기 일정</Text>
          <Text style={[styles.note, { fontFamily }]}>준비물: 크레파스, 색종이</Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      width: '100%',
      marginTop: 28,
      alignItems: 'center',
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 10,
    },
    frame: {
      width: '100%',
      maxWidth: 320,
      borderRadius: 18,
      padding: 12,
    },
    board: {
      borderRadius: 10,
      padding: 18,
      minHeight: 120,
    },
    date: {
      fontSize: 14,
      color: colors.chalkboardText,
      opacity: 0.85,
    },
    title: {
      fontSize: 20,
      color: colors.chalkboardText,
      marginTop: 6,
      marginBottom: 10,
    },
    note: {
      fontSize: 14,
      color: colors.chalkboardText,
    },
  });
}
