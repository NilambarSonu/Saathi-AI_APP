import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Dimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
  type SharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const SCREEN_WIDTH = Dimensions.get("window").width;

// Tight spring — settles fast, no bounce, feels premium
const SPRING_CONFIG = {
  damping: 26,
  stiffness: 220,
  mass: 0.35,
  overshootClamping: true,
};

export type SwipeContainerHandle = {
  /** Jump to a tab instantly without going through Zustand/React state. Zero lag. */
  scrollTo: (index: number) => void;
};

type SwipeContainerProps = {
  screens: React.FC<any>[];
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
};

const SwipeContainer = forwardRef<SwipeContainerHandle, SwipeContainerProps>(
  function SwipeContainer({ screens, initialIndex = 0, onIndexChange }, ref) {
    // ── Shared Values — UI-thread source of truth ─────────────────────────
    const currentIndex = useSharedValue(initialIndex);
    const translateX = useSharedValue(-initialIndex * SCREEN_WIDTH);

    // ── Stable JS-side refs (no stale closures) ────────────────────────────
    const committedIndexRef = useRef(initialIndex);
    const onIndexChangeRef = useRef(onIndexChange);
    useEffect(() => {
      onIndexChangeRef.current = onIndexChange;
    }, [onIndexChange]);

    // ── Imperative API: called directly by tab bar tap ─────────────────────
    // This runs SYNCHRONOUSLY — no Zustand round-trip, no useEffect delay
    useImperativeHandle(ref, () => ({
      scrollTo(index: number) {
        const clamped = Math.max(0, Math.min(screens.length - 1, index));
        currentIndex.value = clamped;
        translateX.value = withSpring(-clamped * SCREEN_WIDTH, SPRING_CONFIG);
        committedIndexRef.current = clamped;
        // Notify parent (Zustand) AFTER animation starts, not before
        onIndexChangeRef.current?.(clamped);
      },
    }));

    // ── Notify JS after a swipe gesture commits ────────────────────────────
    const commitIndex = (index: number) => {
      committedIndexRef.current = index;
      onIndexChangeRef.current?.(index);
    };

    // ── Pan Gesture ────────────────────────────────────────────────────────
    const gesture = Gesture.Pan()
      .activeOffsetX([-14, 14])    // start tracking before ScrollViews intercept
      .failOffsetY([-22, 22])      // yield to vertical scroll
      .onUpdate((e) => {
        const base = -currentIndex.value * SCREEN_WIDTH + e.translationX;

        // Rubber-band at edges
        if (currentIndex.value === 0 && e.translationX > 0) {
          translateX.value = e.translationX * 0.2;
        } else if (
          currentIndex.value === screens.length - 1 &&
          e.translationX < 0
        ) {
          translateX.value =
            -(currentIndex.value * SCREEN_WIDTH) + e.translationX * 0.2;
        } else {
          translateX.value = base;
        }
      })
      .onEnd((e) => {
        const VELOCITY_THRESHOLD = 350;
        const DRAG_THRESHOLD = SCREEN_WIDTH * 0.36;
        let next = currentIndex.value;

        if (e.velocityX < -VELOCITY_THRESHOLD && next < screens.length - 1) {
          next += 1;
        } else if (e.velocityX > VELOCITY_THRESHOLD && next > 0) {
          next -= 1;
        } else if (e.translationX < -DRAG_THRESHOLD && next < screens.length - 1) {
          next += 1;
        } else if (e.translationX > DRAG_THRESHOLD && next > 0) {
          next -= 1;
        }

        next = Math.max(0, Math.min(screens.length - 1, next));

        // Update UI thread immediately — zero lag before animation starts
        currentIndex.value = next;
        translateX.value = withSpring(-next * SCREEN_WIDTH, SPRING_CONFIG);

        // Notify JS thread once, stably
        runOnJS(commitIndex)(next);
      });

    // ── Outer strip animated style ─────────────────────────────────────────
    const stripStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.strip,
            { width: SCREEN_WIDTH * screens.length },
            stripStyle,
          ]}
        >
          {screens.map((ScreenComponent, index) => (
            <ScreenSlide key={index} index={index} translateX={translateX}>
              <ScreenComponent />
            </ScreenSlide>
          ))}
        </Animated.View>
      </GestureDetector>
    );
  }
);

export default SwipeContainer;

// ── Per-screen slide — scale + opacity depth effect ───────────────────────────
function ScreenSlide({
  index,
  translateX,
  children,
}: {
  index: number;
  translateX: SharedValue<number>;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const center = -index * SCREEN_WIDTH;
    const progress = (translateX.value - center) / SCREEN_WIDTH;
    const abs = Math.abs(progress);

    const scale = interpolate(abs, [0, 1], [1, 0.97], Extrapolation.CLAMP);
    const opacity = interpolate(abs, [0, 1], [1, 0.78], Extrapolation.CLAMP);

    return { transform: [{ scale }], opacity };
  });

  return (
    <Animated.View style={[styles.slide, style]}>{children}</Animated.View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flex: 1,
    flexDirection: "row",
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    overflow: "hidden",
  },
});


