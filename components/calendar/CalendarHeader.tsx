import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Dimensions, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import { useCalendarTheme } from './useCalendarTheme';

const PHOTO_PREVIEW_SIZE = Math.min(Dimensions.get('window').width * 0.7, 320);

interface CalendarHeaderProps {
  childName: string;
  age?: number;
  className?: string;
  photoUri?: string;
  avatarEmoji?: string;
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

/** "햇살" -> "햇살반" / "햇살반" -> "햇살반" 그대로. */
function formatClassName(className?: string): string | undefined {
  const trimmed = className?.trim();
  if (!trimmed) return undefined;
  return trimmed.endsWith('반') ? trimmed : `${trimmed}반`;
}

export default function CalendarHeader({
  childName,
  age,
  className,
  photoUri,
  avatarEmoji,
  percent,
  selectedDateLabel,
  onBack,
}: CalendarHeaderProps) {
  const t = useCalendarTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const particle = useMemo(() => (hasFinalConsonant(childName) ? '이' : ''), [childName]);
  const classLabel = useMemo(
    () => [age !== undefined ? `${age}세` : undefined, formatClassName(className)].filter(Boolean).join(' '),
    [age, className]
  );
  const [photoPreviewVisible, setPhotoPreviewVisible] = useState(false);

  return (
    <View style={styles.row}>
      <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
        <MaterialCommunityIcons name="chevron-left" size={28} color={t.textPrimary} />
      </Pressable>

      <Pressable
        style={styles.avatarWrap}
        onPress={photoUri ? () => setPhotoPreviewVisible(true) : undefined}
        accessibilityLabel={photoUri ? '프로필 사진 크게 보기' : undefined}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderIcon}>{avatarEmoji ?? '🧒'}</Text>
          </View>
        )}
        <View style={styles.onlineDot} />
      </Pressable>

      <View style={styles.textBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {childName}{particle}의 등원 캘린더
          </Text>
          {!!classLabel && (
            <View style={styles.classBadge}>
              <Text style={styles.classBadgeText} numberOfLines={1}>{classLabel}</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {selectedDateLabel} 등원 준비율 <Text style={styles.subtitlePercent}>{percent}%</Text>
        </Text>
      </View>

      {photoUri && (
        <Modal
          visible={photoPreviewVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPhotoPreviewVisible(false)}
        >
          <Pressable style={styles.photoPreviewBackdrop} onPress={() => setPhotoPreviewVisible(false)}>
            <Image source={{ uri: photoUri }} style={styles.photoPreviewImage} />
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const AVATAR_SIZE = 56;

function createStyles(t: import('./calendarTheme').CalendarTheme) {
  return StyleSheet.create({
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
    position: 'relative',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: t.border,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: t.skyBg,
    borderWidth: 2,
    borderColor: t.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderIcon: {
    fontSize: 25,
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: t.emerald,
    borderWidth: 2,
    borderColor: t.bg,
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
  photoPreviewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreviewImage: {
    width: PHOTO_PREVIEW_SIZE,
    height: PHOTO_PREVIEW_SIZE,
    borderRadius: PHOTO_PREVIEW_SIZE / 2,
    borderWidth: 3,
    borderColor: t.cardWhite,
  },
  });
}
