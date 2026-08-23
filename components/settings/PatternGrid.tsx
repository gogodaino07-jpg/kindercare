import React, { useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { ThemeColors } from '../../constants/theme';

interface PatternGridProps {
  colors: ThemeColors;
  showTrail: boolean;
  onComplete: (path: number[]) => void;
  size?: number;
  /** true면 손을 뗀 뒤에도 그린 패턴이 화면에 남아있는다(확인 버튼으로 다음 단계 넘어가는 흐름용). */
  keepTrailAfterComplete?: boolean;
}

const GRID_SIZE = 3;
const HIT_RADIUS = 30;

function centerFor(index: number, cell: number) {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  return { x: col * cell + cell / 2, y: row * cell + cell / 2 };
}

export default function PatternGrid({ colors, showTrail, onComplete, size = 240, keepTrailAfterComplete = false }: PatternGridProps) {
  const cell = size / GRID_SIZE;
  const [path, setPath] = useState<number[]>([]);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const pathRef = useRef<number[]>([]);
  const containerRef = useRef<View>(null);
  // Screen-absolute position of the grid, measured on layout. `locationX/Y` from
  // touch events are relative to whichever view the finger is currently over —
  // during a fast drag that can briefly be a sibling element, making the reported
  // point jump outside the grid. Converting from `pageX/Y` (always screen-absolute)
  // via this offset keeps the trail line locked to the actual finger position.
  const containerOffset = useRef({ x: 0, y: 0 });

  const measureContainer = () => {
    containerRef.current?.measureInWindow((x, y) => {
      containerOffset.current = { x, y };
    });
  };

  const centers = useMemo(
    () => Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => centerFor(i, cell)),
    [cell]
  );

  // PanResponder is created once via useRef below, so its handlers close over
  // whatever `onComplete` was on the FIRST render. Route through a ref that's
  // kept current every render so the handlers always call the latest callback.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const keepTrailRef = useRef(keepTrailAfterComplete);
  keepTrailRef.current = keepTrailAfterComplete;

  const handleTouch = (evt: GestureResponderEvent) => {
    const { pageX, pageY } = evt.nativeEvent;
    let locationX = pageX - containerOffset.current.x;
    let locationY = pageY - containerOffset.current.y;

    // Clamp coordinates to stay within the grid boundaries
    locationX = Math.max(0, Math.min(size, locationX));
    locationY = Math.max(0, Math.min(size, locationY));

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
        measureContainer();
        handleTouch(evt);
      },
      onPanResponderMove: (evt) => handleTouch(evt),
      onPanResponderRelease: () => {
        onCompleteRef.current(pathRef.current);
        if (!keepTrailRef.current) {
          pathRef.current = [];
          setPath([]);
        }
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
      ref={containerRef}
      onLayout={measureContainer}
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
            pointerEvents="none"
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
