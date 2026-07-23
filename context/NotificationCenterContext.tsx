import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface NotificationCenterItem {
  id: string;
  title: string;
  body: string;
  /** 준비물 keyword used for the item's "쿠팡에서 구매" link, if any. */
  keyword?: string;
  createdAt: string;
}

interface NotificationCenterContextValue {
  notifications: NotificationCenterItem[];
  addNotification: (input: Omit<NotificationCenterItem, 'id' | 'createdAt'>) => void;
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
      { ...input, id: nextId(), createdAt: new Date().toISOString() },
      ...prev,
    ]);
  };

  const clearNotifications = () => setNotifications([]);

  const value = useMemo<NotificationCenterContextValue>(
    () => ({ notifications, addNotification, clearNotifications }),
    [notifications]
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
