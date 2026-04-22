/**
 * tabBarStore.ts
 *
 * Module-level Reanimated shared values for tab bar visibility.
 * `makeMutable` creates a shared value that lives outside React's lifecycle —
 * any screen can write to it from a worklet (UI thread) and the tab bar
 * reads it to animate itself. No JS thread round-trip, no re-renders.
 */
import { makeMutable, withSpring, withTiming } from 'react-native-reanimated';

// 0 = fully visible, 1 = fully hidden (tab bar slides down)
export const tabBarHidden = makeMutable(0);

export const TAB_BAR_HEIGHT = 80; // approximate pill height + bottom offset

/** Call from a worklet to hide the tab bar */
export function hideTabBar() {
  'worklet';
  tabBarHidden.value = withSpring(1, {
    damping: 20,
    stiffness: 200,
    mass: 0.4,
    overshootClamping: true,
  });
}

/** Call from a worklet to show the tab bar */
export function showTabBar() {
  'worklet';
  tabBarHidden.value = withSpring(0, {
    damping: 20,
    stiffness: 200,
    mass: 0.4,
    overshootClamping: true,
  });
}


