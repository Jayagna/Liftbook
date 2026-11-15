/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SPORTS } from './defaults';
import { importLiftbook, type LiftbookExport } from './liftbookImport';
import { dayTotals } from './nutrition';
import { e1rm, suggest } from './progression';
import { activeStreak, recoveryStatus } from './recovery';
import { baseTargets, dayTargets, waterTargetMl } from './targets';
import type { DayLog, Profile } from './types';

const blank = (date: string, extra: Partial<DayLog> = {}): DayLog => ({
  date, split: null, sets: [], meals: [], bw: null, waterMl: 0, sport: [], challenges: {}, supplements: [], ...extra,
});

const fixture: LiftbookExport = {
  schema: 'liftbook.v1',
  // A made-up person. These formulas were checked against the original tracker once, by hand, before this.
  profile: { weight: 72, height: 178, age: 29, days: 4, steps: 'mid', phase: 'cut' },
  days: {
    '2026-11-05': { date: '2026-11-05', sets: [{ id: 'a', ex: 'Lat Row', kg: 40, reps: 12 }], meals: [], pushups: 30, pullups: 9, water: 2500, creatine: false, sport: [] },
    '2026-11-06': { date: '2026-11-06', sets: [], meals: [{ id: 'm', name: 'Whey', qty: 1, kcal: 120, p: 24, c: 3, f: 1.5 }], water: 4000, creatine: true, sport: [{ type: 'jogging', mins: 30 }] },
  },
  settings: { sex: 'male', waterBaseMl: 2800, pushupGoal: 40, pullupGoal: 10, creatineDailyG: 3 },
};

test('Liftbook import reproduces Liftbook targets', () => {
  const s = importLiftbook(fixture);
  const t = baseTargets(s.profile, s.overrides);
  assert.equal(t.kcal, 2240);
  assert.equal(t.protein, 144);
  assert.equal(t.fat, 65);
  assert.equal(waterTargetMl(s.profile, s.overrides, undefined, true), 3250);
  assert.equal(waterTargetMl(s.profile, s.overrides, undefined, false), 2750);
});

test('Liftbook import maps habits, creatine and water', () => {
  const s = importLiftbook(fixture);
  assert.deepEqual(s.days['2026-11-05'].challenges, { pushups: 30, pullups: 9 });
  assert.equal(s.days['2026-11-06'].supplements[0].amount, 3);
  assert.equal(s.days['2026-11-06'].waterMl, 4000);
  assert.equal(s.challenges.find((c) => c.id === 'pushups')?.target, 40);
});

test('sport adds net burn as carbs', () => {
  const s = importLiftbook(fixture);
  const t = dayTargets(s.profile, s.overrides, s.days['2026-11-06'], s.sports);
  assert.equal(t.sportExtra, Math.round(6 * 72 * 0.5));
  assert.equal(t.kcal, 2240 + t.sportExtra);
});

test('female BMR and overrides', () => {
  const p: Profile = { age: 30, heightCm: 165, weightKg: 60, sex: 'female', units: 'metric', goal: 'maintain', trainingDaysPerWeek: 3, steps: 'low' };
  const t = baseTargets(p, { kcal: 2000 });
  assert.equal(t.kcal, 2000);
  assert.ok(t.calculated.kcal < 2000);
});

test('protein powder counts toward macros, creatine does not', () => {
  const s = importLiftbook(fixture);
  const d = blank('2026-11-11', { supplements: [
    { id: '1', productId: 'whey', amount: 1.5, at: 0 },
    { id: '2', productId: 'creatine', amount: 5, at: 0 },
  ] });
  const t = dayTotals(d, s.products);
  assert.equal(t.p, 36);
  assert.equal(t.kcal, 180);
});

test('double progression suggests weight only after top of range on every set', () => {
  const m = { name: 'Lat Row', sets: 3, repLow: 8, repHigh: 12, stepKg: 2.5, restSec: 90 };
  const sets = (r: number[]) => r.map((reps, i) => ({ id: String(i), ex: 'Lat Row', kg: 40, reps }));
  const up = suggest({ '2026-11-01': blank('2026-11-01', { sets: sets([12, 12, 12]) }) }, 'Lat Row', '2026-11-05', m);
  assert.equal(up.kind, 'increase');
  assert.equal(up.kg, 42.5);
  const stay = suggest({ '2026-11-01': blank('2026-11-01', { sets: sets([12, 10, 9]) }) }, 'Lat Row', '2026-11-05', m);
  assert.equal(stay.kind, 'beat');
  assert.equal(stay.kg, 40);
  assert.equal(Math.round(e1rm(100, 5) * 10) / 10, 116.7);
});

test('recovery estimate and streak', () => {
  const days = {
    '2026-11-10': blank('2026-11-10', { sets: [1, 2, 3].map((i) => ({ id: String(i), ex: 'Incline Press', kg: 20, reps: 10 })) }),
    '2026-11-09': blank('2026-11-09', { challenges: { pushups: 10 } }),
  };
  const r = recoveryStatus(days, new Date(2026, 10, 11, 7));
  const chest = r.find((x) => x.muscle === 'chest');
  assert.ok(chest && chest.recovered > 0.1 && chest.recovered < 0.4);
  const active = (d: DayLog) => d.sets.length > 0 || Object.values(d.challenges).some((v) => v > 0);
  assert.equal(activeStreak(days, '2026-11-11', active), 2);
});

test('default sports list has MET values', () => {
  assert.ok(DEFAULT_SPORTS.every((s) => s.met > 1));
});
