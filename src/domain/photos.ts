// Ordering and pairing rules for progress photos. Pure functions: no image data passes through here.
import type { ISODate, PhotoPose, ProgressPhoto } from './types';

export const POSES: { value: PhotoPose; label: string }[] = [
  { value: 'front', label: 'Front' }, { value: 'side', label: 'Side' }, { value: 'back', label: 'Back' },
];
export const poseLabel = (p: PhotoPose) => POSES.find((x) => x.value === p)?.label ?? p;
const ORDER: Record<PhotoPose, number> = { front: 0, side: 1, back: 2 };

/** Newest day first. Within a day: front, side, back, then the order they were added. */
export function byDate(photos: ProgressPhoto[]): { date: ISODate; items: ProgressPhoto[] }[] {
  const map = new Map<ISODate, ProgressPhoto[]>();
  for (const p of photos) map.set(p.date, [...(map.get(p.date) ?? []), p]);
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({ date, items: items.sort((a, b) => ORDER[a.pose] - ORDER[b.pose] || a.at - b.at) }));
}

/** One photo per day for a pose, oldest first. If a day has several, the last one added stands for it. */
export function poseTimeline(photos: ProgressPhoto[], pose: PhotoPose): ProgressPhoto[] {
  const perDay = new Map<ISODate, ProgressPhoto>();
  for (const p of photos) {
    if (p.pose !== pose) continue;
    const cur = perDay.get(p.date);
    if (!cur || p.at >= cur.at) perDay.set(p.date, p);
  }
  return [...perDay.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Poses with photos on at least two different days, so there is something to compare. */
export const comparablePoses = (photos: ProgressPhoto[]): PhotoPose[] =>
  POSES.map((p) => p.value).filter((pose) => poseTimeline(photos, pose).length >= 2);

/** The most recent photos, newest day first. */
export const latestPhotos = (photos: ProgressPhoto[], n: number): ProgressPhoto[] =>
  byDate(photos).flatMap((d) => d.items).slice(0, n);

/** Largest size that fits a `max` long edge. Never enlarges. */
export function fitWithin(w: number, h: number, max: number): { w: number; h: number } {
  const long = Math.max(w, h);
  if (long <= max || long <= 0) return { w, h };
  const k = max / long;
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}
