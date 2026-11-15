import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { HydrationWidget, SupplementsWidget } from '@/components/dashboard/DailyWidgets';
import { WaterWeek } from '@/components/nutrition/WaterWeek';
import { SampleBanner } from '@/components/SampleBanner';
import { Welcome } from '@/components/Welcome';
import { Bar } from '@/components/ui/Bar';
import { Card, CardHeader } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Stepper } from '@/components/ui/Stepper';
import { T } from '@/components/ui/T';
import { addDays, longDate, today } from '@/domain/dates';
import { groupBySlot, requantify, SLOTS, type SlotGroup } from '@/domain/meals';
import type { ISODate, Meal, MealSlot } from '@/domain/types';
import { haptic } from '@/hooks/haptics';
import { useDaySummary } from '@/store/selectors';
import { actions, useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

const r1 = (n: number) => Math.round(n * 10) / 10;

export default function Nutrition() {
  const t = today();
  const [date, setDate] = useState<ISODate>(t);
  const s = useDaySummary(date);
  const yesterday = useApp((st) => st.days[addDays(date, -1)]?.meals);
  const [openMeal, setOpenMeal] = useState<string | null>(null);

  if (!s) return <Welcome />;
  const meals = s.day?.meals ?? [];
  const groups = groupBySlot(meals).filter((g) => g.slot || g.meals.length > 0);
  const left = Math.round(s.targets.kcal - s.totals.kcal);
  const macros = [
    { label: 'Protein', v: s.totals.p, t: s.targets.protein, tint: color.protein },
    { label: 'Carbs', v: s.totals.c, t: s.targets.carbs, tint: color.carbs },
    { label: 'Fat', v: s.totals.f, t: s.targets.fat, tint: color.fat },
  ];
  const add = (slot?: MealSlot) => router.push({ pathname: '/food', params: slot ? { date, slot } : { date } });

  return (
    <Screen
      eyebrow={date === t ? 'Today' : longDate(date)} title="Nutrition"
      right={(
        <View style={styles.nav}>
          <PressableScale style={styles.navBtn} onPress={() => { setDate(addDays(date, -1)); setOpenMeal(null); }} accessibilityLabel="Previous day">
            <Ionicons name="chevron-back" size={18} color={color.text} />
          </PressableScale>
          <PressableScale style={[styles.navBtn, date === t && { opacity: 0.35 }]} disabled={date === t} onPress={() => { setDate(addDays(date, 1)); setOpenMeal(null); }} accessibilityLabel="Next day">
            <Ionicons name="chevron-forward" size={18} color={color.text} />
          </PressableScale>
        </View>
      )}
    >
      <SampleBanner />
      <Card index={0} tint="rgba(200,255,80,0.05)">
        <CardHeader title="Calories" right={<T v="small">Targets are estimates</T>} />
        <View style={styles.kcalRow}>
          <View>
            <CountUp value={s.totals.kcal} style={styles.kcal} />
            <T v="small">of {s.targets.kcal.toLocaleString()} kcal{s.targets.sportExtra ? ` · includes +${s.targets.sportExtra} for sport` : ''}</T>
          </View>
          <View style={[styles.leftBox, left < 0 && { backgroundColor: 'rgba(255,194,74,0.12)' }]}>
            <T style={[styles.leftNum, left < 0 && { color: color.warn }]}>{Math.abs(left).toLocaleString()}</T>
            <T v="small">{left >= 0 ? 'left' : 'over'}</T>
          </View>
        </View>
        <Bar progress={s.targets.kcal ? s.totals.kcal / s.targets.kcal : 0} tint={color.lime} height={10} />
        <View style={styles.macros}>
          {macros.map((m, i) => (
            <View key={m.label} style={{ flex: 1, gap: 6 }}>
              <T v="label">{m.label}</T>
              <T style={styles.macroNum}>{Math.round(m.v)}<T style={styles.of}> / {m.t} g</T></T>
              <Bar progress={m.t ? m.v / m.t : 0} tint={m.tint} height={6} delay={120 + i * 80} />
            </View>
          ))}
        </View>
      </Card>

      <PressableScale style={styles.cta} onPress={() => add()} accessibilityLabel="Add food">
        <Ionicons name="add" size={22} color={color.limeInk} />
        <T style={styles.ctaText}>Add food</T>
      </PressableScale>

      {groups.map((g, i) => (
        <SlotCard
          key={g.label} g={g} index={i + 1} date={date} openMeal={openMeal} setOpenMeal={setOpenMeal} onAdd={() => add(g.slot)}
          yesterday={g.slot ? (yesterday ?? []).filter((m) => m.slot === g.slot) : []}
        />
      ))}

      <SupplementsWidget s={s} index={6} />
      <HydrationWidget s={s} index={7} />
      <WaterWeek date={date} index={8} />
    </Screen>
  );
}

function SlotCard({ g, index, date, openMeal, setOpenMeal, onAdd, yesterday }: {
  g: SlotGroup; index: number; date: ISODate; openMeal: string | null; setOpenMeal: (id: string | null) => void; onAdd: () => void; yesterday: Meal[];
}) {
  const reduce = useReducedMotion();
  const [naming, setNaming] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const empty = g.meals.length === 0;
  const save = () => {
    const name = (naming ?? '').trim();
    if (!name) return;
    actions.saveMeal(name, g.meals);
    setNaming(null); setSaved(true); haptic.success();
  };
  return (
    <Card index={index}>
      <View style={styles.slotHead}>
        <View style={{ flex: 1 }}>
          <T v="h2">{g.label}</T>
          <T v="small">{empty ? 'Nothing logged' : `${g.kcal.toLocaleString()} kcal · ${Math.round(g.p)} g protein`}</T>
        </View>
        {g.slot && (
          <PressableScale style={styles.plus} onPress={onAdd} accessibilityLabel={`Add food to ${g.label}`}>
            <Ionicons name="add" size={20} color={color.lime} />
          </PressableScale>
        )}
      </View>

      {g.meals.map((m) => {
        const open = openMeal === m.id;
        return (
          <Animated.View key={m.id} entering={reduce ? undefined : FadeInDown.springify().damping(18)} exiting={reduce ? undefined : FadeOut} layout={reduce ? undefined : LinearTransition} style={styles.meal}>
            <PressableScale scaleTo={0.99} onPress={() => setOpenMeal(open ? null : m.id)} style={styles.mealHead} accessibilityLabel={`${m.name}, ${Math.round(m.kcal)} calories, ${open ? 'collapse' : 'edit'}`}>
              <View style={{ flex: 1 }}>
                <T v="bodyMed" numberOfLines={open ? 3 : 1}>{m.qty !== 1 ? `${m.qty}× ` : ''}{m.name}</T>
                <T v="small">P {r1(m.p)} · C {r1(m.c)} · F {r1(m.f)}{m.source === 'ai' ? ' · AI estimate' : ''}</T>
              </View>
              <T style={styles.mealKcal}>{Math.round(m.kcal)}</T>
            </PressableScale>
            {open && (
              <Animated.View entering={reduce ? undefined : FadeIn.duration(180)} style={{ gap: space.md, paddingBottom: space.md }}>
                <View style={styles.wrap}><Stepper editable label="Servings" value={m.qty || 1} step={0.5} min={0.5} max={20} onChange={(q) => actions.updateMeal(m.id, requantify(m, q), date)} /></View>
                <View style={{ gap: 6 }}>
                  <T v="label">Move to</T>
                  <View style={styles.wrap}>
                    {SLOTS.map((x) => <Pill key={x.id} small label={x.label} solid={m.slot === x.id} onPress={() => { actions.updateMeal(m.id, { ...m, slot: x.id }, date); setOpenMeal(null); }} />)}
                  </View>
                </View>
                <Pill small label="Delete" onPress={() => { actions.removeMeal(m.id, date); setOpenMeal(null); }} style={{ alignSelf: 'flex-start' }} accessibilityLabel={`Delete ${m.name}`} />
              </Animated.View>
            )}
          </Animated.View>
        );
      })}

      {empty && yesterday.length > 0 && (
        <Pill
          small label={`Same as yesterday · ${yesterday.length} food${yesterday.length === 1 ? '' : 's'}`} style={{ alignSelf: 'flex-start', marginTop: space.md }}
          onPress={() => { actions.addMeals(yesterday.map(({ id, ...rest }) => rest), date); haptic.success(); }}
        />
      )}

      {g.slot && g.meals.length > 0 && (
        naming !== null ? (
          <View style={styles.nameRow}>
            <TextInput
              autoFocus value={naming} onChangeText={setNaming} placeholder="Name this meal" placeholderTextColor={color.text3} style={styles.nameInput}
              accessibilityLabel="Name for the saved meal" onSubmitEditing={save}
            />
            <Pill small solid label="Save" onPress={save} />
            <Pill small label="Cancel" onPress={() => setNaming(null)} />
          </View>
        ) : (
          saved
            ? <T v="small" style={{ marginTop: space.md, color: color.lime }}>Saved. Find it under My meals when you add food.</T>
            : <T v="small" onPress={() => setNaming('')} style={styles.saveLink} accessibilityRole="button">Save as meal</T>
        )
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', gap: 6 },
  navBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  kcalRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: space.md },
  kcal: { fontFamily: font.display, fontSize: 52, lineHeight: 54, color: color.text },
  leftBox: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.md, backgroundColor: color.limeDim },
  leftNum: { fontFamily: font.display, fontSize: 26, lineHeight: 28, color: color.lime },
  macros: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  macroNum: { fontFamily: font.display, fontSize: 22, lineHeight: 24, color: color.text },
  of: { fontFamily: font.body, fontSize: 11, color: color.text3 },
  cta: { flexDirection: 'row', gap: 6, height: 54, borderRadius: radius.pill, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: font.display, fontSize: 21, letterSpacing: 0.8, textTransform: 'uppercase', color: color.limeInk },
  slotHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  plus: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.limeDim },
  meal: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line, marginTop: space.md },
  mealHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.md, paddingBottom: 2 },
  mealKcal: { fontFamily: font.display, fontSize: 20, color: color.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: space.md },
  nameInput: {
    flex: 1, minWidth: 0, height: 40, paddingHorizontal: 14, borderRadius: radius.pill, color: color.text, fontFamily: font.bodyMed, fontSize: 15,
    backgroundColor: color.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  saveLink: { marginTop: space.md, color: color.text2, textDecorationLine: 'underline' },
});
