import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { radius } from '@/theme/tokens';

/** Animated horizontal progress bar. */
export function Bar({ progress, tint, height = 8, delay = 0 }: { progress: number; tint: string; height?: number; delay?: number }) {
  const p = useSharedValue(0);
  const reduce = useReducedMotion();
  const target = Math.max(0, Math.min(progress, 1));
  useEffect(() => {
    if (reduce) p.value = target;
    else {
      const t = setTimeout(() => { p.value = withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) }); }, delay);
      return () => clearTimeout(t);
    }
  }, [target, reduce, delay]);
  const a = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: tint }, a]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden', borderRadius: radius.pill },
});
