import { Linking } from 'react-native';
import { markExternalActionBriefly } from './externalAction';

/**
 * 장소명으로 여기어때/야놀자 앱을 먼저 시도하고, 설치되어 있지 않으면 웹 검색으로 대체.
 * openCoupangSearch와 동일한 패턴. 앱 스킴/웹 검색 URL은 두 회사가 공식 문서를 제공하지
 * 않아 알려진 패턴 기준으로 작성했어요 — 실제 동작이 다르면 이 파일만 고치면 됩니다.
 */
async function openWithFallback(appUrl: string, webUrl: string): Promise<void> {
  markExternalActionBriefly();
  try {
    const supported = await Linking.canOpenURL(appUrl);
    if (supported) {
      await Linking.openURL(appUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch (err) {
    console.error('Travel Link Error:', err);
    Linking.openURL(webUrl).catch(() => {});
  }
}

/** Opens 여기어때 search results for the given place name. */
export async function openYeogiSearch(placeName: string): Promise<void> {
  const encoded = encodeURIComponent(placeName.trim());
  if (!encoded) return;
  await openWithFallback(
    `goodchoice://search?keyword=${encoded}`,
    `https://www.goodchoice.kr/search/result?keyword=${encoded}`
  );
}

/** Opens 야놀자 search results for the given place name. */
export async function openYanoljaSearch(placeName: string): Promise<void> {
  const encoded = encodeURIComponent(placeName.trim());
  if (!encoded) return;
  await openWithFallback(
    `yanolja://search?keyword=${encoded}`,
    `https://www.yanolja.com/search?keyword=${encoded}`
  );
}
