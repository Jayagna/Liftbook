import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { color, radius, space } from '@/theme/tokens';
import { T } from './T';

/** Rounded glass-like card: a faint top highlight over the card colour, hairline border. */
export function Card({
  children, style, tint, index = 0, padded = true,
}: { children: ReactNode; style?: StyleProp<ViewStyle>; tint?: string; index?: number; padded?: boolean }) {
  const reduce = useReducedMotion();
  // Cards flip up into place in 3D, staggered by index.
  const t = useSharedValue(reduce ? 1 : 0);
  const o = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    t.value = withDelay(70 * index, withSpring(1, { damping: 16, stiffness: 120, mass: 0.9 }));
    o.value = withDelay(70 * index, withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) }));
  }, []);
  const enter = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [
      { perspective: 900 },
      { translateY: (1 - t.value) * 36 },
      { rotateX: `${(1 - t.value) * 22}deg` },
      { scale: 0.96 + t.value * 0.04 },
    ],
  }));
  return (
    <Animated.View style={[styles.card, style, enter]}>
      <LinearGradient
        colors={[tint ?? 'rgba(255,255,255,0.055)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={padded ? styles.pad : undefined}>{children}</View>
    </Animated.View>
  );
}

export function CardHeader({ title, right, icon }: { title: string; right?: ReactNode; icon?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {icon}
        <T v="label">{title}</T>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.lineStrong,
    overflow: 'hidden',
  },
  pad: { padding: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
