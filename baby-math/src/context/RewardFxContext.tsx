// 보상 연출(별이 카운터로 날아가는 fly-to 애니메이션)을 앱 전역에서 쓰기 위한 컨텍스트
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface Point {
  x: number;
  y: number;
}

interface FlyingItem {
  id: number;
  from: Point;
  to: Point;
  emoji: string;
}

interface RewardFxValue {
  /** 별 카운터 위치를 등록한다 (화면 좌표) */
  setStarTarget: (p: Point) => void;
  /** from 위치에서 별 카운터로 별이 날아가는 연출. 도착하면 onArrive 호출 */
  flyStars: (from: Point, count?: number, onArrive?: () => void) => void;
}

const RewardFxContext = createContext<RewardFxValue | null>(null);

const FLY_DURATION = 620;

function FlyingStar({ item, onDone }: { item: FlyingItem; onDone: (id: number) => void }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: FLY_DURATION, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onDone)(item.id);
      },
    );
    // 최초 마운트 시 한 번만 실행
  }, []);

  const dx = item.to.x - item.from.x;
  const dy = item.to.y - item.from.y;

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // 살짝 위로 떴다가 카운터로 빨려 들어가는 곡선
    const lift = Math.sin(p * Math.PI) * -40;
    return {
      transform: [
        { translateX: dx * p },
        { translateY: dy * p + lift },
        { scale: 1.3 - 0.75 * p },
      ],
      opacity: p > 0.85 ? (1 - p) / 0.15 : 1,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.flying, { left: item.from.x, top: item.from.y }, style]}
    >
      <Text style={styles.flyingText}>{item.emoji}</Text>
    </Animated.View>
  );
}

export function RewardFxProvider({ children }: { children: React.ReactNode }) {
  const targetRef = useRef<Point>({ x: 60, y: 40 });
  const idRef = useRef(0);
  const [items, setItems] = useState<FlyingItem[]>([]);

  const setStarTarget = useCallback((p: Point) => {
    targetRef.current = p;
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const flyStars = useCallback((from: Point, count = 1, onArrive?: () => void) => {
    const to = targetRef.current;
    const created: FlyingItem[] = [];
    for (let i = 0; i < count; i += 1) {
      idRef.current += 1;
      created.push({
        id: idRef.current,
        // 여러 개일 때 살짝씩 흩어져서 출발
        from: { x: from.x + (i - (count - 1) / 2) * 26, y: from.y },
        to,
        emoji: '⭐',
      });
    }
    setItems((prev) => [...prev, ...created]);
    if (onArrive) setTimeout(onArrive, FLY_DURATION - 120);
  }, []);

  const value = useMemo<RewardFxValue>(() => ({ setStarTarget, flyStars }), [setStarTarget, flyStars]);

  return (
    <RewardFxContext.Provider value={value}>
      {children}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {items.map((item) => (
          <FlyingStar key={item.id} item={item} onDone={removeItem} />
        ))}
      </View>
    </RewardFxContext.Provider>
  );
}

export function useRewardFx() {
  const ctx = useContext(RewardFxContext);
  if (!ctx) throw new Error('useRewardFx 는 RewardFxProvider 안에서만 사용할 수 있어요.');
  return ctx;
}

const styles = StyleSheet.create({
  flying: { position: 'absolute' },
  flyingText: { fontSize: 34 },
});
