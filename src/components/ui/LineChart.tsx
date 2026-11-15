import { useEffect, useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { color, font } from '@/theme/tokens';
import { T } from './T';

const APath = Animated.createAnimatedComponent(Path);

export interface Point { x: number; y: number; label?: string }

/** Smooth area line chart that draws itself in. Tap a point to read it. */
export function LineChart({ points, height = 180, tint = color.lime, unit = '', empty }: {
  points: Point[]; height?: number; tint?: string; unit?: string; empty: string;
}) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const draw = useSharedValue(0);
  const reduce = useReducedMotion();
  // Gradient ids are page-global on web, so each chart needs its own or they all take the first chart's colour.
  const gid = `area${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const key = points.map((p) => `${p.x}:${p.y}`).join('|');
  useEffect(() => {
    setSel(null);
    if (reduce) { draw.value = 1; return; }
    draw.value = 0;
    draw.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [key, reduce]);
  const animated = useAnimatedProps(() => ({ strokeDashoffset: 3000 * (1 - draw.value) }));
  const areaProps = useAnimatedProps(() => ({ opacity: draw.value }));

  if (points.length < 2) return <View style={styles.empty}><T v="small">{empty}</T></View>;

  const L = 34, R = 10, Tp = 48, B = 22;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = Math.max((y1 - y0) * 0.2, 1); y0 -= pad; y1 += pad;
  const sx = (x: number) => L + (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0)) * (w - L - R);
  const sy = (y: number) => Tp + (1 - (y - y0) / (y1 - y0)) * (height - Tp - B);
  // Monotone-ish smoothing with cubic segments.
  let d = `M${sx(points[0].x)},${sy(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const mx = (sx(a.x) + sx(b.x)) / 2;
    d += ` C${mx},${sy(a.y)} ${mx},${sy(b.y)} ${sx(b.x)},${sy(b.y)}`;
  }
  const area = `${d} L${sx(x1)},${height - B} L${sx(x0)},${height - B} Z`;
  // Grid lines sit on rounded values so the label is exactly where the line is.
  const dp = y1 - y0 < 8 ? 10 : 1;
  const ticks = [...new Set([y0 + (y1 - y0) * 0.15, (y0 + y1) / 2, y1 - (y1 - y0) * 0.15].map((v) => Math.round(v * dp) / dp))];
  const last = points[points.length - 1];
  const s = sel != null ? points[sel] : null;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tint} stopOpacity={0.28} />
              <Stop offset="1" stopColor={tint} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {ticks.map((v, i) => (
            <Line key={i} x1={L} x2={w - R} y1={sy(v)} y2={sy(v)} stroke={color.line} strokeDasharray="3 5" />
          ))}
          {ticks.map((v, i) => (
            <SvgText key={`t${i}`} x={L - 6} y={sy(v) + 4} fill={color.text3} fontSize={10} fontFamily={font.body} textAnchor="end">{v}</SvgText>
          ))}
          <APath d={area} fill={`url(#${gid})`} animatedProps={areaProps} />
          <APath d={d} stroke={tint} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray="3000" animatedProps={animated} />
          {points.map((p, i) => (
            <Circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={i === sel ? 6 : i === points.length - 1 ? 5 : 0} fill={tint} stroke={color.card} strokeWidth={2} />
          ))}
          {points.map((p, i) => (
            <Circle key={`h${i}`} cx={sx(p.x)} cy={sy(p.y)} r={16} fill="transparent" onPress={() => setSel(i === sel ? null : i)} />
          ))}
        </Svg>
      )}
      <View pointerEvents="none" style={styles.readout}>
        <T style={styles.readNum}>{Math.round((s ?? last).y * 10) / 10}<T style={styles.readUnit}> {unit}</T></T>
        <T v="small">{(s ?? last).label}</T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { height: 120, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: color.lineStrong, padding: 16 },
  readout: { position: 'absolute', top: 0, right: 10, alignItems: 'flex-end' },
  readNum: { fontFamily: font.display, fontSize: 26, color: color.text },
  readUnit: { fontFamily: font.bodyMed, fontSize: 12, color: color.text3 },
});
