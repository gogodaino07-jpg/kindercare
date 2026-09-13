import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'kindercare:tutorialSeen:';

/**
 * 홈 화면 코치마크 튜토리얼 키. 신규 가입자에게만 보여주면 되고, 이미 온보딩을
 * 마친 적 있는 계정(재설치+재로그인 포함)에는 굳이 다시 보여줄 필요가 없다 —
 * 그 판단은 로컬 저장값이 아니라 계정 자체의 Firestore hasOnboarded 이력으로
 * 하므로, google-signin.tsx에서 로그인 시점에 이 키를 미리 "봤음"으로
 * 표시해둔다(app/google-signin.tsx의 hasOnboardedCloud 분기 참고).
 */
export const HOME_TUTORIAL_KEY = 'homeSchedule:v2';

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

/** 설정 화면의 "온보딩 다시 보기"처럼, 시청 기록을 지워 다음 진입 때 다시 뜨게 한다. */
export async function resetTutorialSeen(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {}
}
