import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from '@/components/ui/Aurora';
import { Bar } from '@/components/ui/Bar';
import { Choice, Field } from '@/components/ui/Field';
import { PressableScale } from '@/components/ui/PressableScale';
import { T } from '@/components/ui/T';
import { DOW_LONG, DOW_SHORT } from '@/domain/dates';
import { CHALLENGE_PRESETS, newCreatineProduct, newProteinProduct } from '@/domain/defaults';
import { EXERCISES } from '@/domain/exercises';
import { FOCUS_LABEL, generatePlan, recoveryConflicts, suggestedWeek } from '@/domain/planner';
import { sessionMinutes } from '@/domain/progression';
import { baseTargets, GOALS, waterBaseMl } from '@/domain/targets';
import type {
  Diet, EquipmentId, Experience, Focus, Goal, Profile, Sex, StepsBand, SupplementProduct, Units,
} from '@/domain/types';
import { MUSCLE_LABEL } from '@/domain/exercises';
import { haptic } from '@/hooks/haptics';
import { actions } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

const STEPS = ['Goal', 'About you', 'Training', 'Your week', 'Preferences', 'Nutrition', 'Ready'] as const;
const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];
const FOCI: Focus[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'abs', 'cardio', 'full_body'];
const EQUIP: { value: EquipmentId; label: string }[] = [
  { value: 'dumbbell', label: 'Dumbbells' }, { value: 'barbell', label: 'Barbell' }, { value: 'bench', label: 'Bench' },
  { value: 'band', label: 'Bands' }, { value: 'kettlebell', label: 'Kettlebell' }, { value: 'cable', label: 'Cables' }, { value: 'machine', label: 'Machines' },
];
const num = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')));

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [units, setUnits] = useState<Units>('metric');
  const [f, setF] = useState({ name: '', age: '', h1: '', h2: '', w: '', tw: '' });
  const [sex, setSex] = useState<Sex>('male');
  const [days, setDays] = useState(4);
  const [week, setWeek] = useState<Record<number, Focus[]>>(suggestedWeek(4));
  const [experience, setExperience] = useState<Experience>('beginner');
  const [location, setLocation] = useState<'gym' | 'home'>('gym');
  const [equipment, setEquipment] = useState<EquipmentId[]>(['dumbbell']);
  const [sessionMin, setSessionMin] = useState(60);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [prefer, setPrefer] = useState<string[]>([]);
  const [limitations, setLimitations] = useState('');
  const [challenges, setChallenges] = useState<string[]>(['Push-ups']);
  const [diet, setDiet] = useState<Diet>('none');
  const [steps, setSteps] = useState<StepsBand>('mid');
  const [meals, setMeals] = useState(3);
  const [useProtein, setUseProtein] = useState(false);
  const [scoopProtein, setScoopProtein] = useState('24');
  const [useCreatine, setUseCreatine] = useState(false);
  const [creatineG, setCreatineG] = useState('');

  // Inputs are typed in the chosen units and stored in metric.
  const heightCm = units === 'metric' ? num(f.h1) : (num(f.h1) * 12 + (num(f.h2) || 0)) * 2.54;
  const weightKg = units === 'metric' ? num(f.w) : num(f.w) * 0.4536;
  const targetKg = f.tw ? (units === 'metric' ? num(f.tw) : num(f.tw) * 0.4536) : undefined;
  const age = num(f.age);
  const bodyOk = age >= 13 && age <= 100 && heightCm >= 120 && heightCm <= 230 && weightKg >= 30 && weightKg <= 250;

  const profile: Profile | null = goal && bodyOk ? {
    name: f.name.trim() || undefined, age, heightCm: Math.round(heightCm * 10) / 10, weightKg: Math.round(weightKg * 10) / 10,
    targetWeightKg: targetKg ? Math.round(targetKg * 10) / 10 : undefined, sex, units, goal,
    trainingDaysPerWeek: Object.values(week).filter((x) => x.length).length || days, steps, climate: 'temperate',
  } : null;
  const training = { week, sessionMin, location, equipment, experience, prefer, avoid, limitations };
  const plan = useMemo(() => (goal ? generatePlan(training, goal) : []), [goal, JSON.stringify(training)]);
  const conflicts = useMemo(() => recoveryConflicts(plan), [plan]);

  const canNext = [!!goal, bodyOk, true, Object.values(week).some((x) => x.length), true, !useCreatine || num(creatineG) > 0, true][step];

  const pickDays = (n: number) => { setDays(n); setWeek(suggestedWeek(n)); };
  const toggleFocus = (d: number, fc: Focus) => {
    const cur = week[d] ?? [];
    const next = cur.includes(fc) ? cur.filter((x) => x !== fc) : fc === 'full_body' || fc === 'cardio' ? [fc] : [...cur.filter((x) => x !== 'full_body' && x !== 'cardio'), fc];
    const w = { ...week, [d]: next };
    if (!next.length) delete w[d];
    setWeek(w);
  };
  const toggle = <T,>(list: T[], v: T, setter: (x: T[]) => void) => setter(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const finish = () => {
    if (!profile || !goal) return;
    const products: SupplementProduct[] = [];
    if (useProtein) products.push({ ...newProteinProduct('protein'), proteinG: num(scoopProtein) || 24 });
    if (useCreatine) { const g = num(creatineG); products.push({ ...newCreatineProduct('creatine'), dailyTarget: g, scoopG: g, quick: [...new Set([1, Math.round(g / 2 * 2) / 2, g])].filter((x) => x > 0).sort((a, b) => a - b) }); }
    const scale = experience === 'beginner' ? 0.5 : experience === 'advanced' ? 2 : 1;
    actions.completeOnboarding({
      profile, plan, products,
      training: { ...training },
      nutrition: { diet, mealsPerDay: meals, useProtein, useCreatine },
      challenges: CHALLENGE_PRESETS.filter((c) => challenges.includes(c.name)).map((c) => ({
        ...c, id: c.name.toLowerCase().replace(/[^a-z]/g, ''), target: c.unit === 'steps' ? c.target : Math.max(5, Math.round((c.target * scale) / 5) * 5),
      })),
    });
    haptic.success();
    router.replace('/');
  };

  const next = () => { if (!canNext) return; haptic.tap(); step === STEPS.length - 1 ? finish() : setStep(step + 1); };
  const t = profile ? baseTargets(profile) : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora />
      <View style={[styles.top, { paddingTop: insets.top + space.md }]}>
        <PressableScale style={styles.back} onPress={() => (step ? setStep(step - 1) : router.back())} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={color.text} />
        </PressableScale>
        <View style={{ flex: 1, gap: 6 }}>
          <T v="label">Step {step + 1} of {STEPS.length} · {STEPS[step]}</T>
          <Bar progress={(step + 1) / STEPS.length} tint={color.lime} height={5} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 140, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <Animated.View key={step} entering={reduce ? undefined : FadeInRight.springify().damping(18)} exiting={reduce ? undefined : FadeOutLeft.duration(150)} style={{ gap: space.lg }}>
          {step === 0 && (
            <>
              <Title t="What are you training for?" s="Pick the closest one. You can change it any time." />
              <View style={styles.grid2}>
                {GOALS.map((g) => (
                  <Option key={g.id} on={goal === g.id} onPress={() => setGoal(g.id)} title={g.label} sub={g.blurb} />
                ))}
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <Title t="About you" s="Used only to estimate your calories, protein and water. It stays on your phone." />
              <Choice label="Units" value={units} onChange={setUnits} options={[{ value: 'metric', label: 'kg · cm' }, { value: 'imperial', label: 'lb · ft' }]} />
              <View style={styles.row}>
                <Field label="Name (optional)" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} autoCapitalize="words" />
                <Field label="Age" value={f.age} onChangeText={(v) => setF({ ...f, age: v })} keyboardType="number-pad" />
              </View>
              <Choice label="Sex (for the calorie formula)" value={sex} onChange={setSex} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
              <View style={styles.row}>
                {units === 'metric' ? (
                  <Field label="Height" suffix="cm" value={f.h1} onChangeText={(v) => setF({ ...f, h1: v })} keyboardType="decimal-pad" />
                ) : (
                  <>
                    <Field label="Height" suffix="ft" value={f.h1} onChangeText={(v) => setF({ ...f, h1: v })} keyboardType="number-pad" />
                    <Field label=" " suffix="in" value={f.h2} onChangeText={(v) => setF({ ...f, h2: v })} keyboardType="number-pad" />
                  </>
                )}
              </View>
              <View style={styles.row}>
                <Field label="Weight" suffix={units === 'metric' ? 'kg' : 'lb'} value={f.w} onChangeText={(v) => setF({ ...f, w: v })} keyboardType="decimal-pad" />
                <Field label="Target (optional)" suffix={units === 'metric' ? 'kg' : 'lb'} value={f.tw} onChangeText={(v) => setF({ ...f, tw: v })} keyboardType="decimal-pad" />
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Title t="How do you train?" s="This shapes the plan we build for you. Everything stays editable." />
              <Choice label="Days per week" value={days} onChange={pickDays} options={[1, 2, 3, 4, 5, 6, 7].map((d) => ({ value: d, label: String(d) }))} />
              <Choice label="Experience" value={experience} onChange={setExperience} options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }]} />
              <Choice label="Where" value={location} onChange={setLocation} options={[{ value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }]} />
              {location === 'home' && (
                <Multi label="Equipment you have" options={EQUIP} values={equipment} onToggle={(v) => toggle(equipment, v, setEquipment)} />
              )}
              <Choice label="Time per session" value={sessionMin} onChange={setSessionMin} options={[30, 45, 60, 75, 90, 120].map((m) => ({ value: m, label: `${m} min` }))} />
            </>
          )}

          {step === 3 && (
            <>
              <Title t="Your week" s="Tap muscle groups for each day. Days with nothing selected are rest days." />
              {MON_FIRST.map((d) => (
                <View key={d} style={styles.dayCard}>
                  <View style={styles.between}>
                    <T v="h2">{DOW_LONG[d]}</T>
                    <T v="small">{week[d]?.length ? week[d].map((x) => FOCUS_LABEL[x]).join(' + ') : 'Rest'}</T>
                  </View>
                  <View style={styles.chips}>
                    {FOCI.map((fc) => {
                      const on = week[d]?.includes(fc);
                      return (
                        <PressableScale key={fc} onPress={() => toggleFocus(d, fc)} style={[styles.chip, on && styles.chipOn]} accessibilityState={{ selected: !!on }} accessibilityLabel={`${DOW_LONG[d]} ${FOCUS_LABEL[fc]}`}>
                          <T style={[styles.chipText, on && { color: color.limeInk }]}>{FOCUS_LABEL[fc]}</T>
                        </PressableScale>
                      );
                    })}
                  </View>
                </View>
              ))}
              {conflicts.map((c) => (
                <View key={`${c.dowA}`} style={styles.warn}>
                  <Ionicons name="warning-outline" size={18} color={color.warn} />
                  <T v="small" style={{ flex: 1, color: color.text }}>
                    {DOW_SHORT[c.dowA]} and {DOW_SHORT[c.dowB]} both train {c.muscles.map((m) => MUSCLE_LABEL[m].toLowerCase()).join(' and ')} hard. That leaves little time to recover. You can keep it, but a day between usually works better.
                  </T>
                </View>
              ))}
            </>
          )}

          {step === 4 && (
            <>
              <Title t="Preferences" s="Optional. Tap to mark exercises you love (★) or want to skip (✕)." />
              <View style={styles.chips}>
                {EXERCISES.map((e) => {
                  const st = prefer.includes(e.name) ? 'p' : avoid.includes(e.name) ? 'a' : null;
                  const cycle = () => {
                    if (st === null) setPrefer([...prefer, e.name]);
                    else if (st === 'p') { setPrefer(prefer.filter((x) => x !== e.name)); setAvoid([...avoid, e.name]); }
                    else setAvoid(avoid.filter((x) => x !== e.name));
                  };
                  return (
                    <PressableScale key={e.name} onPress={cycle} style={[styles.chip, st === 'p' && styles.chipOn, st === 'a' && styles.chipAvoid]} accessibilityLabel={`${e.name}: ${st === 'p' ? 'preferred' : st === 'a' ? 'avoided' : 'neutral'}`}>
                      <T style={[styles.chipText, st === 'p' && { color: color.limeInk }, st === 'a' && { color: color.danger, textDecorationLine: 'line-through' }]}>
                        {st === 'p' ? '★ ' : st === 'a' ? '✕ ' : ''}{e.name}
                      </T>
                    </PressableScale>
                  );
                })}
              </View>
              <View style={{ gap: 6 }}>
                <T v="label">Anything the planner should know? (injuries, limits)</T>
                <TextInput value={limitations} onChangeText={setLimitations} multiline placeholder="e.g. sore left shoulder, avoid overhead pressing" placeholderTextColor={color.text3} style={styles.area} />
                <T v="small">Liftbook isn’t medical advice. For pain or injuries, check with a professional.</T>
              </View>
              <Multi label="Daily challenges" options={CHALLENGE_PRESETS.map((c) => ({ value: c.name, label: c.name }))} values={challenges} onToggle={(v) => toggle(challenges, v, setChallenges)} />
            </>
          )}

          {step === 5 && (
            <>
              <Title t="Nutrition" s="Targets are estimates from your stats. You can override any of them later in Profile." />
              <Choice label="Diet" value={diet} onChange={setDiet} options={[{ value: 'none', label: 'No restrictions' }, { value: 'eggetarian', label: 'Eggetarian' }, { value: 'vegetarian', label: 'Vegetarian' }, { value: 'vegan', label: 'Vegan' }, { value: 'pescatarian', label: 'Pescatarian' }]} />
              <Choice label="Everyday activity (outside workouts)" value={steps} onChange={setSteps} options={[{ value: 'low', label: 'Under 6k steps' }, { value: 'mid', label: '6k–10k' }, { value: 'high', label: 'Over 10k' }]} />
              <Choice label="Meals per day" value={meals} onChange={setMeals} options={[2, 3, 4, 5, 6].map((m) => ({ value: m, label: String(m) }))} />
              <Toggle on={useProtein} onPress={() => setUseProtein(!useProtein)} title="I use protein powder" sub="Log scoops in one tap. They count toward protein and calories." />
              {useProtein && <Field label="Protein per scoop" suffix="g" value={scoopProtein} onChangeText={setScoopProtein} keyboardType="decimal-pad" />}
              <Toggle on={useCreatine} onPress={() => setUseCreatine(!useCreatine)} title="I take creatine" sub="Tracked separately. It never adds calories or protein." />
              {useCreatine && <Field label="Your usual daily amount" suffix="g" value={creatineG} onChangeText={setCreatineG} keyboardType="decimal-pad" placeholder="what you take" />}
              {t && profile && (
                <View style={styles.targets}>
                  {[['Calories', `${t.kcal.toLocaleString()}`], ['Protein', `${t.protein} g`], ['Carbs', `${t.carbs} g`], ['Fat', `${t.fat} g`], ['Water', `${(waterBaseMl(profile) / 1000).toFixed(1)} L+`]].map(([k, v]) => (
                    <View key={k} style={styles.target}><T v="label">{k}</T><T style={styles.targetNum}>{v}</T></View>
                  ))}
                </View>
              )}
            </>
          )}

          {step === 6 && (
            <>
              <Title t={profile?.name ? `You’re set, ${profile.name.split(' ')[0]}` : 'Your plan is ready'} s="Built from your answers. Edit any day, exercise, set or rep range from Train." />
              {plan.map((d) => (
                <View key={d.id} style={styles.dayCard}>
                  <View style={styles.between}>
                    <View>
                      <T v="label">{d.dow != null ? DOW_LONG[d.dow] : ''}</T>
                      <T v="h2" style={{ marginTop: 2 }}>{d.name}</T>
                    </View>
                    <T v="small">{d.exercises.length ? `≈ ${sessionMinutes(d.exercises)} min` : 'Cardio'}</T>
                  </View>
                  {d.exercises.map((e) => (
                    <View key={e.name} style={styles.between}>
                      <T v="bodyMed">{e.name}</T>
                      <T v="small">{e.sets} × {e.repLow}–{e.repHigh}</T>
                    </View>
                  ))}
                </View>
              ))}
            </>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <PressableScale style={[styles.cta, !canNext && { opacity: 0.35 }]} disabled={!canNext} onPress={next}>
          <T style={styles.ctaText}>{step === STEPS.length - 1 ? 'Let’s go' : 'Continue'}</T>
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

function Title({ t, s }: { t: string; s: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T style={styles.title}>{t}</T>
      <T v="small">{s}</T>
    </View>
  );
}

function Option({ on, onPress, title, sub }: { on: boolean; onPress: () => void; title: string; sub: string }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.option, on && styles.optionOn]}>
      <T style={[styles.optTitle, on && { color: color.limeInk }]}>{title}</T>
      <T v="small" style={on ? { color: 'rgba(13,16,16,0.7)' } : undefined}>{sub}</T>
    </PressableScale>
  );
}

function Toggle({ on, onPress, title, sub }: { on: boolean; onPress: () => void; title: string; sub: string }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }} style={[styles.toggle, on && { borderColor: color.lime }]}>
      <View style={{ flex: 1 }}>
        <T v="bodyMed">{title}</T>
        <T v="small">{sub}</T>
      </View>
      <View style={[styles.knobTrack, on && { backgroundColor: color.lime }]}>
        <View style={[styles.knob, on && { alignSelf: 'flex-end', backgroundColor: color.limeInk }]} />
      </View>
    </PressableScale>
  );
}

function Multi<V extends string>({ label, options, values, onToggle }: { label: string; options: { value: V; label: string }[]; values: V[]; onToggle: (v: V) => void }) {
  return (
    <View style={{ gap: space.sm }}>
      <T v="label">{label}</T>
      <View style={styles.chips}>
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <PressableScale key={o.value} onPress={() => onToggle(o.value)} accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
              <T style={[styles.chipText, on && { color: color.limeInk }]}>{o.label}</T>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.sm },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.card },
  title: { fontFamily: font.display, fontSize: 40, lineHeight: 42, color: color.text, textTransform: 'uppercase' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: {
    flexBasis: '47%', flexGrow: 1, minHeight: 92, padding: space.md, borderRadius: radius.lg, gap: 4, justifyContent: 'flex-end',
    backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  optionOn: { backgroundColor: color.lime, borderColor: color.lime },
  optTitle: { fontFamily: font.display, fontSize: 21, color: color.text, textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { flexDirection: 'row', gap: space.md },
  dayCard: { padding: space.md, borderRadius: radius.lg, backgroundColor: color.card, gap: space.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, minHeight: 34, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  chipOn: { backgroundColor: color.lime, borderColor: color.lime },
  chipAvoid: { borderColor: color.danger, backgroundColor: 'rgba(255,107,94,0.08)' },
  chipText: { fontFamily: font.bodySemi, fontSize: 13, color: color.text },
  warn: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: 'rgba(255,194,74,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,194,74,0.4)' },
  area: { minHeight: 80, padding: space.md, borderRadius: radius.sm, backgroundColor: color.bg2, color: color.text, fontFamily: font.body, fontSize: 15, textAlignVertical: 'top' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: color.card, borderWidth: 1, borderColor: color.lineStrong },
  knobTrack: { width: 50, height: 30, borderRadius: 15, padding: 3, backgroundColor: 'rgba(255,255,255,0.12)' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: color.text },
  targets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  target: { flexGrow: 1, flexBasis: '30%', padding: space.md, borderRadius: radius.md, backgroundColor: color.card, gap: 2 },
  targetNum: { fontFamily: font.display, fontSize: 24, color: color.text },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: 'rgba(13,16,16,0.92)' },
  cta: { height: 56, borderRadius: radius.pill, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: font.display, fontSize: 20, letterSpacing: 0.8, textTransform: 'uppercase', color: color.limeInk },
});
