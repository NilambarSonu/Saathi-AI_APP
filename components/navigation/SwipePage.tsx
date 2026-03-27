import React, { useEffect, useRef } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SwipePageProps = {
  children: React.ReactNode;
  leftRoute?: string;
  rightRoute?: string;
};

export default function SwipePage({ children, leftRoute, rightRoute }: SwipePageProps) {
  const router = useRouter();
  const swipeX = useSharedValue(0);
  const isNavigatingRef = useRef(false);

  const SWIPE_THRESHOLD = Math.max(72, SCREEN_WIDTH * 0.22);
  const SWIPE_COMPLETE_DISTANCE = Math.max(56, SCREEN_WIDTH * 0.14);
  const DRAG_RESISTANCE = 0.22;

  const navigateTo = (target?: string) => {
    if (!target || isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    router.replace(target as any);
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 420);
  };

  useEffect(() => {
    if (leftRoute) router.prefetch(leftRoute as any);
    if (rightRoute) router.prefetch(rightRoute as any);
  }, [leftRoute, rightRoute, router]);

  const gesture = Gesture.Pan()
    .activeOffsetX([-28, 28])
    .failOffsetY([-22, 22])
    .onUpdate((event) => {
      const clamped = Math.max(
        -SWIPE_COMPLETE_DISTANCE,
        Math.min(SWIPE_COMPLETE_DISTANCE, event.translationX * DRAG_RESISTANCE)
      );
      swipeX.value = clamped;
    })
    .onEnd((event) => {
      const toLeft = event.translationX < -SWIPE_THRESHOLD || event.velocityX < -900;
      const toRight = event.translationX > SWIPE_THRESHOLD || event.velocityX > 900;

      if (toLeft && leftRoute) {
        swipeX.value = withTiming(-SWIPE_COMPLETE_DISTANCE, { duration: 90 });
        runOnJS(navigateTo)(leftRoute);
        return;
      }

      if (toRight && rightRoute) {
        swipeX.value = withTiming(SWIPE_COMPLETE_DISTANCE, { duration: 90 });
        runOnJS(navigateTo)(rightRoute);
        return;
      }

      swipeX.value = withSpring(0, { damping: 20, stiffness: 230, mass: 0.7 });
    })
    .onFinalize(() => {
      if (!isNavigatingRef.current) {
        swipeX.value = withSpring(0, { damping: 20, stiffness: 230, mass: 0.7 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      Math.abs(swipeX.value),
      [0, SWIPE_COMPLETE_DISTANCE],
      [1, 0.96],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      Math.abs(swipeX.value),
      [0, SWIPE_COMPLETE_DISTANCE],
      [1, 0.994],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateX: swipeX.value } as any, { scale } as any],
      opacity,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
