import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface NotificationCenterItem {
  id: string;
  title: string;
  body: string;
  /** 준비물 keyword used for the item's "쿠팡에서 구매" link, if any. */
  keyword?: string;
  /** 이 알림이 특정 아이와 관련된 경우, 알림 센터에서 아이별로 필터링하는 데 사용. */
  childId?: string;
  /** ISO date of the related schedule, if any — used to deep-link into the calendar on tap. */
  date?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationCenterContextValue {
  notifications: NotificationCenterItem[];
  hasUnread: boolean;
  unreadCount: number;
  addNotification: (
    input: Omit<NotificationCenterItem, 'id' | 'createdAt' | 'read'> & { id?: string }
  ) => void;
  removeNotification: (id: string) => void;
  markRead: (id: string) => void;
  clearNotifications: () => void;
  refreshNotifications: () => Promise<void>;
}

const STORAGE_KEY = 'kindercare_notification_center';

const NotificationCenterContext = createContext<NotificationCenterContextValue | undefined>(
  undefined
);

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `notif-${Date.now()}-${idCounter}`;
}

export function NotificationCenterProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationCenterItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setNotifications(parsed);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications)).catch(() => {});
  }, [notifications, loaded]);

  // id를 넘기면(스누즈 알림처럼 OS 알림 identifier를 그대로 쓰는 경우) 같은 id가 이미
  // 있을 때 중복 추가하지 않는다 — 포그라운드 수신 리스너와 탭 응답 리스너가 같은 알림에
  // 대해 둘 다 호출될 수 있어서다.
  const addNotification: NotificationCenterContextValue['addNotification'] = (input) => {
    setNotifications((prev) => {
      if (input.id && prev.some((n) => n.id === input.id)) return prev;
      return [
        { ...input, id: input.id ?? nextId(), read: false, createdAt: new Date().toISOString() },
        ...prev,
      ];
    });
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearNotifications = () => setNotifications([]);

  const refreshNotifications = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setNotifications(parsed);
      }
    } catch (e) {
      console.error('Failed to refresh notifications:', e);
    }
  };

  const hasUnread = useMemo(() => notifications.some((n) => !n.read), [notifications]);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo<NotificationCenterContextValue>(
    () => ({
      notifications,
      hasUnread,
      unreadCount,
      addNotification,
      removeNotification,
      markRead,
      clearNotifications,
      refreshNotifications,
    }),
    [notifications, hasUnread, unreadCount]
  );

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
    </NotificationCenterContext.Provider>
  );
}

export function useNotificationCenter(): NotificationCenterContextValue {
  const ctx = useContext(NotificationCenterContext);
  if (!ctx) {
    throw new Error('useNotificationCenter must be used within a NotificationCenterProvider');
  }
  return ctx;
}
