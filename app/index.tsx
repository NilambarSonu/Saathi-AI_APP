import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withSequence,
  withDelay,
  withRepeat
} from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { useAuthStore } from '../store/authStore';

export default function SplashScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  // Animation Values
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  useEffect(() => {
    // 1. Logo Entrance
    logoScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 100 }));
    logoOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));

    // 2. Title Entrance
    titleOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    titleTranslateY.value = withDelay(600, withTiming(0, { duration: 400 }));

    // 3. Tagline Entrance
    taglineOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));

    // 4. Loading dots pulse (Starts at 1200ms)
    setTimeout(() => {
      dot1Opacity.value = withRepeat(withSequence(withTiming(1, {duration: 600}), withTiming(0.3, {duration: 600})), -1, true);
      setTimeout(() => dot2Opacity.value = withRepeat(withSequence(withTiming(1, {duration: 600}), withTiming(0.3, {duration: 600})), -1, true), 200);
      setTimeout(() => dot3Opacity.value = withRepeat(withSequence(withTiming(1, {duration: 600}), withTiming(0.3, {duration: 600})), -1, true), 400);
    }, 1200);

    // 5. Navigate exactly at 2.2 seconds based on state
    const timer = setTimeout(async () => {
      const hasOnboarded = await AsyncStorage.getItem('saathi_has_onboarded');
      const legacyHasOnboarded = await AsyncStorage.getItem('hasOnboarded');
      const isOnboarded = hasOnboarded === 'true' || legacyHasOnboarded === 'true';
      
      if (!isOnboarded) {
        router.replace('/(onboarding)');
      } else if (!isAuthenticated) {
        router.replace('/(auth)/login');
      } else {
        router.replace('/(app)');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }]
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }]
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value
  }));

  return (
    <View style={styles.container}>
      {/* Background Gradient Simulator (using solid color for now as per prompt we just use linear gradient approximation if needed) */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.primaryDark }]} />
      
      <Animated.View style={[styles.logoBox, logoStyle]}>
        <Text style={{ fontSize: 40 }}>🌱</Text>
      </Animated.View>

      <Animated.View style={[styles.textContainer, titleStyle]}>
        <Text style={styles.title}>Saathi AI</Text>
      </Animated.View>

      <Animated.View style={[styles.textContainer, taglineStyle]}>
        <Text style={styles.tagline}>The Organic Intelligence Platform</Text>
      </Animated.View>

      <View style={styles.loaderContainer}>
        <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
        <Animated.View style={[styles.dot, { opacity: dot2Opacity }]} />
        <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Mitti-AI Innovations · Est. 2024</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryDeep,
  },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 32,
    color: '#FFF',
    letterSpacing: -0.64, // -0.02em
  },
  tagline: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
  },
  loaderContainer: {
    flexDirection: 'row',
    marginTop: 40,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
  },
  footerText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.88, // 0.08em
  }
});
