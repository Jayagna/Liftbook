import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Bar } from '@/components/ui/Bar';
import { Card, CardHeader } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { Ring } from '@/components/ui/Ring';
import { T } from '@/components/ui/T';
import { WaterTank } from '@/components/ui/WaterTank';
import { addDays, DOW_SHORT, today, weekStart } from '@/domain/dates';
import { findExercise, MUSCLE_LABEL } from '@/domain/exercises';
import { supplementTaken, unitWord } from '@/domain/nutrition';
import { activeStreak, recoveryStatus } from '@/domain/recovery';
import type { DayLog, MuscleGroup } from '@/domain/types';
import { haptic } from '@/hooks/haptics';
import type { useDaySummary } from '@/store/selectors';
import { actions, getState, useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

type Summary = NonNullable<ReturnType<typeof useDaySummary>>;
const L = (ml: number) => (Math.round(ml / 10) / 100).toString();

// ---------------- Hydration ----------------
export function HydrationWidget({ s, index }: { s: Summary; index: number }) {
  const quick = useApp((st) => st.dashboard.waterQuick);
  const [custom, setCustom] = useState<string | null>(null);
  const left = s.waterTarget - s.waterMl;
  const add = (ml: number) => {
    const before = s.waterMl;
    actions.addWater(ml, s.date);
    if (before < s.waterTarget && before + ml >= s.waterTarget) haptic.success();
  };
  return (
    <Card index={index}>
      <CardHeader title="Hydration" right={<T v="small">Estimate · {L(s.waterTarget)} L goal</T>} />
      <View style={styles.row}>
        <WaterTank width={78} height={132} progress={s.waterTarget ? s.waterMl / s.waterTarget : 0} />
        <View style={{ flex: 1, gap: space.sm }}>
          <T style={styles.big}>
            <CountUp value={s.waterMl} format={(n) => L(n)} duration={500} /><T style={styles.unit}> L</T>
          </T>
          <T v="small">{left > 0 ? `${L(left)} L to go` : 'Goal reached. Nice work.'}</T>
          <View style={styles.pills}>
            {quick.map((ml) => (
              <Pill key={ml} small label={`+${ml}`} accessibilityLabel={`Add ${ml} millilitres`} onPress={() => add(ml)} />
            ))}
            <Pill small label="Custom" onPress={() => setCustom(custom === null ? '' : null)} />
          </View>
          {custom !== null && (
            <View style={styles.customRow}>
              <TextInput
                autoFocus value={custom} onChangeText={setCustom} keyboardType="number-pad" placeholder="ml"
                placeholderTextColor={color.text3} style={styles.input} accessibilityLabel="Custom amount in millilitres"
                onSubmitEditing={() => { const v = Number(custom); if (v > 0) add(v); setCustom(null); }}
              />
              <Pill small solid tone={color.water} label="Add" onPress={() => { const v = Number(custom); if (v > 0) add(v); setCustom(null); }} />
              {s.waterMl > 0 && <Pill small label="Undo 250" onPress={() => actions.addWater(-250, s.date)} />}
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

// ---------------- Workout of the day ----------------
export function WorkoutWidget({ s, index }: { s: Summary; index: number }) {
  const w = s.workout;
  const hasPlan = useApp((st) => st.plan.length > 0);
  const live = useApp((st) => !!st.session);
  if (!w) {
    return (
      <Card index={index}>
        <CardHeader title="Today’s training" />
        <T v="title">{hasPlan ? 'Rest & recover' : 'No plan yet'}</T>
        <T v="small" style={{ marginTop: 4, marginBottom: space.md }}>
          {hasPlan ? 'Log sport below, hit your protein and water, and get some steps in.' : 'Build your weekly split and your daily workout shows up here.'}
        </T>
        <Pill label={live ? 'Resume workout' : hasPlan ? 'View week' : 'Build my week'} onPress={() => router.push(live ? '/workout' : hasPlan ? '/train' : '/planner')} />
      </Card>
    );
  }
  const muscles = [...new Set(w.exercises.flatMap((e) => findExercise(e.name)?.primary ?? []))].slice(0, 5) as MuscleGroup[];
  const planned = w.exercises.reduce((a, e) => a + e.sets, 0);
  const done = Math.min(s.setsDone, planned);
  return (
    <Card index={index}>
      <CardHeader title="Workout of the day" right={<T v="small">≈ {s.workoutMinutes} min</T>} />
      <T v="title">{w.name}</T>
      <View style={[styles.pills, { marginTop: space.sm }]}>
        {muscles.map((m) => (
          <View key={m} style={styles.tag}><T style={styles.tagText}>{MUSCLE_LABEL[m]}</T></View>
        ))}
      </View>
      <View style={{ marginTop: space.md, gap: 6 }}>
        {w.exercises.slice(0, 4).map((e) => (
          <View key={e.name} style={styles.exRow}>
            <T v="bodyMed" numberOfLines={1} style={{ flex: 1 }}>{e.name}</T>
            <T v="small">{e.sets} × {e.repLow}–{e.repHigh}</T>
          </View>
        ))}
        {w.exercises.length > 4 && <T v="small">+ {w.exercises.length - 4} more</T>}
      </View>
      <View style={{ marginTop: space.md, gap: 6 }}>
        <View style={styles.exRow}>
          <T v="label">Progress</T>
          <T v="small">{done} / {planned} sets</T>
        </View>
        <Bar progress={planned ? done / planned : 0} tint={color.lime} />
      </View>
      <PressableScale
        style={styles.cta} accessibilityLabel="Start workout"
        onPress={() => { if (!getState().session) actions.startWorkout({ id: w.id, exercises: w.exercises }); router.push('/workout'); }}
      >
        <T style={styles.ctaText}>{live ? 'Resume workout' : done > 0 ? 'Continue workout' : 'Start workout'}</T>
      </PressableScale>
    </Card>
  );
}

// ---------------- Daily challenges ----------------
export function ChallengesWidget({ s, index }: { s: Summary; index: number }) {
  const challenges = useApp((st) => st.challenges);
  return (
    <Card index={index}>
      <CardHeader title="Daily challenges" right={<T v="small" onPress={() => router.push('/profile')}>Edit</T>} />
      {challenges.length === 0 && <T v="small">Add push-ups, pull-ups, planks or steps with your own targets in Profile.</T>}
      <View style={{ gap: space.lg }}>
        {challenges.map((c, i) => {
          const v = s.day?.challenges[c.id] ?? 0;
          const done = v >= c.target;
          return (
            <View key={c.id} style={{ gap: 8 }}>
              <View style={styles.exRow}>
                <T v="bodyMed">{c.name}</T>
                <T style={[styles.chNum, done && { color: color.lime }]}>
                  {v.toLocaleString()}<T style={styles.unit}> / {c.target.toLocaleString()}{c.unit === 'sec' ? ' s' : ''}</T>
                </T>
              </View>
              <Bar progress={v / c.target} tint={done ? color.lime : color.text2} height={6} delay={i * 80} />
              <View style={styles.pills}>
                {c.increments.map((inc) => (
                  <Pill key={inc} small label={`+${inc}`} accessibilityLabel={`Add ${inc} ${c.name}`}
                    onPress={() => { actions.addChallenge(c.id, inc, s.date); if (v < c.target && v + inc >= c.target) haptic.success(); }} />
                ))}
                {v > 0 && <Pill small label={`−${c.increments[0]}`} accessibilityLabel={`Remove ${c.increments[0]}`} onPress={() => actions.addChallenge(c.id, -c.increments[0], s.date)} />}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

// ---------------- Supplements ----------------
export function SupplementsWidget({ s, index }: { s: Summary; index: number }) {
  const products = useApp((st) => st.products);
  return (
    <Card index={index}>
      <CardHeader title="Supplements" right={<T v="small" onPress={() => router.push('/supplements')} accessibilityRole="button">Manage</T>} />
      {products.length === 0 && (
        <View style={{ gap: space.md }}>
          <T v="small">Add your protein powder, creatine or anything else you take, and log it in one tap.</T>
          <Pill label="Add a supplement" onPress={() => router.push('/supplements')} style={{ alignSelf: 'flex-start' }} />
        </View>
      )}
      <View style={{ gap: space.lg }}>
        {products.map((p, i) => {
          const taken = supplementTaken(s.day, p.id);
          const tint = p.kind === 'protein' ? color.protein : p.kind === 'creatine' ? color.water : color.fat;
          const unit = unitWord(p.unit, p.dailyTarget);
          return (
            <View key={p.id} style={styles.row}>
              <Ring size={58} stroke={6} progress={p.dailyTarget ? taken / p.dailyTarget : 0} tint={tint} delay={i * 100}>
                <T style={styles.suppPct}>{fmt(taken)}</T>
              </Ring>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.exRow}>
                  <T v="bodyMed" numberOfLines={1} style={{ flex: 1 }}>{p.name}</T>
                  <T v="small">{fmt(taken)} / {fmt(p.dailyTarget)} {unit}</T>
                </View>
                {p.kind === 'protein' && taken > 0 && <T v="small" style={{ color: color.protein }}>+{Math.round(p.proteinG * taken)} g protein counted</T>}
                <View style={styles.pills}>
                  {p.quick.map((q) => (
                    <Pill key={q} small label={p.unit === 'g' ? `${fmt(q)} g` : `${fmt(q)}×`}
                      accessibilityLabel={`Log ${fmt(q)} ${p.unit === 'g' ? 'grams' : unitWord(p.unit, q)} of ${p.name}`}
                      onPress={() => { actions.logSupplement(p.id, q, s.date); if (taken < p.dailyTarget && taken + q >= p.dailyTarget) haptic.success(); }} />
                  ))}
                  {taken > 0 && <Pill small label="Undo" onPress={() => actions.undoSupplement(p.id, s.date)} />}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
const fmt = (x: number) => (Math.round(x * 100) / 100).toString();

// ---------------- Recovery & consistency ----------------
const isActive = (d: DayLog) => d.sets.length > 0 || d.sport.length > 0 || Object.values(d.challenges).some((v) => v > 0);

export function ConsistencyWidget({ s, index }: { s: Summary; index: number }) {
  const days = useApp((st) => st.days);
  const plan = useApp((st) => st.plan);
  const t = today();
  const streak = activeStreak(days, t, isActive);
  const ws = weekStart(s.date);
  const week = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const plannedDows = new Set(plan.map((p) => p.dow));
  const trained = week.filter((d) => (days[d]?.sets.length ?? 0) > 0).length;
  const recovery = recoveryStatus(days).slice(0, 4);
  return (
    <Card index={index}>
      <CardHeader title="Recovery & consistency" />
      <View style={styles.row}>
        <View style={styles.streak}>
          <T style={styles.streakNum}>{streak}</T>
          <T v="label" style={{ fontSize: 9.5, letterSpacing: 0.8 }}>day streak</T>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={styles.exRow}>
            <T v="label">This week</T>
            <T v="small">{trained} / {plannedDows.size || '–'} sessions</T>
          </View>
          <View style={styles.week}>
            {week.map((d) => {
              const on = (days[d]?.sets.length ?? 0) > 0;
              const sport = (days[d]?.sport.length ?? 0) > 0;
              const planned = plannedDows.has(new Date(d + 'T12:00').getDay());
              return (
                <View key={d} style={[styles.dot, on && styles.dotOn, !on && sport && styles.dotSport, d === t && styles.dotToday]}>
                  <T style={[styles.dotText, on && { color: color.limeInk }]}>{DOW_SHORT[new Date(d + 'T12:00').getDay()][0]}</T>
                  {!on && planned && <View style={styles.plannedMark} />}
                </View>
              );
            })}
          </View>
        </View>
      </View>
      <View style={{ marginTop: space.lg, gap: 10 }}>
        <View style={styles.exRow}>
          <T v="label">Recently trained</T>
          <T v="small">Estimated recovery</T>
        </View>
        {recovery.length === 0 && <T v="small">Log a workout and recovery estimates appear here.</T>}
        {recovery.map((r) => (
          <View key={r.muscle} style={{ gap: 4 }}>
            <View style={styles.exRow}>
              <T v="bodyMed">{MUSCLE_LABEL[r.muscle]}</T>
              <T v="small" style={{ color: r.recovered >= 0.9 ? color.ok : r.recovered >= 0.5 ? color.warn : color.danger }}>
                {r.recovered >= 0.9 ? 'Ready' : `${Math.round(r.recovered * 100)}%`}
              </T>
            </View>
            <Bar progress={r.recovered} tint={r.recovered >= 0.9 ? color.ok : r.recovered >= 0.5 ? color.warn : color.danger} height={4} />
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  big: { fontFamily: font.display, fontSize: 44, lineHeight: 46, color: color.text },
  unit: { fontFamily: font.bodyMed, fontSize: 14, color: color.text3 },
  customRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    minWidth: 80, height: 36, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: color.bg2,
    color: color.text, fontFamily: font.bodySemi, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: color.limeDim },
  tagText: { fontFamily: font.bodySemi, fontSize: 12, color: color.lime },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cta: { marginTop: space.lg, height: 52, borderRadius: radius.pill, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: font.display, fontSize: 20, letterSpacing: 0.8, textTransform: 'uppercase', color: color.limeInk },
  chNum: { fontFamily: font.display, fontSize: 22, color: color.text },
  suppPct: { fontFamily: font.displaySemi, fontSize: 16, color: color.text },
  streak: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: color.limeDim },
  streakNum: { fontFamily: font.display, fontSize: 36, lineHeight: 38, color: color.lime },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: color.lime },
  dotSport: { backgroundColor: color.waterDim },
  dotToday: { borderWidth: 1.5, borderColor: color.text },
  dotText: { fontFamily: font.bodySemi, fontSize: 12, color: color.text2 },
  plannedMark: { position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: color.lime },
});
