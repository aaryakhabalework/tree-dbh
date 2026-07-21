// ─── Root Layout ──────────────────────────────────────────────────────────────
import 'react-native-reanimated';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '../src/ui/theme/colors';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown:       false,
          contentStyle:      { backgroundColor: colors.bg },
          animation:         'fade_from_bottom',
        }}
      />
    </GestureHandlerRootView>
  );
}
