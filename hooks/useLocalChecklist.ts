import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Event, EventItem } from '../types/models';

/**
 * items가 없는 과거 이벤트는 note를 줄 단위로 나눠 표시만 해줌(저장하지 않는 화면 표시용 폴백).
 * 진행률 게이지와 일정 카드가 서로 다른 기준으로 항목 수를 세면 게이지가 숨어버리는 등
 * 불일치가 생기므로, 항목 목록을 구하는 로직은 이 함수 하나로 통일한다.
 */
export function getDisplayItems(event: Event): EventItem[] {
  if (event.items && event.items.length > 0) return event.items;
  if (!event.note) return [];
  return event.note
    .split('\n')
    .map((name, idx) => ({ id: `legacy-${idx}`, name: name.trim() }))
    .filter((i) => i.name);
}

const STORAGE_KEY = 'kindercare:checklist';

type CheckedMap = Record<string, boolean>;

let cache: CheckedMap | null = null;

function keyFor(eventId: string, itemId: string): string {
  return `${eventId}:${itemId}`;
}

async function loadCache(): Promise<CheckedMap> {
  if (cache) return cache;
  let loaded: CheckedMap = {};
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    loaded = raw ? JSON.parse(raw) : {};
  } catch {
    loaded = {};
  }
  cache = loaded;
  return loaded;
}

async function persist(map: CheckedMap): Promise<void> {
  cache = map;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * 준비물 체크 상태를 기기 로컬(AsyncStorage)에만 저장 — 서버/Firestore로 동기화하지 않음.
 * 홈 화면 여러 컴포넌트(진행률 게이지, 일정 카드)가 상태를 공유해야 하므로
 * app/index.tsx에서 한 번만 호출해 props로 내려주는 방식으로 사용할 것.
 */
export function useLocalChecklist() {
  const [map, setMap] = useState<CheckedMap>(cache ?? {});

  useEffect(() => {
    let mounted = true;
    loadCache().then((loaded) => {
      if (mounted) setMap(loaded);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const isChecked = useCallback(
    (eventId: string, itemId: string) => !!map[keyFor(eventId, itemId)],
    [map]
  );

  const toggle = useCallback((eventId: string, itemId: string) => {
    setMap((prev) => {
      const k = keyFor(eventId, itemId);
      const next = { ...prev, [k]: !prev[k] };
      persist(next);
      return next;
    });
  }, []);

  /** 이벤트의 모든 준비물 항목을 한 번에 체크/해제 (카드 전체 "완료" 버튼용). */
  const setAllChecked = useCallback((eventId: string, itemIds: string[], value: boolean) => {
    setMap((prev) => {
      const next = { ...prev };
      for (const itemId of itemIds) next[keyFor(eventId, itemId)] = value;
      persist(next);
      return next;
    });
  }, []);

  const getProgress = useCallback(
    (events: Event[]) => {
      let total = 0;
      let checked = 0;
      for (const event of events) {
        const items = getDisplayItems(event);
        total += items.length;
        for (const item of items) {
          if (map[keyFor(event.id, item.id)]) checked++;
        }
      }
      return { total, checked, percent: total > 0 ? Math.round((checked / total) * 100) : 0 };
    },
    [map]
  );

  return { isChecked, toggle, setAllChecked, getProgress };
}
