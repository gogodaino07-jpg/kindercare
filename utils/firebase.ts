import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { getFunctions as getFunctionsModular } from '@react-native-firebase/functions';

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
 * Cloud Functions instance — Gemini 프록시 함수(analyzeNewsletter)를 배포한
 * 리전(asia-northeast3, 서울)과 반드시 일치해야 한다. 리전이 다르면
 * "함수를 찾을 수 없음" 에러가 난다.
 */
let _functions: any = null;
export const getFunctions = () => {
  if (!_functions) _functions = getFunctionsModular(undefined, 'asia-northeast3');
  return _functions;
};

/**
 * Firestore Collection References
 */
export const collections = {
  users: () => getDb().collection('users'),
};
