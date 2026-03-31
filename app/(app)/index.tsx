import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

// Zustand Store
import { useNavigationStore } from '../../src/store/navigationStore';

// Screens
import DashboardScreen from '../../src/screens/DashboardScreen';
import ConnectScreen from '../../src/screens/ConnectScreen';
import ChatScreen from '../../src/screens/ChatScreen';
import HistoryScreen from '../../src/screens/HistoryScreen';
import ProfileScreen from '../../src/screens/ProfileScreen';

// Core Swiper
import SwipeContainer from '../../src/shared/components/navigation/SwipeContainer';

export default function AppIndex() {
  const { currentIndex, setCurrentIndex } = useNavigationStore();

  // Expose the 5 screens
  const screens = [
    DashboardScreen,
    ConnectScreen,
    ChatScreen,
    HistoryScreen,
    ProfileScreen
  ];

  return (
    <View style={s.container}>
      <SwipeContainer
        screens={screens}
        initialIndex={currentIndex}
        onIndexChange={setCurrentIndex}
      />
      
      {/* Floating Tab Bar purely managing index */}
      {currentIndex !== 2 && ( // Hide on Chat (index 2)
        <Animated.View style={s.tabContainer}>
          <BlurView intensity={90} tint="light" style={s.tabPill}>
            <TabItem icon="home-outline" lib={Ionicons} label="HOME" idx={0} currentIdx={currentIndex} onPress={setCurrentIndex} />
            <TabItem icon="hubspot" lib={MaterialCommunityIcons} label="CONNECT" idx={1} currentIdx={currentIndex} onPress={setCurrentIndex} />
            <TabItem icon="sparkles" lib={Ionicons} label="AI CHAT" idx={2} currentIdx={currentIndex} onPress={setCurrentIndex} />
            <TabItem icon="history" lib={MaterialCommunityIcons} label="HISTORY" idx={3} currentIdx={currentIndex} onPress={setCurrentIndex} />
            <TabItem icon="person-outline" lib={Ionicons} label="PROFILE" idx={4} currentIdx={currentIndex} onPress={setCurrentIndex} />
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
}

function TabItem({ icon, lib: IconLib, label, idx, currentIdx, onPress }: any) {
  const isFocused = idx === currentIdx;
  
  return (
    <TouchableOpacity 
      onPress={() => onPress(idx)} 
      style={s.tabItem} 
      activeOpacity={0.8}
    >
      <View style={[s.iconBox, isFocused && s.activeIconBox]}>
         <View style={{ position: 'relative' }}>
          <IconLib name={icon} size={24} color={isFocused ? '#1A5C35' : '#8A9E8E'} />
          {isFocused && (
            <View style={{
              position: 'absolute', top: -2, right: -2,
              width: 6, height: 6, borderRadius: 3,
              backgroundColor: '#69e417ff', 
              borderWidth: 1, borderColor: '#111'
            }} />
          )}
        </View>
      </View>
      <Text style={[s.tabLabel, { color: isFocused ? '#1A5C35' : '#8A9E8E' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' }, 
  tabContainer: {
    position: 'absolute',
    bottom: 35,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  tabPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(240, 253, 244, 0.6)', 
    borderRadius: 35,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: '100%',
    justifyContent: 'space-around',
    borderWidth: 1.5,
    borderColor: 'rgba(167, 243, 208, 0.3)',
    overflow: 'hidden',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  activeIconBox: {
    backgroundColor: 'transparent',
    transform: [{ scale: 1.15 }],
  },
  tabLabel: {
    fontSize: 9,
    fontFamily: 'Sora_700Bold',
    letterSpacing: 0.5,
  },
});
