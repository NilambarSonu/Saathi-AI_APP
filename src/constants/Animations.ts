import { Animated } from 'react-native';

export const tabBarY = new Animated.Value(0);

export const hideTabBar = () => {
  Animated.timing(tabBarY, {
    toValue: 120,
    duration: 300,
    useNativeDriver: true,
  }).start();
};

export const showTabBar = () => {
  Animated.timing(tabBarY, {
    toValue: 0,
    duration: 300,
    useNativeDriver: true,
  }).start();
};
