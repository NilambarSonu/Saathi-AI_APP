import React, { useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';

import { useNavigationStore } from '../../src/store/navigationStore';

import DashboardScreen from '../../src/screens/DashboardScreen';
import ConnectScreen   from '../../src/screens/ConnectScreen';
import ChatScreen      from '../../src/screens/ChatScreen';
import HistoryScreen   from '../../src/screens/HistoryScreen';
import ProfileScreen   from '../../src/screens/ProfileScreen';

import SwipeContainer, {
  type SwipeContainerHandle,
} from '../../src/shared/components/navigation/SwipeContainer';

const SCREENS = [
  DashboardScreen,
  ConnectScreen,
  ChatScreen,
  HistoryScreen,
  ProfileScreen,
] as const;

const TABS = [
  { icon: 'home-outline',  lib: 'Ionicons',               label: 'HOME'    },
  { icon: 'hubspot',       lib: 'MaterialCommunityIcons',  label: 'CONNECT' },
  { icon: 'sparkles',      lib: 'Ionicons',               label: 'AI CHAT' },
  { icon: 'history',       lib: 'MaterialCommunityIcons',  label: 'HISTORY' },
  { icon: 'person-outline',lib: 'Ionicons',               label: 'PROFILE' },
] as const;

export default function AppIndex() {
  const { currentIndex, setCurrentIndex } = useNavigationStore();
  const swipeRef = useRef<SwipeContainerHandle>(null);

  // ── Active index as a shared value so tab bar highlights update on UI thread ─
  const activeIdx = useSharedValue(currentIndex);

  // ── Called by swipe gesture (already on JS thread) ──────────────────────────
  const handleSwipeChange = useCallback(
    (index: number) => {
      activeIdx.value = index;
      setCurrentIndex(index);    // sync Zustand for other consumers
    },
    [setCurrentIndex]
  );

  // ── Called by tab bar tap — INSTANT, no Zustand round-trip ──────────────────
  const handleTabPress = useCallback(
    (index: number) => {
      activeIdx.value = index;         // update highlight immediately (UI thread)
      swipeRef.current?.scrollTo(index); // animate strip (UI thread)
      // setCurrentIndex is called inside scrollTo → onIndexChange, no need here
    },
    []
  );

  // Chat tab hides the tab bar
  const isChat = currentIndex === 2;

  return (
    <View style={s.root}>
      <SwipeContainer
        ref={swipeRef}
        screens={SCREENS as any}
        initialIndex={currentIndex}
        onIndexChange={handleSwipeChange}
      />

      {!isChat && (
        <View style={s.tabContainer}>
          <BlurView intensity={85} tint="light" style={s.pill}>
            {TABS.map((tab, idx) => (
              <TabItem
                key={idx}
                tab={tab}
                idx={idx}
                activeIdx={activeIdx}
                onPress={handleTabPress}
              />
            ))}
          </BlurView>
        </View>
      )}
    </View>
  );
}

// ── Tab item: reads activeIdx from shared value → highlights update on UI thread
function TabItem({
  tab,
  idx,
  activeIdx,
  onPress,
}: {
  tab: (typeof TABS)[number];
  idx: number;
  activeIdx: SharedValue<number>;
  onPress: (idx: number) => void;
}) {
  const IconLib =
    tab.lib === 'Ionicons' ? Ionicons : MaterialCommunityIcons;

  // Animated dot indicator under the active tab
  const dotStyle = useAnimatedStyle(() => {
    const focused = interpolate(
      Math.abs(activeIdx.value - idx),
      [0, 0.5, 1],
      [1, 0.4, 0],
      Extrapolation.CLAMP
    );
    return { opacity: focused, transform: [{ scaleX: focused }] };
  });

  // Icon scale when active
  const iconStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(activeIdx.value - idx),
      [0, 1],
      [1.1, 1],
      Extrapolation.CLAMP
    );
    return { transform: [{ scale }] };
  });

  return (
    <TouchableOpacity
      onPress={() => onPress(idx)}
      style={s.tabItem}
      activeOpacity={0.75}
    >
      <Animated.View style={[s.iconBox, iconStyle]}>
        <IconLib
          name={tab.icon as any}
          size={24}
          color="#1A5C35"
        />
      </Animated.View>
      <Text style={s.tabLabel}>{tab.label}</Text>
      {/* Active indicator dot */}
      <Animated.View style={[s.dot, dotStyle]} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  tabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 18 : 30,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(240, 253, 244, 0.55)',
    borderRadius: 36,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(167, 243, 208, 0.35)',
    overflow: 'hidden',
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconBox: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 9,
    fontFamily: 'Sora_700Bold',
    letterSpacing: 0.4,
    color: '#1A5C35',
    marginTop: 1,
  },
  dot: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#38B000',
    marginTop: 2,
  },
});
