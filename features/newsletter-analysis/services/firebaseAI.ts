import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAI, getGenerativeModel, VertexAIBackend } from 'firebase/ai';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Initializes and returns the Firebase AI (Vertex AI) model for production.
 * This ensures data privacy and security for store-launched versions.
 */
export function getVertexAIModel() {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  // Use VertexAIBackend for enterprise privacy (requires Blaze plan)
  const ai = getAI(app, { backend: new VertexAIBackend() });

  return getGenerativeModel(ai, {
    model: 'gemini-3.6-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    }
  });
}
