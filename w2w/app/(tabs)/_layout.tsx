import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Platform, View, Text, TouchableOpacity } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import HomeTabIcon from '@/components/ui/HomeTabIcon';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { AuthGuard } from '@/components/AuthGuard';
import TabGuide from '@/components/TabGuide';
import { getTabGuidanceStatus } from '@/lib/onboardingStorage';

import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// This file is the main layout for the tabs in the app.

export default function TabLayout() {
  // Temporarily set to true for testing - change back to false when debugging is complete
  const [showTabGuide, setShowTabGuide] = useState(false);

  useEffect(() => {
    const checkTabGuidance = async () => {
      try {
        console.log('[TabLayout] 🔍 Checking tab guidance status...');
        const hasSeenGuidance = await getTabGuidanceStatus();
        console.log('[TabLayout] 📊 Tab guidance status:', hasSeenGuidance);
        console.log('[TabLayout] 🔍 Current showTabGuide state:', showTabGuide);
        
        if (!hasSeenGuidance) {
          console.log('[TabLayout] 🎯 First time user detected, showing guide in 1 second...');
          // Show guide after a short delay to ensure tabs are rendered
          setTimeout(() => {
            console.log('[TabLayout] ✨ Setting showTabGuide to true!');
            setShowTabGuide(true);
            console.log('[TabLayout] 🔍 showTabGuide state after setting:', true);
          }, 1000);
        } else {
          console.log('[TabLayout] ✅ User has already seen the guide - NOT showing guide');
        }
      } catch (error) {
        console.error('[TabLayout] ❌ Error checking tab guidance status:', error);
      }
    };

    checkTabGuidance();
  }, []);


  const handleTabGuideComplete = () => {
    setShowTabGuide(false);
  };

  return (
    <AuthGuard>
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          height: 65,
          backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.7)',
          borderRadius: 32.5,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: '#00630F',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
          paddingBottom: 14,
          paddingTop: 14,
          ...(Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }),
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <HomeTabIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ color }) => <FontAwesome5 name="history" size={32} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          tabBarIcon: ({ color }) => (
            <View style={{
              backgroundColor: Colors.primary,
              borderRadius: 30,
              width: 60,
              height: 60,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: -15, // Move it up to overlap the border
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}>
              <MaterialCommunityIcons name="cube-scan" size={32} color="white" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          tabBarIcon: ({ color }) => <FontAwesome6 name="people-group" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          tabBarIcon: ({ color }) => <FontAwesome5 name="scroll" size={30} color={color} />,
        }}
      />
    </Tabs>
    
    <TabGuide 
      visible={showTabGuide} 
      onComplete={handleTabGuideComplete} 
    />
    
    </AuthGuard>
  );
}
