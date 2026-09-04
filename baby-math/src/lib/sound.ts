// 효과음 재생
// 짧은 효과음이라 플레이어를 미리 만들어 두고 재사용한다.
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

export type SoundKey = 'correct' | 'wrong' | 'clear';

const SOURCES: Record<SoundKey, number> = {
  correct: require('../../assets/sounds/correct.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
  clear: require('../../assets/sounds/clear.wav'),
};

const players: Partial<Record<SoundKey, AudioPlayer>> = {};

/** 앱 시작 시 한 번 호출 - 무음 모드에서도 효과음이 들리게 한다 */
export function prepareSounds() {
  setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
}

export function playSound(key: SoundKey) {
  try {
    let player = players[key];
    if (!player) {
      player = createAudioPlayer(SOURCES[key]);
      players[key] = player;
    }
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // 효과음은 실패해도 학습에 지장이 없으므로 조용히 무시한다
  }
}
