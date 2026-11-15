import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/hooks/haptics';
import { RAIL_WIDTH, useLayout } from '@/theme/layout';
import { color, font, motion, radius, space } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { T } from './T';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home', train: 'barbell', nutrition: 'nutrition', progress: 'stats-chart', profile: 'person',
};
const RAIL_ITEM = 50;

/**
 * Navigation that follows the screen: a bottom bar on phones and tablets, a left rail on laptops and desktops.
 * The active tab is lime with a marker that slides between tabs.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const L = useLayout();
  const reduce = useReducedMotion();
  const count = state.routes.length;
  const index = state.index;
  const move = (v: number | `${number}%`) => (reduce ? withTiming(v, { duration: 0 }) : withSpring(v, motion.slide));
  const bottomMark = useAnimatedStyle(() => ({ left: move(`${(index / count) * 100}%`) }), [index, count, reduce]);
  const railMark = useAnimatedStyle(() => ({ top: move(index * (RAIL_ITEM + 4)) }), [index, reduce]);

  const items = state.routes.map((route, i) => {
    const focused = index === i;
    const label = (descriptors[route.key].options.title ?? route.name) as string;
    const icon = ICONS[route.name] ?? 'ellipse';
    return { route, focused, label, icon: (focused ? icon : `${icon}-outline`) as keyof typeof Ionicons.glyphMap };
  });
  const press = (key: string, focused: boolean) => {
    const e = emitter.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (!focused && !e.defaultPrevented) { haptic.select(); navigateToTab(key); }
  };

  if (L.wide) {
    return (
      <View style={[styles.rail, { paddingTop: insets.top + space.xxl }]} accessibilityRole="tablist">
        <View style={styles.brand}>
          <View style={styles.brandMark} />
          <T style={styles.brandText}>LIFTBOOK</T>
        </View>
        <View>
          <Animated.View style={[styles.railMark, railMark]} />
          {items.map(({ route, focused, label, icon }) => (
            <PressableScale key={route.key} haptics={false} scaleTo={0.98} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}
              style={[styles.railItem, focused && styles.railItemOn]} onPress={() => press(route.key, focused)}>
              <Ionicons name={icon} size={20} color={focused ? color.lime : color.text2} />
              <T style={[styles.railLabel, { color: focused ? color.text : color.text2 }]}>{label}</T>
            </PressableScale>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.bar} accessibilityRole="tablist">
        <Animated.View style={[styles.markBox, { width: `${100 / count}%` }, bottomMark]}><View style={styles.mark} /></Animated.View>
        {items.map(({ route, focused, label, icon }) => (
          <PressableScale key={route.key} haptics={false} scaleTo={0.92} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}
            style={styles.item} onPress={() => press(route.key, focused)}>
            <Ionicons name={icon} size={22} color={focused ? color.lime : color.text2} />
            <T numberOfLines={1} style={[styles.label, L.tiny && { fontSize: 9.5, letterSpacing: 0 }, { color: focused ? color.text : color.text3 }]}>{label}</T>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, alignItems: 'center' },
  bar: {
    flexDirection: 'row', height: 62, width: '100%', maxWidth: 520, borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: 'rgba(16,19,17,0.98)', borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
    shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  markBox: { position: 'absolute', top: 0, height: 3, alignItems: 'center' },
  mark: { width: 30, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: color.lime },
  item: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 3 },
  label: { fontFamily: font.bodySemi, fontSize: 10.5, letterSpacing: 0.2 },

  rail: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: RAIL_WIDTH, paddingHorizontal: space.lg,
    backgroundColor: color.bg2, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: color.line,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.md, marginBottom: space.xxl },
  brandMark: { width: 10, height: 22, borderRadius: 2, backgroundColor: color.lime, transform: [{ skewX: '-12deg' }] },
  brandText: { fontFamily: font.display, fontSize: 24, letterSpacing: 1.5, color: color.text },
  railItem: { height: RAIL_ITEM, marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, borderRadius: radius.md },
  railItemOn: { backgroundColor: 'rgba(255,255,255,0.05)' },
  railMark: { position: 'absolute', left: 0, width: 3, height: RAIL_ITEM - 20, marginTop: 10, borderRadius: 2, backgroundColor: color.lime },
  railLabel: { fontFamily: font.bodySemi, fontSize: 15 },
});
