import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
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
  seedNotificationSettings,
} from '../data/seed';
import { Child, Event, FamilyMember, GoogleAccount, NotificationSettings } from '../types/models';
import { toISODate } from '../utils/date';
import { withExternalAction } from '../utils/externalAction';
import { db, firebaseAuth } from '../utils/firebase';
import { scheduleEventNotifications } from '../utils/notifications';
import { sanitizeData } from '../utils/validation';

const HAS_ONBOARDED_KEY = 'kindercare_has_onboarded';
const FONT_SIZE_KEY = 'kindercare_font_size';
const EVENTS_KEY = 'kindercare_events';
const CHILDREN_KEY = 'kindercare_children';
const SELECTED_CHILD_ID_KEY = 'kindercare_selected_child_id';
const NOTIFICATION_SETTINGS_KEY = 'kindercare_notification_settings';
const GOOGLE_ACCOUNT_KEY = 'kindercare_google_account';
const FAMILY_MEMBERS_KEY = 'kindercare_family_members';
const DATA_OWNER_EMAIL_KEY = 'kindercare_data_owner_email';
const FAMILY_KEY_KEY = 'kindercare_family_key';

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
  deleteEvents: (eventIds: string[]) => void;
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

  // Account deletion
  resetAllData: () => Promise<void>;

  // Data ownership
  dataOwnerEmail: string | null;

  // Cloud sync
  checkCloudDataExists: (email: string) => Promise<boolean>;
  restoreDataFromCloud: (email: string) => Promise<void>;

  // Google sign-in (mocked — real OAuth is deferred to a future contract)
  googleAccount: GoogleAccount | null;
  signInWithGoogle: () => Promise<GoogleAccount>;
  signOutGoogle: () => void;
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
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  const [childProfiles, setChildProfiles] = useState<Child[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(undefined);

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(seedNotificationSettings);
  const [fontChoiceId, setFontChoiceId] = useState<FontChoiceId>(DEFAULT_FONT_ID);
  const [fontSizeChoice, setFontSizeChoiceState] = useState<FontSizeChoice>(DEFAULT_FONT_SIZE);
  const [chalkboardThemeId, setChalkboardThemeId] = useState(DEFAULT_CHALKBOARD_THEME_ID);
  const [adDismissedDate, setAdDismissedDate] = useState<string | null>(null);
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null);
  const [dataOwnerEmail, setDataOwnerEmail] = useState<string | null>(null);
  const [syncChecked, setSyncChecked] = useState(false);

  // Restore the "already onboarded" / font-size choice / registered events
  // made in a previous session so relaunching (or force-quitting) the app
  // doesn't force the user back through onboarding, reset their preferred
  // text size, or lose schedules they'd already added.
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '399651841789-rnm71qdp4tbvsism5rne3b2k5ndquuih.apps.googleusercontent.com',
      offlineAccess: true,
    });

    Promise.all([
      AsyncStorage.getItem(HAS_ONBOARDED_KEY),
      AsyncStorage.getItem(FONT_SIZE_KEY),
      AsyncStorage.getItem(EVENTS_KEY),
      AsyncStorage.getItem(GOOGLE_ACCOUNT_KEY),
      AsyncStorage.getItem(CHILDREN_KEY),
      AsyncStorage.getItem(SELECTED_CHILD_ID_KEY),
      AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY),
      AsyncStorage.getItem(FAMILY_MEMBERS_KEY),
      AsyncStorage.getItem(DATA_OWNER_EMAIL_KEY),
      AsyncStorage.getItem(FAMILY_KEY_KEY),
    ])
      .then(
        ([
          storedOnboarded,
          storedFontSize,
          storedEvents,
          storedGoogleAccount,
          storedChildren,
          storedSelectedChildId,
          storedNotificationSettings,
          storedFamilyMembers,
          storedDataOwnerEmail,
          storedFamilyKey,
        ]) => {
          if (storedOnboarded === 'true') setHasOnboarded(true);
          if (storedFontSize && FONT_SIZE_OPTIONS.some((o) => o.id === storedFontSize)) {
            setFontSizeChoiceState(storedFontSize as FontSizeChoice);
          }
          if (storedFamilyKey) {
            setFamilyKey(storedFamilyKey);
          }
          if (storedEvents) {
            try {
              const parsed = JSON.parse(storedEvents);
              if (Array.isArray(parsed)) setEvents(parsed);
            } catch (e) {
              console.error('Failed to parse stored events:', e);
            }
          }
          if (storedGoogleAccount) {
            try {
              setGoogleAccount(JSON.parse(storedGoogleAccount));
            } catch (e) {
              console.error('Failed to parse stored google account:', e);
            }
          }
          if (storedChildren) {
            try {
              const parsed = JSON.parse(storedChildren);
              if (Array.isArray(parsed)) setChildProfiles(parsed);
            } catch (e) {
              console.error('Failed to parse stored children:', e);
            }
          }
          if (storedSelectedChildId) {
            setSelectedChildId(storedSelectedChildId);
          }
          if (storedNotificationSettings) {
            try {
              setNotificationSettings(JSON.parse(storedNotificationSettings));
            } catch (e) {
              console.error('Failed to parse stored notification settings:', e);
            }
          }
          if (storedFamilyMembers) {
            try {
              const parsed = JSON.parse(storedFamilyMembers);
              if (Array.isArray(parsed)) setFamilyMembers(parsed);
            } catch (e) {
              console.error('Failed to parse stored family members:', e);
            }
          }
          if (storedDataOwnerEmail) {
            setDataOwnerEmail(storedDataOwnerEmail);
            // If we have an account and are onboarded, make sure cloud user doc exists
            if (storedGoogleAccount) {
              try {
                const account = JSON.parse(storedGoogleAccount);
                syncUserToFirestore(account);
              } catch (e) {
                console.error('Failed to parse google account for firestore sync:', e);
              }
            }
          }
        }
      )
      .finally(() => setOnboardingLoaded(true));
  }, []);

  // Persist events after the initial load above has resolved
  useEffect(() => {
    if (!onboardingLoaded) return;
    AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events)).catch(() => {});
  }, [events, onboardingLoaded]);

  // Persist children after initial load
  useEffect(() => {
    if (!onboardingLoaded) return;
    AsyncStorage.setItem(CHILDREN_KEY, JSON.stringify(childProfiles)).catch(() => {});
  }, [childProfiles, onboardingLoaded]);

  // Persist selected child ID after initial load
  useEffect(() => {
    if (!onboardingLoaded || !selectedChildId) return;
    AsyncStorage.setItem(SELECTED_CHILD_ID_KEY, selectedChildId).catch(() => {});
  }, [selectedChildId, onboardingLoaded]);

  // Persist family key
  useEffect(() => {
    if (!onboardingLoaded) return;
    AsyncStorage.setItem(FAMILY_KEY_KEY, familyKey).catch(() => {});
  }, [familyKey, onboardingLoaded]);

  // Persist notification settings after initial load
  useEffect(() => {
    if (!onboardingLoaded) return;
    AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(notificationSettings)).catch(
      () => {}
    );
  }, [notificationSettings, onboardingLoaded]);

  // Persist family members after initial load
  useEffect(() => {
    if (!onboardingLoaded) return;
    AsyncStorage.setItem(FAMILY_MEMBERS_KEY, JSON.stringify(familyMembers)).catch(() => {});
  }, [familyMembers, onboardingLoaded]);

  // Persist data owner email
  useEffect(() => {
    if (!onboardingLoaded || !dataOwnerEmail) return;
    AsyncStorage.setItem(DATA_OWNER_EMAIL_KEY, dataOwnerEmail).catch(() => {});
  }, [dataOwnerEmail, onboardingLoaded]);

  // [Real-time Synchronization]
  // Listen for changes in the cloud and update local state immediately.
  useEffect(() => {
    if (!googleAccount?.email || !onboardingLoaded || !syncChecked) return;

    const email = googleAccount.email;
    console.log('🔄 Firestore Listener Started for:', email);

    // Listen to Children
    const unsubChildren = db
      .collection('users')
      .doc(email)
      .collection('children')
      .onSnapshot((snap) => {
        if (!snap) return;
        const cloudChildren = snap.docs.map(doc => doc.data() as Child);
        console.log(`📥 Cloud Sync: Received ${cloudChildren.length} children`);

        // Trust cloud only if we've already done our initial sync-up check.
        // This prevents accidental wipes on cold start.
        if (cloudChildren.length > 0 || syncChecked) {
          setChildProfiles(cloudChildren);
        }
      }, (err) => console.error('❌ Firestore Children Listener Error:', err));

    // Listen to Events
    const unsubEvents = db
      .collection('users')
      .doc(email)
      .collection('events')
      .onSnapshot((snap) => {
        if (!snap) return;
        const cloudEvents = snap.docs.map(doc => doc.data() as Event);
        console.log(`📥 Cloud Sync: Received ${cloudEvents.length} events`);

        // Trust cloud only if we've already done our initial sync-up check.
        if (cloudEvents.length > 0 || syncChecked) {
          setEvents(cloudEvents);
        }
      }, (err) => console.error('❌ Firestore Events Listener Error:', err));

    return () => {
      console.log('🔌 Firestore Listener Unsubscribed');
      unsubChildren();
      unsubEvents();
    };
  }, [googleAccount?.email, onboardingLoaded, syncChecked]);

  // [Initial Sync-Up]
  // If we have local data but the cloud is empty, push local data to cloud.
  useEffect(() => {
    if (!googleAccount?.email || !onboardingLoaded || syncChecked) return;

    const syncUp = async () => {
      const email = googleAccount.email;
      try {
        console.log('📤 Initial Sync-Up Checking for:', email);

        // Wait for Firebase Auth to be ready
        let retry = 0;
        while (!firebaseAuth.currentUser && retry < 5) {
          console.log('⏳ Waiting for Firebase Auth session...');
          await new Promise(resolve => setTimeout(resolve, 500));
          retry++;
        }

        const eventsSnap = await db.collection('users').doc(email).collection('events').limit(1).get();
        const childrenSnap = await db.collection('users').doc(email).collection('children').limit(1).get();

        if (eventsSnap.empty && events.length > 0) {
          console.log(`📤 Pushing ${events.length} local events to cloud...`);
          await Promise.all(events.map(e => pushEventToCloud(email, e)));
        }

        if (childrenSnap.empty && childProfiles.length > 0) {
          console.log(`📤 Pushing ${childProfiles.length} local profiles to cloud...`);
          await Promise.all(childProfiles.map(c => pushChildToCloud(email, c)));
        }

        console.log('✅ Initial Sync-Up Complete');
        setSyncChecked(true);
      } catch (error) {
        console.error('❌ Initial Sync-Up Failed:', error);
        // Set checked to true anyway so listeners can resume normal operation
        setSyncChecked(true);
      }
    };

    syncUp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleAccount?.email, onboardingLoaded]);

  const selectedChild = useMemo(
    () => childProfiles.find((c) => c.id === selectedChildId),
    [childProfiles, selectedChildId]
  );

  const fontScale = useMemo(
    () => FONT_SIZE_OPTIONS.find((o) => o.id === fontSizeChoice)?.scale ?? 1,
    [fontSizeChoice]
  );

  const syncUserToFirestore = async (account: GoogleAccount) => {
    try {
      console.log('📡 Syncing user to Firestore:', account.email);
      const userRef = db.collection('users').doc(account.email);
      await userRef.set(sanitizeData({
        email: account.email,
        name: account.name,
        lastLogin: new Date().toISOString(),
        hasOnboarded: true,
      }), { merge: true });
      console.log('✅ User sync success');
    } catch (error) {
      console.error('❌ Firestore Sync User Error:', error);
    }
  };

  const pushChildToCloud = async (email: string, child: Child) => {
    try {
      console.log('📡 Pushing child to cloud:', child.id);
      await db.collection('users').doc(email).collection('children').doc(child.id).set(sanitizeData(child));
      console.log('✅ Child push success');
    } catch (error) {
      console.error('❌ Firestore Push Child Error:', error);
    }
  };

  const pushEventToCloud = async (email: string, event: Event) => {
    try {
      console.log('📡 Pushing event to cloud:', event.id);
      await db.collection('users').doc(email).collection('events').doc(event.id).set(sanitizeData(event));
      console.log('✅ Event push success');
    } catch (error) {
      console.error('❌ Firestore Push Event Error:', error);
    }
  };

  const deleteChildFromCloud = async (email: string, childId: string) => {
    try {
      console.log('📡 Deleting child from cloud:', childId);
      await db.collection('users').doc(email).collection('children').doc(childId).delete();
      console.log('✅ Child delete success');
    } catch (error) {
      console.error('❌ Firestore Delete Child Error:', error);
    }
  };

  const deleteEventFromCloud = async (email: string, eventId: string) => {
    try {
      console.log('📡 Deleting event from cloud:', eventId);
      await db.collection('users').doc(email).collection('events').doc(eventId).delete();
      console.log('✅ Event delete success');
    } catch (error) {
      console.error('❌ Firestore Delete Event Error:', error);
    }
  };

  const checkCloudDataExists = async (email: string): Promise<boolean> => {
    try {
      const childrenSnap = await db.collection('users').doc(email).collection('children').limit(1).get();
      return !childrenSnap.empty;
    } catch (error) {
      console.error('Firestore Check Data Error:', error);
      return false;
    }
  };

  const restoreDataFromCloud = async (email: string) => {
    try {
      console.log('🔄 Restoring data for:', email);

      const childrenSnap = await db.collection('users').doc(email).collection('children').get();
      const eventsSnap = await db.collection('users').doc(email).collection('events').get();

      const cloudChildren = childrenSnap.docs.map(doc => doc.data() as Child);
      const cloudEvents = eventsSnap.docs.map(doc => doc.data() as Event);

      console.log(`📥 Restored ${cloudChildren.length} children and ${cloudEvents.length} events`);

      // 1. Update In-memory State first
      if (cloudChildren.length > 0) {
        setChildProfiles(cloudChildren);
        setSelectedChildId(cloudChildren[0].id);
      }
      setEvents(cloudEvents);
      setDataOwnerEmail(email);

      // 2. Persist to AsyncStorage (Immediate)
      // We do this manually here to ensure that even if the app is closed
      // immediately after navigation, the data is definitely there.
      const persistOps = [
        AsyncStorage.setItem(HAS_ONBOARDED_KEY, 'true'),
        AsyncStorage.setItem(DATA_OWNER_EMAIL_KEY, email),
        AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(cloudEvents)),
        AsyncStorage.setItem(CHILDREN_KEY, JSON.stringify(cloudChildren)),
      ];
      if (cloudChildren.length > 0) {
        persistOps.push(AsyncStorage.setItem(SELECTED_CHILD_ID_KEY, cloudChildren[0].id));
      }
      await Promise.all(persistOps);

      // 3. Mark flags to trigger Home Screen entry and stop initial sync-up wipes
      setSyncChecked(true);
      setHasOnboarded(true);

      console.log('✅ Cloud restoration complete');
    } catch (error) {
      console.error('❌ Firestore Restore Error:', error);
      throw error;
    }
  };

  const completeOnboarding = () => {
    setHasOnboarded(true);
    AsyncStorage.setItem(HAS_ONBOARDED_KEY, 'true').catch(() => {});
    // When onboarding is completed, lock the current user's email as the data owner.
    if (googleAccount?.email && !dataOwnerEmail) {
      setDataOwnerEmail(googleAccount.email);
      syncUserToFirestore(googleAccount);
    }
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
    if (googleAccount?.email) {
      pushChildToCloud(googleAccount.email, newChild);
    }
  };

  const updateChild = (id: string, input: Omit<Child, 'id'>) => {
    const updatedChild = { ...input, id };
    setChildProfiles((prev) => prev.map((c) => (c.id === id ? updatedChild : c)));
    if (googleAccount?.email) {
      pushChildToCloud(googleAccount.email, updatedChild);
    }
  };

  const deleteChild = (id: string) => {
    setChildProfiles((prev) => prev.filter((c) => c.id !== id));
    setSelectedChildId((prev) => {
      if (prev !== id) return prev;
      const remaining = childProfiles.filter((c) => c.id !== id);
      return remaining[0]?.id;
    });
    if (googleAccount?.email) {
      deleteChildFromCloud(googleAccount.email, id);
    }
  };

  const updateEventNote = (eventId: string, note: string) => {
    setEvents((prev) => {
      const updated = prev.map((e) => (e.id === eventId ? { ...e, note } : e));
      const target = updated.find(e => e.id === eventId);
      if (googleAccount?.email && target) {
        pushEventToCloud(googleAccount.email, target);
      }
      return updated;
    });
  };

  const updateEvent = (eventId: string, input: Partial<Omit<Event, 'id'>>) => {
    setEvents((prev) => {
      const updated = prev.map((e) => (e.id === eventId ? { ...e, ...input } : e));
      const target = updated.find(e => e.id === eventId);
      if (googleAccount?.email && target) {
        pushEventToCloud(googleAccount.email, target);
      }
      return updated;
    });
  };

  const deleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    if (googleAccount?.email) {
      deleteEventFromCloud(googleAccount.email, eventId);
    }
  };

  const deleteEvents = (eventIds: string[]) => {
    const idSet = new Set(eventIds);
    setEvents((prev) => prev.filter((e) => !idSet.has(e.id)));
    if (googleAccount?.email) {
      eventIds.forEach(id => deleteEventFromCloud(googleAccount.email!, id));
    }
  };

  const addEvent = (input: Omit<Event, 'id'>) => {
    const newEvent = { ...input, id: nextEventId() };
    setEvents((prev) => [...prev, newEvent]);
    if (googleAccount?.email) {
      pushEventToCloud(googleAccount.email, newEvent);
    }
  };

  const addEvents = (inputs: Omit<Event, 'id'>[]) => {
    const newEvents = inputs.map((input) => ({ ...input, id: nextEventId() }));
    setEvents((prev) => [...prev, ...newEvents]);
    if (googleAccount?.email) {
      newEvents.forEach(e => pushEventToCloud(googleAccount.email!, e));
    }
  };

  const updateNotificationSettings = (input: Partial<NotificationSettings>) => {
    setNotificationSettings((prev) => ({ ...prev, ...input }));
  };

  const dismissAdForToday = () => {
    setAdDismissedDate(toISODate(new Date()));
  };

  // Real Google OAuth handshake using @react-native-google-signin/google-signin.
  const signInWithGoogle = async (): Promise<GoogleAccount> => {
    return await withExternalAction(async () => {
      try {
        await GoogleSignin.hasPlayServices();

        // Force account selection popup by signing out first
        try {
          await GoogleSignin.signOut();
        } catch (e) {
          // Ignore errors from signOut (e.g. if not signed in)
        }

        const userInfo = await GoogleSignin.signIn();

        if (userInfo.data?.user) {
          // Firebase Auth link
          if (userInfo.data.idToken) {
            const googleCredential = auth.GoogleAuthProvider.credential(userInfo.data.idToken);
            await firebaseAuth.signInWithCredential(googleCredential);
          }

          const account: GoogleAccount = {
            email: userInfo.data.user.email,
            name: userInfo.data.user.name ?? '사용자'
          };

          setGoogleAccount(account);
          await AsyncStorage.setItem(GOOGLE_ACCOUNT_KEY, JSON.stringify(account));

          // If they already finished onboarding, sync to Firestore on login
          if (hasOnboarded) {
            await syncUserToFirestore(account);
          }

          // If family members list is empty (e.g. first login or fresh install),
          // initialize it with the current user as "Me" (owner).
          setFamilyMembers((prev) => {
            if (prev.length === 0) {
              return [{ id: `member-${Date.now()}`, name: '나', isOwner: true }];
            }
            return prev;
          });

          return account;
        } else {
          const error = new Error('구글 계정 정보를 가져올 수 없습니다.');
          (error as any).code = 'USER_INFO_MISSING';
          throw error;
        }
      } catch (error: any) {
        console.error('Google Sign-In Error:', error);

        // [Error Normalization]
        // Explicitly map various cancellation patterns to a unified code '12501'
        // to help the UI layer handle it reliably.
        const msg = String(error.message || '').toLowerCase();
        const code = String(error.code || '');

        if (
          code === '12501' || code === '12502' || code === '13' || code === '7' ||
          code === '10' || code === '12500' ||
          msg.includes('cancel') || msg.includes('dismiss') || msg.includes('user back') ||
          msg.includes('뒤로') || msg.includes('취소') || msg.includes('닫기') ||
          msg.includes('sign_in_cancelled') || msg.includes('user_cancelled') ||
          msg.includes('developer_error')
        ) {
          error.code = '12501'; // Unified cancel code
        }

        throw error;
      }
    });
  };

  const signOutGoogle = async () => {
    try {
      await GoogleSignin.signOut();
      await firebaseAuth.signOut();
      setGoogleAccount(null);
      AsyncStorage.removeItem(GOOGLE_ACCOUNT_KEY).catch(() => {});
    } catch (error) {
      console.error('Google Sign-Out Error:', error);
    }
  };

  // 회원탈퇴: wipes every piece of this app's persisted state and puts the
  // in-memory data back to the same shape a fresh install would have, then
  // the caller navigates back to onboarding.
  const resetAllData = async () => {
    await AsyncStorage.multiRemove([
      HAS_ONBOARDED_KEY,
      FONT_SIZE_KEY,
      EVENTS_KEY,
      GOOGLE_ACCOUNT_KEY,
      CHILDREN_KEY,
      SELECTED_CHILD_ID_KEY,
      NOTIFICATION_SETTINGS_KEY,
      FAMILY_MEMBERS_KEY,
      DATA_OWNER_EMAIL_KEY,
      FAMILY_KEY_KEY,
    ]).catch(() => {});
    setHasOnboarded(false);
    setFamilyKey(generateFamilyKey());
    setFamilyMembers([]);
    setChildProfiles([]);
    setEvents([]);
    setSelectedChildId(undefined);
    setNotificationSettings(seedNotificationSettings);
    setFontChoiceId(DEFAULT_FONT_ID);
    setFontSizeChoiceState(DEFAULT_FONT_SIZE);
    setChalkboardThemeId(DEFAULT_CHALKBOARD_THEME_ID);
    setAdDismissedDate(null);
    setGoogleAccount(null);
    setDataOwnerEmail(null);
  };

  // Whenever the event list or the notification schedule preferences change,
  // re-schedule the day-before/same-day local notifications so newly
  // added/edited events actually get a reminder without the user having to
  // separately revisit the notification settings screen.
  useEffect(() => {
    // The permission prompt this may trigger briefly blips AppState on some
    // platforms — suppress the lock/splash replay that would otherwise fire.
    withExternalAction(() => scheduleEventNotifications(events, notificationSettings)).catch(
      () => {}
    );
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
    deleteEvents,
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

    resetAllData,

    dataOwnerEmail,

    checkCloudDataExists,
    restoreDataFromCloud,

    googleAccount,
    signInWithGoogle,
    signOutGoogle,
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
