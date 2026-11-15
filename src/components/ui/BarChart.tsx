// Single-series bar chart for a phone-width card. Thin bars with rounded tops on a baseline,
// an optional target line, and a tap-to-read line above the plot in place of a hover tooltip.
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { color, font, space } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { T } from './T';

export interface BarDatum { label: string; title: string; value: number | null }

export function BarChart({ bars, tint = color.lime, unit = '', format = (n) => Math.round(n).toLocaleString(), target, height = 132, empty }: {
  bars: BarDatum[]; tint?: string; unit?: string; format?: (n: number) => string;
  target?: { value: number; label: string }; height?: number; empty: string;
}) {
  const reduce = useReducedMotion();
  const withData = bars.map((b, i) => ((b.value ?? 0) > 0 ? i : -1)).filter((i) => i >= 0);
  const [sel, setSel] = useState<number | null>(null);
  const grow = useSharedValue(reduce ? 1 : 0);
  const key = bars.map((b) => `${b.label}:${b.value}`).join('|');
  useEffect(() => {
    setSel(null);
    if (reduce) { grow.value = 1; return; }
    grow.value = 0;
    grow.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [key, reduce]);

  if (withData.length === 0) return <View style={styles.empty}><T v="small">{empty}</T></View>;

  const cur = sel != null && bars[sel] ? sel : withData[withData.length - 1];
  const max = Math.max(target?.value ?? 0, ...bars.map((b) => b.value ?? 0)) || 1;
  const every = Math.max(1, Math.ceil(bars.length / 6));
  const b = bars[cur];
  // Headroom so the target label sits inside the plot, clear of the readout above it.
  const inner = height - (target && target.value > 0 ? 16 : 0);

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.readout} accessibilityLiveRegion="polite">
        <T v="small">{b.title}</T>
        <T style={styles.value}>{b.value != null && b.value > 0 ? format(b.value) : '–'}<T style={styles.unit}>{b.value != null && b.value > 0 && unit ? ` ${unit}` : ''}</T></T>
      </View>
      <View style={[styles.plot, { height }]}>
        {target && target.value > 0 && (
          <View style={[styles.target, { bottom: (target.value / max) * inner }]} pointerEvents="none">
            <T style={styles.targetText}>{target.label}</T>
          </View>
        )}
        {bars.map((x, i) => (
          <PressableScale key={`${x.label}${i}`} haptics={false} scaleTo={1} style={styles.col} onPress={() => setSel(i)}
            accessibilityLabel={`${x.title}: ${x.value != null && x.value > 0 ? `${format(x.value)} ${unit}` : 'no data'}`} accessibilityState={{ selected: i === cur }}>
            <Bar h={((x.value ?? 0) / max) * inner} grow={grow} tint={tint} on={i === cur} />
          </PressableScale>
        ))}
      </View>
      <View style={styles.axis}>
        {bars.map((x, i) => (
          <View key={`${x.label}${i}`} style={styles.tick}>
            {(i % every === 0 || bars.length <= 7) && <T numberOfLines={1} style={[styles.tickText, i === cur && { color: color.text }]}>{x.label}</T>}
          </View>
        ))}
      </View>
    </View>
  );
}

function Bar({ h, grow, tint, on }: { h: number; grow: SharedValue<number>; tint: string; on: boolean }) {
  const a = useAnimatedStyle(() => ({ height: Math.max(h > 0 ? 3 : 0, h * grow.value) }));
  return <Animated.View style={[styles.bar, { backgroundColor: tint, opacity: on ? 1 : 0.5 }, a]} />;
}

const styles = StyleSheet.create({
  empty: { minHeight: 90, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  readout: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md },
  value: { fontFamily: font.display, fontSize: 26, lineHeight: 28, color: color.text },
  unit: { fontFamily: font.body, fontSize: 12, color: color.text3 },
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.lineStrong },
  col: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '64%', maxWidth: 20, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  target: { position: 'absolute', left: 0, right: 0, height: 0, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: color.text3 },
  targetText: { position: 'absolute', right: 0, bottom: 2, fontFamily: font.body, fontSize: 10, color: color.text2 },
  axis: { flexDirection: 'row', gap: 2 },
  tick: { flex: 1, alignItems: 'center', overflow: 'visible' },
  tickText: { fontFamily: font.bodySemi, fontSize: 10, color: color.text3, width: 48, textAlign: 'center' },
});
