// Supplement products: what the user takes, in their own amounts.
// The app tracks; it never recommends a dose or a time of day. Only protein powders count toward nutrition.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from '@/components/ui/Aurora';
import { Choice, Field } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { T } from '@/components/ui/T';
import { addDays, DOW_SHORT, dow, today } from '@/domain/dates';
import { newCreatineProduct, newOtherProduct, newProteinProduct } from '@/domain/defaults';
import { amountLabel, supplementWeek, unitWord } from '@/domain/nutrition';
import type { SupplementKind, SupplementProduct, SupplementUnit } from '@/domain/types';
import { haptic } from '@/hooks/haptics';
import { actions, useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

const KIND: Record<SupplementKind, { label: string; tint: string; icon: keyof typeof Ionicons.glyphMap }> = {
  protein: { label: 'Protein powder', tint: color.protein, icon: 'nutrition-outline' },
  creatine: { label: 'Creatine', tint: color.water, icon: 'flash-outline' },
  other: { label: 'Other', tint: color.fat, icon: 'medkit-outline' },
};
const uid = () => Math.random().toString(36).slice(2, 8);
const back = () => (router.canGoBack() ? router.back() : router.replace('/nutrition'));

export default function Supplements() {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const products = useApp((s) => s.products);
  const days = useApp((s) => s.days);
  const [open, setOpen] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));

  const add = (p: SupplementProduct) => { actions.upsertProduct(p); setOpen(p.id); haptic.success(); };

  return (
    <View style={styles.root}>
      <Aurora />
      <View style={[styles.top, { paddingTop: insets.top + space.md }]}>
        <PressableScale style={styles.round} onPress={back} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={color.text} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <T v="label" style={{ color: color.lime }}>What you take</T>
          <T v="title">Supplements</T>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + 60, gap: space.md }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <T v="small">
          Enter what is on your own tub and the amount you actually take. Liftbook keeps count for you. It does not tell you how much to take or when, so check the label or ask a professional if you are unsure.
        </T>

        {products.length === 0 && (
          <View style={styles.card}>
            <T v="bodyMed">Nothing here yet</T>
            <T v="small">Add a product below and it shows up on Home and Nutrition with one-tap logging.</T>
          </View>
        )}

        {products.map((p, i) => {
          const k = KIND[p.kind];
          const isOpen = open === p.id;
          const wk = supplementWeek(days, p, week);
          const full = wk.filter((d) => d.state === 'full').length;
          const set = (patch: Partial<SupplementProduct>) => actions.upsertProduct({ ...p, ...patch });
          return (
            <Animated.View key={p.id} layout={reduce ? undefined : LinearTransition.duration(200)} entering={reduce ? undefined : FadeInDown.delay(i * 40)} style={styles.card}>
              <PressableScale scaleTo={0.99} style={styles.head} onPress={() => { setOpen(isOpen ? null : p.id); setRemoving(null); }} accessibilityLabel={`${p.name}, ${isOpen ? 'collapse' : 'edit'}`}>
                <View style={[styles.kindIcon, { backgroundColor: `${k.tint}22` }]}><Ionicons name={k.icon} size={18} color={k.tint} /></View>
                <View style={{ flex: 1 }}>
                  <T v="bodyMed" style={{ fontSize: 16 }} numberOfLines={1}>{p.brand ? `${p.brand} ` : ''}{p.name}</T>
                  <T v="small">{k.label} · {p.dailyTarget > 0 ? `${amountLabel(p.unit, p.dailyTarget)} a day` : 'daily amount not set'}</T>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={color.text3} />
              </PressableScale>

              <View style={styles.week} accessibilityLabel={`Daily amount reached on ${full} of the last 7 days`}>
                {wk.map((d) => (
                  <View key={d.date} style={styles.dayCol}>
                    <View style={[styles.dot, d.state === 'full' && { backgroundColor: k.tint, borderColor: k.tint }, d.state === 'part' && { borderColor: k.tint }]}>
                      {d.state === 'full' && <Ionicons name="checkmark" size={12} color={color.limeInk} />}
                      {d.state === 'part' && <View style={[styles.half, { backgroundColor: k.tint }]} />}
                    </View>
                    <T style={styles.dayText}>{DOW_SHORT[dow(d.date)][0]}</T>
                  </View>
                ))}
                <T v="small" style={{ marginLeft: 'auto' }}>{full}/7 days</T>
              </View>

              {isOpen && (
                <Animated.View entering={reduce ? undefined : FadeIn.duration(180)} style={{ gap: space.md }}>
                  <View style={styles.rowWrap}><Field label="Name" value={p.name} onChangeText={(v) => set({ name: v })} placeholder="Whey protein" /></View>
                  <View style={styles.rowWrap}><Field label="Brand (optional)" value={p.brand ?? ''} onChangeText={(v) => set({ brand: v || undefined })} placeholder="Brand" /></View>
                  <Choice<SupplementKind> label="Type" value={p.kind} onChange={(v) => set({ kind: v })} options={[{ value: 'protein', label: 'Protein powder' }, { value: 'creatine', label: 'Creatine' }, { value: 'other', label: 'Other' }]} />
                  <Choice<SupplementUnit> label="Measured in" value={p.unit} onChange={(v) => set({ unit: v })} options={[{ value: 'scoop', label: 'Scoops' }, { value: 'g', label: 'Grams' }, { value: 'tablet', label: 'Tablets' }]} />
                  <View style={styles.rowWrap}>
                    <Num label="Amount per day" suffix={unitWord(p.unit, 2)} value={p.dailyTarget} onChange={(v) => set({ dailyTarget: v, quick: p.quick.length === 0 || (p.quick.length === 1 && p.quick[0] === p.dailyTarget) ? (v > 0 ? [v] : []) : p.quick })} />
                    <QuickField unit={p.unit} value={p.quick} onChange={(q) => set({ quick: q })} />
                  </View>

                  {p.kind === 'protein' ? (
                    <>
                      <T v="label">One scoop, from your tub’s label</T>
                      <View style={styles.rowWrap}>
                        <Num label="Scoop size" suffix="g" value={p.scoopG} onChange={(v) => set({ scoopG: v })} />
                        <Num label="Calories" suffix="kcal" value={p.kcal} onChange={(v) => set({ kcal: v })} />
                      </View>
                      <View style={styles.rowWrap}>
                        <Num label="Protein" suffix="g" value={p.proteinG} onChange={(v) => set({ proteinG: v })} />
                        <Num label="Carbs" suffix="g" value={p.carbsG} onChange={(v) => set({ carbsG: v })} />
                        <Num label="Fat" suffix="g" value={p.fatG} onChange={(v) => set({ fatG: v })} />
                      </View>
                      <T v="small">
                        Each {p.unit === 'g' ? 'scoop' : unitWord(p.unit, 1)} you log adds {Math.round(p.kcal)} kcal and {Math.round(p.proteinG * 10) / 10} g protein to that day. If you also log the shake as a food, it would be counted twice.
                      </T>
                    </>
                  ) : (
                    <T v="small">
                      {p.kind === 'creatine' ? 'Creatine has no calories, so logging it' : 'Logging this'} never changes your calorie or protein totals.
                    </T>
                  )}

                  {removing === p.id ? (
                    <View style={styles.rowWrap}>
                      <Pill small label="Yes, remove it" onPress={() => { actions.removeProduct(p.id); setRemoving(null); setOpen(null); }} />
                      <Pill small solid label="Keep" onPress={() => setRemoving(null)} />
                    </View>
                  ) : (
                    <Pill small label="Remove product" onPress={() => setRemoving(p.id)} style={{ alignSelf: 'flex-start' }} />
                  )}
                </Animated.View>
              )}
            </Animated.View>
          );
        })}

        <T v="label" style={{ marginTop: space.sm }}>Add a product</T>
        <View style={styles.rowWrap}>
          <AddBtn kind="protein" onPress={() => add(newProteinProduct(`p-${uid()}`))} />
          {/* No amount is pre-filled for creatine or anything else: the user enters their own. */}
          <AddBtn kind="creatine" onPress={() => add({ ...newCreatineProduct(`p-${uid()}`), dailyTarget: 0, quick: [] })} />
          <AddBtn kind="other" onPress={() => add({ ...newOtherProduct(`p-${uid()}`), dailyTarget: 0, quick: [] })} />
        </View>
      </ScrollView>
    </View>
  );
}

function AddBtn({ kind, onPress }: { kind: SupplementKind; onPress: () => void }) {
  const k = KIND[kind];
  return (
    <PressableScale style={styles.addBtn} onPress={onPress} accessibilityLabel={`Add ${k.label}`}>
      <Ionicons name="add" size={18} color={k.tint} />
      <T style={styles.addText}>{k.label}</T>
    </PressableScale>
  );
}

/** Number field that keeps what is being typed ("1." on the way to "1.5") and reports valid numbers. */
function Num({ label, suffix, value, onChange }: { label: string; suffix?: string; value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(value ? String(value) : '');
  useEffect(() => { if ((Number(text.replace(',', '.')) || 0) !== value) setText(value ? String(value) : ''); }, [value]);
  return (
    <Field
      label={label} suffix={suffix} value={text} keyboardType="decimal-pad" placeholder="0"
      onChangeText={(t) => { setText(t); const n = Number(t.replace(',', '.')); if (Number.isFinite(n) && n >= 0) onChange(Math.round(n * 100) / 100); }}
    />
  );
}

/** The one-tap amounts, typed as a short list: "0.5, 1, 2". */
function QuickField({ unit, value, onChange }: { unit: SupplementUnit; value: number[]; onChange: (q: number[]) => void }) {
  const [text, setText] = useState(value.join(', '));
  useEffect(() => { if (parse(text).join() !== value.join()) setText(value.join(', ')); }, [value.join()]);
  return <Field label="One-tap amounts" suffix={unitWord(unit, 2)} value={text} placeholder="1, 2" onChangeText={(t) => { setText(t); onChange(parse(t)); }} />;
}
const parse = (t: string) => [...new Set(t.split(/[,\s]+/).map((x) => Number(x.replace(',', '.'))).filter((n) => Number.isFinite(n) && n > 0))].slice(0, 5);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.sm },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  card: { padding: space.lg, borderRadius: radius.lg, backgroundColor: color.card, gap: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  kindIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayCol: { alignItems: 'center', gap: 4 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: color.lineStrong },
  half: { width: 8, height: 8, borderRadius: 4 },
  dayText: { fontFamily: font.bodySemi, fontSize: 10, color: color.text3 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 46, paddingHorizontal: 16, borderRadius: radius.pill,
    borderWidth: 1, borderStyle: 'dashed', borderColor: color.lineStrong,
  },
  addText: { fontFamily: font.bodySemi, fontSize: 14, color: color.text },
});
