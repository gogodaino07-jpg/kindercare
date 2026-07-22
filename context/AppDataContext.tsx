import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_CHALKBOARD_THEME_ID } from '../constants/chalkboardThemes';
import {
  DEFAULT_FONT_ID,
  DEFAULT_FONT_SIZE,
  FONT_SIZE_OPTIONS,
  FontChoiceId,
  FontSizeChoice,
} from '../constants/fontOptions';
import {
  generateFamilyKey,
  seedChildren,
  seedEvents,
  seedFamilyMembers,
  seedNotificationSettings,
} from '../data/seed';
import { Child, Event, FamilyMember, NotificationSettings } from '../types/models';
import { toISODate } from '../utils/date';
import { scheduleEventNotifications } from '../utils/notifications';

const HAS_ONBOARDED_KEY = 'kindercare_has_onboarded';
const FONT_SIZE_KEY = 'kindercare_font_size';

interface AppDataContextValue {
  // Onboarding / family group
  hasOnboarded: boolean;
  onboardingLoaded: boolean;
  completeOnboarding: () => void;
  familyKey: string;
  regenerateFamilyKey: () => string;
  familyMembers: FamilyMember[];
  removeMember: (memberId: string) => void;
  leaveFamily: (memberId: string) => void;
  updateMemberPhone: (memberId: string, phone: string | null) => void;

  // Children
  children: Child[];
  selectedChild: Child | undefined;
  selectChild: (id: string) => void;
  addChild: (input: Omit<Child, 'id'>) => void;
  updateChild: (id: string, input: Omit<Child, 'id'>) => void;
  deleteChild: (id: string) => void;

  // Events
  events: Event[];
  updateEventNote: (eventId: string, note: string) => void;
  updateEvent: (eventId: string, input: Partial<Omit<Event, 'id'>>) => void;
  deleteEvent: (eventId: string) => void;
  addEvent: (input: Omit<Event, 'id'>) => void;
  addEvents: (inputs: Omit<Event, 'id'>[]) => void;

  // Notifications
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (input: Partial<NotificationSettings>) => void;

  // Appearance
  fontChoiceId: FontChoiceId;
  setFontChoiceId: (id: FontChoiceId) => void;
  fontSizeChoice: FontSizeChoice;
  setFontSizeChoice: (id: FontSizeChoice) => void;
  /** Multiplier for the current fontSizeChoice — the single source of truth AppText reads from. */
  fontScale: number;
  chalkboardThemeId: string;
  setChalkboardThemeId: (id: string) => void;

  // Home ad popup
  adDismissedDate: string | null;
  dismissAdForToday: () => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

let eventIdCounter = 0;
function nextEventId() {
  eventIdCounter += 1;
  return `event-${Date.now()}-${eventIdCounter}`;
}

export function AppDataProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const [familyKey, setFamilyKey] = useState(generateFamilyKey);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(seedFamilyMembers);

  const [childProfiles, setChildProfiles] = useState<Child[]>(seedChildren);
  const [events, setEvents] = useState<Event[]>(seedEvents);
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(seedChildren[0]?.id);

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(seedNotificationSettings);
  const [fontChoiceId, setFontChoiceId] = useState<FontChoiceId>(DEFAULT_FONT_ID);
  const [fontSizeChoice, setFontSizeChoiceState] = useState<FontSizeChoice>(DEFAULT_FONT_SIZE);
  const [chalkboardThemeId, setChalkboardThemeId] = useState(DEFAULT_CHALKBOARD_THEME_ID);
  const [adDismissedDate, setAdDismissedDate] = useState<string | null>(null);

  // Restore the "already onboarded" / font-size choice made in a previous
  // session so relaunching the app doesn't force the user back through
  // onboarding or reset their preferred text size.
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(HAS_ONBOARDED_KEY),
      AsyncStorage.getItem(FONT_SIZE_KEY),
    ])
      .then(([storedOnboarded, storedFontSize]) => {
        if (storedOnboarded === 'true') setHasOnboarded(true);
        if (storedFontSize === 'small' || storedFontSize === 'medium' || storedFontSize === 'large') {
          setFontSizeChoiceState(storedFontSize);
        }
      })
      .finally(() => setOnboardingLoaded(true));
  }, []);

  const selectedChild = useMemo(
    () => childProfiles.find((c) => c.id === selectedChildId),
    [childProfiles, selectedChildId]
  );

  const fontScale = useMemo(
    () => FONT_SIZE_OPTIONS.find((o) => o.id === fontSizeChoice)?.scale ?? 1,
    [fontSizeChoice]
  );

  const completeOnboarding = () => {
    setHasOnboarded(true);
    AsyncStorage.setItem(HAS_ONBOARDED_KEY, 'true').catch(() => {});
  };

  const setFontSizeChoice = (id: FontSizeChoice) => {
    setFontSizeChoiceState(id);
    AsyncStorage.setItem(FONT_SIZE_KEY, id).catch(() => {});
  };

  const regenerateFamilyKey = () => {
    const newKey = generateFamilyKey();
    setFamilyKey(newKey);
    return newKey;
  };

  const removeMember = (memberId: string) => {
    setFamilyMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const leaveFamily = (memberId: string) => {
    setFamilyMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const updateMemberPhone = (memberId: string, phone: string | null) => {
    setFamilyMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, phone: phone ?? undefined } : m))
    );
  };

  const addChild = (input: Omit<Child, 'id'>) => {
    const newChild: Child = { ...input, id: `child-${Date.now()}` };
    setChildProfiles((prev) => [...prev, newChild]);
    setSelectedChildId(newChild.id);
  };

  const updateChild = (id: string, input: Omit<Child, 'id'>) => {
    setChildProfiles((prev) => prev.map((c) => (c.id === id ? { ...input, id } : c)));
  };

  const deleteChild = (id: string) => {
    setChildProfiles((prev) => prev.filter((c) => c.id !== id));
    setSelectedChildId((prev) => {
      if (prev !== id) return prev;
      const remaining = childProfiles.filter((c) => c.id !== id);
      return remaining[0]?.id;
    });
  };

  const updateEventNote = (eventId: string, note: string) => {
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, note } : e)));
  };

  const updateEvent = (eventId: string, input: Partial<Omit<Event, 'id'>>) => {
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, ...input } : e)));
  };

  const deleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const addEvent = (input: Omit<Event, 'id'>) => {
    setEvents((prev) => [...prev, { ...input, id: nextEventId() }]);
  };

  const addEvents = (inputs: Omit<Event, 'id'>[]) => {
    setEvents((prev) => [...prev, ...inputs.map((input) => ({ ...input, id: nextEventId() }))]);
  };

  const updateNotificationSettings = (input: Partial<NotificationSettings>) => {
    setNotificationSettings((prev) => ({ ...prev, ...input }));
  };

  const dismissAdForToday = () => {
    setAdDismissedDate(toISODate(new Date()));
  };

  // Whenever the event list or the notification schedule preferences change,
  // re-schedule the day-before/same-day local notifications so newly
  // added/edited events actually get a reminder without the user having to
  // separately revisit the notification settings screen.
  useEffect(() => {
    scheduleEventNotifications(events, notificationSettings).catch(() => {});
  }, [events, notificationSettings]);

  const value: AppDataContextValue = {
    hasOnboarded,
    onboardingLoaded,
    completeOnboarding,
    familyKey,
    regenerateFamilyKey,
    familyMembers,
    removeMember,
    leaveFamily,
    updateMemberPhone,

    children: childProfiles,
    selectedChild,
    selectChild: setSelectedChildId,
    addChild,
    updateChild,
    deleteChild,

    events,
    updateEventNote,
    updateEvent,
    deleteEvent,
    addEvent,
    addEvents,

    notificationSettings,
    updateNotificationSettings,

    fontChoiceId,
    setFontChoiceId,
    fontSizeChoice,
    setFontSizeChoice,
    fontScale,
    chalkboardThemeId,
    setChalkboardThemeId,

    adDismissedDate,
    dismissAdForToday,
  };

  return <AppDataContext.Provider value={value}>{reactChildren}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return ctx;
}
