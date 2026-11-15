// Recovery body: the OpenArt 3D anatomy render with each muscle glowing in its recovery colour.
// Glows are soft radial gradients placed over the render; they light up one by one and the selected one breathes.
import { useEffect, useId, type ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, G, RadialGradient, Stop } from 'react-native-svg';
import type { MuscleGroup } from '@/domain/types';

type Spot = [cx: number, cy: number, rx: number, ry: number, rotate: number];
// Positions in the 440 x 660 render.
const SPOTS: Record<'front' | 'back', Partial<Record<MuscleGroup, Spot[]>>> = {
  front: {
    traps: [[190.0, 119.0, 20.0, 8.0, 0], [250.0, 119.0, 20.0, 8.0, 0]],
    shoulders: [[150.0, 152.5, 21.0, 26.0, -10], [290.0, 152.5, 21.0, 26.0, 10]],
    chest: [[192.5, 167.5, 31.0, 22.0, 0], [247.5, 167.5, 31.0, 22.0, 0]],
    biceps: [[140.0, 207.5, 14.0, 31.0, -12], [300.0, 207.5, 14.0, 31.0, 12]],
    forearms: [[120.0, 267.5, 13.0, 36.0, -18], [320.0, 267.5, 13.0, 36.0, 18]],
    abs: [[220.0, 227.5, 26.0, 50.0, 0]],
    obliques: [[184.0, 240.0, 10.0, 34.0, -6], [256.0, 240.0, 10.0, 34.0, 6]],
    quads: [[189.0, 422.5, 26.0, 65.0, -3], [251.0, 422.5, 26.0, 65.0, 3]],
    calves: [[186.0, 540.0, 15.0, 46.0, -2], [254.0, 540.0, 15.0, 46.0, 2]],
  },
  back: {
    traps: [[222.0, 125.0, 47.5, 20.0, 0], [222.0, 162.5, 17.0, 35.0, 0]],
    rear_delts: [[152.5, 150.0, 20.0, 23.0, -10], [290.0, 150.0, 20.0, 23.0, 10]],
    back: [[222.0, 235.0, 16.0, 47.5, 0]],
    lats: [[182.5, 220.0, 25.0, 47.5, 8], [261.5, 220.0, 25.0, 47.5, -8]],
    triceps: [[142.5, 207.5, 15.0, 31.0, -10], [300.0, 207.5, 15.0, 31.0, 10]],
    forearms: [[125.0, 272.5, 13.0, 36.0, -15], [317.5, 272.5, 13.0, 36.0, 15]],
    glutes: [[196.0, 320.0, 27.5, 27.5, 0], [248.0, 320.0, 27.5, 27.5, 0]],
    hamstrings: [[194.0, 425.0, 23.0, 60.0, -2], [250.0, 425.0, 23.0, 60.0, 2]],
    calves: [[191.0, 527.5, 20.0, 44.0, -2], [253.0, 527.5, 20.0, 44.0, 2]],
  },
};
const IMG = { front: require('../../../assets/images/body/front.jpg'), back: require('../../../assets/images/body/back.jpg') };
const W = 440, H = 660;
const AnimatedG = Animated.createAnimatedComponent(G);

export function RenderBody({ side, tone, selected, height, onSelect }: {
  side: 'front' | 'back'; tone: Partial<Record<MuscleGroup, string>>; selected: MuscleGroup | null; height: number; onSelect?: (m: MuscleGroup) => void;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const width = (height * W) / H;
  const reduce = !!useReducedMotion();
  const muscles = Object.keys(SPOTS[side]) as MuscleGroup[];
  const colors = [...new Set(Object.values(tone).filter(Boolean) as string[])];
  const gid = (c: string) => `g${uid}${side}${c.replace(/[^a-zA-Z0-9]/g, '')}`;
  const key = muscles.map((m) => tone[m] ?? '').join('|');
  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Image source={IMG[side]} style={{ position: 'absolute', left: 0, top: 0, width, height }} resizeMode="cover" accessibilityIgnoresInvertColors />
      <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} style={StyleSheet.absoluteFill}>
        <Defs>
          {colors.map((c) => (
            <RadialGradient key={c} id={gid(c)} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c} stopOpacity={0.85} />
              <Stop offset="0.6" stopColor={c} stopOpacity={0.45} />
              <Stop offset="1" stopColor={c} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {muscles.map((m, i) => {
          const c = tone[m];
          const shapes = (SPOTS[side][m] ?? []).map(([cx, cy, rx, ry, r], j) => (
            <Ellipse key={j} cx={cx} cy={cy} rx={rx * 1.15} ry={ry * 1.1} fill={c ? `url(#${gid(c)})` : 'transparent'} transform={r ? `rotate(${r} ${cx} ${cy})` : undefined} />
          ));
          return (
            <G key={m} onPress={onSelect ? () => onSelect(m) : undefined} opacity={selected && selected !== m ? 0.4 : 1}>
              {c ? <Glow delay={reduce ? 0 : 150 + i * 70} trigger={key + side} reduce={reduce} breathe={selected === m}>{shapes}</Glow> : shapes}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

function Glow({ delay, trigger, reduce, breathe, children }: { delay: number; trigger: string; reduce: boolean; breathe: boolean; children: ReactNode }) {
  const o = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) { o.value = 1; return; }
    o.value = 0;
    o.value = withDelay(delay, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [trigger, reduce]);
  useEffect(() => {
    if (reduce) return;
    if (breathe) o.value = withRepeat(withTiming(0.45, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
    else { cancelAnimation(o); o.value = withTiming(1, { duration: 200 }); }
  }, [breathe, reduce]);
  const props = useAnimatedProps(() => ({ opacity: o.value }));
  return <AnimatedG animatedProps={props}>{children}</AnimatedG>;
}
