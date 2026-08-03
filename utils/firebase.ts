import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

/**
 * Firebase Auth instance
 */
let _firebaseAuth: any = null;
export const getFirebaseAuth = () => {
  if (!_firebaseAuth) _firebaseAuth = auth();
  return _firebaseAuth;
};

/**
 * Firestore instance
 */
let _db: any = null;
export const getDb = () => {
  if (!_db) _db = firestore();
  return _db;
};

/**
 * Firestore Collection References
 */
export const collections = {
  users: () => getDb().collection('users'),
};
