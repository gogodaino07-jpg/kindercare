import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, SHADOW } from '../../constants/theme';
import { Child } from '../../types/models';

interface HomeHeaderProps {
  selectedChild: Child | undefined;
  onPressChild: () => void;
}

export default function HomeHeader({ selectedChild, onPressChild }: HomeHeaderProps) {
  const router = useRouter();

  const childLabel = selectedChild
    ? [selectedChild.name, `${selectedChild.age}세`, selectedChild.className]
        .filter(Boolean)
        .join(' · ')
    : '등록된 아이가 없어요';

  return (
    <View style={styles.container}>
      <View style={styles.leftSpacer} />
      <View style={styles.centerArea}>
        <Pressable style={styles.childButton} onPress={onPressChild}>
          <Text style={styles.childLabel}>{childLabel}</Text>
          <Text style={styles.chevron}>▾</Text>
        </Pressable>
      </View>
      <View style={styles.rightActions}>
        <Pressable
          style={styles.iconButton}
          onPress={() => router.push('/calendar')}
          accessibilityLabel="캘린더로 이동"
        >
          <Text style={styles.icon}>📅</Text>
        </Pressable>
        <Pressable
          style={styles.iconButton}
          onPress={() => router.push('/settings')}
          accessibilityLabel="설정으로 이동"
        >
          <Text style={styles.icon}>⚙️</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  leftSpacer: {
    width: 96,
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
  },
  childButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardWhite,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    ...SHADOW,
  },
  childLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: 6,
  },
  chevron: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cardWhite,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  icon: {
    fontSize: 20,
  },
});
