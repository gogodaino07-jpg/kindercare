import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { WeatherDay } from '../../hooks/useWeeklyWeather';
import { toISODate } from '../../utils/date';
import Text from '../common/AppText';

const LAST_SHOWN_KEY = 'kindercare:tomorrowWeatherAlert:lastShownDate';
// 하원 시간대(대략 오후 5시) 이후부터는 내일 날씨에 더 관심이 생긴다는
// 전제로, 그 시간 이후에만 살짝 띄워준다.
const EVENING_HOUR = 17;
const COLD_DROP_THRESHOLD = 5;

interface AlertContent {
  emoji: string;
  message: string;
  tint: string;
}

function buildAlertContent(today: WeatherDay | undefined, tomorrow: WeatherDay): AlertContent | null {
  if (['비', '이슬비', '소나기'].includes(tomorrow.label)) {
    return { emoji: '🐥☂️', message: '내일은 비가 와요! 우산을 꼭 챙겨주세요', tint: '#DBEAFE' };
  }
  if (['눈', '눈 소나기'].includes(tomorrow.label)) {
    return { emoji: '🐥❄️', message: '내일은 눈이 와요! 따뜻하게 입혀주세요', tint: '#E0E7FF' };
  }
  if (tomorrow.label === '뇌우') {
    return { emoji: '🐥⛈️', message: '내일은 천둥번개가 쳐요! 우산을 챙겨주세요', tint: '#EDE9FE' };
  }
  if (today && today.tempMin - tomorrow.tempMin >= COLD_DROP_THRESHOLD) {
    return { emoji: '🐥🧣', message: '내일은 기온이 뚝 떨어져요! 겉옷을 챙겨주세요', tint: '#F0F5FF' };
  }
  return null;
}

/** 하원 시간 이후, 내일 날씨가 궂으면(비·눈·뇌우·기온 급락) 홈 화면 진입 시
 *  아주 짧게(3초 남짓) 알려주는 배너. 하루 한 번만, 조용히 떴다 사라지도록
 *  해서 광고 팝업 등 다른 화면 요소와 부딪히지 않게 한다(모달이 아니라
 *  터치를 막지 않는 오버레이라 다른 동작을 방해하지 않음). */
export default function TomorrowWeatherAlert({
  weatherDays,
  weatherLoading,
}: {
  weatherDays: WeatherDay[] | null;
  weatherLoading: boolean;
}) {
  const [content, setContent] = useState<AlertContent | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current || weatherLoading || !weatherDays) return;
    hasCheckedRef.current = true;

    const now = new Date();
    if (now.getHours() < EVENING_HOUR) return;

    const today = weatherDays.find((d) => d.isToday);
    const tomorrow = weatherDays.find((d) => d.isTomorrow);
    if (!tomorrow) return;

    const alert = buildAlertContent(today, tomorrow);
    if (!alert) return;

    const todayISO = toISODate(now);
    AsyncStorage.getItem(LAST_SHOWN_KEY)
      .then((lastShown) => {
        if (lastShown === todayISO) return; // 오늘 이미 보여줬으면 다시 안 띄움
        AsyncStorage.setItem(LAST_SHOWN_KEY, todayISO).catch(() => {});
        setContent(alert);

        Animated.sequence([
          Animated.spring(progress, { toValue: 1, useNativeDriver: true, friction: 7, tension: 60 }),
          Animated.delay(3200),
          Animated.timing(progress, {
            toValue: 0,
            duration: 350,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(() => setContent(null));
      })
      .catch(() => {});
  }, [weatherDays, weatherLoading, progress]);

  if (!content) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          backgroundColor: content.tint,
          opacity: progress,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <Text style={styles.emoji}>{content.emoji}</Text>
      <Text style={styles.message} numberOfLines={2}>
        {content.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    // 프로필 바(아바타+이름) 바로 아래, 급식 카드 위에 살짝 떠 있는 위치 —
    // 아이 정보를 가리지 않으면서도 눈에 띄게 배치.
    top: 72,
    left: 20,
    right: 20,
    zIndex: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowOpacity: 0.12,
    elevation: 4,
  },
  emoji: { fontSize: 20 },
  message: { flex: 1, fontSize: 13, fontWeight: '700', color: '#2B3A45' },
});
