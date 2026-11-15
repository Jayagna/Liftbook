import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { color } from '@/theme/tokens';

function Blob({ size, tint, opacity }: { size: number; tint: string; opacity: number }) {
  const id = `b${tint.replace('#', '')}`;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={tint} stopOpacity={opacity} />
          <Stop offset="1" stopColor={tint} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={size} height={size} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Slow-drifting soft colour light behind a screen's header, for depth. */
export function Aurora() {
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduce) t.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: -60 + t.value * 80 }, { translateY: -120 + t.value * 40 }, { scale: 1 + t.value * 0.15 }] }));
  const b = useAnimatedStyle(() => ({ transform: [{ translateX: width - 260 - t.value * 70 }, { translateY: -40 + t.value * 70 }] }));
  return (
    <View pointerEvents="none" style={styles.layer}>
      <Animated.View style={[styles.abs, a]}><Blob size={420} tint={color.lime} opacity={0.16} /></Animated.View>
      <Animated.View style={[styles.abs, b]}><Blob size={380} tint={color.water} opacity={0.12} /></Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, height: 560, overflow: 'hidden' },
  abs: { position: 'absolute', top: 0, left: 0 },
});
