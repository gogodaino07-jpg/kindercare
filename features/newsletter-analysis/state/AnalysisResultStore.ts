import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event, MealPlan, UploadedDoc, Child } from '../../../types/models';

interface AnalysisSession {
  docs: UploadedDoc[];
  initialEvents: Omit<Event, 'id'>[];
  mealPlans: Omit<MealPlan, 'id'>[];
  shouldReplaceSimilar?: boolean;
}

interface PendingSession {
  docs: UploadedDoc[];
  child: Child;
}

const PENDING_SESSION_KEY = 'kindercare:pendingAnalysis';

/**
 * A simple in-memory singleton to hold the extracted AI events and original docs
 * between upload and review screens.
 */
let currentSession: AnalysisSession | null = null;
let _shouldResetUpload = false;

export const AnalysisResultStore = {
  setSession(docs: UploadedDoc[], events: Omit<Event, 'id'>[], mealPlans: Omit<MealPlan, 'id'>[] = []) {
    currentSession = { docs, initialEvents: events, mealPlans };
    this.clearPendingSession(); // Successfully moved to review, clear pending
  },

  getSession(): AnalysisSession | null {
    return currentSession;
  },

  takeSession(): AnalysisSession | null {
    const session = currentSession;
    currentSession = null;
    return session;
  },

  setResetUpload(val: boolean) {
    _shouldResetUpload = val;
  },

  getResetUpload() {
    return _shouldResetUpload;
  },

  // --- Pending Session Handling (Recovery) ---

  async savePendingSession(docs: UploadedDoc[], child: Child) {
    try {
      await AsyncStorage.setItem(PENDING_SESSION_KEY, JSON.stringify({ docs, child }));
    } catch {}
  },

  async getPendingSession(): Promise<PendingSession | null> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async clearPendingSession() {
    try {
      await AsyncStorage.removeItem(PENDING_SESSION_KEY);
    } catch {}
  },

  // Legacy compatibility for simple event handover
  setResult(result: Omit<Event, 'id'>[]) {
    this.setSession([], result);
  },

  takeResult(): Omit<Event, 'id'>[] | null {
    return this.takeSession()?.initialEvents ?? null;
  }
};
