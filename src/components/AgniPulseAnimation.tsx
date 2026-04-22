import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withDelay,
} from 'react-native-reanimated';

const RING_COLOR = 'rgba(255, 255, 255, 0.4)';

export default function AgniPulseAnimation() {
  const scale1 = useSharedValue(1);
  const opacity1 = useSharedValue(1);
  
  const scale2 = useSharedValue(1);
  const opacity2 = useSharedValue(1);

  useEffect(() => {
    const config = { duration: 3000, easing: Easing.out(Easing.ease) };
    
    scale1.value = withRepeat(withTiming(2.5, config), -1, false);
    opacity1.value = withRepeat(withTiming(0, config), -1, false);

    scale2.value = withDelay(1000, withRepeat(withTiming(2.5, config), -1, false));
    opacity2.value = withDelay(1000, withRepeat(withTiming(0, config), -1, false));
  }, []);

  const r1 = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: opacity1.value,
  }));

  const r2 = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: opacity2.value,
  }));

  return (
    <View style={styles.container}>
      {/* Expanding Ring 1 */}
      <Animated.View style={[styles.ring, r1]} />
      {/* Expanding Ring 2 */}
      <Animated.View style={[styles.ring, r2]} />
      
      {/* Core Glowing Dot */}
      <View style={styles.core} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  ring: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: RING_COLOR,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  core: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
});
