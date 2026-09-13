import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'kindercare:tutorialSeen:';

/**
 * 앱을 삭제 후 재설치하면 이 로컬 저장값도 함께 사라지므로, 재설치+재로그인과
 * 신규 가입자 모두 자연스럽게 "아직 안 본 상태"가 되어 튜토리얼이 다시 뜬다.
 * (서버/계정에 저장하지 않는 이유)
 */
export async function hasSeenTutorial(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREFIX + key)) === 'true';
  } catch {
    return true;
  }
}

export async function markTutorialSeen(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, 'true');
  } catch {}
}
