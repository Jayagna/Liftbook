import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BACKUP_SCHEMA, backupSummary, emptyDay, makeBackup, mergeDashboard, readBackup, type BackupData } from './backup';
import { DEFAULT_DASHBOARD, DEFAULT_SPORTS } from './defaults';

const state = (): BackupData => ({
  profile: { age: 30, heightCm: 180, weightKg: 80, sex: 'male', units: 'metric', goal: 'recomp', trainingDaysPerWeek: 4, steps: 'mid' },
  overrides: { kcal: 2500 }, plan: [], challenges: [], products: [], sports: DEFAULT_SPORTS, dashboard: DEFAULT_DASHBOARD,
  training: null, nutrition: null, customExercises: [], templates: [], customFoods: [], savedMeals: [],
  days: {
    '2026-11-10': { ...emptyDay('2026-11-10'), sets: [{ id: 'a', ex: 'Squat', kg: 80, reps: 5 }], bw: 80.4 },
    '2026-11-11': { ...emptyDay('2026-11-11'), meals: [{ id: 'm', name: 'Eggs', qty: 2, kcal: 150, p: 12, c: 1, f: 10 }], waterMl: 500 },
    '2026-11-12': emptyDay('2026-11-12'),
  },
});

test('a backup round-trips and carries only backup fields', () => {
  const withExtras = { ...state(), photos: [{ id: 'p' }], session: { date: '2026-11-12' }, isSample: true, hydrated: true };
  const file = makeBackup(withExtras, new Date('2026-11-12T10:00:00Z'));
  assert.equal(file.schema, BACKUP_SCHEMA);
  assert.deepEqual(Object.keys(file.data).sort(), Object.keys(state()).sort());
  const back = readBackup(JSON.stringify(file));
  assert.ok(back.ok && back.kind === 'app');
  assert.deepEqual(back.data, state());
  assert.equal(back.exportedAt, '2026-11-12T10:00:00.000Z');
});

test('files that are not backups are refused with a reason', () => {
  for (const bad of ['', 'hello', '[]', '{}', '{"schema":"something.else"}', '{"schema":5}']) {
    const r = readBackup(bad);
    assert.equal(r.ok, false, bad);
  }
  const newer = readBackup('{"schema":"liftbook.app.v2","data":{"days":{}}}');
  assert.ok(!newer.ok && /newer version/.test(newer.error));
});

test('a damaged backup is refused whole, not half-loaded', () => {
  const noDays = readBackup(JSON.stringify({ schema: BACKUP_SCHEMA, data: { profile: null } }));
  assert.ok(!noDays.ok && /damaged/.test(noDays.error));
  const badKey = readBackup(JSON.stringify({ schema: BACKUP_SCHEMA, data: { days: { yesterday: {} } } }));
  assert.ok(!badKey.ok && /damaged/.test(badKey.error));
  const badDay = readBackup(JSON.stringify({ schema: BACKUP_SCHEMA, data: { days: { '2026-11-10': 'oops' } } }));
  assert.ok(!badDay.ok);
});

test('missing or wrong-typed fields fall back to safe defaults', () => {
  const r = readBackup(JSON.stringify({ schema: BACKUP_SCHEMA, data: { days: { '2026-11-10': { date: 'wrong', sets: 'x', waterMl: 'lots', bw: 80 } }, plan: 'nope', sports: [] } }));
  assert.ok(r.ok && r.kind === 'app');
  const d = r.data.days['2026-11-10'];
  assert.equal(d.date, '2026-11-10');
  assert.deepEqual(d.sets, []);
  assert.equal(d.waterMl, 0);
  assert.equal(d.bw, 80);
  assert.deepEqual(r.data.plan, []);
  assert.deepEqual(r.data.sports, DEFAULT_SPORTS);
  assert.deepEqual(r.data.dashboard, DEFAULT_DASHBOARD);
  assert.equal(r.data.profile, null);
});

test('the original Liftbook export is recognised and passed on untouched', () => {
  const r = readBackup(JSON.stringify({ schema: 'liftbook.v1', profile: {}, days: {} }));
  assert.ok(r.ok && r.kind === 'legacy');
});

test('the summary counts only days with something logged', () => {
  const s = backupSummary(state().days);
  assert.deepEqual(s, { days: 2, workouts: 1, meals: 1, first: '2026-11-10', last: '2026-11-11' });
  assert.deepEqual(backupSummary({}), { days: 0, workouts: 0, meals: 0, first: null, last: null });
});

test('a saved dashboard keeps its order and gains widgets added later', () => {
  const m = mergeDashboard({ order: ['workout', 'calories', 'retired-widget' as never], hidden: ['macros'] });
  assert.deepEqual(m.order.slice(0, 2), ['workout', 'calories']);
  assert.equal(m.order.includes('retired-widget' as never), false);
  assert.deepEqual([...m.order].sort(), [...DEFAULT_DASHBOARD.order].sort());
  assert.deepEqual(m.hidden, ['macros']);
});
