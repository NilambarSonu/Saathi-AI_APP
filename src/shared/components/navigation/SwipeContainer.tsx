import React, { useState } from "react";
import { Dimensions, View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const SCREEN_WIDTH = Dimensions.get("window").width;

type SwipeContainerProps = {
  screens: React.FC<any>[];
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
};

export default function SwipeContainer({
  screens,
  initialIndex = 0,
  onIndexChange,
}: SwipeContainerProps) {
  const currentIndex = useSharedValue(initialIndex);
  const translateX = useSharedValue(-initialIndex * SCREEN_WIDTH);

  // Helper to notify the parent when the index changes
  const notifyIndexChange = (index: number) => {
    if (onIndexChange) {
      onIndexChange(index);
    }
  };

  const gesture = Gesture.Pan()
    // Increase hit slop to prevent conflicts with vertical scroll views
    .activeOffsetX([-20, 20])
    .onUpdate((e) => {
      let newTranslate = -currentIndex.value * SCREEN_WIDTH + e.translationX;

      // Add resistance at edges
      if (currentIndex.value === 0 && e.translationX > 0) {
        newTranslate = e.translationX * 0.3;
      }
      if (currentIndex.value === screens.length - 1 && e.translationX < 0) {
        newTranslate =
          -currentIndex.value * SCREEN_WIDTH + e.translationX * 0.3;
      }

      translateX.value = newTranslate;
    })
    .onEnd((e) => {
      const velocity = e.velocityX;

      if (velocity < -500 && currentIndex.value < screens.length - 1) {
        currentIndex.value += 1;
      } else if (velocity > 500 && currentIndex.value > 0) {
        currentIndex.value -= 1;
      } else {
        // If slow swipe, check if we passed half the screen
        const dragLimit = SCREEN_WIDTH / 2;
        if (e.translationX < -dragLimit && currentIndex.value < screens.length - 1) {
          currentIndex.value += 1;
        } else if (e.translationX > dragLimit && currentIndex.value > 0) {
          currentIndex.value -= 1;
        }
      }

      runOnJS(notifyIndexChange)(currentIndex.value);

      translateX.value = withSpring(-currentIndex.value * SCREEN_WIDTH, {
        damping: 20,
        stiffness: 120,
        mass: 0.5,
      });
    });

  const animatedStyle = useAnimatedStyle(() => {
    // Premium parallax scale effect
    const offset = Math.abs(translateX.value % SCREEN_WIDTH);
    const scale = 0.98 + (offset / SCREEN_WIDTH) * 0.02;

    return {
      transform: [
        { translateX: translateX.value },
        // Uncomment if you want the scale parallax
        // { scale }
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.container,
          { width: SCREEN_WIDTH * screens.length },
          animatedStyle,
        ]}
      >
        {screens.map((ScreenComponent, index) => (
          <View style={styles.screenWrapper} key={index}>
            <ScreenComponent />
          </View>
        ))}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  screenWrapper: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});
