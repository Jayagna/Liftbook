import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Body3D, type MuscleTone } from '@/components/three/Body3D';
import { Rings3D } from '@/components/three/Rings3D';
import { Card, CardHeader } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import { Choice } from '@/components/ui/Field';
import { Ring } from '@/components/ui/Ring';
import { T } from '@/components/ui/T';
import { EXERCISES, findExercise, MUSCLE_LABEL } from '@/domain/exercises';
import { recoveryStatus } from '@/domain/recovery';
import type { MuscleGroup } from '@/domain/types';
import { haptic } from '@/hooks/haptics';
import type { useDaySummary } from '@/store/selectors';
import { useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

type Summary = NonNullable<ReturnType<typeof useDaySummary>>;

// ---------------- Today rings (hero) ----------------
export function TodayRingsWidget({ s, index }: { s: Summary; index: number }) {
  const use3d = useApp((st) => st.dashboard.visuals3d);
  const kcalP = s.targets.kcal ? s.totals.kcal / s.targets.kcal : 0;
  const proP = s.targets.protein ? s.totals.p / s.targets.protein : 0;
  const waterP = s.waterTarget ? s.waterMl / s.waterTarget : 0;
  const left = s.targets.kcal - s.totals.kcal;
  const legend = [
    { label: 'Calories', v: `${Math.round(s.totals.kcal).toLocaleString()} / ${s.targets.kcal.toLocaleString()}`, p: kcalP, c: color.lime },
    { label: 'Protein', v: `${Math.round(s.totals.p)} / ${s.targets.protein} g`, p: proP, c: color.protein },
    { label: 'Water', v: `${(s.waterMl / 1000).toFixed(1)} / ${(s.waterTarget / 1000).toFixed(1)} L`, p: waterP, c: color.water },
  ];
  return (
    <Card index={index} padded={false} tint="rgba(200,255,80,0.10)" style={styles.hero}>
      <View style={styles.heroTop}>
        <T v="label">Today</T>
        <T v="small">Targets are estimates</T>
      </View>
      <View>
        {use3d ? (
          <Rings3D height={270} rings={[{ progress: kcalP, color: color.lime }, { progress: proP, color: color.protein }, { progress: waterP, color: color.water }]} />
        ) : (
          <View style={styles.flat}>
            <Ring size={230} stroke={16} progress={kcalP} tint={color.lime}>
              <Ring size={184} stroke={14} progress={proP} tint={color.protein}>
                <Ring size={142} stroke={12} progress={waterP} tint={color.water} />
              </Ring>
            </Ring>
          </View>
        )}
        <View style={styles.center} pointerEvents="none">
          <CountUp value={Math.abs(left)} style={styles.big} />
          <View style={styles.pill}><T v="label" style={{ color: left >= 0 ? color.text : color.danger }}>{left >= 0 ? 'kcal left' : 'kcal over'}</T></View>
        </View>
      </View>
      <View style={styles.legend}>
        {legend.map((l) => (
          <View key={l.label} style={styles.legendItem}>
            <View style={styles.legendHead}>
              <View style={[styles.dot, { backgroundColor: l.c }]} />
              <T v="label">{l.label}</T>
            </View>
            <T style={styles.legendPct}>{Math.round(Math.min(l.p, 9.99) * 100)}%</T>
            <T v="small" numberOfLines={1}>{l.v}</T>
          </View>
        ))}
      </View>
      {s.targets.sportExtra > 0 && (
        <View style={styles.bonus}><Ionicons name="flash" size={14} color={color.lime} /><T v="small" style={{ color: color.lime }}>+{s.targets.sportExtra} kcal added for today’s sport</T></View>
      )}
    </Card>
  );
}

// ---------------- Muscle map ----------------
const STATUS = (r: number) => (r >= 0.9 ? color.ok : r >= 0.5 ? color.warn : color.danger);

export function MuscleMapWidget({ s, index }: { s: Summary; index: number }) {
  const use3d = useApp((st) => st.dashboard.visuals3d);
  const days = useApp((st) => st.days);
  const [mode, setMode] = useState<'today' | 'recovery'>(s.workout ? 'today' : 'recovery');
  const [view, setView] = useState<'front' | 'back'>('front');
  const [sel, setSel] = useState<MuscleGroup | null>(null);
  const recovery = useMemo(() => recoveryStatus(days), [days]);

  const { tone, primary, secondary } = useMemo(() => {
    const t: MuscleTone = {};
    const prim = new Set<MuscleGroup>(), sec = new Set<MuscleGroup>();
    if (mode === 'today' && s.workout) {
      for (const e of s.workout.exercises) {
        const ex = findExercise(e.name);
        ex?.primary.forEach((m) => prim.add(m));
        ex?.secondary.forEach((m) => sec.add(m));
      }
      sec.forEach((m) => { if (!prim.has(m)) t[m] = '#5E7A2A'; });
      prim.forEach((m) => (t[m] = color.lime));
    } else if (mode === 'recovery') {
      for (const r of recovery) t[r.muscle] = STATUS(r.recovered);
    }
    return { tone: t, primary: prim, secondary: sec };
  }, [mode, s.workout, recovery]);

  const selInfo = sel ? recovery.find((r) => r.muscle === sel) : null;
  const selExercises = sel ? EXERCISES.filter((e) => e.primary.includes(sel)).slice(0, 4) : [];
  const select = (m: MuscleGroup | null) => { haptic.select(); setSel(m); if (m) { const front: MuscleGroup[] = ['chest', 'abs', 'obliques', 'quads', 'biceps']; const back: MuscleGroup[] = ['back', 'lats', 'traps', 'glutes', 'hamstrings', 'calves', 'rear_delts', 'triceps']; if (front.includes(m)) setView('front'); else if (back.includes(m)) setView('back'); } };

  return (
    <Card index={index} padded={false}>
      <View style={{ padding: space.lg, paddingBottom: 0 }}>
        <CardHeader title="Muscle map" right={<T v="small">{use3d ? 'Drag to rotate · tap a muscle' : 'Tap a muscle below'}</T>} />
        <Choice value={mode} onChange={(v) => { setMode(v); setSel(null); }} options={[{ value: 'today', label: s.workout ? `Today · ${s.workout.name}` : 'Today' }, { value: 'recovery', label: 'Recovery' }]} />
      </View>
      {use3d ? (
        <View>
          <Body3D tone={tone} selected={sel} onSelect={select} view={view} height={340} />
          <View style={styles.viewToggle}>
            {(['front', 'back'] as const).map((v) => (
              <T key={v} onPress={() => { haptic.select(); setView(v); }} style={[styles.viewBtn, view === v && styles.viewBtnOn]}>{v === 'front' ? 'Front' : 'Back'}</T>
            ))}
          </View>
        </View>
      ) : null}
      <View style={{ padding: space.lg, paddingTop: use3d ? 0 : space.md, gap: space.md }}>
        <View style={styles.legendRow}>
          {mode === 'today' ? (
            <>
              <Key c={color.lime} label="Primary" />
              <Key c="#5E7A2A" label="Secondary" />
            </>
          ) : (
            <>
              <Key c={color.danger} label="Fatigued" />
              <Key c={color.warn} label="Recovering" />
              <Key c={color.ok} label="Ready" />
            </>
          )}
        </View>
        {mode === 'today' && !s.workout && <T v="small">Rest day. Switch to Recovery to see how your muscles are bouncing back.</T>}
        {mode === 'recovery' && recovery.length === 0 && <T v="small">Log a workout and estimated recovery shows up on the body.</T>}
        <View style={styles.chips}>
          {(mode === 'today' ? [...primary] : recovery.map((r) => r.muscle)).map((m) => (
            <T key={m} onPress={() => select(sel === m ? null : m)} style={[styles.chip, sel === m && styles.chipOn]}>{MUSCLE_LABEL[m]}</T>
          ))}
        </View>
        {sel && (
          <View style={styles.sel}>
            <View style={styles.between}>
              <T v="h2">{MUSCLE_LABEL[sel]}</T>
              {selInfo ? <T v="small" style={{ color: STATUS(selInfo.recovered) }}>{selInfo.recovered >= 0.9 ? 'Ready' : `${Math.round(selInfo.recovered * 100)}% recovered`} · est.</T> : <T v="small">Not trained recently</T>}
            </View>
            <T v="label" style={{ marginTop: space.sm }}>Exercises that target it</T>
            {selExercises.map((e) => (
              <View key={e.name} style={styles.between}>
                <T v="bodyMed">{e.name}</T>
                <T v="small">{e.equipment[0]}</T>
              </View>
            ))}
          </View>
        )}
        {mode === 'today' && secondary.size > 0 && !sel && (
          <T v="small">Also working: {[...secondary].filter((m) => !primary.has(m)).map((m) => MUSCLE_LABEL[m]).join(', ')}</T>
        )}
      </View>
    </Card>
  );
}

function Key({ c, label }: { c: string; label: string }) {
  return (
    <View style={styles.key}>
      <View style={[styles.dot, { backgroundColor: c }]} />
      <T v="small">{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderColor: 'rgba(200,255,80,0.22)' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', padding: space.lg, paddingBottom: 0 },
  flat: { height: 270, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  big: { fontFamily: font.display, fontSize: 50, lineHeight: 52, color: color.text, textShadowColor: 'rgba(0,0,0,0.85)', textShadowRadius: 16 },
  pill: { marginTop: 2, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: 'rgba(13,16,16,0.72)' },
  legend: { flexDirection: 'row', paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm },
  legendItem: { flex: 1, padding: space.md, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.04)', gap: 2 },
  legendHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendPct: { fontFamily: font.display, fontSize: 26, color: color.text },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bonus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.lg, paddingBottom: space.lg, marginTop: -space.sm },
  viewToggle: { position: 'absolute', right: space.lg, bottom: space.lg, flexDirection: 'row', backgroundColor: 'rgba(13,16,16,0.7)', borderRadius: radius.pill, padding: 3 },
  viewBtn: { fontFamily: font.bodySemi, fontSize: 12, color: color.text2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, overflow: 'hidden' },
  viewBtnOn: { backgroundColor: color.text, color: color.bg },
  legendRow: { flexDirection: 'row', gap: space.lg },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    fontFamily: font.bodySemi, fontSize: 13, color: color.text, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipOn: { backgroundColor: color.text, color: color.bg },
  sel: { padding: space.md, borderRadius: radius.md, backgroundColor: color.bg2, gap: 6 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
