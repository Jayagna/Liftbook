/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alternatives, moveDay, moveExercise, normalizeSupersets, rebuildDay, regeneratePlan, toggleSuperset, generatePlan, suggestedWeek, recoveryConflicts, inferFocus } from './planner';
import { sessionMinutes } from './progression';
import { blockOf, elapsedSec, fmtClock, nextInBlock, nextUp, prefill, restAfter, staleEnd, summarize } from './session';
import type { DayLog, LoggedSet, PlannedExercise, TrainingPrefs } from './types';

const E = (name: string, sets = 3, extra: Partial<PlannedExercise> = {}): PlannedExercise => ({ name, sets, repLow: 8, repHigh: 12, stepKg: 2.5, restSec: 90, ...extra });
const S = (ex: string, kg = 20, reps = 10): LoggedSet => ({ id: Math.random().toString(36), ex, kg, reps });
const prefs: TrainingPrefs = { week: suggestedWeek(4), sessionMin: 60, location: 'gym', equipment: [], experience: 'intermediate', prefer: [], avoid: [], limitations: '' };
const blank = (date: string, sets: LoggedSet[]): DayLog => ({ date, split: null, sets, meals: [], bw: null, waterMl: 0, sport: [], challenges: {}, supplements: [] });

test('straight sets finish one exercise before the next', () => {
  const ex = [E('Bench Press', 2), E('Chest Fly', 2)];
  assert.deepEqual(nextUp(ex, []), { index: 0, setNumber: 1 });
  assert.deepEqual(nextUp(ex, [S('Bench Press')]), { index: 0, setNumber: 2 });
  assert.deepEqual(nextUp(ex, [S('Bench Press'), S('Bench Press')]), { index: 1, setNumber: 1 });
  assert.equal(nextUp(ex, [S('Bench Press'), S('Bench Press'), S('Chest Fly'), S('Chest Fly')]), null);
});

test('supersets alternate and rest only after the round', () => {
  const ex = toggleSuperset([E('Preacher Curl', 2), E('Rope Pushdown', 2), E('Leg Raise', 1)], 0);
  assert.equal(ex[0].superset, ex[1].superset);
  assert.equal(ex[2].superset, undefined);
  const a1 = [S('Preacher Curl')];
  assert.deepEqual(nextUp(ex, a1), { index: 1, setNumber: 1 });
  assert.equal(restAfter(ex, 0, a1), 0);
  const b1 = [...a1, S('Rope Pushdown')];
  assert.deepEqual(nextUp(ex, b1), { index: 0, setNumber: 2 });
  assert.equal(restAfter(ex, 1, b1), 90);
});

test('skipped exercises are passed over, and no rest after the final set', () => {
  const ex = [E('Squat', 1), E('Leg Press', 1), E('Calf Raise', 1)];
  assert.deepEqual(nextUp(ex, [S('Squat')], ['Leg Press']), { index: 2, setNumber: 1 });
  assert.equal(restAfter(ex, 2, [S('Squat'), S('Calf Raise')], ['Leg Press']), 0);
});

test('superset editing: unlink, and groups break when reordered apart', () => {
  let ex = toggleSuperset([E('A'), E('B'), E('C')], 0);
  ex = toggleSuperset(ex, 1); // A+B+C
  assert.ok(ex.every((e) => e.superset === ex[0].superset));
  ex = toggleSuperset(ex, 0); // split A | B+C
  assert.equal(ex[0].superset, undefined);
  assert.equal(ex[1].superset, ex[2].superset);
  const moved = moveExercise(ex, 2, 0); // C, A, B -> B alone
  assert.ok(moved.every((e) => e.superset === undefined));
  assert.deepEqual(normalizeSupersets([E('A', 3, { superset: 5 }), E('B')]).map((e) => e.superset), [undefined, undefined]);
});

test('supersets shorten the estimated session', () => {
  const plain = [E('Preacher Curl'), E('Rope Pushdown')];
  assert.ok(sessionMinutes(toggleSuperset(plain, 0)) < sessionMinutes(plain));
});

test('rebuild keeps locked exercises; regenerate keeps locked days', () => {
  const plan = generatePlan(prefs, 'muscle');
  const mon = { ...plan[0], exercises: [{ ...E('Push-up', 5), locked: true }, ...plan[0].exercises.slice(1)] };
  const rebuilt = rebuildDay(mon, prefs, 'strength');
  assert.ok(rebuilt.exercises.some((e) => e.name === 'Push-up' && e.sets === 5 && e.locked));
  const lockedDay = { ...plan[1], locked: true, exercises: plan[1].exercises.slice(0, 1) };
  const again = regeneratePlan([mon, lockedDay, ...plan.slice(2)], prefs, 'strength');
  assert.equal(again[1].exercises.length, 1);
  assert.ok(again[2].exercises.length >= 3);
});

test('moving leg day swaps days and can raise a recovery conflict', () => {
  const plan = generatePlan({ ...prefs, week: { 1: ['legs'], 3: ['chest'], 5: ['legs', 'glutes'] } }, 'muscle');
  assert.equal(recoveryConflicts(plan).length, 0);
  const moved = moveDay(plan, 5, 2); // Friday legs to Tuesday, next to Monday legs
  assert.equal(moved.find((d) => d.dow === 2)?.name, 'Legs + Glutes');
  assert.equal(recoveryConflicts(moved).length, 1);
  const swapped = moveDay(plan, 1, 3);
  assert.equal(swapped.find((d) => d.dow === 3)?.name, 'Legs');
  assert.equal(swapped.find((d) => d.dow === 1)?.name, 'Chest');
});

test('alternatives hit the same muscle and respect equipment', () => {
  const alts = alternatives('Bench Press', { ...prefs, location: 'home', equipment: ['dumbbell'] }, ['Push-up']);
  assert.ok(alts.length > 0);
  assert.ok(alts.every((e) => e.primary.includes('chest') || e.secondary.includes('chest') || e.primary.some((m) => m === 'chest')));
  assert.ok(!alts.some((e) => e.name === 'Push-up' || e.name === 'Chest Fly'));
});

test('focus is inferred for days without saved muscle groups', () => {
  assert.deepEqual(inferFocus({ id: 'x', name: 'Mine', dow: 1, exercises: [E('Incline Press', 4), E('Rope Pushdown', 3)] }), ['chest', 'triceps']);
});

test('summary counts volume and personal records, clock formats', () => {
  const days = {
    '2026-11-01': blank('2026-11-01', [S('Bench Press', 50, 10)]),
    '2026-11-08': blank('2026-11-08', [S('Bench Press', 52.5, 10), S('Bench Press', 52.5, 9), S('Squat', 60, 8)]),
  };
  const s = summarize(days, '2026-11-08', [E('Bench Press', 3), E('Squat', 3)]);
  assert.equal(s.sets, 3);
  assert.equal(s.volumeKg, Math.round(52.5 * 19 + 480));
  assert.deepEqual(s.prs.map((p) => p.ex), ['Bench Press']);
  assert.equal(s.plannedSets, 6);
  assert.equal(fmtClock(75), '1:15');
  assert.equal(fmtClock(3725), '1:02:05');
  assert.equal(elapsedSec({ date: 'x', dayId: null, exercises: [], startedAt: 0, pausedAt: 60000, pausedMs: 10000, skipped: [], restEndsAt: null, restTotalSec: 0 }, 999999), 50);
});

test('prefill uses what was last lifted, never the suggested increase', () => {
  const bench = E('Bench Press', 2, { repLow: 6, repHigh: 10, targetKg: 40 });
  // No history: the starting weight from the plan.
  assert.deepEqual(prefill({}, '2026-11-10', bench), { kg: 40, reps: 6 });
  assert.deepEqual(prefill({}, '2026-11-10', E('Chest Fly')), { kg: 0, reps: 8 });
  // Hit the top of the range on every set: the suggestion would be 62.5, the prefill stays 60.
  const days = { '2026-11-03': blank('2026-11-03', [S('Bench Press', 40, 12), S('Bench Press', 60, 10), S('Bench Press', 60, 10)]) };
  assert.deepEqual(prefill(days, '2026-11-10', bench), { kg: 60, reps: 10 });
  // Once a set is logged today, follow that.
  const withToday = { ...days, '2026-11-10': blank('2026-11-10', [S('Bench Press', 62.5, 7)]) };
  assert.deepEqual(prefill(withToday, '2026-11-10', bench), { kg: 62.5, reps: 7 });
});

test('jumping to an exercise stays with its block until it is done', () => {
  const ex = toggleSuperset([E('Squat', 2), E('Preacher Curl', 2), E('Rope Pushdown', 2)], 1);
  assert.deepEqual(blockOf(ex, 0), { start: 0, end: 1 });
  assert.deepEqual(blockOf(ex, 2), { start: 1, end: 3 });
  // Jumped to the superset before finishing squats: alternate inside it.
  assert.equal(nextInBlock(ex, 1, [S('Preacher Curl')]), 2);
  assert.equal(nextInBlock(ex, 2, [S('Preacher Curl'), S('Rope Pushdown')]), 1);
  const all = [S('Preacher Curl'), S('Rope Pushdown'), S('Preacher Curl'), S('Rope Pushdown')];
  assert.equal(nextInBlock(ex, 2, all), null);
  assert.deepEqual(nextUp(ex, all), { index: 0, setNumber: 1 });
});

test('a workout left open overnight ends at the last logged change', () => {
  const s = { date: '2026-11-10', dayId: null, exercises: [], startedAt: 1000, pausedAt: null, pausedMs: 0, skipped: [], restEndsAt: null, restTotalSec: 0 };
  assert.equal(staleEnd(s, { ...blank('2026-11-10', []), rev: 5000 } as DayLog), 5000);
  assert.equal(staleEnd(s, undefined), 1000);
  assert.equal(staleEnd({ ...s, pausedAt: 3000 }, { ...blank('2026-11-10', []), rev: 5000 } as DayLog), 3000);
});
