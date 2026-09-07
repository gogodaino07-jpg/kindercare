import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
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
// 닫기 버튼이 이 시간(초) 동안 비활성 상태로 카운트다운되다가 활성화된다.
// 완전히 못 닫게 막는 건 정책 위반 소지가 있어서, 잠깐 붙잡아두는 정도로만 둔다.
const CLOSE_DELAY_SECONDS = 4;

interface CalendarNativeAdPopupProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * 캘린더 화면에 진입할 때(세션당 1회) 뜨는 네이티브 광고 팝업. 하루 일정
 * 리스트 맨 밑에 두면 일정이 많을 때 스크롤해야만 보였는데, 진입 시점
 * 팝업으로 바꿔서 항상 바로 보이게 했다. 광고 단위 미설정/로드 실패 시
 * 아무것도 렌더링하지 않는다.
 */
export default function CalendarNativeAdPopup({ visible, onClose }: CalendarNativeAdPopupProps) {
  const t = useCalendarTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const nativeAdRef = useRef<NativeAd | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(CLOSE_DELAY_SECONDS);
  const canClose = secondsLeft <= 0;

  useEffect(() => {
    if (!visible) return;
    setSecondsLeft(CLOSE_DELAY_SECONDS);
    const intervalId = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [visible]);

  const handleClose = () => {
    if (!canClose) return;
    onClose();
  };

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>🎁 오늘의 추천</Text>
            <View style={styles.adBadge}>
              <Text style={styles.adBadgeText}>광고</Text>
            </View>
          </View>

          <NativeAdView nativeAd={nativeAd} style={styles.adBody}>
            <View style={styles.topRow}>
              {nativeAd.icon?.url && (
                <NativeAsset assetType={NativeAssetType.ICON}>
                  <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
                </NativeAsset>
              )}
              <NativeAsset assetType={NativeAssetType.HEADLINE}>
                <Text style={styles.headline} numberOfLines={1}>
                  {nativeAd.headline}
                </Text>
              </NativeAsset>
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

          <Pressable style={styles.closeButton} onPress={handleClose} disabled={!canClose}>
            <Text style={[styles.closeButtonText, !canClose && styles.closeButtonTextDisabled]}>
              {canClose ? '닫기' : `${secondsLeft}초 후 닫기`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(t: import('./calendarTheme').CalendarTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: t.cardWhite,
      borderRadius: 24,
      padding: 18,
    },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    headerTitle: { flex: 1, fontSize: 15.5, fontWeight: '800', color: t.textPrimary },
    adBadge: {
      backgroundColor: t.gray100,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    adBadgeText: { fontSize: 9.5, fontWeight: '800', color: t.textMuted },
    adBody: {},
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    icon: { width: 36, height: 36, borderRadius: 10 },
    headline: { flex: 1, fontSize: 14.5, fontWeight: '800', color: t.textPrimary },
    media: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14, marginBottom: 10, backgroundColor: t.gray100 },
    body: { fontSize: 12.5, color: t.textSecondary, marginBottom: 14 },
    ctaButton: {
      backgroundColor: t.violet,
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
    },
    ctaButtonText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
    closeButton: { marginTop: 10, alignItems: 'center', paddingVertical: 6 },
    closeButtonText: { fontSize: 12.5, fontWeight: '700', color: t.textSecondary },
    closeButtonTextDisabled: { color: t.textMuted },
  });
}
