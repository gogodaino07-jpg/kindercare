import React, { useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { ThemeColors } from '../../constants/theme';

interface PatternGridProps {
  colors: ThemeColors;
  showTrail: boolean;
  onComplete: (path: number[]) => void;
  size?: number;
}

const GRID_SIZE = 3;
const HIT_RADIUS = 30;

function centerFor(index: number, cell: number) {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  return { x: col * cell + cell / 2, y: row * cell + cell / 2 };
}

export default function PatternGrid({ colors, showTrail, onComplete, size = 240 }: PatternGridProps) {
  const cell = size / GRID_SIZE;
  const [path, setPath] = useState<number[]>([]);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const pathRef = useRef<number[]>([]);

  const centers = useMemo(
    () => Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => centerFor(i, cell)),
    [cell]
  );

  // PanResponder is created once via useRef below, so its handlers close over
  // whatever `onComplete` was on the FIRST render. Route through a ref that's
  // kept current every render so the handlers always call the latest callback.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const handleTouch = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent;
    setDragPoint({ x: locationX, y: locationY });
    for (let i = 0; i < centers.length; i += 1) {
      if (pathRef.current.includes(i)) continue;
      const dx = locationX - centers[i].x;
      const dy = locationY - centers[i].y;
      if (Math.sqrt(dx * dx + dy * dy) <= HIT_RADIUS) {
        const next = [...pathRef.current, i];
        pathRef.current = next;
        setPath(next);
        break;
      }
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        pathRef.current = [];
        setPath([]);
        handleTouch(evt);
      },
      onPanResponderMove: (evt) => handleTouch(evt),
      onPanResponderRelease: () => {
        onCompleteRef.current(pathRef.current);
        pathRef.current = [];
        setPath([]);
        setDragPoint(null);
      },
      onPanResponderTerminate: () => {
        pathRef.current = [];
        setPath([]);
        setDragPoint(null);
      },
    })
  ).current;

  const linePoints = showTrail
    ? [
        ...path.map((i) => centers[i]),
        ...(dragPoint && path.length > 0 ? [dragPoint] : []),
      ]
    : [];
  const polylinePoints = linePoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      {...panResponder.panHandlers}
    >
      {linePoints.length > 1 ? (
        <Svg
          width={size}
          height={size}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={colors.accent}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
          {path.map((i) => (
            <Circle key={i} cx={centers[i].x} cy={centers[i].y} r={5} fill={colors.accent} />
          ))}
        </Svg>
      ) : null}

      {centers.map((c, i) => {
        const visited = path.includes(i);
        const active = visited && showTrail;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                left: c.x - 12,
                top: c.y - 12,
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? colors.accent : 'transparent',
              },
              visited && !showTrail && { borderColor: colors.accent },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
});
