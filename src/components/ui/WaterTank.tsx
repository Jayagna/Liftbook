import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSpring, withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { color, radius } from '@/theme/tokens';

const WAVE_H = 10;

/** One wavelength-repeating wave strip, twice the tank width, so sliding it by `width` loops seamlessly. */
function wavePath(width: number) {
  let d = `M0 ${WAVE_H}`;
  const total = width * 2;
  for (let x = 0; x <= total; x += 4) d += ` L${x} ${WAVE_H / 2 + Math.sin((x / width) * Math.PI * 2) * (WAVE_H / 2 - 1)}`;
  return d + ` L${total} ${WAVE_H} Z`;
}

/**
 * A rounded tank whose water level springs to `progress`, with two drifting waves.
 * Uses transforms and heights only, so it runs on the UI thread on iOS, Android and web.
 */
export function WaterTank({ width, height, progress }: { width: number; height: number; progress: number }) {
  const level = useSharedValue(0);
  const drift = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const target = Math.max(0, Math.min(progress, 1));
    level.value = reduce ? target : withSpring(target, { damping: 14, stiffness: 70 });
  }, [progress, reduce]);
  useEffect(() => {
    if (reduce) return;
    drift.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1, false);
  }, [reduce]);

  const fill = useAnimatedStyle(() => ({ height: level.value * height }));
  const front = useAnimatedStyle(() => ({ transform: [{ translateX: -drift.value * width }] }));
  const back = useAnimatedStyle(() => ({ transform: [{ translateX: -width + drift.value * width }] }));
  const d = wavePath(width);

  return (
    <View style={[styles.tank, { width, height }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(progress, 1) * 100) }}>
      <Animated.View style={[styles.fill, fill]}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="wt" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#7CC8FF" />
              <Stop offset="1" stopColor={color.water} />
            </LinearGradient>
          </Defs>
          <Path d={`M0 0 H${width} V${height} H0 Z`} fill="url(#wt)" />
        </Svg>
        {!reduce && progress > 0.01 && progress < 0.99 && (
          <>
            <Animated.View style={[styles.wave, { width: width * 2 }, back]}>
              <Svg width={width * 2} height={WAVE_H}><Path d={d} fill={color.water} opacity={0.4} /></Svg>
            </Animated.View>
            <Animated.View style={[styles.wave, { width: width * 2, top: -WAVE_H + 3 }, front]}>
              <Svg width={width * 2} height={WAVE_H}><Path d={d} fill="#7CC8FF" /></Svg>
            </Animated.View>
          </>
        )}
      </Animated.View>
      {[0.25, 0.5, 0.75].map((m) => (
        <View key={m} style={[styles.tick, { bottom: height * m }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tank: {
    borderRadius: radius.md, overflow: 'hidden', backgroundColor: color.waterDim, justifyContent: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(63,169,255,0.35)',
  },
  fill: { width: '100%', overflow: 'visible' },
  wave: { position: 'absolute', top: -WAVE_H, left: 0, height: WAVE_H },
  tick: { position: 'absolute', right: 0, width: 10, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
});
