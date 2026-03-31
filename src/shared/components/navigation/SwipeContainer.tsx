import React, { ReactNode, useState, useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS,
  cancelAnimation
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useNavigationStore } from '../../../store/navigationStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SwipeContainerProps {
  children: ReactNode[];
}

export default function SwipeContainer({ children }: SwipeContainerProps) {
  const translateX = useSharedValue(0);
  const context = useSharedValue({ x: 0 });
  
  const currentIndex = useNavigationStore(s => s.currentIndex);
  const setCurrentIndex = useNavigationStore(s => s.setCurrentIndex);
  
  const [mountedScreens, setMountedScreens] = useState<Set<number>>(new Set([currentIndex]));

  useEffect(() => {
    // Mount the current screen and its neighbors for smooth swiping
    setMountedScreens(prev => {
      const newSet = new Set(prev);
      newSet.add(currentIndex);
      if (currentIndex > 0) newSet.add(currentIndex - 1);
      if (currentIndex < children.length - 1) newSet.add(currentIndex + 1);
      return newSet;
    });
  }, [currentIndex, children.length]);
  
  // Sync the animated value when currentIndex changes (e.g. from tab bar tap)
  useEffect(() => {
    translateX.value = withSpring(-currentIndex * SCREEN_WIDTH, {
      damping: 25,
      stiffness: 220,
      mass: 0.8,
    });
  }, [currentIndex]);
  
  const onIndexChange = (index: number) => {
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const MAX_INDEX = children.length - 1;

  const panGesture = Gesture.Pan()
    // Configure to only trigger on prominent horizontal swipes
    .activeOffsetX([-15, 15])
    .failOffsetY([-30, 30])
    .onStart(() => {
      context.value = { x: translateX.value };
      cancelAnimation(translateX);
    })
    .onUpdate((event) => {
      let newTranslateX = context.value.x + event.translationX;
      
      // Rubber banding effect at boundary edges
      if (newTranslateX > 0) {
        newTranslateX = newTranslateX * 0.25; 
      } else if (newTranslateX < -MAX_INDEX * SCREEN_WIDTH) {
        const overscroll = -MAX_INDEX * SCREEN_WIDTH - newTranslateX;
        newTranslateX = -MAX_INDEX * SCREEN_WIDTH - overscroll * 0.25;
      }
      
      translateX.value = newTranslateX;
    })
    .onEnd((event) => {
      const distance = event.translationX;
      const velocity = event.velocityX;
      
      let nextIndex = currentIndex;
      
      // Determine if swipe should change the screen
      if (velocity < -500 || distance < -SCREEN_WIDTH / 3) {
        nextIndex = Math.min(currentIndex + 1, MAX_INDEX);
      } else if (velocity > 500 || distance > SCREEN_WIDTH / 3) {
        nextIndex = Math.max(currentIndex - 1, 0);
      } else {
        // Did not cross threshold, bounce back to current
        nextIndex = currentIndex;
      }
      
      runOnJS(onIndexChange)(nextIndex);
      
      // Animate to proper position using the velocity for fluid movement
      translateX.value = withSpring(-nextIndex * SCREEN_WIDTH, {
        damping: 25,
        stiffness: 220,
        mass: 0.8,
        velocity: velocity
      });
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: SCREEN_WIDTH * children.length,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {children.map((child, index) => {
          const isMounted = mountedScreens.has(index);
          return (
            <Animated.View 
              key={index} 
              style={[styles.screen, { width: SCREEN_WIDTH }]}
            >
              {isMounted ? child : null}
            </Animated.View>
          );
        })}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  screen: {
    flex: 1,
    height: '100%',
  }
});
