// Food search, "describe your meal" matching, recents and meal slots.
// Nothing here guesses nutrition: every number comes from the food list or from what the user typed.
import { FOODS, type FoodDef } from './foods';
import type { DayLog, ISODate, Meal, MealSlot } from './types';

export const SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' }, { id: 'lunch', label: 'Lunch' }, { id: 'dinner', label: 'Dinner' }, { id: 'snack', label: 'Snacks' },
];
export const slotLabel = (s: MealSlot | undefined) => SLOTS.find((x) => x.id === s)?.label ?? 'Other';

/** The meal most people are eating at this hour. Only a starting point; the user can change it. */
export const slotForHour = (h: number): MealSlot => (h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snack' : 'dinner');

const r1 = (n: number) => Math.round(n * 10) / 10;
export const scale = (f: { kcal: number; p: number; c: number; f: number }, qty: number) =>
  ({ kcal: Math.round(f.kcal * qty), p: r1(f.p * qty), c: r1(f.c * qty), f: r1(f.f * qty) });
export const toMeal = (f: FoodDef, qty: number, source: Meal['source'] = f.custom ? 'manual' : 'library'): Omit<Meal, 'id'> =>
  ({ name: f.name, qty, ...scale(f, qty), source });

/** Calories implied by the macros (4/4/9). Lets a hand-typed food be sanity-checked. */
export const macroKcal = (p: number, c: number, f: number) => Math.round(p * 4 + c * 4 + f * 9);

/** Built-in foods, the user's own foods, and anything they have logged before (per serving). */
export function knownFoods(days: Record<ISODate, DayLog>, custom: FoodDef[] = []): FoodDef[] {
  const map = new Map<string, FoodDef>();
  for (const f of custom) map.set(f.name.toLowerCase(), { ...f, custom: true });
  for (const f of FOODS) if (!map.has(f.name.toLowerCase())) map.set(f.name.toLowerCase(), f);
  for (const d of Object.values(days)) {
    for (const m of d.meals) {
      const k = m.name.toLowerCase();
      if (map.has(k) || !m.qty || m.source === 'ai') continue;
      map.set(k, { name: m.name, kcal: Math.round(m.kcal / m.qty), p: r1(m.p / m.qty), c: r1(m.c / m.qty), f: r1(m.f / m.qty) });
    }
  }
  return [...map.values()];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9.\s/]/g, ' ').replace(/\s+/g, ' ').trim();
const singular = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

/** How well a food matches a query: every query word must appear in the name or its other names. */
export function matchScore(f: FoodDef, query: string): number {
  const q = norm(query);
  if (!q) return 0;
  const name = norm(f.name.replace(/\(.*?\)/g, ' '));
  const full = norm(f.name);
  const aka = (f.aka ?? []).map(norm);
  if (aka.includes(q) || aka.map(singular).includes(singular(q))) return 100;
  if (name === q) return 95;
  const words = q.split(' ').map(singular);
  const hay = [name, ...aka].join(' ').split(' ').map(singular);
  let score = 0;
  for (const w of words) {
    if (hay.includes(w)) score += 10;
    else if (hay.some((h) => h.startsWith(w))) score += 6;
    else if (full.includes(w)) score += 3;
    else return 0;
  }
  if (name.startsWith(q)) score += 8;
  // Prefer the plain food over a dish that merely contains the word.
  return score - Math.min(5, name.split(' ').length);
}

export function searchFoods(foods: FoodDef[], query: string, limit = 12): FoodDef[] {
  return foods
    .map((f) => ({ f, s: matchScore(f, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.f.name.localeCompare(b.f.name))
    .slice(0, limit)
    .map((x) => x.f);
}

/** Foods logged most often in the last `window` days, most recent first on ties. */
export function recentFoods(days: Record<ISODate, DayLog>, foods: FoodDef[], today: ISODate, limit = 10, window = 30): FoodDef[] {
  const seen = new Map<string, { n: number; last: ISODate }>();
  const dates = Object.keys(days).filter((d) => d <= today).sort().slice(-window);
  for (const d of dates) for (const m of days[d].meals) {
    const k = m.name.toLowerCase();
    const cur = seen.get(k);
    seen.set(k, { n: (cur?.n ?? 0) + 1, last: d });
  }
  const by = new Map(foods.map((f) => [f.name.toLowerCase(), f]));
  return [...seen.entries()]
    .filter(([k]) => by.has(k))
    .sort((a, b) => b[1].n - a[1].n || b[1].last.localeCompare(a[1].last))
    .slice(0, limit)
    .map(([k]) => by.get(k)!);
}

// ---------------- describe your meal ----------------
const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5, quarter: 0.25, couple: 2,
};
const FILLER = new Set(['of', 'bowl', 'bowls', 'cup', 'cups', 'plate', 'plates', 'piece', 'pieces', 'pc', 'pcs', 'slice', 'slices', 'glass', 'glasses',
  'katori', 'serving', 'servings', 'some', 'small', 'medium', 'large', 'big', 'the', 'my', 'had', 'ate', 'i', 'for', 'scoop', 'scoops']);

export interface ParsedItem {
  text: string;
  food: FoodDef | null;
  qty: number;
  /** Set when the user gave a weight or volume and the food has a known serving size. */
  amount?: number;
}

/**
 * Splits "2 eggs, 200g chicken and a bowl of dal" into foods from the list with quantities.
 * Anything it cannot find comes back with `food: null` so the UI can say so. It never invents numbers.
 */
export function parseMealText(text: string, foods: FoodDef[]): ParsedItem[] {
  const parts = text.toLowerCase().split(/,|\n|;|\+|&|\band\b|\bwith\b/).map((x) => x.trim()).filter(Boolean);
  return parts.map((part) => {
    let rest = norm(part);
    let qty = 1;
    let amount: number | undefined;
    const weight = rest.match(/(\d+(?:\.\d+)?)\s*(g|gm|gms|gram|grams|ml|kg|l|litre|liter)\b/);
    if (weight) {
      const n = Number(weight[1]);
      amount = /^(kg|l|litre|liter)$/.test(weight[2]) ? n * 1000 : n;
      rest = rest.replace(weight[0], ' ');
    } else {
      const frac = rest.match(/^(\d+)\s*\/\s*(\d+)\b/);
      const num = rest.match(/^(\d+(?:\.\d+)?)\b/);
      if (frac && Number(frac[2]) > 0) { qty = Number(frac[1]) / Number(frac[2]); rest = rest.slice(frac[0].length); }
      else if (num) { qty = Number(num[1]); rest = rest.slice(num[0].length); }
      else {
        const first = rest.split(' ')[0];
        if (first in NUMBER_WORDS) { qty = NUMBER_WORDS[first]; rest = rest.split(' ').slice(1).join(' '); if (rest.startsWith('a ')) rest = rest.slice(2); }
      }
    }
    const words = rest.split(' ').filter((w) => w && !FILLER.has(w));
    const food = words.length ? searchFoods(foods, words.join(' '), 1)[0] ?? null : null;
    if (food && amount != null) {
      if (food.grams) qty = Math.round((amount / food.grams) * 100) / 100;
      else amount = undefined; // no serving size to convert with, so fall back to one serving and let the user adjust
    }
    return { text: part, food, qty: Math.max(0.25, qty), amount };
  });
}

// ---------------- day views ----------------
export interface SlotGroup { slot: MealSlot | undefined; label: string; meals: Meal[]; kcal: number; p: number }

/** Meals grouped by slot, in eating order. Unslotted (older or imported) meals come last under "Other". */
export function groupBySlot(meals: Meal[]): SlotGroup[] {
  const order: (MealSlot | undefined)[] = [...SLOTS.map((s) => s.id), undefined];
  return order.map((slot) => {
    const list = meals.filter((m) => m.slot === slot);
    return { slot, label: slotLabel(slot), meals: list, kcal: Math.round(list.reduce((a, m) => a + m.kcal, 0)), p: r1(list.reduce((a, m) => a + m.p, 0)) };
  });
}

/** Changing the quantity of a logged food scales its numbers with it. */
export function requantify(m: Meal, qty: number): Meal {
  if (!m.qty || qty <= 0) return m;
  const k = qty / m.qty;
  return { ...m, qty, kcal: Math.round(m.kcal * k), p: r1(m.p * k), c: r1(m.c * k), f: r1(m.f * k) };
}
