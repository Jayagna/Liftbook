/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buckets, challengeSeries, overview, personalBests } from './analytics';
import type { DayLog, LoggedSet, Meal } from './types';

const S = (ex: string, kg: number, reps: number): LoggedSet => ({ id: Math.random().toString(36), ex, kg, reps });
const M = (kcal: number, p: number): Meal => ({ id: Math.random().toString(36), name: 'x', qty: 1, kcal, p, c: 0, f: 0 });
const D = (date: string, x: Partial<DayLog> = {}): DayLog => ({ date, split: null, sets: [], meals: [], bw: null, waterMl: 0, sport: [], challenges: {}, supplements: [], ...x });
const byDate = (list: DayLog[]) => Object.fromEntries(list.map((d) => [d.date, d]));

test('a week is seven daily buckets and a day with no log has no averages', () => {
  const days = byDate([
    D('2026-11-10', { sets: [S('Squat', 100, 5), S('Squat', 100, 5)], meals: [M(2000, 120)], waterMl: 3000 }),
    D('2026-11-12', { meals: [M(1000, 50), M(800, 40)] }),
  ]);
  const b = buckets(days, [], '2026-11-12', 7);
  assert.equal(b.length, 7);
  assert.equal(b[0].from, '2026-11-06'); assert.equal(b[6].to, '2026-11-12');
  assert.deepEqual([b[4].workouts, b[4].sets, b[4].volumeKg, b[4].kcal, b[4].waterMl], [1, 2, 1000, 2000, 3000]);
  assert.equal(b[6].kcal, 1800); assert.equal(b[6].waterMl, null);
  assert.equal(b[5].kcal, null); assert.equal(b[5].workouts, 0);
});

test('30 and 90 days use Monday weeks clipped to the range, a year uses months', () => {
  const b30 = buckets({}, [], '2026-11-12', 30); // 14 Oct (Wed) to 12 Nov (Thu)
  assert.equal(b30[0].from, '2026-10-14'); assert.equal(b30[0].to, '2026-10-18');
  assert.equal(b30[1].from, '2026-10-19'); assert.equal(b30[b30.length - 1].to, '2026-11-12');
  assert.equal(b30.length, 5);
  for (let i = 1; i < b30.length; i++) assert.ok(b30[i].from > b30[i - 1].to); // no overlap, no gap checked below
  const covered = b30.reduce((a, x) => a + (Date.parse(x.to) - Date.parse(x.from)) / 86400000 + 1, 0);
  assert.equal(Math.round(covered), 30);
  assert.ok(buckets({}, [], '2026-11-12', 90).length <= 14);
  const year = buckets({}, [], '2026-11-12', 365);
  assert.equal(year.length, 13); // partial November last year through November this year
  assert.equal(year[0].from, '2025-11-13'); assert.equal(year[12].to, '2026-11-12');
});

test('personal bests: only real improvements inside the range, one per lift', () => {
  const days = byDate([
    D('2026-10-01', { sets: [S('Bench Press', 60, 8)] }),                       // first ever: not a record
    D('2026-11-03', { sets: [S('Bench Press', 60, 10), S('Bench Press', 60, 9)] }), // record in range
    D('2026-11-10', { sets: [S('Bench Press', 62.5, 10), S('Squat', 100, 5)] }),   // better again, squat is a first
    D('2026-11-11', { sets: [S('Bench Press', 50, 5)] }),
  ]);
  const prs = personalBests(days, '2026-11-01', '2026-11-12');
  assert.equal(prs.length, 1);
  assert.equal(prs[0].ex, 'Bench Press'); assert.equal(prs[0].date, '2026-11-10'); assert.equal(prs[0].kg, 62.5);
  // Gain is measured from the best before the range: 60x8 = 76, 62.5x10 = 83.3.
  assert.equal(prs[0].gain, 7.3);
  assert.deepEqual(personalBests(days, '2026-11-11', '2026-11-12'), []);
});

test('overview compares with the previous period and counts protein days', () => {
  const days = byDate([
    D('2026-10-30', { sets: [S('Squat', 100, 5)] }),                         // previous week
    D('2026-11-07', { sets: [S('Squat', 100, 5)], meals: [M(2100, 130)], bw: 70 }),
    D('2026-11-09', { sets: [S('Squat', 110, 5)], meals: [M(1900, 90)], waterMl: 2500 }),
    D('2026-11-12', { meals: [M(2000, 110)], bw: 69.4, waterMl: 3500 }),
  ]);
  const o = overview(days, [], '2026-11-12', 7, 120);
  assert.equal(o.workouts, 2); assert.equal(o.volumeKg, 1050); assert.deepEqual(o.prev, { workouts: 1, volumeKg: 500 });
  assert.equal(o.fedDays, 3); assert.equal(o.proteinDays, 2); // 130 and 110 reach 90% of 120, 90 does not
  assert.equal(o.kcal, 2000); assert.equal(o.waterDays, 2); assert.equal(o.waterMl, 3000);
  assert.deepEqual(o.weight, { first: 70, last: 69.4, change: -0.6 });
  assert.equal(overview({}, [], '2026-11-12', 30, 120).weight, null);
});

test('challenge series skips empty days', () => {
  const days = byDate([D('2026-11-10', { challenges: { pushups: 40 } }), D('2026-11-11'), D('2026-11-12', { challenges: { pushups: 55, plank: 60 } })]);
  assert.deepEqual(challengeSeries(days, 'pushups', '2026-11-06', '2026-11-12').map((x) => x.value), [40, 55]);
  assert.deepEqual(challengeSeries(days, 'squats', '2026-11-06', '2026-11-12'), []);
});
