import React, { useEffect } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  Platform, Dimensions, Text,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── TAB CONFIGURATION ──
const TABS = [
  { key: 'dashboard',  icon: 'home',             label: 'Home'     },
  { key: 'live-connect',icon: 'radio',            label: 'Connect'  },
  { key: 'ai-chat',    icon: 'message-circle',   label: 'AI Chat'  },
  { key: 'history',    icon: 'activity',         label: 'History'  },
  { key: 'account',    icon: 'user',             label: 'Profile'  },
] as const;

// Tab bar pill dimensions
const TAB_BAR_WIDTH = SCREEN_WIDTH - 40;   // 20px margin each side
const TAB_BAR_HEIGHT = 64;
const TAB_INDICATOR_WIDTH = TAB_BAR_WIDTH / TABS.length - 8;

interface LiquidGlassTabBarProps {
  activeTab: string;
  onTabPress: (tabKey: string) => void;
}

export default function LiquidGlassTabBar({
  activeTab,
  onTabPress,
}: LiquidGlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = Math.max(0, TABS.findIndex(t => t.key === activeTab));

  // Animated X position of the sliding indicator
  const indicatorX = useSharedValue(activeIndex * (TAB_BAR_WIDTH / TABS.length));

  useEffect(() => {
    indicatorX.value = withSpring(
      activeIndex * (TAB_BAR_WIDTH / TABS.length) + 4,
      {
        damping: 20,        // Controls bounce — lower = more bounce
        stiffness: 180,     // Controls speed
        mass: 0.8,
        overshootClamping: false,
      }
    );
  }, [activeIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleTabPress = (tabKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabPress(tabKey);
  };

  return (
    <View style={[styles.outerWrap, { marginBottom: Math.max(insets.bottom, 12) }]}>
      {/* ── GLASS PILL CONTAINER ── */}
      <BlurView
        intensity={85}
        tint="light"
        style={styles.blurContainer}
      >
        {/* Specular highlight — top edge of glass */}
        <View style={styles.specularHighlight} />

        {/* Sliding green indicator */}
        <Animated.View style={[styles.indicator, indicatorStyle]} />

        {/* Tab items */}
        <View style={styles.tabsRow}>
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <TabItem
                key={tab.key}
                tab={tab}
                isActive={isActive}
                onPress={() => handleTabPress(tab.key)}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

// ── TAB ITEM ──
function TabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: { key: string; icon: any; label: string };
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isActive ? 1 : 0.45);

  useEffect(() => {
    opacity.value = withTiming(isActive ? 1 : 0.45, { duration: 200 });
  }, [isActive]);

  const handlePress = () => {
    // Bounce animation on press
    scale.value = withSpring(0.85, { damping: 10, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    });
    onPress();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={handlePress}
      activeOpacity={1}  // We handle opacity via animation
    >
      <Animated.View style={[styles.tabInner, animStyle]}>
        <Feather name={tab.icon} size={24} color={isActive ? '#1A5C35' : '#8A9E8E'} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    alignItems: 'center',
    // Shadow for floating effect
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  blurContainer: {
    width: TAB_BAR_WIDTH,
    height: TAB_BAR_HEIGHT,
    borderRadius: 32,          // Full pill shape
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',   // glass edge
    backgroundColor: Platform.OS === 'android'
      ? 'rgba(245,250,246,0.94)'             // Android fallback (no blur)
      : 'transparent',
  },
  specularHighlight: {
    position: 'absolute',
    top: 0, left: 16, right: 16,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.70)',   // top glass edge shimmer
    borderRadius: 1,
  },
  indicator: {
    position: 'absolute',
    top: 8,
    width: TAB_INDICATOR_WIDTH,
    height: TAB_BAR_HEIGHT - 16,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 92, 53, 0.10)',   // very subtle green fill
    borderWidth: 1,
    borderColor: 'rgba(26, 92, 53, 0.18)',        // green glass border
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44, height: 44,
    borderRadius: 22,
  },
});


