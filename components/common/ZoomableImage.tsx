import React, { useCallback, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface Props {
  uri: string;
  onZoomChange?: (isZoomed: boolean) => void;
}

const ZoomableImage: React.FC<Props> = ({ uri, onZoomChange }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const reset = useCallback(() => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const pinchGesture = useMemo(() => Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = savedScale.value * event.scale;
      if (onZoomChange && (scale.value > 1) !== (newScale > 1)) {
        runOnJS(onZoomChange)(newScale > 1);
      }
      scale.value = newScale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        reset();
        if (onZoomChange) runOnJS(onZoomChange)(false);
      } else {
        savedScale.value = scale.value;
      }
    }), [onZoomChange, reset, scale, savedScale]);

  const panGesture = useMemo(() => Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      if (scale.value > 1) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    }), [scale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const doubleTapGesture = useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
        if (onZoomChange) runOnJS(onZoomChange)(false);
      } else {
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
        if (onZoomChange) runOnJS(onZoomChange)(true);
      }
    }), [onZoomChange, reset, scale, savedScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const composed = useMemo(() => Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture), [pinchGesture, panGesture, doubleTapGesture]);

  return (
    <GestureDetector gesture={composed}>
      <Animated.Image
        source={{ uri }}
        style={[styles.image, { width: SCREEN_WIDTH }, animatedStyle]}
        resizeMode="contain"
      />
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  image: {
    height: '100%',
  },
});

export default ZoomableImage;
