// Each weight is imported on its own so the web build ships five font files, not every weight of both families.
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { hydrate, useApp } from '@/store/store';
import { color } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});
// Web build only: drop the browser's focus box on text fields. Each field already sits in its own bordered box.
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('lb-inputs')) {
  const el = document.createElement('style');
  el.id = 'lb-inputs';
  el.textContent = 'input,textarea{outline:none}';
  document.head.appendChild(el);
}
SystemUI.setBackgroundColorAsync(color.bg).catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  });
  const hydrated = useApp((s) => s.hydrated);
  useEffect(() => { hydrate(); }, []);
  const ready = fontsLoaded && hydrated;
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg }, animation: 'fade' }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="customize" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right', gestureEnabled: false }} />
          <Stack.Screen name="planner" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="supplements" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="exercises" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="exercise" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="photos" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="food" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="workout" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
