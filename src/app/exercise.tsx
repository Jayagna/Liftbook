// One exercise: which muscles it works (3D when enabled), how to do it, the user's own history, and swaps.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body3D, type MuscleTone } from '@/components/three/Body3D';
import { Aurora } from '@/components/ui/Aurora';
import { LineChart } from '@/components/ui/LineChart';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { T } from '@/components/ui/T';
import { DOW_SHORT, parseISO, shortDate } from '@/domain/dates';
import { guideFor } from '@/domain/exerciseGuides';
import { EQUIPMENT_LABEL, findExercise, MUSCLE_LABEL } from '@/domain/exercises';
import { alternatives, plannedFrom, prefsFromPlan } from '@/domain/planner';
import { e1rm, fmtKg, sessionsFor } from '@/domain/progression';
import type { MuscleGroup } from '@/domain/types';
import { haptic } from '@/hooks/haptics';
import { actions, useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

const BACK_SIDE: MuscleGroup[] = ['back', 'lats', 'traps', 'glutes', 'hamstrings', 'calves', 'rear_delts', 'triceps'];
const SECONDARY = '#5E7A2A';
const LEVEL = { beginner: 'Beginner friendly', intermediate: 'Intermediate', advanced: 'Advanced' };
const back = () => (router.canGoBack() ? router.back() : router.replace('/exercises'));

export default function Exercise() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ name?: string }>();
  const name = typeof params.name === 'string' ? params.name : '';
  // Subscribed so a custom exercise resolves after the store loads.
  useApp((s) => s.customExercises);
  const ex = findExercise(name);
  const use3d = useApp((s) => s.dashboard.visuals3d);
  const days = useApp((s) => s.days);
  const plan = useApp((s) => s.plan);
  const training = useApp((s) => s.training);
  const goal = useApp((s) => s.profile?.goal ?? 'general');
  const [view, setView] = useState<'front' | 'back'>(() => (ex && BACK_SIDE.includes(ex.primary[0]) ? 'back' : 'front'));
  const [sel, setSel] = useState<MuscleGroup | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const tone = useMemo(() => {
    const t: MuscleTone = {};
    ex?.secondary.forEach((m) => (t[m] = SECONDARY));
    ex?.primary.forEach((m) => (t[m] = color.lime));
    return t;
  }, [ex]);
  const sessions = useMemo(() => (ex ? sessionsFor(days, ex.name) : []), [days, ex]);

  if (!ex) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + space.xxl, paddingHorizontal: space.lg, gap: space.md }]}>
        <Aurora />
        <T v="title">Exercise not found</T>
        <T v="small">{name ? `“${name}” is not in the library.` : 'No exercise was chosen.'}</T>
        <Pill solid label="Open the library" onPress={() => router.replace('/exercises')} style={{ alignSelf: 'flex-start' }} />
      </View>
    );
  }

  const guide = guideFor(ex.name);
  const prefs = training ?? prefsFromPlan(plan);
  const swaps = alternatives(ex.name, prefs).slice(0, 4);
  const timed = /\(sec\)/.test(ex.name);
  const points = sessions.map((s) => {
    const best = s.sets.reduce((a, x) => (e1rm(x.kg, x.reps) > e1rm(a.kg, a.reps) ? x : a));
    return { x: parseISO(s.date).getTime(), y: Math.round(e1rm(best.kg, best.reps) * 10) / 10, label: `${shortDate(s.date)} · ${best.kg > 0 ? `${fmtKg(best.kg)} kg × ${best.reps}` : `${best.reps}${timed ? ' s' : ' reps'}`}` };
  });
  const allSets = sessions.flatMap((s) => s.sets.map((x) => ({ ...x, date: s.date })));
  const top = allSets.length ? allSets.reduce((a, x) => (e1rm(x.kg, x.reps) > e1rm(a.kg, a.reps) ? x : a)) : null;
  const last = sessions[sessions.length - 1];
  const weighted = allSets.some((x) => x.kg > 0);

  return (
    <View style={styles.root}>
      <Aurora />
      <View style={[styles.top, { paddingTop: insets.top + space.md }]}>
        <PressableScale style={styles.round} onPress={back} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={color.text} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <T v="label" style={{ color: color.lime }}>{ex.primary.map((m) => MUSCLE_LABEL[m]).join(' · ')}</T>
          <T v="title" numberOfLines={2}>{ex.name}</T>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + 40, gap: space.md }} showsVerticalScrollIndicator={false}>
        <View style={styles.tags}>
          <Tag label={ex.custom ? 'Your exercise' : LEVEL[ex.level]} />
          <Tag label={ex.compound ? 'Compound lift' : 'Isolation'} />
          {ex.equipment.map((k) => <Tag key={k} label={EQUIPMENT_LABEL[k]} />)}
        </View>

        <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
          {use3d && (
            <View>
              <Body3D tone={tone} selected={sel} onSelect={(m) => { setSel(m); if (m) setView(BACK_SIDE.includes(m) ? 'back' : 'front'); }} view={view} height={300} />
              <View style={styles.viewToggle}>
                <Pill small label={view === 'front' ? 'Show back' : 'Show front'} onPress={() => setView(view === 'front' ? 'back' : 'front')} />
              </View>
            </View>
          )}
          <View style={{ padding: space.lg, gap: space.md }}>
            <MuscleRow label="Main muscles" tint={color.lime} muscles={ex.primary} sel={sel} onSel={(m) => { setSel(m); setView(BACK_SIDE.includes(m) ? 'back' : 'front'); }} />
            {ex.secondary.length > 0 && <MuscleRow label="Also working" tint={SECONDARY} muscles={ex.secondary} sel={sel} onSel={(m) => { setSel(m); setView(BACK_SIDE.includes(m) ? 'back' : 'front'); }} />}
          </View>
        </View>

        {guide ? (
          <>
            <View style={styles.card}>
              <T v="h2">How to do it</T>
              {guide.steps.map((s, i) => (
                <View key={i} style={styles.step}>
                  <View style={styles.stepNum}><T style={styles.stepNumText}>{i + 1}</T></View>
                  <T style={{ flex: 1 }}>{s}</T>
                </View>
              ))}
            </View>
            <View style={styles.card}>
              <T v="h2">Keep in mind</T>
              {guide.cues.map((c, i) => (
                <View key={i} style={styles.step}>
                  <Ionicons name="checkmark-circle" size={18} color={color.lime} style={{ marginTop: 1 }} />
                  <T style={{ flex: 1 }}>{c}</T>
                </View>
              ))}
              <T v="label" style={{ marginTop: space.xs, color: color.warn }}>Avoid</T>
              {guide.avoid.map((c, i) => (
                <View key={i} style={styles.step}>
                  <Ionicons name="close-circle" size={18} color={color.warn} style={{ marginTop: 1 }} />
                  <T style={{ flex: 1 }}>{c}</T>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.card}>
            <T v="h2">How to do it</T>
            <T v="small">This is an exercise you added, so there are no written steps for it.</T>
          </View>
        )}

        <View style={styles.card}>
          <T v="h2">Your history</T>
          {sessions.length === 0 ? (
            <T v="small">You have not logged this one yet. Your best sets and trend will show here once you do.</T>
          ) : (
            <>
              <View style={styles.stats}>
                <Stat label="Sessions" value={String(sessions.length)} />
                <Stat label="Best set" value={top ? (top.kg > 0 ? `${fmtKg(top.kg)} × ${top.reps}` : `${top.reps}${timed ? ' s' : ''}`) : '–'} />
                <Stat label="Last time" value={shortDate(last.date)} />
              </View>
              <T v="small">Last session: {last.sets.map((x) => (x.kg > 0 ? `${fmtKg(x.kg)}×${x.reps}` : `${x.reps}${timed ? 's' : ''}`)).join(', ')}</T>
              {weighted && <LineChart points={points} unit="kg" height={150} empty="Log it on two different days to see the trend." />}
              {weighted && <T v="small" style={{ color: color.text3 }}>Estimated one-rep max from your best set each session.</T>}
            </>
          )}
        </View>

        {plan.length > 0 && (
          <View style={styles.card}>
            <T v="h2">Add to your week</T>
            <View style={styles.tags}>
              {plan.filter((d) => d.dow != null).map((d) => {
                const has = d.exercises.some((e) => e.name === ex.name);
                return (
                  <Pill
                    key={d.id} small solid={has} label={`${has ? '✓ ' : ''}${DOW_SHORT[d.dow!]} · ${d.name}`}
                    accessibilityLabel={has ? `Already in ${d.name}` : `Add to ${DOW_SHORT[d.dow!]}, ${d.name}`}
                    onPress={() => {
                      if (has) return;
                      actions.upsertPlanDay({ ...d, exercises: [...d.exercises, plannedFrom(ex, goal, prefs.experience)] });
                      setAdded(d.name); haptic.success();
                    }}
                  />
                );
              })}
            </View>
            {added && <T v="small" style={{ color: color.lime }}>Added to {added}. Change sets and reps in the plan editor.</T>}
          </View>
        )}

        {swaps.length > 0 && (
          <View style={styles.card}>
            <T v="h2">Try instead</T>
            <T v="small">Same main muscle, with equipment you have.</T>
            {swaps.map((s) => (
              <PressableScale key={s.name} scaleTo={0.99} style={styles.swap} onPress={() => router.push({ pathname: '/exercise', params: { name: s.name } })} accessibilityLabel={`${s.name}, open`}>
                <View style={{ flex: 1 }}>
                  <T v="bodyMed">{s.name}</T>
                  <T v="small">{s.equipment.map((k) => EQUIPMENT_LABEL[k]).join(' / ')}</T>
                </View>
                <Ionicons name="chevron-forward" size={16} color={color.text3} />
              </PressableScale>
            ))}
          </View>
        )}

        <T v="small" style={{ color: color.text3 }}>General technique guidance. Stop if something hurts sharply, and get advice from a qualified coach or clinician for injuries.</T>
      </ScrollView>
    </View>
  );
}

function Tag({ label }: { label: string }) {
  return <View style={styles.tag}><T style={styles.tagText}>{label}</T></View>;
}

function MuscleRow({ label, tint, muscles, sel, onSel }: { label: string; tint: string; muscles: MuscleGroup[]; sel: MuscleGroup | null; onSel: (m: MuscleGroup) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={[styles.swatch, { backgroundColor: tint }]} />
        <T v="label">{label}</T>
      </View>
      <View style={styles.tags}>
        {muscles.map((m) => <Pill key={m} small label={MUSCLE_LABEL[m]} onPress={() => onSel(m)} style={sel === m ? { borderColor: color.text, borderWidth: 1 } : undefined} />)}
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <T v="label">{label}</T>
      <T style={styles.statNum} numberOfLines={1}>{value}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.sm },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  card: { padding: space.lg, borderRadius: radius.lg, backgroundColor: color.card, gap: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, height: 26, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.06)' },
  tagText: { fontFamily: font.bodySemi, fontSize: 11.5, color: color.text2 },
  viewToggle: { position: 'absolute', right: 12, bottom: 8 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: color.limeDim },
  stepNumText: { fontFamily: font.displaySemi, fontSize: 14, color: color.lime },
  stats: { flexDirection: 'row', gap: space.md },
  statNum: { fontFamily: font.display, fontSize: 24, lineHeight: 26, color: color.text },
  swap: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line },
});
