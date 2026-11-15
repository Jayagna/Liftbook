// Live-workout logic: what comes next, how long to rest, and the end-of-session summary.
// Pure functions so the screen stays thin and this can be tested.
import { bestEver, e1rm, isPR, lastBefore } from './progression';
import type { DayLog, ISODate, LoggedSet, PlannedExercise, WorkoutSession } from './types';

export interface Next { index: number; setNumber: number }

const done = (sets: LoggedSet[], name: string) => sets.filter((s) => s.ex === name).length;

/**
 * The next set to do. Straight sets finish one exercise before moving on; supersets
 * alternate (A1, B1, rest, A2, B2 …). Skipped exercises are passed over.
 */
export function nextUp(exercises: PlannedExercise[], sets: LoggedSet[], skipped: string[] = []): Next | null {
  let i = 0;
  while (i < exercises.length) {
    const g = exercises[i].superset;
    let j = i + 1;
    if (g != null) while (j < exercises.length && exercises[j].superset === g) j++;
    const block = exercises.slice(i, j).map((e, k) => ({ e, index: i + k })).filter((x) => !skipped.includes(x.e.name));
    const rounds = Math.max(0, ...block.map((x) => x.e.sets));
    for (let r = 1; r <= rounds; r++) {
      for (const x of block) if (r <= x.e.sets && done(sets, x.e.name) < r) return { index: x.index, setNumber: r };
    }
    i = j;
  }
  return null;
}

/**
 * Seconds to rest after a set of exercises[index] when exercises[upcoming] is next.
 * Moving on to a superset partner in the same round is 0: go straight to it. Nothing left is 0 too.
 */
export function restBefore(exercises: PlannedExercise[], index: number, upcoming: number | null): number {
  const e = exercises[index];
  if (!e || upcoming == null) return 0;
  const partner = exercises[upcoming];
  if (e.superset != null && partner?.superset === e.superset && upcoming > index) return 0;
  return e.restSec;
}

/** Seconds to rest after logging a set of exercises[index], following the plan order. */
export function restAfter(exercises: PlannedExercise[], index: number, setsAfter: LoggedSet[], skipped: string[] = []): number {
  return restBefore(exercises, index, nextUp(exercises, setsAfter, skipped)?.index ?? null);
}

/** The exercises that share a superset with exercises[index] (just itself for straight sets). */
export function blockOf(exercises: PlannedExercise[], index: number): { start: number; end: number } {
  const g = exercises[index]?.superset;
  if (g == null) return { start: index, end: index + 1 };
  let start = index, end = index + 1;
  while (start > 0 && exercises[start - 1].superset === g) start--;
  while (end < exercises.length && exercises[end].superset === g) end++;
  return { start, end };
}

/**
 * When the user jumps to an exercise out of order, stay with it (and its superset partners)
 * until that block is done. Returns the index to stay on, or null to go back to the plan order.
 */
export function nextInBlock(exercises: PlannedExercise[], index: number, sets: LoggedSet[], skipped: string[] = []): number | null {
  const { start, end } = blockOf(exercises, index);
  const n = nextUp(exercises.slice(start, end), sets, skipped);
  return n ? start + n.index : null;
}

/**
 * What to pre-fill for the next set: what you last did, never the suggested increase.
 * A heavier weight is only used once the user accepts the recommendation.
 */
export function prefill(days: Record<ISODate, DayLog>, date: ISODate, e: PlannedExercise): { kg: number; reps: number } {
  const mine = (days[date]?.sets ?? []).filter((s) => s.ex === e.name);
  if (mine.length) { const l = mine[mine.length - 1]; return { kg: l.kg, reps: l.reps }; }
  const last = lastBefore(days, e.name, date);
  if (!last) return { kg: e.targetKg && e.targetKg > 0 ? e.targetKg : 0, reps: e.repLow };
  const top = Math.max(...last.sets.map((s) => s.kg));
  const working = last.sets.filter((s) => s.kg === top);
  return { kg: top, reps: working[0].reps };
}

/** A workout left open on an earlier day ends at that day's last logged change, not "now". */
export function staleEnd(s: WorkoutSession, day: DayLog | undefined): number {
  const last = day?.rev ?? s.startedAt;
  return Math.max(s.startedAt, s.pausedAt ?? last);
}

export function elapsedSec(s: WorkoutSession, now: number): number {
  const end = s.pausedAt ?? now;
  return Math.max(0, Math.round((end - s.startedAt - s.pausedMs) / 1000));
}

export interface Summary {
  sets: number; exercises: number; volumeKg: number; reps: number; prs: { ex: string; kg: number; reps: number }[];
  plannedSets: number;
}

export function summarize(days: Record<ISODate, DayLog>, date: ISODate, planned: PlannedExercise[], skipped: string[] = []): Summary {
  const sets = days[date]?.sets ?? [];
  const prs: Summary['prs'] = [];
  for (const name of new Set(sets.map((s) => s.ex))) {
    let best = bestEver(days, name, date);
    if (best <= 0) continue; // first time doing a lift isn't counted as a record
    let top: LoggedSet | null = null;
    for (const s of sets.filter((x) => x.ex === name)) if (isPR(s, best)) { best = e1rm(s.kg, s.reps); top = s; }
    if (top) prs.push({ ex: name, kg: top.kg, reps: top.reps });
  }
  return {
    sets: sets.length,
    exercises: new Set(sets.map((s) => s.ex)).size,
    volumeKg: Math.round(sets.reduce((a, s) => a + s.kg * s.reps, 0)),
    reps: sets.reduce((a, s) => a + s.reps, 0),
    prs,
    plannedSets: planned.filter((e) => !skipped.includes(e.name)).reduce((a, e) => a + e.sets, 0),
  };
}

export const fmtClock = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};
