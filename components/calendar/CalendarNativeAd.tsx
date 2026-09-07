import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
} from 'react-native-google-mobile-ads';
import Text from '../common/AppText';
import { useCalendarTheme } from './useCalendarTheme';

const AD_UNIT_ID = process.env.EXPO_PUBLIC_AD_CALENDAR_NATIVE_ID || null;

/**
 * 하루 일정 카드 리스트 맨 끝에 붙는 네이티브 광고. 앱 카드 디자인에 맞춰
 * 직접 스타일링해서 다른 광고 형식보다 이질감이 적다. 광고 단위 미설정/로드
 * 실패 시 아무것도 렌더링하지 않아 화면에 빈 자리가 남지 않는다.
 */
export default function CalendarNativeAd() {
  const t = useCalendarTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const nativeAdRef = useRef<NativeAd | null>(null);

  useEffect(() => {
    if (!AD_UNIT_ID) return;
    let cancelled = false;
    NativeAd.createForAdRequest(AD_UNIT_ID)
      .then((ad) => {
        if (cancelled) {
          ad.destroy();
          return;
        }
        nativeAdRef.current = ad;
        setNativeAd(ad);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      nativeAdRef.current?.destroy();
      nativeAdRef.current = null;
    };
  }, []);

  if (!AD_UNIT_ID || !nativeAd) return null;

  return (
    <NativeAdView nativeAd={nativeAd} style={styles.card}>
      <View style={styles.topRow}>
        {nativeAd.icon?.url && (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        )}
        <View style={styles.headlineWrap}>
          <View style={styles.adBadge}>
            <Text style={styles.adBadgeText}>광고</Text>
          </View>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.headline} numberOfLines={1}>
              {nativeAd.headline}
            </Text>
          </NativeAsset>
        </View>
      </View>

      <NativeMediaView style={styles.media} />

      {!!nativeAd.body && (
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text style={styles.body} numberOfLines={2}>
            {nativeAd.body}
          </Text>
        </NativeAsset>
      )}

      <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
        <View style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>{nativeAd.callToAction}</Text>
        </View>
      </NativeAsset>
    </NativeAdView>
  );
}

function createStyles(t: import('./calendarTheme').CalendarTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: t.cardWhite,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: t.border,
      padding: 16,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    icon: { width: 36, height: 36, borderRadius: 10 },
    headlineWrap: { flex: 1, gap: 3 },
    adBadge: {
      alignSelf: 'flex-start',
      backgroundColor: t.gray100,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    adBadgeText: { fontSize: 9.5, fontWeight: '800', color: t.textMuted },
    headline: { fontSize: 14.5, fontWeight: '800', color: t.textPrimary },
    media: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14, marginBottom: 10, backgroundColor: t.gray100 },
    body: { fontSize: 12.5, color: t.textSecondary, marginBottom: 12 },
    ctaButton: {
      backgroundColor: t.violet,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
    },
    ctaButtonText: { fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' },
  });
}
