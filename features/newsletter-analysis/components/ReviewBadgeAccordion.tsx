import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';
import Text from '../../../components/common/AppText';
import { ScanColors, useScanColors } from '../uiColors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ReviewBadgeAccordionProps {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

/** "확인필요" / "기존 일정과 겹쳐요" 공용 앰버 배지 + 탭하면 펼쳐지는 아코디언. */
export const ReviewBadgeAccordion = ({ label, expanded, onToggle, children }: ReviewBadgeAccordionProps) => {
  const C = useScanColors();
  const styles = useMemo(() => createStyles(C), [C]);

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  return (
    <View>
      <Pressable style={styles.badge} onPress={handleToggle} hitSlop={4}>
        <Feather name="alert-triangle" size={11} color={C.amber700} />
        <Text style={styles.badgeText}>{label}</Text>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={C.amber700} />
      </Pressable>
      {expanded && <View style={styles.panel}>{children}</View>}
    </View>
  );
};

function createStyles(C: ScanColors) {
  return StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      backgroundColor: C.amber50,
      borderWidth: 1,
      borderColor: C.amber200,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 8,
    },
    badgeText: { fontSize: 11, fontWeight: '800', color: C.amber700 },
    panel: {
      backgroundColor: C.amber50,
      borderRadius: 12,
      padding: 10,
      marginTop: 6,
    },
  });
}
