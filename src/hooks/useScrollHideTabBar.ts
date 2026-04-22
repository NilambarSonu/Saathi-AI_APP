/**
 * useScrollHideTabBar.ts
 *
 * Returns an animated scroll handler (from useAnimatedScrollHandler).
 * Attach it to ANY Animated.ScrollView — the tab bar auto-hides when
 * the user starts dragging and reappears the moment they lift their finger.
 *
 * Usage:
 *   import { Animated } from 'react-native-reanimated';
 *   import { useScrollHideTabBar } from '@/hooks/useScrollHideTabBar';
 *
 *   function MyScreen() {
 *     const scrollHandler = useScrollHideTabBar();
 *     return (
 *       <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
 *         ...
 *       </Animated.ScrollView>
 *     );
 *   }
 */
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { hideTabBar, showTabBar } from '@/store/tabBarStore';

export function useScrollHideTabBar() {
  const lastY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  return useAnimatedScrollHandler({
    onBeginDrag() {
      isDragging.value = true;
      hideTabBar();
    },

    onEndDrag() {
      isDragging.value = false;
      // Show immediately when finger lifts
      showTabBar();
    },

    onMomentumEnd() {
      // Also show when the momentum scroll finishes
      showTabBar();
    },

    onScroll(event) {
      lastY.value = event.contentOffset.y;
    },
  });
}


