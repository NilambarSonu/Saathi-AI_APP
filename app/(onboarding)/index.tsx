import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  runOnJS,
  interpolateColor
} from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Soil Testing in ',
    highlight: '60 Seconds',
    body: 'The Agni device analyzes 14 parameters — pH, N, P, K, moisture, EC and more. No lab. No waiting.',
    badge: '60 SECS',
    bg: '#E8F5E9',
    iconColor: Colors.primary
  },
  {
    id: '2',
    title: 'Your Farm, ',
    highlight: 'Your Language',
    body: 'Get recommendations in Odia, Hindi, English or 7 other Indian languages — with full voice advisory support.',
    badge: '10 LANGS',
    bg: '#FFF3E0',
    iconColor: Colors.warning
  },
  {
    id: '3',
    title: 'AI That Knows ',
    highlight: 'Agriculture',
    body: 'Saathi AI is trained on peer-reviewed agronomic data to deliver personalized fertilizer plans and yield forecasts.',
    badge: 'CUSTOM LLM',
    bg: '#F3E5F5',
    iconColor: Colors.premium
  }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);

  const completeOnboarding = async () => {
    await AsyncStorage.multiSet([
      ['hasOnboarded', 'true'],
      ['saathi_has_onboarded', 'true'],
    ]);
    router.replace('/(auth)/login');
  };

  const setIndex = (index: number) => {
    setCurrentIndex(index);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX < -50 && currentIndex < SLIDES.length - 1) {
        // Swipe left (next)
        translateX.value = withSpring(-width, { damping: 20 }, () => {
          runOnJS(setIndex)(currentIndex + 1);
          translateX.value = width;
          translateX.value = withSpring(0, { damping: 20 });
        });
      } else if (event.translationX > 50 && currentIndex > 0) {
        // Swipe right (prev)
        translateX.value = withSpring(width, { damping: 20 }, () => {
          runOnJS(setIndex)(currentIndex - 1);
          translateX.value = -width;
          translateX.value = withSpring(0, { damping: 20 });
        });
      } else {
        // Snap back
        translateX.value = withSpring(0, { damping: 20 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }));

  const slide = SLIDES[currentIndex];

  return (
    <View style={styles.container}>
      <Pressable style={styles.skipButton} onPress={completeOnboarding}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.slideContainer, animatedStyle]}>
          <View style={[styles.illustrationPanel, { backgroundColor: slide.bg }]}>
            <View style={[styles.badge, { backgroundColor: slide.iconColor }]}>
              <Text style={styles.badgeText}>{slide.badge}</Text>
            </View>
            <Text style={{ fontSize: 80, opacity: 0.8 }}>
              {currentIndex === 0 ? '🌡️' : currentIndex === 1 ? '🗣️' : '🧠'}
            </Text>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>
              {slide.title}
              <Text style={{ color: Colors.primary }}>{slide.highlight}</Text>
            </Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        </Animated.View>
      </GestureDetector>

      <View style={styles.footer}>
        <View style={styles.indicators}>
          {SLIDES.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.dot, 
                currentIndex === index ? styles.dotActive : null
              ]} 
            />
          ))}
        </View>

        <Pressable 
          style={styles.ctaButton} 
          onPress={() => {
            if (currentIndex < SLIDES.length - 1) {
              translateX.value = withTiming(-width, { duration: 250 }, () => {
                runOnJS(setIndex)(currentIndex + 1);
                translateX.value = width;
                translateX.value = withTiming(0, { duration: 250 });
              });
            } else {
              completeOnboarding();
            }
          }}
        >
          <Text style={styles.ctaText}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: Spacing.xl,
    zIndex: 10,
    padding: Spacing.sm,
  },
  skipText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: Spacing.xl,
  },
  illustrationPanel: {
    width: 260,
    height: 220,
    borderRadius: Spacing.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: -10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    ...Spacing.shadows.sm,
  },
  badgeText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 10,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.52, // -0.02em
    marginBottom: Spacing.md,
  },
  body: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22.4, // 1.6
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 50,
    paddingTop: 20,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  ctaButton: {
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: Spacing.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Spacing.shadows.md,
  },
  ctaText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 16,
    color: Colors.surface,
    letterSpacing: 0.2,
  }
});
