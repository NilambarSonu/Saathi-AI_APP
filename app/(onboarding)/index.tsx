import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

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
  const scrollViewRef = useRef<ScrollView>(null);

  const completeOnboarding = async () => {
    await AsyncStorage.multiSet([
      ['hasOnboarded', 'true'],
      ['saathi_has_onboarded', 'true'],
    ]);
    router.replace('/(auth)/login');
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const handleContinue = () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * width,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.skipButton} onPress={completeOnboarding}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            <View style={[styles.illustrationPanel, { backgroundColor: slide.bg }]}>
              <View style={[styles.badge, { backgroundColor: slide.iconColor }]}>
                <Text style={styles.badgeText}>{slide.badge}</Text>
              </View>
              <Text style={{ fontSize: 80, opacity: 0.8 }}>
                {index === 0 ? '🌡️' : index === 1 ? '🗣️' : '🧠'}
              </Text>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>
                {slide.title}
                <Text style={{ color: Colors.primary }}>{slide.highlight}</Text>
              </Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

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
          onPress={handleContinue}
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
  scrollView: {
    flex: 1,
  },
  slide: {
    width: width,
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    letterSpacing: -0.52,
    marginBottom: Spacing.md,
  },
  body: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22.4,
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
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  ctaText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 16,
    color: Colors.surface,
    letterSpacing: 0.2,
  }
});


