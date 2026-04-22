import React from 'react';
import { Text, Pressable, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

export default function Button({ title, onPress, variant = 'primary', style, textStyle, disabled = false }: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 12, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  let bg = Colors.primary;
  let textCol = '#FFF';
  let border = 'transparent';

  if (variant === 'secondary') {
    bg = Colors.surfaceAlt;
    textCol = Colors.primary;
  } else if (variant === 'outline') {
    bg = 'transparent';
    textCol = Colors.primary;
    border = Colors.border;
  } else if (variant === 'danger') {
    bg = '#FFF';
    textCol = Colors.error;
    border = Colors.error;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.base,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === 'outline' || variant === 'danger' ? 2 : 0 },
        disabled && { opacity: 0.5 },
        animatedStyle,
        style
      ]}
    >
      <Text style={[styles.text, { color: textCol }, textStyle]}>{title}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    width: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
  }
});


