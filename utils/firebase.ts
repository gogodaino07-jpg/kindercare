import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

/**
 * Firebase Auth instance
 */
export const firebaseAuth = auth();

/**
 * Firestore instance
 */
export const db = firestore();

/**
 * Firestore Collection References
 */
export const collections = {
  users: () => db.collection('users'),
  // Add other collections here as needed
};
