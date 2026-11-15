import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AiCard } from '@/components/profile/AiCard';
import { DataCard } from '@/components/profile/DataCard';
import { InstallCard } from '@/components/profile/InstallCard';
import { SampleBanner } from '@/components/SampleBanner';
import { Card, CardHeader } from '@/components/ui/Card';
import { Choice, Field } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { CHALLENGE_PRESETS } from '@/domain/defaults';
import { baseTargets, GOALS, waterBaseMl } from '@/domain/targets';
import type { Goal, Profile, Sex, StepsBand, TargetOverrides } from '@/domain/types';
import { haptic } from '@/hooks/haptics';
import { actions, useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')));

export default function ProfileScreen() {
  const profile = useApp((s) => s.profile);
  const overrides = useApp((s) => s.overrides);
  const challenges = useApp((s) => s.challenges);
  const isSample = useApp((s) => s.isSample);

  const [f, setF] = useState({
    name: profile?.name ?? '', age: String(profile?.age ?? ''), height: String(profile?.heightCm ?? ''),
    weight: String(profile?.weightKg ?? ''), target: String(profile?.targetWeightKg ?? ''),
  });
  const [sex, setSex] = useState<Sex>(profile?.sex ?? 'male');
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'general');
  const [days, setDays] = useState(profile?.trainingDaysPerWeek ?? 4);
  const [steps, setSteps] = useState<StepsBand>(profile?.steps ?? 'mid');
  const [hot, setHot] = useState(profile?.climate === 'hot');
  const [ov, setOv] = useState({
    kcal: String(overrides.kcal ?? ''), p: String(overrides.proteinG ?? ''), c: String(overrides.carbsG ?? ''),
    f: String(overrides.fatG ?? ''), w: String(overrides.waterBaseMl ?? ''),
  });

  // Re-sync the form when the underlying profile changes (sample mode, import).
  useEffect(() => {
    setF({ name: profile?.name ?? '', age: String(profile?.age ?? ''), height: String(profile?.heightCm ?? ''), weight: String(profile?.weightKg ?? ''), target: String(profile?.targetWeightKg ?? '') });
    if (profile) { setSex(profile.sex); setGoal(profile.goal); setDays(profile.trainingDaysPerWeek); setSteps(profile.steps); setHot(profile.climate === 'hot'); }
    setOv({ kcal: String(overrides.kcal ?? ''), p: String(overrides.proteinG ?? ''), c: String(overrides.carbsG ?? ''), f: String(overrides.fatG ?? ''), w: String(overrides.waterBaseMl ?? '') });
  }, [profile, overrides]);

  const draft: Profile | null = (() => {
    const age = num(f.age), h = num(f.height), w = num(f.weight);
    if (!age || !h || !w || age < 13 || age > 100 || h < 120 || h > 230 || w < 30 || w > 250) return null;
    return {
      name: f.name.trim() || undefined, age, heightCm: h, weightKg: w, targetWeightKg: num(f.target), sex, units: 'metric',
      goal, trainingDaysPerWeek: days, steps, climate: hot ? 'hot' : 'temperate',
    };
  })();
  const draftOv: TargetOverrides = { kcal: num(ov.kcal), proteinG: num(ov.p), carbsG: num(ov.c), fatG: num(ov.f), waterBaseMl: num(ov.w) };
  const t = draft ? baseTargets(draft, draftOv) : null;

  const save = () => {
    if (!draft) return;
    actions.setProfile(draft);
    actions.setOverrides(draftOv);
    haptic.success();
  };

  return (
    <Screen eyebrow="Your setup" title="Profile">
      <SampleBanner />
      <Card index={0}>
        <CardHeader title="About you" />
        <View style={styles.grid}>
          <Field label="Name (optional)" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} autoCapitalize="words" style={{ flexBasis: '100%' }} />
          <Field label="Age" value={f.age} onChangeText={(v) => setF({ ...f, age: v })} keyboardType="number-pad" />
          <Field label="Height" suffix="cm" value={f.height} onChangeText={(v) => setF({ ...f, height: v })} keyboardType="decimal-pad" />
          <Field label="Weight" suffix="kg" value={f.weight} onChangeText={(v) => setF({ ...f, weight: v })} keyboardType="decimal-pad" />
          <Field label="Target weight" suffix="kg" value={f.target} onChangeText={(v) => setF({ ...f, target: v })} keyboardType="decimal-pad" placeholder="Optional" />
        </View>
        <View style={{ gap: space.lg, marginTop: space.lg }}>
          <Choice label="Sex (used for the calorie formula)" value={sex} onChange={setSex} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
          <Choice label="Training days per week" value={days} onChange={setDays} options={[1, 2, 3, 4, 5, 6, 7].map((d) => ({ value: d, label: String(d) }))} />
          <Choice label="Daily steps, outside workouts" value={steps} onChange={setSteps} options={[{ value: 'low', label: 'Under 6k' }, { value: 'mid', label: '6k–10k' }, { value: 'high', label: 'Over 10k' }]} />
          <Choice label="Climate" value={hot ? 'hot' : 'temperate'} onChange={(v) => setHot(v === 'hot')} options={[{ value: 'temperate', label: 'Temperate' }, { value: 'hot', label: 'Hot / humid' }]} />
        </View>
      </Card>

      <Card index={1}>
        <CardHeader title="Goal" />
        <View style={styles.goals}>
          {GOALS.map((g) => {
            const on = g.id === goal;
            return (
              <PressableScale key={g.id} onPress={() => setGoal(g.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.goal, on && styles.goalOn]}>
                <T style={[styles.goalTitle, on && { color: color.limeInk }]}>{g.label}</T>
                <T v="small" style={on ? { color: 'rgba(13,16,16,0.7)' } : undefined}>{g.blurb}</T>
              </PressableScale>
            );
          })}
        </View>
      </Card>

      <Card index={2}>
        <CardHeader title="Daily targets" right={<T v="small">Estimates · override any</T>} />
        {t ? (
          <>
            <View style={styles.grid}>
              <Field label="Calories" suffix="kcal" value={ov.kcal} placeholder={String(t.calculated.kcal)} onChangeText={(v) => setOv({ ...ov, kcal: v })} keyboardType="number-pad" />
              <Field label="Protein" suffix="g" value={ov.p} placeholder={String(t.calculated.protein)} onChangeText={(v) => setOv({ ...ov, p: v })} keyboardType="number-pad" />
              <Field label="Carbs" suffix="g" value={ov.c} placeholder={String(t.calculated.carbs)} onChangeText={(v) => setOv({ ...ov, c: v })} keyboardType="number-pad" />
              <Field label="Fat" suffix="g" value={ov.f} placeholder={String(t.calculated.fat)} onChangeText={(v) => setOv({ ...ov, f: v })} keyboardType="number-pad" />
              <Field label="Water, rest day" suffix="ml" value={ov.w} placeholder={String(draft ? waterBaseMl(draft) : '')} onChangeText={(v) => setOv({ ...ov, w: v })} keyboardType="number-pad" />
            </View>
            <T v="small" style={{ marginTop: space.md }}>
              Maintenance is about {t.tdee.toLocaleString()} kcal (Mifflin-St Jeor × activity). Leave a box empty to use the calculated value shown in grey. Sport you log adds to that day’s calories and water.
            </T>
          </>
        ) : (
          <T v="small">Fill in age, height and weight to see your targets.</T>
        )}
      </Card>

      <PressableScale style={[styles.cta, !draft && { opacity: 0.4 }]} disabled={!draft} onPress={save}>
        <T style={styles.ctaText}>{profile ? 'Save changes' : 'Create my profile'}</T>
      </PressableScale>

      {profile && (
        <Card index={3}>
          <CardHeader title="Daily challenges" />
          <View style={{ gap: space.md }}>
            {challenges.map((c) => (
              <View key={c.id} style={styles.chRow}>
                <T v="bodyMed" style={{ flex: 1 }}>{c.name}</T>
                <TextInput
                  defaultValue={String(c.target)} keyboardType="number-pad" style={styles.smallInput} accessibilityLabel={`${c.name} daily target`}
                  onEndEditing={(e) => { const v = Number(e.nativeEvent.text); if (v > 0) actions.setChallenges(challenges.map((x) => (x.id === c.id ? { ...x, target: v } : x))); }}
                />
                <T v="small">{c.unit}</T>
                <Pill small label="Remove" onPress={() => actions.setChallenges(challenges.filter((x) => x.id !== c.id))} />
              </View>
            ))}
            <View style={styles.wrap}>
              {CHALLENGE_PRESETS.filter((p) => !challenges.some((c) => c.name === p.name)).map((p) => (
                <Pill key={p.name} small label={`+ ${p.name}`} onPress={() => actions.setChallenges([...challenges, { ...p, id: p.name.toLowerCase().replace(/[^a-z]/g, '') }])} />
              ))}
            </View>
          </View>
        </Card>
      )}

      <AiCard index={4} />
      <DataCard index={5} />
      <InstallCard index={6} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  goals: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  goal: {
    flexBasis: '47%', flexGrow: 1, padding: space.md, borderRadius: radius.md, gap: 2,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  goalOn: { backgroundColor: color.lime, borderColor: color.lime },
  goalTitle: { fontFamily: font.display, fontSize: 19, color: color.text, textTransform: 'uppercase', letterSpacing: 0.4 },
  cta: { height: 56, borderRadius: radius.pill, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: font.display, fontSize: 20, letterSpacing: 0.8, textTransform: 'uppercase', color: color.limeInk },
  chRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallInput: {
    width: 72, height: 38, borderRadius: radius.sm, backgroundColor: color.bg2, color: color.text, textAlign: 'center',
    fontFamily: font.bodySemi, fontSize: 15,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
