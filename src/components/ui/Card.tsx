import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { color, motion, radius, space } from '@/theme/tokens';
import { T } from './T';

/**
 * Matte panel with a hairline edge. `tint` marks the one card that matters most on a screen:
 * it gets a lime rule along the top instead of a different fill, so emphasis stays quiet.
 * Cards rise into place once, in order, when a screen first appears.
 */
export function Card({
  children, style, tint, index = 0, padded = true,
}: { children: ReactNode; style?: StyleProp<ViewStyle>; tint?: string; index?: number; padded?: boolean }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    t.value = withDelay(Math.min(index, 6) * motion.stagger, withTiming(1, { duration: motion.enter, easing: Easing.out(Easing.cubic) }));
  }, []);
  const enter = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * 14 }] }));
  return (
    <Animated.View style={[styles.card, tint ? styles.accent : null, style, enter]}>
      {tint ? <View style={styles.rule} pointerEvents="none" /> : null}
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
    borderColor: color.line,
    overflow: 'hidden',
  },
  accent: { borderColor: 'rgba(200,255,80,0.28)' },
  rule: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: color.lime },
  pad: { padding: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md, gap: space.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
});
