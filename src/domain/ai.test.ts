import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aiEndpoint, aiReady, coachContext, readEstimate } from './ai';
import { emptyDay } from './backup';

test('AI is only ready with a Supabase address, a key and a passcode', () => {
  const ok = { url: 'https://abcd1234.supabase.co/', anonKey: 'x'.repeat(40), passcode: 'gym' };
  assert.equal(aiReady(ok), true);
  assert.equal(aiEndpoint(ok), 'https://abcd1234.supabase.co/functions/v1/ai');
  assert.equal(aiReady({ ...ok, url: 'http://abcd.supabase.co' }), false);
  assert.equal(aiReady({ ...ok, url: 'https://evil.example.com' }), false);
  assert.equal(aiReady({ ...ok, passcode: ' ' }), false);
  assert.equal(aiReady(null), false);
});

test('a meal estimate drops broken items and distrusts numbers that do not add up', () => {
  const r = readEstimate({ note: 'ok', items: [
    { name: 'Dal', assumed: '1 bowl', kcal: 180, p: 10, c: 24, f: 5, confidence: 'high' },
    { name: 'Mystery', assumed: '', kcal: 900, p: 5, c: 5, f: 1, confidence: 'high' },
    { name: 'Broken', kcal: 'lots', p: 1, c: 1, f: 1 },
    { name: 'Huge', kcal: 99999, p: 1, c: 1, f: 1 },
    { name: '', kcal: 10, p: 1, c: 1, f: 0 },
  ] });
  assert.deepEqual(r.items.map((x) => [x.name, x.confidence]), [['Dal', 'high'], ['Mystery', 'low']]);
  assert.equal(r.note, 'ok');
  assert.deepEqual(readEstimate('nonsense'), { items: [], note: '' });
});

test('the summary shared with the AI has targets and totals but no name', () => {
  const profile = { name: 'Private Name', age: 29, heightCm: 178, weightKg: 72, sex: 'male' as const, units: 'metric' as const, goal: 'cut' as const, trainingDaysPerWeek: 4, steps: 'mid' as const };
  const days = { '2026-11-12': { ...emptyDay('2026-11-12'), bw: 71.8, waterMl: 900, meals: [{ id: 'm', name: 'Eggs', qty: 1, kcal: 300, p: 20, c: 2, f: 22 }] } };
  const text = coachContext({ profile, overrides: {}, plan: [], days, products: [] }, '2026-11-12');
  assert.ok(!text.includes('Private Name'));
  assert.match(text, /Daily targets: \d+ kcal/);
  assert.match(text, /Latest weigh-in: 71.8 kg/);
  assert.match(text, /Today so far: 300 kcal/);
  assert.equal(coachContext({ profile: null, overrides: {}, plan: [], days: {}, products: [] }, '2026-11-12'), '');
});
