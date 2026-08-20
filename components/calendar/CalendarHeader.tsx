import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import { calendarTheme as t } from './calendarTheme';

interface CalendarHeaderProps {
  childName: string;
  className?: string;
  photoUri?: string;
  percent: number;
  selectedDateLabel: string;
  onBack: () => void;
}

function hasFinalConsonant(text: string): boolean {
  const trimmed = text.trim();
  const code = trimmed.charCodeAt(trimmed.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return true;
  return (code - 0xac00) % 28 !== 0;
}

export default function CalendarHeader({
  childName,
  className,
  photoUri,
  percent,
  selectedDateLabel,
  onBack,
}: CalendarHeaderProps) {
  const particle = useMemo(() => (hasFinalConsonant(childName) ? '이' : ''), [childName]);

  return (
    <View style={styles.row}>
      <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
        <MaterialCommunityIcons name="chevron-left" size={28} color={t.textPrimary} />
      </Pressable>

      <View style={styles.avatarWrap}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderIcon}>🧒</Text>
          </View>
        )}
      </View>

      <View style={styles.textBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {childName}{particle}의 등원 캘린더
          </Text>
          {!!className && (
            <View style={styles.classBadge}>
              <Text style={styles.classBadgeText} numberOfLines={1}>{className}</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {selectedDateLabel} 등원 준비율 <Text style={styles.subtitlePercent}>{percent}%</Text>
        </Text>
      </View>
    </View>
  );
}

const AVATAR_SIZE = 56;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: t.bg,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: t.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderIcon: {
    fontSize: 25,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    marginLeft: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '800',
    color: t.textPrimary,
  },
  classBadge: {
    backgroundColor: t.emeraldBg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  classBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: t.emeraldDeep,
  },
  subtitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: t.textSecondary,
    marginTop: 3,
  },
  subtitlePercent: {
    color: t.amberDeep,
    fontWeight: '800',
  },
});
