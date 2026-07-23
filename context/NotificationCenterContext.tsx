import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface NotificationCenterItem {
  id: string;
  title: string;
  body: string;
  /** 준비물 keyword used for the item's "쿠팡에서 구매" link, if any. */
  keyword?: string;
  /** ISO date of the related schedule, if any — used to deep-link into the calendar on tap. */
  date?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationCenterContextValue {
  notifications: NotificationCenterItem[];
  hasUnread: boolean;
  addNotification: (input: Omit<NotificationCenterItem, 'id' | 'createdAt' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markRead: (id: string) => void;
  clearNotifications: () => void;
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

  const addNotification: NotificationCenterContextValue['addNotification'] = (input) => {
    setNotifications((prev) => [
      { ...input, id: nextId(), read: false, createdAt: new Date().toISOString() },
      ...prev,
    ]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearNotifications = () => setNotifications([]);

  const hasUnread = useMemo(() => notifications.some((n) => !n.read), [notifications]);

  const value = useMemo<NotificationCenterContextValue>(
    () => ({ notifications, hasUnread, addNotification, removeNotification, markRead, clearNotifications }),
    [notifications, hasUnread]
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
