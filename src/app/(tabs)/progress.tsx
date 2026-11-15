import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SampleBanner } from '@/components/SampleBanner';
import { Bar } from '@/components/ui/Bar';
import { BarChart } from '@/components/ui/BarChart';
import { Card, CardHeader } from '@/components/ui/Card';
import { Choice } from '@/components/ui/Field';
import { LineChart } from '@/components/ui/LineChart';
import { PhotoImage } from '@/components/photos/PhotoImage';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { buckets, challengeSeries, overview, personalBests, type Range } from '@/domain/analytics';
import { addDays, parseISO, shortDate, today } from '@/domain/dates';
import { findExercise, MUSCLE_LABEL } from '@/domain/exercises';
import { latestPhotos, poseLabel } from '@/domain/photos';
import { e1rm, fmtKg, sessionsFor } from '@/domain/progression';
import { baseTargets, waterBaseMl } from '@/domain/targets';
import type { MuscleGroup } from '@/domain/types';
import { useApp } from '@/store/store';
import { color, font, space } from '@/theme/tokens';

const RANGES: { value: Range; label: string }[] = [{ value: 7, label: '7 days' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }, { value: 365, label: '1 year' }];
const SPAN: Record<Range, string> = { 7: 'day', 30: 'week', 90: 'week', 365: 'month' };
const tonnes = (kg: number) => (kg >= 1000 ? `${Math.round(kg / 100) / 10} t` : `${Math.round(kg)} kg`);
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export default function Progress() {
  const [range, setRange] = useState<Range>(30);
  const days = useApp((s) => s.days);
  const profile = useApp((s) => s.profile);
  const overrides = useApp((s) => s.overrides);
  const products = useApp((s) => s.products);
  const challenges = useApp((s) => s.challenges);
  const photos = useApp((s) => s.photos);
  const isSample = useApp((s) => s.isSample);
  const end = today();
  const from = addDays(end, -range + 1);
  const inRange = useMemo(() => Object.keys(days).filter((d) => d >= from && d <= end).sort(), [days, from, end]);

  const t = profile ? baseTargets(profile, overrides) : null;
  const waterGoal = profile ? waterBaseMl(profile, overrides) : 0;
  const bk = useMemo(() => buckets(days, products, end, range), [days, products, end, range]);
  const ov = useMemo(() => overview(days, products, end, range, t?.protein ?? 0), [days, products, end, range, t?.protein]);
  const prs = useMemo(() => personalBests(days, from, end), [days, from, end]);

  const lifts = useMemo(() => {
    const c = new Map<string, number>();
    for (const d of Object.values(days)) for (const s of d.sets) c.set(s.ex, (c.get(s.ex) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [days]);
  const [lift, setLift] = useState<string | null>(null);
  const ex = lift && lifts.includes(lift) ? lift : lifts[0];
  const strength = ex
    ? sessionsFor(days, ex).filter((s) => s.date >= from).map((s) => {
        const best = s.sets.reduce((a, x) => (e1rm(x.kg, x.reps) > e1rm(a.kg, a.reps) ? x : a));
        return { x: parseISO(s.date).getTime(), y: Math.round(e1rm(best.kg, best.reps) * 10) / 10, label: `${shortDate(s.date)} · ${best.kg > 0 ? `${fmtKg(best.kg)} kg × ${best.reps}` : `${best.reps} reps`}` };
      })
    : [];
  const bw = inRange.filter((d) => days[d].bw).map((d) => ({ x: parseISO(d).getTime(), y: days[d].bw as number, label: shortDate(d) }));

  const muscleSets = new Map<MuscleGroup, number>();
  for (const d of inRange) for (const s of days[d].sets) for (const m of findExercise(s.ex)?.primary ?? []) muscleSets.set(m, (muscleSets.get(m) ?? 0) + 1);
  const muscles = [...muscleSets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxSets = Math.max(1, ...muscles.map((m) => m[1]));

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const challenge = challenges.find((c) => c.id === challengeId) ?? challenges[0];
  const habit = challenge ? challengeSeries(days, challenge.id, from, end).map((x) => ({ x: parseISO(x.date).getTime(), y: x.value, label: shortDate(x.date) })) : [];

  const dW = ov.workouts - ov.prev.workouts;
  const dV = ov.prev.volumeKg > 0 ? Math.round(((ov.volumeKg - ov.prev.volumeKg) / ov.prev.volumeKg) * 100) : null;
  const before = `the ${range === 365 ? 'year' : `${range} days`} before`;

  return (
    <Screen eyebrow="Your trends" title="Progress">
      <SampleBanner />
      <Choice options={RANGES} value={range} onChange={setRange} />

      <Card index={0} padded={false}>
        <View style={styles.kpis}>
          <Kpi label="Workouts" value={String(ov.workouts)} note={ov.prev.workouts > 0 ? (dW === 0 ? 'same as before' : `${signed(dW)} vs before`) : undefined} />
          <Kpi label="Volume" value={tonnes(ov.volumeKg)} note={dV == null ? undefined : dV === 0 ? 'same as before' : `${signed(dV)}% vs before`} />
          <Kpi label="Protein" value={ov.fedDays ? `${ov.proteinDays}/${ov.fedDays}` : '–'} note={ov.fedDays ? 'days at 90%+' : undefined} />
        </View>
      </Card>
      {ov.prev.workouts > 0 && <T v="small" style={{ marginTop: -4 }}>“Before” is {before}.</T>}

      <Card index={0}>
        <CardHeader title={`Training volume · per ${SPAN[range]}`} right={<T v="small">{ov.sets} sets</T>} />
        <BarChart bars={bk.map((b) => ({ label: b.label, title: b.title, value: b.volumeKg }))} format={tonnes} empty="Log a workout and the weight you moved shows up here." />
        <T v="small" style={{ marginTop: space.sm }}>Volume is weight × reps added up. Bodyweight and timed sets count as sets but add no volume.</T>
      </Card>

      <Card index={1}>
        <CardHeader title="Strength · est. 1RM" />
        {lifts.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: space.md }}>
            {lifts.map((n) => <Pill key={n} small label={n} solid={n === ex} onPress={() => setLift(n)} />)}
          </ScrollView>
        )}
        <LineChart points={strength} unit="kg" empty={lifts.length ? 'Train this lift on two different days in this range to see the trend.' : 'Log a few sets in Train and your strength lines appear here.'} />
        <T v="small" style={{ marginTop: space.sm }}>Estimated one-rep max from your best set each session: weight × (1 + reps ÷ 30).</T>
      </Card>

      <Card index={2}>
        <CardHeader title="Personal bests" right={<T v="small">{prs.length ? `${prs.length} lift${prs.length === 1 ? '' : 's'}` : ''}</T>} />
        {prs.length === 0 && <T v="small">No new bests in this range yet. Beat an earlier session on any lift and it lands here.</T>}
        {prs.slice(0, 6).map((p, i) => (
          <PressableScale key={p.ex} scaleTo={0.99} style={[styles.pr, i > 0 && styles.line]} onPress={() => router.push({ pathname: '/exercise', params: { name: p.ex } })} accessibilityLabel={`${p.ex}, new best on ${shortDate(p.date)}, open`}>
            <Ionicons name="trophy" size={16} color={color.lime} />
            <View style={{ flex: 1 }}>
              <T v="bodyMed" numberOfLines={1}>{p.ex}</T>
              <T v="small">{shortDate(p.date)} · est. 1RM up {fmtKg(p.gain)}{p.kg > 0 ? ' kg' : ''}</T>
            </View>
            <T style={styles.prNum}>{p.kg > 0 ? `${fmtKg(p.kg)} kg × ${p.reps}` : `${p.reps} reps`}</T>
          </PressableScale>
        ))}
        {prs.length > 6 && <T v="small" style={{ marginTop: space.sm }}>and {prs.length - 6} more.</T>}
      </Card>

      <Card index={3}>
        <CardHeader title={`Calories · average per ${SPAN[range]}`} right={<T v="small">{ov.kcal != null ? `Avg ${ov.kcal.toLocaleString()}` : ''}</T>} />
        <BarChart
          bars={bk.map((b) => ({ label: b.label, title: b.title, value: b.kcal }))} unit="kcal"
          target={t ? { value: t.kcal, label: `Target ${t.kcal.toLocaleString()}` } : undefined}
          empty="Log food on a few days to see how your intake tracks against your target."
        />
        <T v="small" style={{ marginTop: space.sm }}>Only days with food logged are averaged, so a day you forgot does not drag it down. Sport days have a higher target than the line shows.</T>
      </Card>

      <Card index={4}>
        <CardHeader title={`Protein · average per ${SPAN[range]}`} right={<T v="small">{ov.protein != null ? `Avg ${ov.protein} g` : ''}</T>} />
        <BarChart
          bars={bk.map((b) => ({ label: b.label, title: b.title, value: b.protein }))} unit="g" tint={color.protein}
          target={t ? { value: t.protein, label: `Target ${t.protein} g` } : undefined}
          empty="Protein from your logged food and protein powder shows here."
        />
      </Card>

      <Card index={5}>
        <CardHeader title="Bodyweight" right={<T v="small">{ov.weight ? `${signed(ov.weight.change)} kg` : ''}</T>} />
        <LineChart points={bw} tint={color.water} unit="kg" empty="Weigh in on a few mornings to see your trend." />
      </Card>

      <Card index={6}>
        <CardHeader title="Progress photos" right={photos.length > 0 ? <T v="small">{photos.length} on this phone</T> : undefined} />
        {isSample ? (
          <T v="small">The sample has no photos. Exit the sample to add your own.</T>
        ) : (
          <View style={{ gap: space.md }}>
            {photos.length === 0 ? (
              <T v="small">A photo every few weeks shows changes the scale misses. They stay on this phone and are never uploaded.</T>
            ) : (
              <View style={styles.photoRow}>
                {latestPhotos(photos, 3).map((p) => (
                  <PressableScale key={p.id} scaleTo={0.98} style={styles.photo} onPress={() => router.push('/photos')} accessibilityLabel={`${poseLabel(p.pose)} photo, ${shortDate(p.date)}, open photos`}>
                    <PhotoImage id={p.id} label={`${poseLabel(p.pose)} photo from ${shortDate(p.date)}`} style={StyleSheet.absoluteFill} compact />
                    <View style={styles.photoTag}><T style={styles.photoTagText}>{shortDate(p.date)}</T></View>
                  </PressableScale>
                ))}
              </View>
            )}
            <Pill label={photos.length === 0 ? 'Add your first photo' : 'Add or compare photos'} onPress={() => router.push('/photos')} style={{ alignSelf: 'flex-start' }} />
          </View>
        )}
      </Card>

      <Card index={7}>
        <CardHeader title={`Water · average per ${SPAN[range]}`} right={<T v="small">{ov.waterMl != null ? `Avg ${Math.round(ov.waterMl / 100) / 10} L` : ''}</T>} />
        <BarChart
          bars={bk.map((b) => ({ label: b.label, title: b.title, value: b.waterMl == null ? null : b.waterMl / 1000 }))} unit="L" tint={color.water}
          format={(n) => (Math.round(n * 100) / 100).toString()}
          target={waterGoal ? { value: waterGoal / 1000, label: `Base goal ${Math.round(waterGoal / 100) / 10} L` } : undefined}
          empty="Log water from Home and your daily average shows here."
        />
      </Card>

      <Card index={8}>
        <CardHeader title="Sets per muscle group" />
        {muscles.length === 0 && <T v="small">No workouts in this range yet.</T>}
        <View style={{ gap: 10 }}>
          {muscles.map(([m, n], i) => (
            <View key={m} style={{ gap: 4 }}>
              <View style={styles.between}><T v="bodyMed">{MUSCLE_LABEL[m]}</T><T v="small">{n} sets</T></View>
              <Bar progress={n / maxSets} tint={color.lime} height={6} delay={i * 60} />
            </View>
          ))}
        </View>
      </Card>

      <Card index={9}>
        <CardHeader title="Daily challenges" />
        {challenges.length === 0 ? (
          <T v="small">Add a daily challenge in Profile and its trend shows here.</T>
        ) : (
          <>
            {challenges.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: space.md }}>
                {challenges.map((c) => <Pill key={c.id} small label={c.name} solid={c.id === challenge?.id} onPress={() => setChallengeId(c.id)} />)}
              </ScrollView>
            )}
            <LineChart points={habit} tint={color.carbs} unit={challenge?.unit ?? ''} empty={`Log ${challenge?.name.toLowerCase() ?? 'it'} on two days in this range to see the trend.`} />
          </>
        )}
      </Card>
    </Screen>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.kpiCell}>
      <T v="label" numberOfLines={1}>{label}</T>
      <T style={styles.kpi} numberOfLines={1} adjustsFontSizeToFit>{value}</T>
      <T style={styles.kpiNote} numberOfLines={1}>{note ?? ' '}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  kpis: { flexDirection: 'row' },
  kpiCell: { flex: 1, minWidth: 0, paddingVertical: space.lg, paddingHorizontal: space.md, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: color.line, marginLeft: -StyleSheet.hairlineWidth },
  kpi: { fontFamily: font.display, fontSize: 36, lineHeight: 38, color: color.text, marginTop: 6, fontVariant: ['tabular-nums'] },
  kpiNote: { fontFamily: font.body, fontSize: 10.5, color: color.text2, marginTop: 2 },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  pr: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line },
  prNum: { fontFamily: font.display, fontSize: 20, color: color.text },
  photoRow: { flexDirection: 'row', gap: space.sm },
  photo: { width: '31.5%', aspectRatio: 3 / 4, borderRadius: 14, overflow: 'hidden', backgroundColor: color.bg2 },
  photoTag: { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 8, height: 22, borderRadius: 11, justifyContent: 'center', backgroundColor: 'rgba(13,16,16,0.72)' },
  photoTagText: { fontFamily: font.bodySemi, fontSize: 11, color: color.text },
});
