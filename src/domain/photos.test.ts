import assert from 'node:assert/strict';
import { test } from 'node:test';
import { byDate, comparablePoses, fitWithin, latestPhotos, poseTimeline } from './photos';
import type { ProgressPhoto } from './types';

const P = (id: string, date: string, pose: ProgressPhoto['pose'], at: number): ProgressPhoto => ({ id, date, pose, w: 900, h: 1200, at });

test('photos group by day, newest first, front then side then back', () => {
  const g = byDate([P('a', '2026-11-01', 'back', 1), P('b', '2026-11-08', 'side', 2), P('c', '2026-11-01', 'front', 3), P('d', '2026-11-08', 'front', 4)]);
  assert.deepEqual(g.map((x) => x.date), ['2026-11-08', '2026-11-01']);
  assert.deepEqual(g[0].items.map((x) => x.id), ['d', 'b']);
  assert.deepEqual(g[1].items.map((x) => x.id), ['c', 'a']);
});

test('a pose timeline keeps one photo per day, the last one added', () => {
  const t = poseTimeline([P('a', '2026-11-08', 'front', 1), P('b', '2026-11-01', 'front', 2), P('c', '2026-11-08', 'front', 3), P('d', '2026-11-08', 'side', 4)], 'front');
  assert.deepEqual(t.map((x) => x.id), ['b', 'c']);
});

test('a pose is comparable only with photos on two different days', () => {
  const photos = [P('a', '2026-11-01', 'front', 1), P('b', '2026-11-08', 'front', 2), P('c', '2026-11-08', 'side', 3), P('d', '2026-11-08', 'side', 4)];
  assert.deepEqual(comparablePoses(photos), ['front']);
  assert.deepEqual(comparablePoses([]), []);
});

test('latest photos come from the newest day first', () => {
  const l = latestPhotos([P('a', '2026-11-01', 'front', 1), P('b', '2026-11-08', 'back', 2), P('c', '2026-11-08', 'front', 3)], 2);
  assert.deepEqual(l.map((x) => x.id), ['c', 'b']);
});

test('photos are scaled down to fit and never enlarged', () => {
  assert.deepEqual(fitWithin(3024, 4032, 1600), { w: 1200, h: 1600 });
  assert.deepEqual(fitWithin(4032, 3024, 1600), { w: 1600, h: 1200 });
  assert.deepEqual(fitWithin(800, 600, 1600), { w: 800, h: 600 });
  assert.deepEqual(fitWithin(0, 0, 1600), { w: 0, h: 0 });
});
