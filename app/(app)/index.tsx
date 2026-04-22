import React, { useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useNavigationStore } from '@/store/navigationStore';
import { tabBarY } from '@/constants/Animations';

import DashboardScreen from '@/screens/DashboardScreen';
import ConnectScreen from '@/screens/ConnectScreen';
import ChatScreen from '@/screens/ChatScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import ProfileScreen from '@/screens/ProfileScreen';

import SwipeContainer, {
  type SwipeContainerHandle,
} from '@/shared/components/navigation/SwipeContainer';

// ── Screens array — stable reference (module-level, never recreated) ──────────
const SCREENS = [
  DashboardScreen,
  ConnectScreen,
  ChatScreen,
  HistoryScreen,
  ProfileScreen,
] as const;

const TABS = [
  { icon: 'home-outline', lib: 'Ionicons', label: 'HOME' },
  { icon: 'hubspot', lib: 'MaterialCommunityIcons', label: 'CONNECT' },
  { icon: 'sparkles', lib: 'Ionicons', label: 'AI CHAT' },
  { icon: 'history', lib: 'MaterialCommunityIcons', label: 'HISTORY' },
  { icon: 'person-outline', lib: 'Ionicons', label: 'PROFILE' },
] as const;

const ACTIVE_COLOR = '#0a843dff';
const INACTIVE_COLOR = '#9CAF9F';
const DOT_COLOR = '#38B000';   // same vivid green the user loved

export default function AppIndex() {
  const { currentIndex, setCurrentIndex } = useNavigationStore();
  const swipeRef = useRef<SwipeContainerHandle>(null);

  // After a swipe gesture ends, the SwipeContainer calls this with the final index
  const handleSwipeChange = useCallback(
    (index: number) => {
      setCurrentIndex(index);
    },
    [setCurrentIndex]
  );

  // Tab bar tap: call scrollTo() FIRST (instant, no re-render needed),
  // then update Zustand so React re-renders the indicator.
  const handleTabPress = useCallback(
    (index: number) => {
      swipeRef.current?.scrollTo(index); // animation starts this frame
      setCurrentIndex(index);            // indicator re-renders next frame
    },
    [setCurrentIndex]
  );

  // Hide the whole tab bar on the Chat screen (full-screen UX)
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
        <Animated.View
          style={[
            s.tabContainer,
            { transform: [{ translateY: tabBarY }] },
          ]}
        >
          <BlurView intensity={88} tint="light" style={s.pill}>
            {TABS.map((tab, idx) => (
              <TabItem
                key={idx}
                tab={tab}
                idx={idx}
                isFocused={idx === currentIndex}
                onPress={handleTabPress}
              />
            ))}
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
}

// ── Tab item ─────────────────────────────────────────────────────────────────
// Uses plain React state (isFocused from Zustand) — simple & 100% reliable.
// The dot and icon color update one React frame after the animation starts, 
// which is imperceptible.
function TabItem({
  tab,
  idx,
  isFocused,
  onPress,
}: {
  tab: (typeof TABS)[number];
  idx: number;
  isFocused: boolean;
  onPress: (idx: number) => void;
}) {
  const IconLib =
    tab.lib === 'Ionicons' ? Ionicons : MaterialCommunityIcons;

  return (
    <TouchableOpacity
      onPress={() => onPress(idx)}
      style={s.tabItem}
      activeOpacity={0.75}
    >
      {/* Icon with the green corner dot when focused */}
      <View style={s.iconWrapper}>
        <IconLib
          name={tab.icon as any}
          size={isFocused ? 25 : 23}
          color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
        />

        {/* ✅ The corner dot the user loves */}
        {isFocused && (
          <View style={s.cornerDot} />
        )}
      </View>

      {/* Label */}
      <Text
        style={[
          s.tabLabel,
          { color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR },
        ]}
      >
        {tab.label}
      </Text>

      {/* Bottom pill indicator — only shows for active tab */}
      {isFocused && <View style={s.bottomDot} />}
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
    backgroundColor: 'rgba(240, 253, 244, 0.60)',
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
    gap: 2,
  },

  // Icon container — must be `position: relative` for the corner dot
  iconWrapper: {
    position: 'relative',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // The green corner dot — the one the user loves ✅
  cornerDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DOT_COLOR,
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  tabLabel: {
    fontSize: 9,
    fontFamily: 'Sora_700Bold',
    letterSpacing: 0.4,
  }
});


