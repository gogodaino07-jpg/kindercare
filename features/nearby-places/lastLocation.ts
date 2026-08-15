import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_AREA_CODE_KEY = 'nearbyPlaces:lastAreaCode';

export async function saveLastAreaCode(areaCode: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_AREA_CODE_KEY, areaCode);
  } catch {}
}

export async function loadLastAreaCode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_AREA_CODE_KEY);
  } catch {
    return null;
  }
}
