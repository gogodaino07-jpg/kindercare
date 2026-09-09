import * as FileSystem from 'expo-file-system/legacy';
import { getStorage } from './firebase';

// 아이당 고정 경로(파일명 고정)라서 사진을 바꿔도 같은 오브젝트를 덮어쓴다 — 예전 사진이
// Storage에 계속 쌓여 용량을 차지하는 일이 없다.
const storagePath = (ownerEmail: string, childId: string) => `profilePhotos/${ownerEmail}/${childId}.jpg`;

const LOCAL_CACHE_DIR = `${FileSystem.documentDirectory}profile-photos/`;
const localCachePath = (childId: string) => `${LOCAL_CACHE_DIR}${childId}.jpg`;

/** 프로필 사진을 Storage에 올리고 다운로드 URL을 반환한다. 재설치/새 기기에서도 남아있게 하기 위함. */
export async function uploadChildProfilePhoto(
  ownerEmail: string,
  childId: string,
  localUri: string
): Promise<string> {
  const ref = getStorage().ref(storagePath(ownerEmail, childId));
  await ref.putFile(localUri);
  return ref.getDownloadURL();
}

/** 사진을 지웠거나 아이를 삭제했을 때 Storage에서도 정리한다. 이미 없어도 조용히 무시. */
export async function deleteChildProfilePhoto(ownerEmail: string, childId: string): Promise<void> {
  try {
    await getStorage().ref(storagePath(ownerEmail, childId)).delete();
  } catch {
    // object-not-found 등은 이미 원하는 상태이므로 무시
  }
}

/** 다른 기기/재설치로 로컬 캐시가 없을 때, photoUrl로 사진을 내려받아 로컬 파일 경로를 반환한다. */
export async function downloadChildProfilePhoto(photoUrl: string, childId: string): Promise<string> {
  await FileSystem.makeDirectoryAsync(LOCAL_CACHE_DIR, { intermediates: true }).catch(() => {});
  const dest = localCachePath(childId);
  await FileSystem.downloadAsync(photoUrl, dest);
  return dest;
}
