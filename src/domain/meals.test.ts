/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FOODS } from './foods';
import { groupBySlot, knownFoods, macroKcal, parseMealText, recentFoods, requantify, searchFoods, slotForHour, toMeal } from './meals';
import { dayTotals } from './nutrition';
import type { DayLog, Meal } from './types';

const M = (name: string, kcal: number, extra: Partial<Meal> = {}): Meal => ({ id: Math.random().toString(36), name, qty: 1, kcal, p: 10, c: 10, f: 5, ...extra });
const day = (date: string, meals: Meal[]): DayLog => ({ date, split: null, sets: [], meals, bw: null, waterMl: 0, sport: [], challenges: {}, supplements: [] });

test('the food list has no duplicate names and its macros roughly add up', () => {
  const names = FOODS.map((f) => f.name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
  for (const f of FOODS) {
    assert.ok(f.kcal >= 0 && f.p >= 0 && f.c >= 0 && f.f >= 0, f.name);
    // Within 25% or 25 kcal of 4/4/9. Catches typos without pretending labels are exact.
    const est = macroKcal(f.p, f.c, f.f);
    assert.ok(Math.abs(est - f.kcal) <= Math.max(25, f.kcal * 0.25), `${f.name}: ${f.kcal} kcal vs ${est} from macros`);
  }
});

test('search finds foods by everyday words and prefers the plain food', () => {
  assert.equal(searchFoods(FOODS, 'roti')[0].name, 'Roti / chapati (1 medium)');
  assert.equal(searchFoods(FOODS, 'eggs')[0].name, 'Egg, whole (1 large)');
  assert.equal(searchFoods(FOODS, 'chicken')[0].name, 'Chicken breast, cooked (100 g)');
  assert.equal(searchFoods(FOODS, 'dahi')[0].name, 'Curd / dahi (100 g)');
  assert.ok(searchFoods(FOODS, 'pan').some((f) => f.name.startsWith('Paneer')));
  assert.deepEqual(searchFoods(FOODS, 'zzzz'), []);
  assert.deepEqual(searchFoods(FOODS, ''), []);
});

test('describe your meal: quantities, weights and unknown foods', () => {
  const r = parseMealText('2 eggs, 200g chicken and a bowl of dal with half cup rice, dragonfruit smoothie', FOODS);
  assert.equal(r.length, 5);
  assert.equal(r[0].food?.name, 'Egg, whole (1 large)'); assert.equal(r[0].qty, 2);
  assert.equal(r[1].food?.name, 'Chicken breast, cooked (100 g)'); assert.equal(r[1].qty, 2); assert.equal(r[1].amount, 200);
  assert.equal(r[2].food?.name, 'Dal, cooked (1 bowl)'); assert.equal(r[2].qty, 1);
  assert.equal(r[3].food?.name, 'White rice, cooked (1 cup)'); assert.equal(r[3].qty, 0.5);
  assert.equal(r[4].food, null); // never guessed
  const milk = parseMealText('500 ml milk', FOODS)[0];
  assert.equal(milk.food?.name, 'Milk, toned (250 ml)'); assert.equal(milk.qty, 2);
  assert.equal(parseMealText('three rotis', FOODS)[0].qty, 3);
});

test('own foods come first, and logged foods become reusable but AI estimates do not', () => {
  const days = { '2026-11-10': day('2026-11-10', [M('Mum’s rajma rice', 520, { qty: 2 }), M('Mystery bowl', 400, { source: 'ai' })]) };
  const mine = [{ name: 'Banana (1 medium)', kcal: 90, p: 1, c: 23, f: 0.3 }];
  const foods = knownFoods(days, mine);
  assert.equal(foods.find((f) => f.name === 'Banana (1 medium)')?.kcal, 90);
  assert.equal(foods.find((f) => f.name === 'Mum’s rajma rice')?.kcal, 260);
  assert.equal(foods.find((f) => f.name === 'Mystery bowl'), undefined);
});

test('recents rank by how often a food was logged', () => {
  const days = {
    '2026-11-08': day('2026-11-08', [M('Banana (1 medium)', 105), M('Idli (1)', 39)]),
    '2026-11-09': day('2026-11-09', [M('Banana (1 medium)', 105)]),
    '2026-11-20': day('2026-11-20', [M('Naan (1)', 260)]), // in the future, ignored
  };
  assert.deepEqual(recentFoods(days, FOODS, '2026-11-10').map((f) => f.name), ['Banana (1 medium)', 'Idli (1)']);
});

test('slots, regrouping and changing a quantity', () => {
  assert.equal(slotForHour(8), 'breakfast'); assert.equal(slotForHour(13), 'lunch'); assert.equal(slotForHour(17), 'snack'); assert.equal(slotForHour(21), 'dinner');
  const meals = [M('Old import', 300), M('Oats', 150, { slot: 'breakfast' }), M('Dal', 230, { slot: 'dinner' })];
  const g = groupBySlot(meals);
  assert.deepEqual(g.map((x) => x.label), ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other']);
  assert.equal(g[0].kcal, 150); assert.equal(g[1].meals.length, 0); assert.equal(g[4].meals[0].name, 'Old import');
  const twice = requantify(toMeal(FOODS[0], 1) as Meal, 2.5);
  assert.equal(twice.kcal, 180); assert.equal(twice.qty, 2.5);
});

test('creatine never adds calories or protein, protein powder does', () => {
  const d: DayLog = { ...day('2026-11-10', []), supplements: [{ id: 'a', productId: 'cr', amount: 5, at: 0 }, { id: 'b', productId: 'wh', amount: 2, at: 0 }] };
  const products = [
    { id: 'cr', kind: 'creatine' as const, name: 'Creatine', scoopG: 3, kcal: 50, proteinG: 9, carbsG: 0, fatG: 0, dailyTarget: 3, unit: 'g' as const, quick: [3] },
    { id: 'wh', kind: 'protein' as const, name: 'Whey', scoopG: 30, kcal: 120, proteinG: 24, carbsG: 3, fatG: 1.5, dailyTarget: 1, unit: 'scoop' as const, quick: [1] },
  ];
  assert.deepEqual(dayTotals(d, products), { kcal: 240, p: 48, c: 6, f: 3 });
});
