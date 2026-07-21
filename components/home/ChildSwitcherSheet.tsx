import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, SHADOW } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';

interface ChildSwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function ChildSwitcherSheet({ visible, onClose }: ChildSwitcherSheetProps) {
  const router = useRouter();
  const { children, selectedChild, selectChild } = useAppData();

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>아이 전환·관리</Text>
          {children.map((child) => {
            const isSelected = child.id === selectedChild?.id;
            const label = [child.name, `${child.age}세`, child.className]
              .filter(Boolean)
              .join(' · ');
            return (
              <View
                key={child.id}
                style={[styles.card, isSelected && styles.cardSelected]}
              >
                <Pressable
                  style={styles.cardMain}
                  onPress={() => {
                    selectChild(child.id);
                    onClose();
                  }}
                >
                  {child.photoUri ? (
                    <Image source={{ uri: child.photoUri }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarIcon}>🧒</Text>
                    </View>
                  )}
                  <Text style={styles.cardLabel}>{label}</Text>
                  {isSelected ? <Text style={styles.checkIcon}>✓</Text> : null}
                </Pressable>
                <Pressable
                  style={styles.editButton}
                  onPress={() => {
                    onClose();
                    router.push({ pathname: '/child-profile', params: { childId: child.id } });
                  }}
                  accessibilityLabel="프로필 수정"
                >
                  <Text style={styles.editIcon}>✏️</Text>
                </Pressable>
              </View>
            );
          })}
          <Pressable
            style={styles.addButton}
            onPress={() => {
              onClose();
              router.push('/child-profile');
            }}
          >
            <Text style={styles.addButtonText}>+ 아이 추가</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 24, 22, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.skyBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardWhite,
    borderRadius: 16,
    marginBottom: 10,
    paddingRight: 12,
    ...SHADOW,
  },
  cardSelected: {
    backgroundColor: '#E4F0FB',
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarIcon: {
    fontSize: 22,
  },
  cardLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  checkIcon: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '700',
    marginLeft: 8,
  },
  editButton: {
    padding: 8,
  },
  editIcon: {
    fontSize: 16,
  },
  addButton: {
    marginTop: 2,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },
});
