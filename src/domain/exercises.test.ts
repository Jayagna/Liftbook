/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUIDES, guideFor } from './exerciseGuides';
import { EXERCISES, MUSCLE_LABEL } from './exercises';

test('every built-in exercise has how-to steps, a cue and something to avoid', () => {
  for (const e of EXERCISES) {
    const g = guideFor(e.name);
    assert.ok(g, `no guide for ${e.name}`);
    assert.ok(g!.steps.length >= 2 && g!.cues.length >= 1 && g!.avoid.length >= 1, e.name);
  }
  // No guide is left pointing at an exercise that no longer exists.
  for (const name of Object.keys(GUIDES)) assert.ok(EXERCISES.some((e) => e.name === name), `orphan guide ${name}`);
});

test('exercise names are unique and every muscle has at least two exercises', () => {
  const names = EXERCISES.map((e) => e.name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
  for (const m of Object.keys(MUSCLE_LABEL)) {
    const n = EXERCISES.filter((e) => (e.primary as string[]).includes(m)).length;
    assert.ok(n >= 2, `${m} has ${n}`);
  }
});
