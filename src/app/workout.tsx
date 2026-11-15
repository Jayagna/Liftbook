// Live workout: one set at a time, with a rest timer that starts itself.
// The timer runs on timestamps, so it stays right if the phone locks or the app is backgrounded.
import Ionicons from '@expo/vector-icons/Ionicons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing, FadeIn, FadeInDown, LinearTransition, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue,
  withDelay, withTiming, ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { ExercisePicker } from '@/components/train/ExercisePicker';
import { Aurora } from '@/components/ui/Aurora';
import { Bar } from '@/components/ui/Bar';
import { CountUp } from '@/components/ui/CountUp';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { Stepper } from '@/components/ui/Stepper';
import { T } from '@/components/ui/T';
import { longDate, shortDate } from '@/domain/dates';
import { findExercise, MUSCLE_LABEL } from '@/domain/exercises';
import { plannedFrom } from '@/domain/planner';
import { bestEver, e1rm, fmtKg, isPR, suggest } from '@/domain/progression';
import { elapsedSec, fmtClock, nextInBlock, nextUp, prefill, restBefore, summarize, type Summary } from '@/domain/session';
import type { LoggedSet } from '@/domain/types';
import { beep, primeBeep } from '@/hooks/beep';
import { haptic } from '@/hooks/haptics';
import { actions, getState, useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

interface Finished { name: string; date: string; durationSec: number; sum: Summary; skipped: string[] }

const AWAKE = 'liftbook-workout';
const isTimed = (name: string) => /\(sec\)/.test(name);
const setText = (s: LoggedSet, timed: boolean) => (timed ? `${s.reps}s` : s.kg > 0 ? `${fmtKg(s.kg)} × ${s.reps}` : `BW × ${s.reps}`);
const leave = () => (router.canGoBack() ? router.back() : router.replace('/train'));

export default function Workout() {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const session = useApp((s) => s.session);
  const days = useApp((s) => s.days);
  const plan = useApp((s) => s.plan);
  const goal = useApp((s) => s.profile?.goal ?? 'general');
  const experience = useApp((s) => s.training?.experience ?? 'intermediate');

  const [now, setNow] = useState(() => Date.now());
  /** Set when the user jumps to an exercise out of plan order. */
  const [focus, setFocus] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { kg: number; reps: number }>>({});
  const [declined, setDeclined] = useState<string[]>([]);
  const [picker, setPicker] = useState<{ mode: 'add' } | { mode: 'replace'; index: number } | null>(null);
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null);
  const [flash, setFlash] = useState<{ text: string; at: number } | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);

  const running = !!session && !session.pausedAt;
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);

  // The screen stays on while a workout is open.
  const open = !!session;
  useEffect(() => {
    if (!open) return;
    activateKeepAwakeAsync(AWAKE).catch(() => {});
    return () => { deactivateKeepAwake(AWAKE).catch(() => {}); };
  }, [open]);

  const restEndsAt = session?.restEndsAt ?? null;
  useEffect(() => {
    if (restEndsAt && now >= restEndsAt) {
      actions.clearRest();
      haptic.success();
      beep();
      setFlash({ text: 'Rest over. Go.', at: Date.now() });
    }
  }, [now, restEndsAt]);

  if (finished) return <Done f={finished} />;

  if (!session) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + space.xxl, paddingHorizontal: space.lg, gap: space.md }]}>
        <Aurora />
        <T v="title">No workout in progress</T>
        <T v="small">Start one from the Train tab and it opens here with a rest timer.</T>
        <Pill solid label="Go to Train" onPress={() => router.replace('/train')} style={{ alignSelf: 'flex-start' }} />
      </View>
    );
  }

  const date = session.date;
  const ex = session.exercises;
  const todays = days[date]?.sets ?? [];
  const name = plan.find((d) => d.id === session.dayId)?.name ?? 'Free workout';
  const next = nextUp(ex, todays, session.skipped);
  const idx = focus != null && ex[focus] ? focus : next?.index ?? null;
  const cur = idx != null ? ex[idx] : null;
  const count = (n: string) => todays.filter((s) => s.ex === n).length;

  const live = ex.filter((e) => !session.skipped.includes(e.name));
  const plannedSets = live.reduce((a, e) => a + e.sets, 0);
  const doneSets = live.reduce((a, e) => a + Math.min(count(e.name), e.sets), 0);
  const left = plannedSets - doneSets;

  const paused = !!session.pausedAt;
  const elapsed = elapsedSec(session, now);
  const restLeft = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0;
  const resting = !!restEndsAt && restLeft > 0;
  const showFlash = flash && now - flash.at < 4000 ? flash.text : null;

  // ----- the set in front of the user -----
  const mine = cur ? todays.filter((s) => s.ex === cur.name) : [];
  const timed = cur ? isTimed(cur.name) : false;
  const draft = cur ? drafts[cur.name] ?? prefill(days, date, cur) : { kg: 0, reps: 0 };
  const sug = cur ? suggest(days, cur.name, date, cur) : null;
  const prevBest = cur ? bestEver(days, cur.name, date) : 0;
  const def = cur ? findExercise(cur.name) : undefined;
  const setNo = mine.length + 1;
  const partnerNames = cur?.superset != null ? ex.filter((e) => e.superset === cur.superset && e.name !== cur.name).map((e) => e.name) : [];
  // A heavier weight is only ever offered. It is used when the user taps to accept it.
  const offer = cur && sug?.kind === 'increase' && mine.length === 0 && draft.kg < sug.kg && !declined.includes(cur.name) ? sug : null;

  const setDraft = (patch: Partial<{ kg: number; reps: number }>) => cur && setDrafts({ ...drafts, [cur.name]: { ...draft, ...patch } });

  const complete = () => {
    if (!cur || idx == null || draft.reps <= 0) return;
    primeBeep();
    if (paused) actions.resumeWorkout();
    const kg = timed ? 0 : draft.kg;
    const pr = isPR({ id: '', ex: cur.name, kg, reps: draft.reps }, Math.max(prevBest, ...mine.map((x) => e1rm(x.kg, x.reps))));
    actions.addSet({ ex: cur.name, kg, reps: draft.reps }, date);
    const after = getState().days[date]?.sets ?? [];
    const stay = focus != null ? nextInBlock(ex, idx, after, session.skipped) : null;
    const upcoming = stay ?? nextUp(ex, after, session.skipped)?.index ?? null;
    actions.startRest(restBefore(ex, idx, upcoming));
    setFocus(stay);
    const { [cur.name]: _, ...rest } = drafts;
    setDrafts(rest);
    setConfirm(null);
    if (pr) { haptic.success(); setFlash({ text: `New best on ${cur.name}`, at: Date.now() }); }
  };

  const jump = (i: number) => {
    const e = ex[i];
    if (session.skipped.includes(e.name)) actions.toggleSkip(e.name);
    setFocus(i);
    haptic.select();
  };

  const finish = () => {
    const s = getState();
    setFinished({ name, date, durationSec: elapsedSec(session, Date.now()), sum: summarize(s.days, date, ex, session.skipped), skipped: session.skipped });
    actions.finishWorkout();
    haptic.success();
  };

  return (
    <View style={styles.root}>
      <Aurora />
      <View style={[styles.top, { paddingTop: insets.top + space.md }]}>
        <PressableScale style={styles.round} onPress={leave} accessibilityLabel="Minimise workout. The timer keeps running.">
          <Ionicons name="chevron-down" size={22} color={color.text} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <T v="label" numberOfLines={1} style={{ color: paused ? color.warn : color.lime }}>{paused ? 'Paused' : name}</T>
          <T style={styles.clock} accessibilityLabel={`Elapsed ${fmtClock(elapsed)}`}>{fmtClock(elapsed)}</T>
        </View>
        <PressableScale style={styles.round} onPress={() => (paused ? actions.resumeWorkout() : actions.pauseWorkout())} accessibilityLabel={paused ? 'Resume workout' : 'Pause workout'}>
          <Ionicons name={paused ? 'play' : 'pause'} size={20} color={paused ? color.lime : color.text} />
        </PressableScale>
      </View>
      <View style={styles.progress}>
        <Bar progress={plannedSets ? doneSets / plannedSets : 0} tint={color.lime} height={6} />
        <T v="small">{doneSets} of {plannedSets} sets</T>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + 150, gap: space.md }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {resting && (
          <Animated.View entering={reduce ? undefined : FadeIn.duration(220)} style={[styles.card, styles.restCard]}>
            <RestRing endsAt={restEndsAt!} total={session.restTotalSec} now={now} label={fmtClock(restLeft)} />
            <View style={styles.restBtns}>
              <Pill label="−15 s" onPress={() => actions.adjustRest(-15)} accessibilityLabel="15 seconds less rest" />
              <Pill solid label="Skip rest" onPress={() => actions.clearRest()} />
              <Pill label="+15 s" onPress={() => actions.adjustRest(15)} accessibilityLabel="15 seconds more rest" />
            </View>
          </Animated.View>
        )}

        {showFlash && (
          <Animated.View entering={reduce ? undefined : ZoomIn.duration(240)} style={styles.flash} accessibilityLiveRegion="polite">
            <Ionicons name={showFlash.startsWith('New best') ? 'trophy' : 'flash'} size={16} color={color.limeInk} />
            <T style={styles.flashText}>{showFlash}</T>
          </Animated.View>
        )}

        {cur ? (
          <Animated.View key={cur.name} entering={reduce ? undefined : FadeInDown.duration(260)} style={[styles.card, styles.curCard]}>
            <View style={styles.between}>
              <T v="label" style={{ color: color.lime }}>{resting ? 'Up next' : 'Now'}</T>
              <T v="small">
                {setNo > cur.sets ? `Extra set ${setNo}` : `Set ${setNo} of ${cur.sets}`} · {cur.repLow}–{cur.repHigh}{timed ? ' s' : ' reps'}
              </T>
            </View>
            <T v="title" style={styles.curName}>{cur.name}</T>
            {(def || partnerNames.length > 0) && (
              <View style={styles.tags}>
                {partnerNames.length > 0 && (
                  <View style={[styles.tag, { backgroundColor: color.limeDim }]}>
                    <Ionicons name="link" size={11} color={color.lime} />
                    <T style={[styles.tagText, { color: color.lime }]}>Superset with {partnerNames.join(', ')}</T>
                  </View>
                )}
                {def?.primary.map((m) => <View key={m} style={styles.tag}><T style={styles.tagText}>{MUSCLE_LABEL[m]}</T></View>)}
              </View>
            )}

            <T v="small">
              {sug && sug.kind !== 'first'
                ? `Last time (${shortDate(sug.lastDate)}): ${sug.last.map((s) => setText(s, timed)).join(', ')}.${sug.kind === 'beat' && mine.length === 0 ? ` Try to beat ${Math.max(...sug.last.map((s) => s.reps))} ${timed ? 'seconds' : 'reps'} on your first set.` : ''}${sug.kind === 'harder' && mine.length === 0 ? ' Top of the range on every set, so slow the reps down or add load.' : ''}`
                : `First time logging this. Pick a weight you can move for ${cur.repLow}–${cur.repHigh} clean ${timed ? 'seconds' : 'reps'}.`}
            </T>

            {offer && (
              <View style={styles.offer}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Ionicons name="trending-up" size={18} color={color.lime} />
                  <T v="small" style={{ flex: 1, color: color.text }}>
                    You hit {cur.repHigh} reps on every set last time. Ready to move up to {fmtKg(offer.kg)} kg?
                  </T>
                </View>
                <View style={styles.rowWrap}>
                  <Pill small solid label={`Use ${fmtKg(offer.kg)} kg`} onPress={() => { setDraft({ kg: offer.kg, reps: offer.reps }); haptic.success(); }} />
                  <Pill small label={`Stay at ${fmtKg(draft.kg)} kg`} onPress={() => setDeclined([...declined, cur.name])} />
                </View>
              </View>
            )}

            <View style={styles.steppers}>
              {!timed && (
                <Stepper big editable label="Weight" unit="kg" value={draft.kg} step={cur.stepKg > 0 ? cur.stepKg : 2.5} min={0} max={600} format={fmtKg} onChange={(kg) => setDraft({ kg })} />
              )}
              <Stepper big editable label={timed ? 'Seconds' : 'Reps'} value={draft.reps} step={timed ? 5 : 1} min={0} max={timed ? 900 : 100} onChange={(reps) => setDraft({ reps })} />
            </View>

            {mine.length > 0 && (
              <View style={{ gap: 6 }}>
                <View style={styles.rowWrap}>
                  {mine.map((s, i) => {
                    const pr = isPR(s, Math.max(prevBest, ...mine.slice(0, i).map((x) => e1rm(x.kg, x.reps))));
                    return (
                      <PressableScale key={s.id} onLongPress={() => actions.removeSet(s.id, date)} style={[styles.set, pr && styles.setPR]} accessibilityLabel={`Set ${i + 1}: ${setText(s, timed)}. Long press to delete.`}>
                        <T style={styles.setIdx}>{i + 1}</T>
                        <T style={styles.setVal}>{setText(s, timed)}</T>
                        {pr && <T style={styles.prTag}>PR</T>}
                      </PressableScale>
                    );
                  })}
                </View>
                <T v="small" style={{ color: color.text3 }}>Long-press a set to delete it.</T>
              </View>
            )}

            <View style={styles.rowWrap}>
              {def && <Mini icon="book-outline" label="How to" onPress={() => router.push({ pathname: '/exercise', params: { name: cur.name } })} />}
              <Mini icon="swap-horizontal" label="Replace" onPress={() => setPicker({ mode: 'replace', index: idx! })} />
              <Mini icon="play-skip-forward" label="Skip exercise" onPress={() => { actions.toggleSkip(cur.name); setFocus(null); }} />
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={reduce ? undefined : FadeInDown.duration(260)} style={[styles.card, styles.curCard, { alignItems: 'center' }]}>
            <View style={styles.check}><Ionicons name="checkmark" size={30} color={color.limeInk} /></View>
            <T v="title">{ex.length ? 'Every set done' : 'Free workout'}</T>
            <T v="small" style={{ textAlign: 'center' }}>
              {ex.length ? 'Finish below, or tap any exercise to add an extra set.' : 'Add your first exercise to get going.'}
            </T>
          </Animated.View>
        )}

        {ex.length > 0 && (
          <View style={styles.card}>
            <T v="label">This session</T>
            {ex.map((e, i) => {
              const n = count(e.name);
              const skipped = session.skipped.includes(e.name);
              const done = !skipped && n >= e.sets;
              const on = i === idx;
              const linked = e.superset != null && ex[i + 1]?.superset === e.superset;
              return (
                <Animated.View key={e.name} layout={reduce ? undefined : LinearTransition.duration(200)}>
                  <PressableScale scaleTo={0.985} onPress={() => jump(i)} style={[styles.row, on && styles.rowOn]} accessibilityLabel={`${e.name}, ${skipped ? 'skipped, tap to bring back' : `${n} of ${e.sets} sets`}`} accessibilityState={{ selected: on }}>
                    <View style={[styles.badge, done && { backgroundColor: color.lime }]}>
                      {done ? <Ionicons name="checkmark" size={16} color={color.limeInk} /> : skipped ? <Ionicons name="play-skip-forward" size={14} color={color.text3} /> : <T style={styles.badgeText}>{n}/{e.sets}</T>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <T v="bodyMed" numberOfLines={1} style={skipped ? { color: color.text3, textDecorationLine: 'line-through' } : undefined}>{e.name}</T>
                      <T v="small">{skipped ? 'Skipped. Tap to bring it back.' : `${e.sets} × ${e.repLow}–${e.repHigh}${isTimed(e.name) ? ' s' : ''} · rest ${fmtClock(e.restSec)}`}</T>
                    </View>
                    {on && <Ionicons name="radio-button-on" size={16} color={color.lime} />}
                  </PressableScale>
                  {linked && <View style={styles.linkBar} />}
                </Animated.View>
              );
            })}
          </View>
        )}

        <PressableScale style={styles.add} onPress={() => setPicker({ mode: 'add' })} accessibilityLabel="Add exercise to this workout">
          <Ionicons name="add" size={20} color={color.lime} />
          <T v="bodyMed" style={{ color: color.lime }}>Add exercise</T>
        </PressableScale>

        <View style={styles.card}>
          <T v="label">Notes</T>
          <TextInput
            value={days[date]?.notes ?? ''} onChangeText={(v) => actions.setNotes(v, date)} multiline placeholder="How did it feel? Anything to remember next time."
            placeholderTextColor={color.text3} style={styles.notes} accessibilityLabel="Workout notes"
          />
        </View>

        {confirm === 'discard' ? (
          <View style={styles.card}>
            <T v="small" style={{ color: color.text }}>Stop the timer without saving a session summary? Sets you logged stay in your log.</T>
            <View style={styles.rowWrap}>
              <Pill small label="Yes, stop it" onPress={() => { actions.discardWorkout(); leave(); }} />
              <Pill small solid label="Keep going" onPress={() => setConfirm(null)} />
            </View>
          </View>
        ) : (
          <T v="small" onPress={() => setConfirm('discard')} style={styles.discard} accessibilityRole="button">Cancel this workout</T>
        )}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.md }]}>
        {confirm === 'finish' ? (
          <View style={{ gap: space.sm }}>
            <T v="small" style={{ color: color.text, textAlign: 'center' }}>{left} set{left === 1 ? '' : 's'} left. Finish anyway?</T>
            <View style={styles.bottomRow}>
              <PressableScale style={[styles.cta, styles.ctaGhost]} onPress={() => setConfirm(null)}><T style={[styles.ctaText, { color: color.text }]}>Keep going</T></PressableScale>
              <PressableScale style={styles.cta} onPress={finish}><T style={styles.ctaText}>Finish</T></PressableScale>
            </View>
          </View>
        ) : (
          <View style={styles.bottomRow}>
            {cur && (
              <PressableScale style={[styles.cta, styles.ctaGhost, styles.ctaSide]} onPress={() => (left > 0 ? setConfirm('finish') : finish())} accessibilityLabel="Finish workout">
                <T style={[styles.ctaText, { color: color.text }]}>Finish</T>
              </PressableScale>
            )}
            {cur ? (
              <PressableScale style={[styles.cta, draft.reps <= 0 && { opacity: 0.4 }]} onPress={complete} accessibilityLabel={`Complete set ${setNo} of ${cur.name}`}>
                <T style={styles.ctaText}>{timed ? `Log ${draft.reps} s` : `Log ${draft.kg > 0 ? `${fmtKg(draft.kg)} kg × ` : ''}${draft.reps}${draft.kg > 0 ? '' : ' reps'}`}</T>
              </PressableScale>
            ) : (
              <PressableScale style={styles.cta} onPress={finish} accessibilityLabel="Finish workout">
                <T style={styles.ctaText}>Finish workout</T>
              </PressableScale>
            )}
          </View>
        )}
      </View>

      <ExercisePicker
        visible={!!picker}
        onClose={() => setPicker(null)}
        replaceFor={picker?.mode === 'replace' ? ex[picker.index]?.name : undefined}
        exclude={ex.map((e) => e.name)}
        onPick={(d) => {
          if (!picker) return;
          const fresh = plannedFrom(d, goal, experience);
          if (picker.mode === 'add') { actions.addToSession(fresh); setFocus(ex.length); }
          else {
            // Today only. The weekly plan keeps the original exercise.
            const old = ex[picker.index];
            actions.swapInSession(picker.index, { ...old, name: d.name, stepKg: fresh.stepKg, targetKg: undefined });
            setFocus(picker.index);
          }
          haptic.success();
        }}
      />
    </View>
  );
}

function Mini({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={styles.mini} accessibilityLabel={label}>
      <Ionicons name={icon} size={15} color={color.text2} />
      <T style={styles.miniText}>{label}</T>
    </PressableScale>
  );
}

const ACircle = Animated.createAnimatedComponent(Circle);
const RING = 196, STROKE = 12, R = (RING - STROKE) / 2, C = 2 * Math.PI * R;

/** Countdown ring. Drains smoothly from the end time, or in steps when motion is reduced. */
function RestRing({ endsAt, total, now, label }: { endsAt: number; total: number; now: number; label: string }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(1);
  useEffect(() => {
    const leftMs = Math.max(0, endsAt - Date.now());
    p.value = total > 0 ? Math.min(1, leftMs / (total * 1000)) : 0;
    if (!reduce) p.value = withTiming(0, { duration: leftMs, easing: Easing.linear });
  }, [endsAt, total, reduce]);
  useEffect(() => {
    if (reduce) p.value = total > 0 ? Math.min(1, Math.max(0, endsAt - now) / (total * 1000)) : 0;
  }, [now, reduce]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - p.value) }));
  return (
    <View style={{ width: RING, height: RING }} accessibilityRole="timer" accessibilityLabel={`Rest, ${label} left`}>
      <Svg width={RING} height={RING} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={RING / 2} cy={RING / 2} r={R} stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} fill="none" />
        <ACircle cx={RING / 2} cy={RING / 2} r={R} stroke={color.lime} strokeWidth={STROKE} fill="none" strokeLinecap="round" strokeDasharray={`${C} ${C}`} animatedProps={props} />
      </Svg>
      <View style={styles.ringCenter}>
        <T v="label">Rest</T>
        <T style={styles.ringClock}>{label}</T>
      </View>
    </View>
  );
}

// ---------------- finished ----------------
function Done({ f }: { f: Finished }) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const notes = useApp((s) => s.days[f.date]?.notes ?? '');
  const { sum } = f;
  return (
    <View style={styles.root}>
      <Aurora />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.xxl, paddingHorizontal: space.lg, paddingBottom: insets.bottom + 120, gap: space.md }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: space.sm, marginBottom: space.sm }}>
          <View style={styles.burstBox}>
            {!reduce && Array.from({ length: 14 }, (_, i) => <Spark key={i} i={i} n={14} />)}
            <Animated.View entering={reduce ? undefined : ZoomIn.springify().damping(12)} style={styles.bigCheck}>
              <Ionicons name="checkmark" size={44} color={color.limeInk} />
            </Animated.View>
          </View>
          <T v="label" style={{ color: color.lime }}>{longDate(f.date)}</T>
          <T v="title" style={{ fontSize: 40, lineHeight: 42, textAlign: 'center' }}>Workout complete</T>
          <T v="small">{f.name}</T>
        </View>

        <View style={styles.stats}>
          <Stat label="Time" text={fmtClock(f.durationSec)} />
          <Stat label="Sets" value={sum.sets} suffix={sum.plannedSets ? ` / ${sum.plannedSets}` : ''} />
          <Stat label="Volume" value={sum.volumeKg} suffix=" kg" />
          <Stat label="Reps" value={sum.reps} />
        </View>

        {sum.prs.length > 0 && (
          <View style={[styles.card, { borderColor: 'rgba(200,255,80,0.4)' }]}>
            <T v="label" style={{ color: color.lime }}>Personal bests</T>
            {sum.prs.map((p) => (
              <View key={p.ex} style={styles.between}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons name="trophy" size={16} color={color.lime} />
                  <T v="bodyMed" numberOfLines={1} style={{ flex: 1 }}>{p.ex}</T>
                </View>
                <T style={styles.setVal}>{p.kg > 0 ? `${fmtKg(p.kg)} × ${p.reps}` : `${p.reps}`}</T>
              </View>
            ))}
          </View>
        )}

        {f.skipped.length > 0 && (
          <View style={styles.card}>
            <T v="label">Skipped today</T>
            <T v="small">{f.skipped.join(', ')}</T>
          </View>
        )}

        {sum.sets === 0 && (
          <View style={styles.card}><T v="small">No sets were logged, so nothing was added to your history.</T></View>
        )}

        <View style={styles.card}>
          <T v="label">Notes</T>
          <TextInput
            value={notes} onChangeText={(v) => actions.setNotes(v, f.date)} multiline placeholder="How did it feel? Anything to remember next time."
            placeholderTextColor={color.text3} style={styles.notes} accessibilityLabel="Workout notes"
          />
        </View>
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.md }]}>
        <View style={styles.bottomRow}>
          <PressableScale style={styles.cta} onPress={leave}><T style={styles.ctaText}>Done</T></PressableScale>
        </View>
      </View>
    </View>
  );
}

function Stat({ label, value, text, suffix = '' }: { label: string; value?: number; text?: string; suffix?: string }) {
  return (
    <View style={styles.stat}>
      <T v="label">{label}</T>
      {text != null ? <T style={styles.statNum}>{text}</T> : <CountUp value={value ?? 0} format={(n) => `${Math.round(n).toLocaleString()}${suffix}`} style={styles.statNum} />}
    </View>
  );
}

/** One lime fleck of the finish burst. */
function Spark({ i, n }: { i: number; n: number }) {
  const t = useSharedValue(0);
  useEffect(() => { t.value = withDelay(120, withTiming(1, { duration: 900 + (i % 3) * 140, easing: Easing.out(Easing.cubic) })); }, []);
  const a = (i / n) * Math.PI * 2;
  const d = 78 + (i % 4) * 16;
  const st = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1 - t.value,
    transform: [{ translateX: Math.cos(a) * d * t.value }, { translateY: Math.sin(a) * d * t.value }, { scale: 1 - t.value * 0.5 }],
  }));
  return <Animated.View style={[styles.spark, i % 3 === 0 && { backgroundColor: color.text }, st]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.sm },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  clock: { fontFamily: font.display, fontSize: 38, lineHeight: 40, color: color.text, fontVariant: ['tabular-nums'] },
  progress: { paddingHorizontal: space.lg, gap: 6 },
  card: { padding: space.lg, borderRadius: radius.lg, backgroundColor: color.card, gap: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  curCard: { borderColor: 'rgba(200,255,80,0.35)' },
  curName: { fontSize: 34, lineHeight: 36, marginTop: -6 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 26, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.06)' },
  tagText: { fontFamily: font.bodySemi, fontSize: 11.5, color: color.text2 },
  offer: { gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: color.limeDim },
  steppers: { gap: space.md },
  set: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 38, borderRadius: radius.pill,
    backgroundColor: color.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  setPR: { borderColor: color.lime, backgroundColor: color.limeDim },
  setIdx: { fontFamily: font.bodySemi, fontSize: 11, color: color.text3 },
  setVal: { fontFamily: font.display, fontSize: 18, color: color.text },
  prTag: { fontFamily: font.bodySemi, fontSize: 10, color: color.lime, letterSpacing: 0.8 },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.05)' },
  miniText: { fontFamily: font.bodySemi, fontSize: 12.5, color: color.text2 },
  restCard: { alignItems: 'center', borderColor: 'rgba(200,255,80,0.35)' },
  restBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringClock: { fontFamily: font.display, fontSize: 62, lineHeight: 64, color: color.text, fontVariant: ['tabular-nums'] },
  flash: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: radius.pill, backgroundColor: color.lime },
  flashText: { fontFamily: font.bodySemi, fontSize: 13, color: color.limeInk },
  check: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: color.lime },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: 10, borderRadius: radius.md },
  rowOn: { backgroundColor: 'rgba(200,255,80,0.08)' },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  badgeText: { fontFamily: font.displaySemi, fontSize: 14, color: color.text },
  linkBar: { width: 2, height: 10, marginLeft: 27, marginVertical: -4, backgroundColor: color.lime, borderRadius: 1 },
  add: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 54, borderRadius: radius.lg,
    borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(200,255,80,0.4)',
  },
  notes: { minHeight: 64, color: color.text, fontFamily: font.body, fontSize: 15, lineHeight: 21, padding: 0, textAlignVertical: 'top' },
  discard: { textAlign: 'center', paddingVertical: space.md, color: color.text3 },
  bottom: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md,
    backgroundColor: 'rgba(13,16,16,0.94)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.lineStrong,
  },
  bottomRow: { flexDirection: 'row', gap: space.sm },
  cta: { flex: 1, height: 58, borderRadius: radius.pill, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  ctaGhost: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  ctaSide: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', paddingHorizontal: 24 },
  ctaText: { fontFamily: font.display, fontSize: 22, letterSpacing: 0.8, textTransform: 'uppercase', color: color.limeInk },
  burstBox: { width: 200, height: 130, alignItems: 'center', justifyContent: 'center' },
  bigCheck: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: color.lime },
  spark: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: color.lime },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  stat: { flexGrow: 1, flexBasis: '45%', padding: space.lg, borderRadius: radius.lg, backgroundColor: color.card, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  statNum: { fontFamily: font.display, fontSize: 36, lineHeight: 38, color: color.text },
});
