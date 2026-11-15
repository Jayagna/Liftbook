import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { SampleBanner } from '@/components/SampleBanner';
import { RenderBody } from '@/components/dashboard/RenderBody';
import { FormLink } from '@/components/train/FormLink';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { addDays, DOW_SHORT, dow, parseISO, shortDate, today, weekStart } from '@/domain/dates';
import { findExercise, MUSCLE_LABEL } from '@/domain/exercises';
import { bestEver, e1rm, fmtKg, isPR, sessionMinutes, suggest, type Suggestion } from '@/domain/progression';
import { fmtClock, prefill } from '@/domain/session';
import type { MuscleGroup, PlannedExercise } from '@/domain/types';
import { haptic } from '@/hooks/haptics';
import { plannedWorkout } from '@/store/selectors';
import { actions, getState, useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

export default function Train() {
  const t = today();
  const [date, setDate] = useState(t);
  const plan = useApp((s) => s.plan);
  const days = useApp((s) => s.days);
  const ws = weekStart(t);
  const week = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const workout = plannedWorkout(getState(), date);
  const session = useApp((s) => s.session);
  const hasProfile = useApp((s) => !!s.profile);
  const day = days[date];
  const isToday = date === t;
  const start = () => {
    if (!getState().session) actions.startWorkout({ id: workout?.id ?? null, exercises: workout?.exercises ?? [] }, t);
    router.push('/workout');
  };
  const loggedNames = [...new Set((day?.sets ?? []).map((s) => s.ex))];
  const planned = workout?.exercises ?? [];
  const extras = loggedNames.filter((n) => !planned.some((p) => p.name === n)).map((name) => ({ name, sets: 3, repLow: 8, repHigh: 12, stepKg: 2.5, restSec: 90 }));

  return (
    <Screen
      eyebrow={isToday ? 'Today' : shortDate(date)} title="Train"
      right={hasProfile ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <PressableScale style={[styles.edit, { paddingHorizontal: 0, width: 38, justifyContent: 'center' }]} onPress={() => router.push('/exercises')} accessibilityLabel="Exercise library">
            <Ionicons name="book-outline" size={16} color={color.text} />
          </PressableScale>
          <PressableScale style={styles.edit} onPress={() => router.push('/planner')} accessibilityLabel="Edit weekly plan">
            <Ionicons name="create-outline" size={16} color={color.text} />
            <T style={styles.editText}>Edit plan</T>
          </PressableScale>
        </View>
      ) : undefined}
    >
      <SampleBanner />
      {session && (
        <PressableScale scaleTo={0.985} style={styles.live} onPress={() => router.push('/workout')} accessibilityLabel="Workout in progress. Open it.">
          <View style={styles.liveDot} />
          <View style={{ flex: 1 }}>
            <T v="bodyMed">Workout in progress</T>
            <T v="small">{session.pausedAt ? 'Paused' : 'Timer running'} · {days[session.date]?.sets.length ?? 0} sets logged</T>
          </View>
          <T style={styles.liveGo}>Open</T>
        </PressableScale>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {week.map((d) => {
          const w = plan.find((p) => p.dow === dow(d));
          const on = d === date;
          const done = (days[d]?.sets.length ?? 0) > 0;
          return (
            <PressableScale key={d} onPress={() => setDate(d)} style={[styles.dayChip, on && styles.dayOn]} accessibilityLabel={`${DOW_SHORT[dow(d)]}, ${w?.name ?? 'rest'}`}>
              <T style={[styles.dayDow, on && { color: color.limeInk }]}>{DOW_SHORT[dow(d)]}</T>
              <T style={[styles.dayNum, on && { color: color.limeInk }]}>{parseISO(d).getDate()}</T>
              <T numberOfLines={1} style={[styles.daySplit, on && { color: color.limeInk }]}>{w ? w.name.split(' ')[0] : 'Rest'}</T>
              {done && <View style={[styles.doneDot, on && { backgroundColor: color.limeInk }]} />}
            </PressableScale>
          );
        })}
      </ScrollView>

      {plan.length === 0 && (
        <Card>
          <T v="title">Your week starts here</T>
          <T v="small" style={{ marginTop: 4, marginBottom: space.md }}>
            Pick the muscle groups for each day and get a session built around your goal, or put it together exercise by exercise.
          </T>
          <Pill solid label="Build my week" onPress={() => router.push(hasProfile ? '/planner' : '/onboarding')} style={{ alignSelf: 'flex-start' }} />
        </Card>
      )}

      {workout && (
        <Card tint="rgba(200,255,80,0.06)" padded={false}>
          <View style={{ padding: 16, paddingBottom: 0 }}>
            <T v="label">{DOW_SHORT[dow(date)]} · ≈ {sessionMinutes(workout.exercises)} min</T>
            <T v="title" style={{ marginTop: 2 }}>{workout.name}</T>
            <T v="small" style={{ marginTop: 4 }}>
              {planned.length} exercises · {planned.reduce((a, e) => a + e.sets, 0)} sets · {day?.sets.length ?? 0} logged
            </T>
          </View>
          {day?.workout && (
            <T v="small" style={{ paddingHorizontal: 16, marginTop: 6, color: color.lime }}>
              Finished in {fmtClock(day.workout.durationSec)}
            </T>
          )}
          {planned.length > 0 && <DayBody names={planned.map((e) => e.name)} />}
          {isToday && !session && (
            <View style={{ padding: 16, paddingTop: planned.length > 0 ? 0 : 14 }}>
              <PressableScale style={styles.cta} onPress={start} accessibilityLabel="Start workout with rest timer">
                <Ionicons name="play" size={18} color={color.limeInk} />
                <T style={styles.ctaText}>{day?.workout ? 'Train again' : (day?.sets.length ?? 0) > 0 ? 'Continue workout' : 'Start workout'}</T>
              </PressableScale>
            </View>
          )}
        </Card>
      )}
      {plan.length > 0 && !workout && extras.length === 0 && (
        <Card>
          <T v="title">Rest day</T>
          <T v="small" style={{ marginTop: 4 }}>Recovery is where the muscle gets built. Log sport or challenges from Home.</T>
          {isToday && !session && <Pill label="Start a free workout" onPress={start} style={{ alignSelf: 'flex-start', marginTop: space.md }} />}
        </Card>
      )}
      {workout && planned.length > 0 && <T v="label" style={{ marginTop: space.xs }}>{isToday ? 'Or log sets quickly' : 'Log sets'}</T>}

      {[...planned, ...extras].map((e, i) => <ExerciseCard key={e.name} e={e} date={date} startOpen={i === 0} />)}
    </Screen>
  );
}

function DayBody({ names }: { names: string[] }) {
  const [sel, setSel] = useState<MuscleGroup | null>(null);
  const tone = useMemo(() => {
    const t: Partial<Record<MuscleGroup, string>> = {};
    const prim = new Set<MuscleGroup>();
    for (const n of names) findExercise(n)?.primary.forEach((m) => prim.add(m));
    for (const n of names) findExercise(n)?.secondary.forEach((m) => { if (!prim.has(m)) t[m] = '#4FB3FF'; });
    prim.forEach((m) => (t[m] = color.lime));
    return t;
  }, [names.join('|')]);
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.md, backgroundColor: '#000', marginTop: space.md }}>
      <View style={{ flexDirection: 'row' }}>
        {(['front', 'back'] as const).map((side) => <RenderBody key={side} side={side} tone={tone} selected={sel} onSelect={(m) => setSel(sel === m ? null : m)} height={250} />)}
      </View>
      <T v="small" style={{ marginTop: 6, color: sel ? color.text : color.text3 }}>{sel ? MUSCLE_LABEL[sel] : 'Lime: main muscles today · blue: also working'}</T>
    </View>
  );
}

function hint(s: Suggestion, m: PlannedExercise) {
  if (s.kind === 'first') return `First time logging this. Pick a weight you can do for ${m.repLow}–${m.repHigh} clean reps.`;
  const last = s.last.map((x) => (x.kg > 0 ? `${fmtKg(x.kg)}×${x.reps}` : `BW×${x.reps}`)).join(', ');
  const when = `Last time (${shortDate(s.lastDate)}): ${last}.`;
  if (s.kind === 'increase') return `${when} You hit ${m.repHigh} on every set. Suggested: ${fmtKg(s.kg)} kg for ${m.repLow}+ reps.`;
  if (s.kind === 'harder') return `${when} Top of the range on every set. Add load or slow the reps down.`;
  return `${when} Stay at ${fmtKg(s.kg)} kg and beat ${Math.max(...s.last.map((x) => x.reps))} reps on your first set.`;
}

function ExerciseCard({ e, date, startOpen }: { e: PlannedExercise; date: string; startOpen: boolean }) {
  const reduce = useReducedMotion();
  const days = useApp((s) => s.days);
  const [open, setOpen] = useState(startOpen);
  const mine = (days[date]?.sets ?? []).filter((s) => s.ex === e.name);
  const sug = suggest(days, e.name, date, e);
  const prev = bestEver(days, e.name, date);
  // Start from what was last lifted. A suggested increase is only used when the user taps to accept it.
  const pre = prefill(days, date, e);
  const [kg, setKg] = useState(pre.kg > 0 ? String(pre.kg) : '');
  const [reps, setReps] = useState(String(pre.reps));
  const offer = sug.kind === 'increase' && mine.length === 0 && (Number(kg.replace(',', '.')) || 0) < sug.kg ? sug : null;
  const timed = /\(sec\)/.test(e.name);
  const ex = findExercise(e.name);
  const done = mine.length >= e.sets;

  const log = () => {
    const r = Number(reps), w = Number(kg.replace(',', '.')) || 0;
    if (!r) return;
    const wasPR = isPR({ id: '', ex: e.name, kg: w, reps: r }, Math.max(prev, ...mine.map((x) => e1rm(x.kg, x.reps))));
    actions.addSet({ ex: e.name, kg: timed ? 0 : w, reps: r }, date);
    if (wasPR || mine.length + 1 === e.sets) haptic.success();
  };

  return (
    <Animated.View layout={reduce ? undefined : LinearTransition.springify().damping(20)}>
      <Card padded={false} style={done ? { borderColor: 'rgba(200,255,80,0.4)' } : undefined}>
        <PressableScale onPress={() => setOpen(!open)} scaleTo={0.99} style={styles.exHead} accessibilityLabel={`${e.name}, ${open ? 'collapse' : 'expand'}`}>
          <View style={[styles.exBadge, done && { backgroundColor: color.lime }]}>
            {done ? <Ionicons name="checkmark" size={18} color={color.limeInk} /> : <T style={styles.exBadgeText}>{mine.length}/{e.sets}</T>}
          </View>
          <View style={{ flex: 1 }}>
            <T v="bodyMed" style={{ fontSize: 16 }}>{e.name}</T>
            <T v="small">{e.sets} × {e.repLow}–{e.repHigh}{timed ? ' s' : ''} · rest {Math.round(e.restSec / 15) * 15 >= 60 ? `${Math.round(e.restSec / 30) / 2} min` : `${e.restSec} s`}{ex ? ` · ${ex.primary.map((m) => MUSCLE_LABEL[m]).join(', ')}` : ''}</T>
          </View>
          <FormLink name={e.name} />
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={color.text3} />
        </PressableScale>
        {open && (
          <Animated.View entering={reduce ? undefined : FadeIn.duration(220)} style={styles.exBody}>
            <View style={styles.hint}>
              <Ionicons name="trending-up" size={16} color={color.lime} />
              <View style={{ flex: 1, gap: 8 }}>
                <T v="small" style={{ color: color.text }}>{hint(sug, e)}</T>
                {offer && <Pill small solid label={`Use ${fmtKg(offer.kg)} kg`} onPress={() => { setKg(String(offer.kg)); setReps(String(offer.reps)); }} style={{ alignSelf: 'flex-start' }} />}
              </View>
            </View>
            {mine.length > 0 && (
              <View style={styles.sets}>
                {mine.map((s, i) => {
                  // A PR is a set that beats every earlier session and every earlier set today.
                  const before = Math.max(prev, ...mine.slice(0, i).map((x) => e1rm(x.kg, x.reps)));
                  const pr = isPR(s, before);
                  return (
                    <PressableScale key={s.id} onLongPress={() => actions.removeSet(s.id, date)} style={[styles.set, pr && styles.setPR]} accessibilityLabel={`Set ${i + 1}, long press to delete`}>
                      <T style={styles.setIdx}>{i + 1}</T>
                      <T style={styles.setVal}>{timed ? `${s.reps}s` : s.kg > 0 ? `${fmtKg(s.kg)} × ${s.reps}` : `BW × ${s.reps}`}</T>
                      {pr && <T style={styles.prTag}>PR</T>}
                    </PressableScale>
                  );
                })}
              </View>
            )}
            <View style={styles.adder}>
              {!timed && (
                <View style={styles.inBox}>
                  <TextInput value={kg} onChangeText={setKg} keyboardType="decimal-pad" style={styles.inText} placeholder="0" placeholderTextColor={color.text3} accessibilityLabel={`Weight for ${e.name}`} />
                  <T v="small">kg</T>
                </View>
              )}
              <View style={styles.inBox}>
                <TextInput value={reps} onChangeText={setReps} keyboardType="number-pad" style={styles.inText} placeholder="0" placeholderTextColor={color.text3} accessibilityLabel={`${timed ? 'Seconds' : 'Reps'} for ${e.name}`} />
                <T v="small">{timed ? 'sec' : 'reps'}</T>
              </View>
              <Pill solid label={`Log set ${mine.length + 1}`} onPress={log} style={{ flexGrow: 1 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
              <T v="small" style={{ color: color.text3, flex: 1 }}>{mine.length > 0 ? 'Long-press a set to delete it.' : ''}</T>
              {ex && <T v="small" onPress={() => router.push({ pathname: '/exercise', params: { name: e.name } })} style={{ color: color.lime }} accessibilityRole="button" accessibilityLabel={`How to do ${e.name}`}>How to do it</T>}
            </View>
          </Animated.View>
        )}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dayChip: {
    width: 64, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', gap: 2,
    backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  dayOn: { backgroundColor: color.lime, borderColor: color.lime },
  dayDow: { fontFamily: font.bodySemi, fontSize: 11, color: color.text3, textTransform: 'uppercase', letterSpacing: 0.8 },
  dayNum: { fontFamily: font.display, fontSize: 24, lineHeight: 26, color: color.text },
  daySplit: { fontFamily: font.bodyMed, fontSize: 10.5, color: color.text2, maxWidth: 56 },
  doneDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: color.lime, marginTop: 2 },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  exBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  exBadgeText: { fontFamily: font.displaySemi, fontSize: 15, color: color.text },
  exBody: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  hint: { flexDirection: 'row', gap: 8, padding: space.md, borderRadius: radius.sm, backgroundColor: color.limeDim },
  sets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  set: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 38, borderRadius: radius.pill,
    backgroundColor: color.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  setPR: { borderColor: color.lime, backgroundColor: color.limeDim },
  setIdx: { fontFamily: font.bodySemi, fontSize: 11, color: color.text3 },
  setVal: { fontFamily: font.display, fontSize: 18, color: color.text },
  prTag: { fontFamily: font.bodySemi, fontSize: 10, color: color.lime, letterSpacing: 0.8 },
  adder: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  inBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 12, borderRadius: radius.pill,
    backgroundColor: color.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  edit: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: radius.pill,
    backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  editText: { fontFamily: font.bodySemi, fontSize: 13, color: color.text },
  live: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg,
    backgroundColor: color.limeDim, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(200,255,80,0.5)',
  },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.lime },
  liveGo: { fontFamily: font.display, fontSize: 18, letterSpacing: 0.8, textTransform: 'uppercase', color: color.lime },
  cta: { flexDirection: 'row', gap: 8, height: 54, borderRadius: radius.pill, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: font.display, fontSize: 21, letterSpacing: 0.8, textTransform: 'uppercase', color: color.limeInk },
  inText: { width: 52, color: color.text, fontFamily: font.display, fontSize: 20, textAlign: 'center', height: '100%' },
});
