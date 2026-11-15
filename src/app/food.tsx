// Add food to a meal: search the food list, reuse a saved meal, describe what you ate, or enter your own.
// Every number shown here comes from the food list or from what the user typed. Nothing is guessed.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from '@/components/ui/Aurora';
import { Field } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { Stepper } from '@/components/ui/Stepper';
import { T } from '@/components/ui/T';
import { today } from '@/domain/dates';
import type { FoodDef } from '@/domain/foods';
import { knownFoods, macroKcal, parseMealText, recentFoods, scale, searchFoods, slotForHour, slotLabel, SLOTS, toMeal, type ParsedItem } from '@/domain/meals';
import type { MealSlot } from '@/domain/types';
import { haptic } from '@/hooks/haptics';
import { AI_ERRORS, aiReady, readEstimate, type EstimateItem } from '@/domain/ai';
import { AiError, callAi } from '@/hooks/aiClient';
import { actions, useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

type Tab = 'foods' | 'meals' | 'describe' | 'new';
const TABS: { id: Tab; label: string }[] = [{ id: 'foods', label: 'Foods' }, { id: 'meals', label: 'My meals' }, { id: 'describe', label: 'Describe' }, { id: 'new', label: 'New food' }];
const macros = (x: { kcal: number; p: number; c: number; f: number }) => `${Math.round(x.kcal)} kcal · P ${x.p} · C ${x.c} · F ${x.f}`;
const num = (s: string) => Number(s.replace(',', '.')) || 0;
const close = () => (router.canGoBack() ? router.back() : router.replace('/nutrition'));

export default function AddFood() {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const params = useLocalSearchParams<{ date?: string; slot?: string }>();
  const date = typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today();
  const days = useApp((s) => s.days);
  const customFoods = useApp((s) => s.customFoods);
  const savedMeals = useApp((s) => s.savedMeals);

  const [slot, setSlot] = useState<MealSlot>(() => (SLOTS.some((x) => x.id === params.slot) ? (params.slot as MealSlot) : slotForHour(new Date().getHours())));
  const [tab, setTab] = useState<Tab>('foods');
  const [q, setQ] = useState('');
  const [openFood, setOpenFood] = useState<string | null>(null);
  const [added, setAdded] = useState({ n: 0, kcal: 0 });

  const foods = useMemo(() => knownFoods(days, customFoods), [days, customFoods]);
  const results = useMemo(() => searchFoods(foods, q, 20), [foods, q]);
  const recents = useMemo(() => recentFoods(days, foods, today(), 12), [days, foods]);

  const note = (n: number, kcal: number) => { setAdded((a) => ({ n: a.n + n, kcal: a.kcal + kcal })); haptic.success(); };
  const addFood = (f: FoodDef, qty: number) => {
    const m = toMeal(f, qty);
    actions.addMeal({ ...m, slot }, date);
    note(1, m.kcal);
    setOpenFood(null);
  };

  const list = q.trim() ? results : recents;

  return (
    <View style={styles.root}>
      <Aurora />
      <View style={[styles.top, { paddingTop: insets.top + space.md }]}>
        <View style={{ flex: 1 }}>
          <T v="label" style={{ color: color.lime }}>{date === today() ? 'Today' : date}</T>
          <T v="title">Add to {slotLabel(slot).toLowerCase()}</T>
        </View>
        <PressableScale style={styles.round} onPress={close} accessibilityLabel="Close">
          <Ionicons name="close" size={22} color={color.text} />
        </PressableScale>
      </View>

      <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
        <View style={styles.seg} accessibilityRole="radiogroup">
          {SLOTS.map((s) => {
            const on = s.id === slot;
            return (
              <PressableScale key={s.id} style={[styles.segItem, on && styles.segOn]} onPress={() => setSlot(s.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`Log to ${s.label}`}>
                <T style={[styles.segText, on && { color: color.limeInk }]}>{s.label}</T>
              </PressableScale>
            );
          })}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {TABS.map((t) => {
            const on = t.id === tab;
            return (
              <PressableScale key={t.id} style={[styles.tab, on && styles.tabOn]} onPress={() => setTab(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <T style={[styles.tabText, on && { color: color.text }]}>{t.label}{t.id === 'meals' && savedMeals.length ? ` · ${savedMeals.length}` : ''}</T>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + 130, gap: space.md }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {tab === 'foods' && (
          <>
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={color.text3} />
              <TextInput value={q} onChangeText={setQ} placeholder="Search: egg, roti, dal, paneer…" placeholderTextColor={color.text3} style={styles.searchInput} accessibilityLabel="Search foods" autoCorrect={false} />
              {q.length > 0 && (
                <PressableScale onPress={() => setQ('')} accessibilityLabel="Clear search"><Ionicons name="close-circle" size={18} color={color.text3} /></PressableScale>
              )}
            </View>
            {!q.trim() && <T v="label">{recents.length ? 'You log these most' : 'Start typing to search'}</T>}
            {q.trim().length > 0 && results.length === 0 && (
              <View style={styles.card}>
                <T v="bodyMed">Nothing called “{q.trim()}” in the food list.</T>
                <T v="small">Add it once with its nutrition and it will be here next time.</T>
                <Pill label="Add as a new food" onPress={() => setTab('new')} style={{ alignSelf: 'flex-start' }} />
              </View>
            )}
            {list.length > 0 && (
              <View style={styles.listCard}>
                {list.map((f, i) => (
                  <FoodRow key={f.name} f={f} first={i === 0} open={openFood === f.name} onToggle={() => setOpenFood(openFood === f.name ? null : f.name)} onAdd={(qty) => addFood(f, qty)} slot={slot} />
                ))}
              </View>
            )}
            {!q.trim() && recents.length === 0 && (
              <T v="small">There are {foods.length} foods to search. You can also describe a whole meal in one line, or add your own food.</T>
            )}
            <T v="small" style={{ color: color.text3 }}>Values are approximate per serving. Home cooking varies, so adjust a food or add your own when you know better.</T>
          </>
        )}

        {tab === 'meals' && (
          <>
            {savedMeals.length === 0 && (
              <View style={styles.card}>
                <T v="bodyMed">No saved meals yet</T>
                <T v="small">Log the foods you usually eat together, then tap “Save as meal” under that meal on the Nutrition tab. After that it is one tap here.</T>
              </View>
            )}
            {savedMeals.map((m) => {
              const kcal = Math.round(m.items.reduce((a, x) => a + x.kcal, 0));
              const p = Math.round(m.items.reduce((a, x) => a + x.p, 0));
              return (
                <Animated.View key={m.id} entering={reduce ? undefined : FadeInDown.duration(220)} style={styles.card}>
                  <View style={styles.between}>
                    <View style={{ flex: 1 }}>
                      <T v="bodyMed" style={{ fontSize: 16 }}>{m.name}</T>
                      <T v="small">{kcal} kcal · {p} g protein · {m.items.length} food{m.items.length === 1 ? '' : 's'}</T>
                    </View>
                    <PressableScale style={styles.iconBtn} onPress={() => actions.deleteSavedMeal(m.id)} accessibilityLabel={`Delete saved meal ${m.name}`}>
                      <Ionicons name="trash-outline" size={16} color={color.text3} />
                    </PressableScale>
                  </View>
                  <T v="small" style={{ color: color.text3 }}>{m.items.map((x) => `${x.qty !== 1 ? `${x.qty}× ` : ''}${x.name}`).join(', ')}</T>
                  <Pill solid label={`Add to ${slotLabel(slot).toLowerCase()}`} onPress={() => { actions.addMeals(m.items.map((x) => ({ ...x, slot })), date); note(m.items.length, kcal); }} style={{ alignSelf: 'flex-start' }} />
                </Animated.View>
              );
            })}
          </>
        )}

        {tab === 'describe' && <Describe foods={foods} slot={slot} onAddAi={(items) => { actions.addMeals(items.map((x) => ({ name: x.name, qty: 1, kcal: x.kcal, p: x.p, c: x.c, f: x.f, source: 'ai' as const, slot })), date); note(items.length, items.reduce((a, x) => a + x.kcal, 0)); }} onAdd={(items) => { actions.addMeals(items.map((x) => ({ ...toMeal(x.food!, x.qty), slot })), date); note(items.length, items.reduce((a, x) => a + scale(x.food!, x.qty).kcal, 0)); }} onSearch={(text) => { setQ(text); setTab('foods'); }} />}

        {tab === 'new' && <NewFood initialName={q.trim()} slot={slot} mine={customFoods} onSaved={(f, log) => { actions.addCustomFood(f); if (log) addFood({ ...f, custom: true }, 1); else haptic.success(); }} />}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.md }]}>
        <View style={{ flex: 1 }}>
          <T v="bodyMed">{added.n ? `${added.n} food${added.n === 1 ? '' : 's'} added` : 'Nothing added yet'}</T>
          <T v="small">{added.n ? `${Math.round(added.kcal)} kcal to ${slotLabel(slot).toLowerCase()}` : 'Tap + on a food to log one serving'}</T>
        </View>
        <PressableScale style={[styles.done, !added.n && styles.doneGhost]} onPress={close} accessibilityLabel="Done">
          <T style={[styles.doneText, !added.n && { color: color.text }]}>Done</T>
        </PressableScale>
      </View>
    </View>
  );
}

function FoodRow({ f, first, open, onToggle, onAdd, slot }: { f: FoodDef; first: boolean; open: boolean; onToggle: () => void; onAdd: (qty: number) => void; slot: MealSlot }) {
  const [qty, setQty] = useState(1);
  const unit = f.per === 'ml' ? 'ml' : 'g';
  const s = scale(f, qty);
  return (
    <View style={[styles.food, !first && styles.foodLine]}>
      <View style={styles.foodHead}>
        <PressableScale scaleTo={0.99} style={{ flex: 1 }} onPress={onToggle} accessibilityLabel={`${f.name}, ${open ? 'collapse' : 'choose amount'}`}>
          <T v="bodyMed" numberOfLines={open ? 3 : 1}>{f.name}{f.custom ? '  ·  yours' : ''}</T>
          <T v="small">{macros(open ? s : f)}</T>
        </PressableScale>
        {!open && (
          <PressableScale onPress={() => onAdd(1)} accessibilityLabel={`Add one serving of ${f.name}`} style={styles.plus}>
            <Ionicons name="add" size={22} color={color.limeInk} />
          </PressableScale>
        )}
      </View>
      {open && (
        <Animated.View entering={FadeIn.duration(180)} style={{ gap: space.md, paddingTop: space.md }}>
          <View style={styles.rowWrap}>
            <Stepper editable label="Servings" value={qty} step={0.5} min={0.5} max={20} onChange={setQty} />
            {f.grams ? (
              <Stepper editable label={unit === 'ml' ? 'Or millilitres' : 'Or grams'} unit={unit} value={Math.round(qty * f.grams)} step={unit === 'ml' ? 50 : 10} min={5} max={3000} onChange={(v) => setQty(Math.round((v / f.grams!) * 100) / 100)} />
            ) : null}
          </View>
          <Pill solid label={`Add to ${slotLabel(slot).toLowerCase()} · ${s.kcal} kcal`} onPress={() => { onAdd(qty); setQty(1); }} />
        </Animated.View>
      )}
    </View>
  );
}

function Describe({ foods, slot, onAdd, onAddAi, onSearch }: { foods: FoodDef[]; slot: MealSlot; onAdd: (items: ParsedItem[]) => void; onAddAi: (items: EstimateItem[]) => void; onSearch: (text: string) => void }) {
  const [text, setText] = useState('');
  const [items, setItems] = useState<ParsedItem[] | null>(null);
  const matched = (items ?? []).filter((x) => x.food);
  const missing = (items ?? []).filter((x) => !x.food);
  const total = matched.reduce((a, x) => a + scale(x.food!, x.qty).kcal, 0);
  const setQty = (i: number, qty: number) => setItems((items ?? []).map((x, k) => (k === i ? { ...x, qty } : x)));
  return (
    <>
      <View style={styles.card}>
        <T v="label">What did you eat?</T>
        <TextInput
          value={text} onChangeText={(v) => { setText(v); setItems(null); }} multiline placeholder="2 eggs, 2 roti and a bowl of dal" placeholderTextColor={color.text3}
          style={styles.describe} accessibilityLabel="Describe your meal"
        />
        <Pill solid label="Find these foods" onPress={() => setItems(parseMealText(text, foods))} style={{ alignSelf: 'flex-start', opacity: text.trim() ? 1 : 0.4 }} />
        <T v="small" style={{ color: color.text3 }}>This matches your words to the food list and nothing more. Check the amounts before you add them.</T>
      </View>

      {items && matched.length > 0 && (
        <View style={styles.card}>
          <T v="label">Found · check the amounts</T>
          {(items ?? []).map((x, i) => x.food && (
            <View key={i} style={{ gap: 8 }}>
              <View style={styles.between}>
                <View style={{ flex: 1 }}>
                  <T v="bodyMed" numberOfLines={2}>{x.food.name}</T>
                  <T v="small">{macros(scale(x.food, x.qty))}</T>
                </View>
                <PressableScale style={styles.iconBtn} onPress={() => setItems((items ?? []).filter((_, k) => k !== i))} accessibilityLabel={`Remove ${x.food.name}`}>
                  <Ionicons name="close" size={16} color={color.text3} />
                </PressableScale>
              </View>
              <View style={styles.rowWrap}><Stepper editable label={`Servings · from “${x.text}”`} value={x.qty} step={0.5} min={0.5} max={20} onChange={(v) => setQty(i, v)} /></View>
            </View>
          ))}
          <Pill solid label={`Add ${matched.length} food${matched.length === 1 ? '' : 's'} to ${slotLabel(slot).toLowerCase()} · ${Math.round(total)} kcal`} onPress={() => { onAdd(matched); setItems(null); setText(''); }} />
        </View>
      )}

      {items && missing.length > 0 && (
        <View style={[styles.card, styles.warnCard]}>
          <T v="label" style={{ color: color.warn }}>Not in the food list</T>
          <T v="small" style={{ color: color.text }}>These were not added, and no numbers were made up for them. Search with another word, or add them as a new food.</T>
          <View style={styles.rowWrap}>
            {missing.map((x, i) => <Pill key={i} small label={`Search “${x.text}”`} onPress={() => onSearch(x.text)} />)}
          </View>
        </View>
      )}

      {items && items.length === 0 && <T v="small">Type what you ate first, for example “oats with milk and a banana”.</T>}
      <AiEstimate text={text} slot={slot} onAddAi={onAddAi} />
    </>
  );
}

/** AI estimate for a described meal. Shown as an estimate, editable by removing items, and saved only on a tap. */
function AiEstimate({ text, slot, onAddAi }: { text: string; slot: MealSlot; onAddAi: (items: EstimateItem[]) => void }) {
  const ai = useApp((s) => s.ai);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ for: string; items: EstimateItem[]; note: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!aiReady(ai)) return <T v="small" style={{ color: color.text3 }}>For foods that are not in the list, connect the AI assistant in Profile to get an estimate.</T>;
  const ask = async () => {
    if (!text.trim() || busy) return;
    setBusy(true); setErr(null); setRes(null);
    try {
      const r = await callAi<{ estimate: unknown }>(ai, { kind: 'meal', text });
      setRes({ for: text, ...readEstimate(r.estimate) });
    } catch (e) { setErr(AI_ERRORS[(e as AiError).code] ?? AI_ERRORS.unknown); } finally { setBusy(false); }
  };
  const shown = res && res.for === text ? res : null;
  const total = (shown?.items ?? []).reduce((a, x) => a + x.kcal, 0);
  return (
    <View style={styles.card}>
      <T v="label">Or ask the AI</T>
      <T v="small">Sends only the words you typed above to Gemini. You see the estimate before anything is saved.</T>
      <Pill label={busy ? 'Estimating…' : 'Estimate with AI'} onPress={ask} style={{ alignSelf: 'flex-start', opacity: text.trim() ? 1 : 0.4 }} />
      {err && <T v="small" style={{ color: color.warn }} accessibilityRole="alert">{err}</T>}
      {shown && shown.items.length === 0 && <T v="small" style={{ color: color.warn }}>{shown.note || 'The AI could not estimate that. Try naming the foods and amounts.'}</T>}
      {shown && shown.items.length > 0 && (
        <View style={[styles.card, styles.warnCard]}>
          <T v="label" style={{ color: color.warn }}>AI estimate · not verified</T>
          {shown.items.map((x, i) => (
            <View key={i} style={styles.between}>
              <View style={{ flex: 1 }}>
                <T v="bodyMed" numberOfLines={2}>{x.name}</T>
                <T v="small">{x.assumed ? `${x.assumed} · ` : ''}{x.kcal} kcal · P {x.p} · C {x.c} · F {x.f}{x.confidence === 'low' ? ' · rough guess' : ''}</T>
              </View>
              <PressableScale style={styles.iconBtn} onPress={() => setRes({ ...shown, items: shown.items.filter((_, k) => k !== i) })} accessibilityLabel={`Remove ${x.name}`}>
                <Ionicons name="close" size={16} color={color.text3} />
              </PressableScale>
            </View>
          ))}
          {shown.note ? <T v="small">{shown.note}</T> : null}
          <Pill solid label={`Add estimate to ${slotLabel(slot).toLowerCase()} · ${Math.round(total)} kcal`} onPress={() => { onAddAi(shown.items); setRes(null); }} />
        </View>
      )}
    </View>
  );
}

function NewFood({ initialName, slot, mine, onSaved }: { initialName: string; slot: MealSlot; mine: FoodDef[]; onSaved: (f: FoodDef, log: boolean) => void }) {
  const [name, setName] = useState(initialName);
  const [serving, setServing] = useState('');
  const [kcal, setKcal] = useState('');
  const [p, setP] = useState('');
  const [c, setC] = useState('');
  const [f, setF] = useState('');
  const fromMacros = macroKcal(num(p), num(c), num(f));
  const typed = num(kcal);
  const off = typed > 0 && fromMacros > 0 && Math.abs(typed - fromMacros) > Math.max(25, typed * 0.25);
  const ok = name.trim().length > 1 && (typed > 0 || fromMacros > 0);
  const build = (): FoodDef => ({
    name: serving.trim() ? `${name.trim()} (${serving.trim()})` : name.trim(),
    kcal: typed > 0 ? typed : fromMacros, p: num(p), c: num(c), f: num(f), custom: true,
  });
  const save = (log: boolean) => {
    if (!ok) return;
    onSaved(build(), log);
    setName(''); setServing(''); setKcal(''); setP(''); setC(''); setF('');
  };
  return (
    <>
      <View style={styles.card}>
        <T v="label">Your own food</T>
        <View style={styles.rowWrap}><Field label="Name" value={name} onChangeText={setName} placeholder="Mum’s rajma rice" /></View>
        <View style={styles.rowWrap}><Field label="One serving is" value={serving} onChangeText={setServing} placeholder="1 bowl, 100 g, 1 piece…" /></View>
        <View style={styles.rowWrap}>
          <Field label="Calories" suffix="kcal" value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" placeholder={fromMacros ? String(fromMacros) : '0'} />
          <Field label="Protein" suffix="g" value={p} onChangeText={setP} keyboardType="decimal-pad" placeholder="0" />
        </View>
        <View style={styles.rowWrap}>
          <Field label="Carbs" suffix="g" value={c} onChangeText={setC} keyboardType="decimal-pad" placeholder="0" />
          <Field label="Fat" suffix="g" value={f} onChangeText={setF} keyboardType="decimal-pad" placeholder="0" />
        </View>
        {off && <T v="small" style={{ color: color.warn }}>Those macros add up to about {fromMacros} kcal, not {typed}. Worth a second look at the label.</T>}
        {!typed && fromMacros > 0 && <T v="small">Calories left blank, so {fromMacros} kcal from the macros will be used.</T>}
        <View style={styles.rowWrap}>
          <Pill solid label={`Save and add to ${slotLabel(slot).toLowerCase()}`} onPress={() => save(true)} style={{ opacity: ok ? 1 : 0.4 }} />
          <Pill label="Just save" onPress={() => save(false)} style={{ opacity: ok ? 1 : 0.4 }} />
        </View>
      </View>
      {mine.length > 0 && (
        <View style={styles.card}>
          <T v="label">Your foods · {mine.length}</T>
          {mine.map((x) => (
            <View key={x.name} style={styles.between}>
              <View style={{ flex: 1 }}>
                <T v="bodyMed" numberOfLines={1}>{x.name}</T>
                <T v="small">{macros(x)}</T>
              </View>
              <PressableScale style={styles.iconBtn} onPress={() => actions.removeCustomFood(x.name)} accessibilityLabel={`Delete ${x.name}`}>
                <Ionicons name="trash-outline" size={16} color={color.text3} />
              </PressableScale>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  seg: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, backgroundColor: color.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  segItem: { flex: 1, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: color.lime },
  segText: { fontFamily: font.bodySemi, fontSize: 12.5, color: color.text2 },
  tab: { paddingHorizontal: 14, height: 36, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: color.lime },
  tabText: { fontFamily: font.bodySemi, fontSize: 14, color: color.text3 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 50, paddingHorizontal: 16, borderRadius: radius.pill,
    backgroundColor: color.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  searchInput: { flex: 1, minWidth: 0, color: color.text, fontFamily: font.bodyMed, fontSize: 16, height: '100%' },
  card: { padding: space.lg, borderRadius: radius.lg, backgroundColor: color.card, gap: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  warnCard: { backgroundColor: 'rgba(255,194,74,0.07)', borderColor: 'rgba(255,194,74,0.4)' },
  listCard: { paddingHorizontal: space.lg, borderRadius: radius.lg, backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  food: { paddingVertical: 12 },
  foodLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line },
  foodHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  plus: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: color.lime },
  between: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  describe: { minHeight: 76, color: color.text, fontFamily: font.body, fontSize: 16, lineHeight: 22, padding: 0, textAlignVertical: 'top' },
  bottom: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md,
    backgroundColor: 'rgba(13,16,16,0.94)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.lineStrong,
  },
  done: { height: 52, paddingHorizontal: 30, borderRadius: radius.pill, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  doneGhost: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  doneText: { fontFamily: font.display, fontSize: 20, letterSpacing: 0.8, textTransform: 'uppercase', color: color.limeInk },
});
