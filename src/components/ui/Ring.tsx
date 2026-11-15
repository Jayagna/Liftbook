import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { color } from '@/theme/tokens';

const ACircle = Animated.createAnimatedComponent(Circle);

/** Animated progress ring. Progress above 1 wraps a second, brighter lap. */
export function Ring({
  size, stroke = 12, progress, tint = color.lime, tint2, track = 'rgba(255,255,255,0.07)', children, delay = 0,
}: {
  size: number; stroke?: number; progress: number; tint?: string; tint2?: string; track?: string; children?: ReactNode; delay?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(0);
  const reduce = useReducedMotion();
  const target = Math.max(0, Math.min(progress, 1));
  useEffect(() => {
    if (reduce) p.value = target;
    else {
      const t = setTimeout(() => { p.value = withTiming(target, { duration: 1100, easing: Easing.out(Easing.cubic) }); }, delay);
      return () => clearTimeout(t);
    }
  }, [target, reduce, delay]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }));
  const gid = `g${Math.round(size)}${tint.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tint2 ?? tint} />
            <Stop offset="1" stopColor={tint} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <ACircle
          cx={size / 2} cy={size / 2} r={r} stroke={`url(#${gid})`} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={props}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
