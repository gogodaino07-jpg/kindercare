import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface ZoomableImageProps {
  uri: string;
  width: number;
  height: number;
  /** 이 사진이 가로 페이지 스와이프용 ScrollView 안에 놓일 때 그 ScrollView의 ref.
   *  넘겨주면 핀치/팬 제스처를 ScrollView의 제스처와 "동시 인식" 대상으로 등록해,
   *  두 손가락을 가로 방향으로 벌릴 때 ScrollView가 그 움직임을 스와이프로 먼저
   *  가로채서 확대가 잘 안 먹던 문제를 없앤다(세로 방향은 원래도 문제없었음). */
  scrollViewRef?: React.RefObject<any>;
}

export const ZoomableImage = ({ uri, width, height, scrollViewRef }: ZoomableImageProps) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  let pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
      savedScale.value = scale.value;
    });

  let panGesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_event, manager) => {
      if (scale.value > 1) {
        manager.activate();
      } else {
        manager.fail();
      }
    })
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      if (scale.value > 1) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  let doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (scrollViewRef) {
    pinchGesture = pinchGesture.simultaneousWithExternalGesture(scrollViewRef);
    panGesture = panGesture.simultaneousWithExternalGesture(scrollViewRef);
    doubleTapGesture = doubleTapGesture.simultaneousWithExternalGesture(scrollViewRef);
  }

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

  return (
    <View style={[styles.container, { width, height }]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.Image
          source={{ uri }}
          style={[styles.image, animatedStyle]}
          resizeMode="contain"
        />
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
