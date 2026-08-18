import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { login as kakaoLogin, logout as kakaoLogout, getProfile as getKakaoProfile } from '@react-native-seoul/kakao-login';
import * as Crypto from 'expo-crypto';
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
import { isSimilarEvent } from '../data/mockAIResult';
import { Child, Event, FamilyMember, GoogleAccount, MealPlan, NotificationSettings } from '../types/models';
import { toISODate } from '../utils/date';
import { withExternalAction } from '../utils/externalAction';
import { getDb, getFirebaseAuth } from '../utils/firebase';
import { scheduleEventNotifications } from '../utils/notifications';
import { sanitizeData } from '../utils/validation';
import { AIUsageLimitService } from '../features/newsletter-analysis';

const HAS_ONBOARDED_KEY = 'kindercare_has_onboarded';
const FONT_SIZE_KEY = 'kindercare_font_size';
const FONT_CHOICE_KEY = 'kindercare_font_choice';
const CHALKBOARD_THEME_KEY = 'kindercare_chalkboard_theme';
const EVENTS_KEY = 'kindercare_events';
const MEAL_PLANS_KEY = 'kindercare_mealplans';
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
  addEvents: (inputs: Omit<Event, 'id'>[], options?: { replaceSimilar?: boolean }) => void;

  // Meal plans
  mealPlans: MealPlan[];
  addMealPlans: (inputs: Omit<MealPlan, 'id'>[]) => void;

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

  // Account deletion
  resetAllData: (options?: { preserveAccount?: boolean }) => Promise<void>;
  requestWithdrawal: () => Promise<void>;
  cancelWithdrawal: (email: string) => Promise<void>;
  purgeCloudData: (email: string) => Promise<void>;
  checkWithdrawalStatus: (email: string) => Promise<string | null>; // Returns ISO date string or null

  // Data ownership
  dataOwnerEmail: string | null;

  // Cloud sync
  checkCloudDataExists: (email: string) => Promise<boolean>;
  checkOnboardingStatus: (email: string) => Promise<boolean>;
  restoreDataFromCloud: (email: string) => Promise<void>;

  // Google sign-in (mocked — real OAuth is deferred to a future contract)
  googleAccount: GoogleAccount | null;
  signInWithGoogle: () => Promise<GoogleAccount>;
  signOutGoogle: () => void;

  // Kakao sign-in
  signInWithKakao: () => Promise<GoogleAccount>;
  signOutKakao: () => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

let eventIdCounter = 0;
function nextEventId() {
  eventIdCounter += 1;
  return `event-${Date.now()}-${eventIdCounter}`;
}

let mealPlanIdCounter = 0;
function nextMealPlanId() {
  mealPlanIdCounter += 1;
  return `mealplan-${Date.now()}-${mealPlanIdCounter}`;
}

export function AppDataProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const [familyKey, setFamilyKey] = useState(generateFamilyKey);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  const [childProfiles, setChildProfiles] = useState<Child[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(undefined);

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(seedNotificationSettings);
  const [fontChoiceId, setFontChoiceId] = useState<FontChoiceId>(DEFAULT_FONT_ID);
  const [fontSizeChoice, setFontSizeChoiceState] = useState<FontSizeChoice>(DEFAULT_FONT_SIZE);
  const [chalkboardThemeId, setChalkboardThemeId] = useState(DEFAULT_CHALKBOARD_THEME_ID);
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
      AsyncStorage.getItem(MEAL_PLANS_KEY),
      AsyncStorage.getItem(GOOGLE_ACCOUNT_KEY),
      AsyncStorage.getItem(CHILDREN_KEY),
      AsyncStorage.getItem(SELECTED_CHILD_ID_KEY),
      AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY),
      AsyncStorage.getItem(FAMILY_MEMBERS_KEY),
      AsyncStorage.getItem(DATA_OWNER_EMAIL_KEY),
      AsyncStorage.getItem(FAMILY_KEY_KEY),
      AsyncStorage.getItem(FONT_CHOICE_KEY),
      AsyncStorage.getItem(CHALKBOARD_THEME_KEY),
    ])
      .then(
        ([
          storedOnboarded,
          storedFontSize,
          storedEvents,
          storedMealPlans,
          storedGoogleAccount,
          storedChildren,
          storedSelectedChildId,
          storedNotificationSettings,
          storedFamilyMembers,
          storedDataOwnerEmail,
          storedFamilyKey,
          storedFontChoice,
          storedChalkboardTheme,
        ]) => {
          if (storedOnboarded === 'true') setHasOnboarded(true);
          if (storedFontSize && FONT_SIZE_OPTIONS.some((o) => o.id === storedFontSize)) {
            setFontSizeChoiceState(storedFontSize as FontSizeChoice);
          }
          if (storedFontChoice) {
            setFontChoiceId(storedFontChoice as FontChoiceId);
          }
          if (storedChalkboardTheme) {
            setChalkboardThemeId(storedChalkboardTheme);
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
          if (storedMealPlans) {
            try {
              const parsed = JSON.parse(storedMealPlans);
              if (Array.isArray(parsed)) setMealPlans(parsed);
            } catch (e) {
              console.error('Failed to parse stored meal plans:', e);
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
              let parsed = JSON.parse(storedNotificationSettings);
              // [Migration] Old default (AM 6:00) -> New default (PM 6:00)
              // Only migrate if it matches the exact old default to avoid overriding intentional user choices.
              if (
                parsed.dayBeforeTime?.period === 'AM' &&
                parsed.dayBeforeTime?.hour === 6 &&
                parsed.dayBeforeTime?.minute === 0
              ) {
                console.log('🔄 Migrating notification time from AM 6:00 to PM 6:00');
                parsed.dayBeforeTime = { period: 'PM', hour: 6, minute: 0 };
              }
              setNotificationSettings(parsed);
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
                syncUserToFirestore(account, 'google');
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

  // Persist meal plans after the initial load above has resolved
  useEffect(() => {
    if (!onboardingLoaded) return;
    AsyncStorage.setItem(MEAL_PLANS_KEY, JSON.stringify(mealPlans)).catch(() => {});
  }, [mealPlans, onboardingLoaded]);

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

  // Ensure we always have a selected child if one exists
  useEffect(() => {
    if (onboardingLoaded && childProfiles.length > 0 && !selectedChildId) {
      setSelectedChildId(childProfiles[0].id);
    }
  }, [onboardingLoaded, childProfiles, selectedChildId]);

  // Persist family key
  useEffect(() => {
    if (!onboardingLoaded) return;
    AsyncStorage.setItem(FAMILY_KEY_KEY, familyKey).catch(() => {});
  }, [familyKey, onboardingLoaded]);

  // Persist font choice after initial load
  useEffect(() => {
    if (!onboardingLoaded) return;
    AsyncStorage.setItem(FONT_CHOICE_KEY, fontChoiceId).catch(() => {});
  }, [fontChoiceId, onboardingLoaded]);

  // Persist chalkboard theme after initial load
  useEffect(() => {
    if (!onboardingLoaded) return;
    AsyncStorage.setItem(CHALKBOARD_THEME_KEY, chalkboardThemeId).catch(() => {});
  }, [chalkboardThemeId, onboardingLoaded]);

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
    const unsubChildren = getDb()
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
          setChildProfiles(prev => {
            // Keep local children that aren't in cloud yet (e.g. just added but not pushed)
            const localOnlyChildren = prev.filter(p => !cloudChildren.some(c => c.id === p.id));

            const mergedChildren = cloudChildren.map(cloudChild => {
              // Priority: cloud data for fields, but keep local photoUri
              const localChild = prev.find(p => p.id === cloudChild.id);
              return {
                ...cloudChild,
                photoUri: localChild?.photoUri || (cloudChild as any).photoUri
              };
            });

            return [...mergedChildren, ...localOnlyChildren];
          });
        }
      }, (err) => console.error('❌ Firestore Children Listener Error:', err));

    // Listen to Events
    const unsubEvents = getDb()
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

    // Listen to Meal Plans
    const unsubMealPlans = getDb()
      .collection('users')
      .doc(email)
      .collection('mealPlans')
      .onSnapshot((snap) => {
        if (!snap) return;
        const cloudMealPlans = snap.docs.map(doc => doc.data() as MealPlan);
        console.log(`📥 Cloud Sync: Received ${cloudMealPlans.length} meal plans`);

        // Trust cloud only if we've already done our initial sync-up check.
        if (cloudMealPlans.length > 0 || syncChecked) {
          setMealPlans(cloudMealPlans);
        }
      }, (err) => console.error('❌ Firestore Meal Plans Listener Error:', err));

    return () => {
      console.log('🔌 Firestore Listener Unsubscribed');
      unsubChildren();
      unsubEvents();
      unsubMealPlans();
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
        while (!getFirebaseAuth().currentUser && retry < 5) {
          console.log('⏳ Waiting for Firebase Auth session...');
          await new Promise(resolve => setTimeout(resolve, 500));
          retry++;
        }

        const eventsSnap = await getDb().collection('users').doc(email).collection('events').limit(1).get();
        const childrenSnap = await getDb().collection('users').doc(email).collection('children').limit(1).get();

        if (eventsSnap.empty && events.length > 0) {
          console.log(`📤 Pushing ${events.length} local events to cloud...`);
          await Promise.all(events.map(e => pushEventToCloud(email, e)));
        }

        const mealPlansSnap = await getDb().collection('users').doc(email).collection('mealPlans').limit(1).get();
        if (mealPlansSnap.empty && mealPlans.length > 0) {
          console.log(`📤 Pushing ${mealPlans.length} local meal plans to cloud...`);
          await Promise.all(mealPlans.map(m => pushMealPlanToCloud(email, m)));
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

  const syncUserToFirestore = async (account: GoogleAccount, provider: string = 'google') => {
    try {
      console.log(`📡 Syncing user to Firestore (${provider}):`, account.email);
      const userRef = getDb().collection('users').doc(account.email);
      await userRef.set(sanitizeData({
        email: account.email,
        name: account.name,
        lastLogin: new Date().toISOString(),
        hasOnboarded: true,
        provider,
      }), { merge: true });
      console.log('✅ User sync success');
    } catch (error) {
      console.error('❌ Firestore Sync User Error:', error);
    }
  };

  const pushChildToCloud = async (email: string, child: Child) => {
    try {
      console.log('📡 Pushing child to cloud:', child.id);
      // Exclude local photoUri from cloud backup as it won't work on other devices.
      const { photoUri, ...childData } = child;
      await getDb().collection('users').doc(email).collection('children').doc(child.id).set(sanitizeData(childData));
      console.log('✅ Child push success');
    } catch (error) {
      console.error('❌ Firestore Push Child Error:', error);
    }
  };

  const pushEventToCloud = async (email: string, event: Event) => {
    try {
      console.log('📡 Pushing event to cloud:', event.id);
      await getDb().collection('users').doc(email).collection('events').doc(event.id).set(sanitizeData(event));
      console.log('✅ Event push success');
    } catch (error) {
      console.error('❌ Firestore Push Event Error:', error);
    }
  };

  const pushMealPlanToCloud = async (email: string, mealPlan: MealPlan) => {
    try {
      console.log('📡 Pushing meal plan to cloud:', mealPlan.id);
      await getDb().collection('users').doc(email).collection('mealPlans').doc(mealPlan.id).set(sanitizeData(mealPlan));
      console.log('✅ Meal plan push success');
    } catch (error) {
      console.error('❌ Firestore Push Meal Plan Error:', error);
    }
  };

  const deleteChildFromCloud = async (email: string, childId: string) => {
    try {
      console.log('📡 Deleting child from cloud:', childId);
      await getDb().collection('users').doc(email).collection('children').doc(childId).delete();
      console.log('✅ Child delete success');
    } catch (error) {
      console.error('❌ Firestore Delete Child Error:', error);
    }
  };

  const deleteEventFromCloud = async (email: string, eventId: string) => {
    try {
      console.log('📡 Deleting event from cloud:', eventId);
      await getDb().collection('users').doc(email).collection('events').doc(eventId).delete();
      console.log('✅ Event delete success');
    } catch (error) {
      console.error('❌ Firestore Delete Event Error:', error);
    }
  };

  const checkCloudDataExists = async (email: string): Promise<boolean> => {
    try {
      const childrenSnap = await getDb().collection('users').doc(email).collection('children').limit(1).get();
      return !childrenSnap.empty;
    } catch (error) {
      console.error('Firestore Check Data Error:', error);
      return false;
    }
  };

  const restoreDataFromCloud = async (email: string) => {
    try {
      console.log('🔄 Restoring data for:', email);

      const childrenSnap = await getDb().collection('users').doc(email).collection('children').get();
      const eventsSnap = await getDb().collection('users').doc(email).collection('events').get();
      const mealPlansSnap = await getDb().collection('users').doc(email).collection('mealPlans').get();

      const cloudChildren = childrenSnap.docs.map(doc => doc.data() as Child);
      const cloudEvents = eventsSnap.docs.map(doc => doc.data() as Event);
      const cloudMealPlans = mealPlansSnap.docs.map(doc => doc.data() as MealPlan);

      console.log(`📥 Restored ${cloudChildren.length} children, ${cloudEvents.length} events, ${cloudMealPlans.length} meal plans`);

      // 1. Update In-memory State first (Preserving local photoUris if we somehow had them)
      let finalChildren: Child[] = [];
      setChildProfiles(prev => {
        finalChildren = cloudChildren.map(cloudChild => {
          const localChild = prev.find(p => p.id === cloudChild.id);
          return { ...cloudChild, photoUri: localChild?.photoUri };
        });
        return finalChildren;
      });

      setEvents(cloudEvents);
      setMealPlans(cloudMealPlans);
      if (cloudChildren.length > 0) {
        setSelectedChildId(cloudChildren[0].id);
      }
      setDataOwnerEmail(email);

      // 2. Persist to AsyncStorage (Immediate)
      const persistOps = [
        AsyncStorage.setItem(HAS_ONBOARDED_KEY, 'true'),
        AsyncStorage.setItem(DATA_OWNER_EMAIL_KEY, email),
        AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(cloudEvents)),
        AsyncStorage.setItem(MEAL_PLANS_KEY, JSON.stringify(cloudMealPlans)),
        AsyncStorage.setItem(CHILDREN_KEY, JSON.stringify(finalChildren)),
      ];
      if (finalChildren.length > 0) {
        persistOps.push(AsyncStorage.setItem(SELECTED_CHILD_ID_KEY, finalChildren[0].id));
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
      syncUserToFirestore(googleAccount, 'google');
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
    try {
      const newEvent = { ...input, id: nextEventId() };
      setEvents((prev) => [...prev, newEvent]);
      if (googleAccount?.email) {
        pushEventToCloud(googleAccount.email, newEvent);
      }
    } catch (error) {
      console.error('❌ addEvent error:', error);
      throw error;
    }
  };

  const addEvents = (inputs: Omit<Event, 'id'>[], options?: { replaceSimilar?: boolean }) => {
    setEvents((prev) => {
      let filteredPrev = prev;
      let newEventsToPush: Omit<Event, 'id'>[] = [];

      if (options?.replaceSimilar) {
        // Find existing events that are "similar" to any of the incoming ones
        const inputsToProcess = [...inputs];

        const existingSimilarOnes = prev.filter((ex) =>
          inputsToProcess.some((nr) => nr.childId === ex.childId && isSimilarEvent(ex, nr))
        );

        if (existingSimilarOnes.length > 0) {
          const idsToRemove = existingSimilarOnes.map(ex => ex.id);
          filteredPrev = prev.filter((e) => !idsToRemove.includes(e.id));

          if (googleAccount?.email) {
            idsToRemove.forEach((id) => deleteEventFromCloud(googleAccount.email!, id));
          }

          // Merge old data into new events
          const processedInputs = inputsToProcess.map(newEv => {
            const oldEv = existingSimilarOnes.find(ex => ex.childId === newEv.childId && isSimilarEvent(ex, newEv));
            if (oldEv) {
              return {
                ...newEv,
                // Preserve custom manual edits if they exist
                memo: oldEv.memo || newEv.memo,
                notifyDayBefore: oldEv.notifyDayBefore ?? newEv.notifyDayBefore,
                // If the new AI scan found a different date, we naturally take the new date (repositioning)
              };
            }
            return newEv;
          });
          newEventsToPush = processedInputs;
        } else {
          newEventsToPush = inputsToProcess;
        }
      } else {
        newEventsToPush = inputs;
      }

      const finalizedNewEvents = newEventsToPush.map((input) => ({ ...input, id: nextEventId() }));
      const result = [...filteredPrev, ...finalizedNewEvents];

      if (googleAccount?.email) {
        finalizedNewEvents.forEach((e) => pushEventToCloud(googleAccount.email!, e));
      }

      return result;
    });
  };

  const addMealPlans = (inputs: Omit<MealPlan, 'id'>[]) => {
    setMealPlans((prev) => {
      // Re-scanning a menu photo should replace that date's entry, not duplicate it.
      const replacedKeys = new Set(inputs.map((m) => `${m.childId}|${m.date}`));
      const kept = prev.filter((m) => !replacedKeys.has(`${m.childId}|${m.date}`));
      const finalized = inputs.map((input) => ({ ...input, id: nextMealPlanId() }));
      if (googleAccount?.email) {
        finalized.forEach((m) => pushMealPlanToCloud(googleAccount.email!, m));
      }
      return [...kept, ...finalized];
    });
  };

  const updateNotificationSettings = (input: Partial<NotificationSettings>) => {
    setNotificationSettings((prev) => ({ ...prev, ...input }));
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
            await getFirebaseAuth().signInWithCredential(googleCredential);
          }

          const account: GoogleAccount = {
            email: userInfo.data.user.email,
            name: userInfo.data.user.name ?? '사용자'
          };

          setGoogleAccount(account);
          await AsyncStorage.setItem(GOOGLE_ACCOUNT_KEY, JSON.stringify(account));

          // If they already finished onboarding, sync to Firestore on login
          if (hasOnboarded) {
            await syncUserToFirestore(account, 'google');
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
          msg.includes('사용자 취소') ||
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
      await getFirebaseAuth().signOut();
      setGoogleAccount(null);
      AsyncStorage.removeItem(GOOGLE_ACCOUNT_KEY).catch(() => {});
    } catch (error) {
      console.error('Google Sign-Out Error:', error);
    }
  };

  // Kakao doesn't have a Firebase Auth provider, so Firestore's
  // per-user security rules (request.auth.token.email == doc id) would
  // otherwise reject every read/write for those accounts. We derive a
  // stable password from the email itself (not the provider's uid) and
  // use it to sign into Firebase Auth with email/password every time,
  // creating the account on first login.
  const signInFirebaseWithSocialAccount = async (email: string) => {
    const password = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `kindercare-social-auth-v1:${email.trim().toLowerCase()}`
    );
    try {
      await getFirebaseAuth().createUserWithEmailAndPassword(email, password);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        try {
          await getFirebaseAuth().signInWithEmailAndPassword(email, password);
        } catch (signInError: any) {
          if (signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/wrong-password') {
            const err = new Error(
              '이미 다른 로그인 방식(예: 구글)으로 가입된 이메일이에요. 처음 가입했던 방식으로 로그인해주세요.'
            );
            (err as any).code = 'auth/account-exists-with-different-credential';
            throw err;
          }
          throw signInError;
        }
      } else {
        throw error;
      }
    }
  };

  const signInWithKakao = async (): Promise<GoogleAccount> => {
    try {
      console.log('📡 Starting Kakao Sign-In...');
      const token = await kakaoLogin();
      if (!token) throw new Error('Kakao login failed - no token');

      const profile = await getKakaoProfile();
      if (!profile || !profile.email) {
        throw new Error('Kakao profile is missing email');
      }

      await signInFirebaseWithSocialAccount(profile.email);

      const account: GoogleAccount = {
        email: profile.email,
        name: profile.nickname ?? '사용자'
      };

      setGoogleAccount(account);
      await AsyncStorage.setItem(GOOGLE_ACCOUNT_KEY, JSON.stringify(account));

      if (hasOnboarded) {
        await syncUserToFirestore(account, 'kakao');
      }

      // Initialize family members if empty
      setFamilyMembers((prev) => {
        if (prev.length === 0) {
          return [{ id: `member-${Date.now()}`, name: '나', isOwner: true }];
        }
        return prev;
      });

      console.log('✅ Kakao Sign-In Success:', account.email);
      return account;
    } catch (error: any) {
      console.error('Kakao Sign-In Error:', error);
      throw error;
    }
  };

  const signOutKakao = async () => {
    try {
      await kakaoLogout();
      await getFirebaseAuth().signOut();
      setGoogleAccount(null);
      AsyncStorage.removeItem(GOOGLE_ACCOUNT_KEY).catch(() => {});
    } catch (error) {
      console.error('Kakao Sign-Out Error:', error);
    }
  };

  // 회원탈퇴: wipes every piece of this app's persisted state and puts the
  // in-memory data back to the same shape a fresh install would have, then
  // the caller navigates back to onboarding.
  //
  // `preserveAccount` is for the account-switch path in google-signin.tsx: the
  // user just successfully signed in as a different provider account, so we
  // only want to clear the previous owner's cached data — not the session we
  // just established (that would incorrectly bounce them back to splash).
  const resetAllData = async (options?: { preserveAccount?: boolean }) => {
    const keysToRemove = [
      HAS_ONBOARDED_KEY,
      FONT_SIZE_KEY,
      FONT_CHOICE_KEY,
      CHALKBOARD_THEME_KEY,
      EVENTS_KEY,
      MEAL_PLANS_KEY,
      CHILDREN_KEY,
      SELECTED_CHILD_ID_KEY,
      NOTIFICATION_SETTINGS_KEY,
      FAMILY_MEMBERS_KEY,
      DATA_OWNER_EMAIL_KEY,
      FAMILY_KEY_KEY,
    ];
    if (!options?.preserveAccount) keysToRemove.push(GOOGLE_ACCOUNT_KEY);
    await AsyncStorage.multiRemove(keysToRemove).catch(() => {});
    if (googleAccount?.email) {
      await AIUsageLimitService.resetUsage(googleAccount.email);
    }
    setHasOnboarded(false);
    setFamilyKey(generateFamilyKey());
    setFamilyMembers([]);
    setChildProfiles([]);
    setEvents([]);
    setMealPlans([]);
    setSelectedChildId(undefined);
    setNotificationSettings(seedNotificationSettings);
    setFontChoiceId(DEFAULT_FONT_ID);
    setFontSizeChoiceState(DEFAULT_FONT_SIZE);
    setChalkboardThemeId(DEFAULT_CHALKBOARD_THEME_ID);
    if (!options?.preserveAccount) {
      setGoogleAccount(null);
    }
    setDataOwnerEmail(null);
  };

  const requestWithdrawal = async () => {
    if (googleAccount?.email) {
      const email = googleAccount.email;
      try {
        console.log('📡 Requesting withdrawal for:', email);
        // 즉시 삭제로 변경: 유예기간 없이 바로 purgeCloudData 호출
        await purgeCloudData(email);
        console.log('✅ Withdrawal (immediate) processed successfully');
      } catch (error) {
        console.error('❌ Firestore Withdrawal Request Error:', error);
        throw error;
      }
    }
  };

  const cancelWithdrawal = async (email: string) => {
    try {
      console.log('📡 Canceling withdrawal for:', email);
      await getDb().collection('users').doc(email).update({
        withdrawalRequestedAt: firestore.FieldValue.delete(),
      });
      console.log('✅ Withdrawal canceled successfully');
    } catch (error) {
      console.error('❌ Firestore Cancel Withdrawal Error:', error);
    }
  };

  const purgeCloudData = async (email: string) => {
    try {
      console.log('📡 Purging all cloud data for:', email);

      // Delete children collection
      const childrenSnap = await getDb().collection('users').doc(email).collection('children').get();
      const childDeletes = childrenSnap.docs.map(doc => doc.ref.delete());

      // Delete events collection
      const eventsSnap = await getDb().collection('users').doc(email).collection('events').get();
      const eventDeletes = eventsSnap.docs.map(doc => doc.ref.delete());

      // Reset user doc (keeping basic info but clearing withdrawal state)
      const userReset = getDb().collection('users').doc(email).set({
        email,
        lastLogin: new Date().toISOString(),
        hasOnboarded: false,
        withdrawalRequestedAt: firestore.FieldValue.delete(),
      }, { merge: true });

      await Promise.all([...childDeletes, ...eventDeletes, userReset]);
      console.log('✅ Cloud data purge complete');
    } catch (error) {
      console.error('❌ Firestore Purge Data Error:', error);
    }
  };

  const checkOnboardingStatus = async (email: string): Promise<boolean> => {
    try {
      const doc = await getDb().collection('users').doc(email).get();
      if (doc.exists) {
        return doc.data()?.hasOnboarded === true;
      }
      return false;
    } catch (error) {
      console.error('❌ Firestore Check Onboarding Status Error:', error);
      return false;
    }
  };

  const checkWithdrawalStatus = async (email: string): Promise<string | null> => {
    try {
      const doc = await getDb().collection('users').doc(email).get();
      if (doc.exists) {
        return doc.data()?.withdrawalRequestedAt || null;
      }
      return null;
    } catch (error) {
      console.error('❌ Firestore Check Withdrawal Status Error:', error);
      return null;
    }
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

    mealPlans,
    addMealPlans,

    notificationSettings,
    updateNotificationSettings,

    fontChoiceId,
    setFontChoiceId,
    fontSizeChoice,
    setFontSizeChoice,
    fontScale,
    chalkboardThemeId,
    setChalkboardThemeId,

    resetAllData,
    requestWithdrawal,
    cancelWithdrawal,
    purgeCloudData,
    checkWithdrawalStatus,

    dataOwnerEmail,

    checkCloudDataExists,
    checkOnboardingStatus,
    restoreDataFromCloud,

    googleAccount,
    signInWithGoogle,
    signOutGoogle,

    signInWithKakao,
    signOutKakao,
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
