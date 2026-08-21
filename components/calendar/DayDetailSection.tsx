import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import EventIcon from '../common/EventIcon';
import { getDisplayItems } from '../../hooks/useLocalChecklist';
import { Event, EventItem } from '../../types/models';
import { isValidCoupangKeyword } from '../../utils/validation';
import { calendarTheme as t } from './calendarTheme';

interface DayDetailSectionProps {
  selectedDate: string;
  events: Event[];
  todayISO: string;
  onAddEvent: () => void;
  onPressEvent: (event: Event) => void;
  onToggleItem: (event: Event, item: EventItem) => void;
  onOpenBuy: (event: Event, item: EventItem) => void;
}

function computeDday(dateISO: string, todayISO: string): number {
  const a = new Date(dateISO + 'T00:00:00');
  const b = new Date(todayISO + 'T00:00:00');
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export default function DayDetailSection({
  selectedDate,
  events,
  todayISO,
  onAddEvent,
  onPressEvent,
  onToggleItem,
  onOpenBuy,
}: DayDetailSectionProps) {
  if (events.length === 0) {
    return (
      <View style={styles.emptyFillContainer}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyDate}>{selectedDate}</Text>
          <Text style={styles.emptyText}>등록된 유치원/어린이집 일정이 없습니다.</Text>
          <Pressable style={styles.addButton} onPress={onAddEvent}>
            <Text style={styles.addButtonText}>+ 새 일정 추가</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.map((event) => (
        <EventDetailCard
          key={event.id}
          event={event}
          todayISO={todayISO}
          onPressEvent={onPressEvent}
          onToggleItem={onToggleItem}
          onOpenBuy={onOpenBuy}
        />
      ))}
    </View>
  );
}

function EventDetailCard({
  event,
  todayISO,
  onPressEvent,
  onToggleItem,
  onOpenBuy,
}: {
  event: Event;
  todayISO: string;
  onPressEvent: (event: Event) => void;
  onToggleItem: (event: Event, item: EventItem) => void;
  onOpenBuy: (event: Event, item: EventItem) => void;
}) {
  const diff = computeDday(event.date, todayISO);
  const items = getDisplayItems(event);
  const incompleteItems = items.filter((i) => !i.completed);
  const completedItems = items.filter((i) => i.completed);
  const dotDate = event.date.replace(/-/g, '.');

  return (
    <View style={styles.card}>
      <Pressable onPress={() => onPressEvent(event)}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardTopLeft}>
            {(diff === 0 || diff > 0) && (
              <View style={styles.ddayBadge}>
                <Text style={styles.ddayBadgeText}>{diff === 0 ? 'D-DAY' : `D+${diff}`}</Text>
              </View>
            )}
            <Text style={styles.cardDate}>{dotDate}</Text>
          </View>
          <View style={styles.cardTopRight}>
            {!!event.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{event.category}</Text>
              </View>
            )}
            <MaterialCommunityIcons name="pencil-outline" size={16} color={t.textMuted} />
          </View>
        </View>

        <View style={styles.titleRow}>
          <EventIcon icon={event.icon} size={20} />
          <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        </View>

        {!!event.noticeText && (
          <View style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <MaterialCommunityIcons name="bell-outline" size={15} color={t.textSecondary} />
              <Text style={styles.noticeHeaderText}>선생님 알림 노트 (1건)</Text>
            </View>
            <Text style={styles.noticeBody}>{event.noticeText}</Text>
          </View>
        )}
      </Pressable>

      {items.length > 0 && (
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <View style={styles.itemsHeaderLeft}>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color={t.amberDeep} />
              <Text style={styles.itemsHeaderText}>챙겨야 할 준비물 ({incompleteItems.length}개)</Text>
            </View>
            <Text style={styles.itemsHint}>터치 시 완료</Text>
          </View>

          {incompleteItems.length === 0 ? (
            <Text style={styles.allDoneText}>🎉 모든 준비물을 차곡차곡 다 챙겼어요!</Text>
          ) : (
            <View style={styles.itemList}>
              {incompleteItems.map((item) => {
                const isBuy = isValidCoupangKeyword(item.name);
                return (
                  <View key={item.id} style={styles.itemRow}>
                    <Pressable
                      style={styles.itemLeft}
                      onPress={() => onToggleItem(event, item)}
                      hitSlop={6}
                    >
                      <View style={styles.checkboxEmpty} />
                      <Text style={styles.itemName}>{item.name}</Text>
                    </Pressable>
                    {isBuy ? (
                      <Pressable style={styles.buyButton} onPress={() => onOpenBuy(event, item)}>
                        <MaterialCommunityIcons name="shopping-outline" size={13} color={t.violet} />
                        <Text style={styles.buyButtonText}>구매하기</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.neededLabel}>
                        <Text style={styles.neededLabelText}>준비 필요</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {completedItems.length > 0 && (
            <View style={styles.completedSection}>
              <Text style={styles.completedHeaderText}>챙김 완료 ({completedItems.length}개)</Text>
              {completedItems.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.completedRow}
                  onPress={() => onToggleItem(event, item)}
                >
                  <View style={styles.completedLeft}>
                    <View style={styles.checkboxFilled}>
                      <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                    </View>
                    <Text style={styles.completedName}>{item.name}</Text>
                  </View>
                  <View style={styles.completedTag}>
                    <Text style={styles.completedTagText}>완료</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyFillContainer: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: t.cardWhite,
  },
  emptyCard: {
    backgroundColor: t.cardWhite,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.border,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyDate: {
    fontSize: 13,
    fontWeight: '700',
    color: t.textSecondary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.textPrimary,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: t.amber,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: t.cardWhite,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.border,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ddayBadge: {
    backgroundColor: t.rose,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  ddayBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '700',
    color: t.textSecondary,
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: t.emeraldBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: t.emeraldDeep,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: t.textPrimary,
  },
  noticeCard: {
    backgroundColor: t.gray50,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  noticeHeaderText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: t.textPrimary,
  },
  noticeBody: {
    fontSize: 13,
    color: t.textSecondary,
    lineHeight: 19,
  },
  itemsSection: {
    marginTop: 2,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemsHeaderText: {
    fontSize: 13,
    fontWeight: '800',
    color: t.textPrimary,
  },
  itemsHint: {
    fontSize: 10.5,
    fontWeight: '600',
    color: t.textMuted,
  },
  allDoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: t.emeraldDeep,
    textAlign: 'center',
    paddingVertical: 14,
  },
  itemList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.cardWhite,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkboxEmpty: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: t.gray200,
    backgroundColor: t.cardWhite,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: t.textPrimary,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: t.violetBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  buyButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: t.violetDeep,
  },
  neededLabel: {
    backgroundColor: t.gray100,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  neededLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: t.textSecondary,
  },
  completedSection: {
    marginTop: 12,
    backgroundColor: t.emeraldBg,
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  completedHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: t.emeraldDeep,
    marginBottom: 2,
    marginLeft: 2,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  completedLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkboxFilled: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: t.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: t.textSecondary,
    textDecorationLine: 'line-through',
  },
  completedTag: {
    backgroundColor: t.gray100,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  completedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: t.textSecondary,
  },
});
