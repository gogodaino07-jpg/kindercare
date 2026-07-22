import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import Checkbox from '../common/Checkbox';

interface TermItem {
  id: string;
  title: string;
  body: string;
}

const TERMS: TermItem[] = [
  {
    id: 'service',
    title: '[필수] 서비스 이용약관',
    body: '키즈케어 서비스 이용에 관한 기본 약관이에요. 회원의 권리와 의무, 서비스 이용 방법 등을 안내해요.',
  },
  {
    id: 'privacy',
    title: '[필수] 개인정보 처리방침',
    body: '아이와 보호자의 개인정보를 어떻게 수집·이용·보관하는지 안내해요. 동의 없이는 서비스를 이용할 수 없어요.',
  },
  {
    id: 'location',
    title: '[필수] 위치기반서비스 이용약관',
    body: '날씨 정보 제공 등을 위해 위치정보를 활용하는 것에 대한 안내예요.',
  },
];

interface TermsAccordionProps {
  onChangeAllAgreed: (allAgreed: boolean) => void;
}

export default function TermsAccordion({ onChangeAllAgreed }: TermsAccordionProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allAgreed = TERMS.every((t) => checkedIds.has(t.id));

  useEffect(() => {
    onChangeAllAgreed(allAgreed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAgreed]);

  const toggleAll = () => {
    setCheckedIds(allAgreed ? new Set() : new Set(TERMS.map((t) => t.id)));
  };

  const toggleOne = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.allRow} onPress={toggleAll}>
        <Checkbox checked={allAgreed} onToggle={toggleAll} />
        <Text style={styles.allText}>전체약관에 동의합니다</Text>
      </Pressable>

      <View style={styles.divider} />

      {TERMS.map((term) => {
        const checked = checkedIds.has(term.id);
        const expanded = expandedId === term.id;
        return (
          <View key={term.id} style={styles.itemRow}>
            <View style={styles.itemHeader}>
              <Checkbox checked={checked} onToggle={() => toggleOne(term.id)} size={18} />
              <Pressable style={styles.itemTitleArea} onPress={() => toggleOne(term.id)}>
                <Text style={styles.itemTitle}>{term.title}</Text>
              </Pressable>
              <Pressable
                style={styles.expandButton}
                onPress={() => toggleExpand(term.id)}
                hitSlop={8}
              >
                <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
              </Pressable>
            </View>
            {expanded ? (
              <View style={styles.itemBody}>
                <Text style={styles.itemBodyText}>{term.body}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginTop: 24,
    },
    allRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    allText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
    },
    itemRow: {
      marginBottom: 8,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    itemTitleArea: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    expandButton: {
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    expandIcon: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    itemBody: {
      marginTop: 6,
      marginLeft: 28,
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      padding: 12,
    },
    itemBodyText: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}
