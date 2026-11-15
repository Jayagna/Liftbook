import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/hooks/haptics';
import { color, font, radius } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { T } from './T';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home', train: 'barbell', nutrition: 'nutrition', progress: 'stats-chart', profile: 'person',
};

/** Floating glass tab bar with a sliding lime indicator. */
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const count = state.routes.length;
  const indicator = useAnimatedStyle(() => ({
    left: withSpring(`${(state.index / count) * 100}%`, { damping: 20, stiffness: 220 }),
  }));
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(23,28,25,0.97)' }]} />
        )}
        <Animated.View style={[styles.indicatorBox, { width: `${100 / count}%` }, indicator]}>
          <View style={styles.indicator} />
        </Animated.View>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const icon = ICONS[route.name] ?? 'ellipse';
          return (
            <PressableScale
              key={route.key}
              haptics={false}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={styles.item}
              onPress={() => {
                const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) { haptic.select(); navigateToTab(route.key); }
              }}
            >
              <Ionicons name={focused ? icon : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)} size={22} color={focused ? color.limeInk : color.text2} />
              <T style={[styles.label, { color: focused ? color.limeInk : color.text3 }]}>{label}</T>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  bar: {
    flexDirection: 'row', height: 66, borderRadius: radius.xl, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12,
  },
  indicatorBox: { position: 'absolute', top: 0, bottom: 0, padding: 6 },
  indicator: { flex: 1, borderRadius: radius.lg, backgroundColor: color.lime },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontFamily: font.bodySemi, fontSize: 10.5, letterSpacing: 0.3 },
});
