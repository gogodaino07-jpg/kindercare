import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { toISODate } from '../utils/date';

/**
 * "오늘" 날짜(ISO)를 반응형으로 반환한다. 화면들이 각자 `toISODate(new Date())`를
 * useMemo(deps: [])로 한 번만 계산해두면, 자정을 넘겨도(앱을 계속 켜둔 채로 두거나
 * 백그라운드에 있다가 다음날 다시 열어도) 값이 그대로 굳어서 "오늘 일정"이 계속
 * 어제 기준으로 보이는 문제가 있었다. 이 훅은:
 * 1) 앱이 백그라운드→포그라운드로 돌아올 때, 2) 앱을 켜둔 채로 실제 자정이 될 때
 * 두 시점 모두에 오늘 날짜를 다시 계산해 갱신한다.
 */
export function useTodayISO(): string {
  const [todayISO, setTodayISO] = useState(() => toISODate(new Date()));

  useEffect(() => {
    const recompute = () => {
      const next = toISODate(new Date());
      setTodayISO((prev) => (prev === next ? prev : next));
    };

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') recompute();
    });

    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleMidnightTick = () => {
      const now = new Date();
      // 자정 정각보다 5초 뒤로 잡아, 타이머 오차로 자정 직전에 깨어나
      // 여전히 어제 날짜를 계산해버리는 경우를 피한다.
      const nextTick = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
      timeoutId = setTimeout(() => {
        recompute();
        scheduleMidnightTick();
      }, nextTick.getTime() - now.getTime());
    };
    scheduleMidnightTick();

    return () => {
      subscription.remove();
      clearTimeout(timeoutId);
    };
  }, []);

  return todayISO;
}
