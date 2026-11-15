/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EXERCISES } from './exercises';
import { generatePlan, recoveryConflicts, suggestedWeek } from './planner';
import { sessionMinutes } from './progression';
import type { TrainingPrefs } from './types';

const prefs = (over: Partial<TrainingPrefs> = {}): TrainingPrefs => ({
  week: suggestedWeek(4), sessionMin: 75, location: 'gym', equipment: [], experience: 'intermediate', prefer: [], avoid: [], limitations: '', ...over,
});

test('generated sessions fit the time budget and put compounds first', () => {
  const plan = generatePlan(prefs(), 'muscle');
  assert.equal(plan.length, 4);
  for (const d of plan) {
    assert.ok(d.exercises.length >= 3, d.name);
    assert.ok(sessionMinutes(d.exercises) <= 75 + 5, `${d.name} ${sessionMinutes(d.exercises)}`);
  }
});

test('home training with dumbbells uses only available equipment and respects avoid list', () => {
  const plan = generatePlan(prefs({ location: 'home', equipment: ['dumbbell'], avoid: ['Push-up'] }), 'general');
  const names = plan.flatMap((d) => d.exercises.map((e) => e.name));
  assert.ok(!names.includes('Leg Press'));
  assert.ok(!names.includes('Push-up'));
  for (const n of names) {
    const ex = EXERCISES.find((e) => e.name === n)!;
    assert.ok(ex.equipment.some((q) => q === 'dumbbell' || q === 'bodyweight'), n);
  }
});

test('locked days survive regeneration', () => {
  const first = generatePlan(prefs(), 'muscle');
  const custom = first.map((d) => (d.dow === 1 ? { ...d, exercises: d.exercises.slice(0, 1) } : d));
  const again = generatePlan(prefs(), 'strength', custom, [1]);
  assert.equal(again.find((d) => d.dow === 1)?.exercises.length, 1);
});

test('moving legs next to legs flags a recovery conflict', () => {
  const plan = generatePlan(prefs({ week: { 3: ['legs'], 4: ['legs', 'glutes'] } }), 'muscle');
  const c = recoveryConflicts(plan);
  assert.equal(c.length, 1);
  assert.ok(c[0].muscles.includes('quads') || c[0].muscles.includes('hamstrings'));
  assert.equal(recoveryConflicts(generatePlan(prefs(), 'muscle')).length, 0);
});
