import React from 'react';
import { Animated, ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import Text from '../../../components/common/AppText';
import { SHADOW, ThemeColors } from '../../../constants/theme';

interface AIReviewBottomSheetProps {
  sheetY: Animated.Value;
  panHandlers: any;
  colors: ThemeColors;
  insets: EdgeInsets;
  onSave: () => void;
  isSaveDisabled: boolean;
  children: React.ReactNode;
}

export const AIReviewBottomSheet = ({
  sheetY,
  panHandlers,
  colors,
  insets,
  onSave,
  isSaveDisabled,
  children,
}: AIReviewBottomSheetProps) => {
  const styles = createStyles(colors);

  return (
    <Animated.View style={[styles.sheet, { top: sheetY }]}>
      <View style={styles.sheetHeader} {...panHandlers}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>AI 분석 결과 검수</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {children}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 24 + insets.bottom }]}>
        <Pressable
          style={[styles.saveButton, isSaveDisabled && styles.saveButtonDisabled]}
          onPress={onSave}
          disabled={isSaveDisabled}
        >
          <Text style={styles.saveButtonText}>최종 검토 완료 & 저장</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.skyBackground,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      ...SHADOW,
    },
    sheetHeader: { alignItems: 'center', paddingVertical: 12 },
    handle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, marginBottom: 8 },
    sheetTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 150 },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      backgroundColor: colors.skyBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    saveButton: { backgroundColor: colors.gray900, borderRadius: 20, paddingVertical: 18, alignItems: 'center', ...SHADOW },
    saveButtonDisabled: { backgroundColor: colors.gray400, opacity: 0.5 },
    saveButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  });
}
