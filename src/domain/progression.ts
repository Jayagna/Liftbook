// Ported from Liftbook: e1RM, history lookups, PR detection and double-progression
// suggestions. Suggestions are only ever shown; the user accepts them by logging.
import type { DayLog, ISODate, LoggedSet, PlannedExercise } from './types';

export const e1rm = (kg: number, reps: number) => (kg > 0 ? kg * (1 + reps / 30) : reps);
const r1 = (n: number) => Math.round(n * 10) / 10;
export const fmtKg = (n: number) => (Math.round(n * 10) / 10).toString();

export function sessionsFor(days: Record<ISODate, DayLog>, name: string) {
  return Object.keys(days)
    .sort()
    .map((date) => ({ date, sets: days[date].sets.filter((s) => s.ex === name) }))
    .filter((s) => s.sets.length > 0);
}

export function lastBefore(days: Record<ISODate, DayLog>, name: string, date: ISODate) {
  const s = sessionsFor(days, name).filter((x) => x.date < date);
  return s.length ? s[s.length - 1] : null;
}

export function bestEver(days: Record<ISODate, DayLog>, name: string, beforeDate: ISODate) {
  let b = 0;
  for (const s of sessionsFor(days, name)) if (s.date < beforeDate) for (const x of s.sets) b = Math.max(b, e1rm(x.kg, x.reps));
  return b;
}

export const isPR = (set: LoggedSet, prevBest: number) => prevBest > 0 && e1rm(set.kg, set.reps) > prevBest + 0.01;

export type Suggestion =
  | { kind: 'first'; kg: number | null; reps: number | null }
  | { kind: 'increase'; last: LoggedSet[]; lastDate: ISODate; kg: number; reps: number }
  | { kind: 'harder'; last: LoggedSet[]; lastDate: ISODate; kg: number; reps: number }
  | { kind: 'beat'; last: LoggedSet[]; lastDate: ISODate; kg: number; reps: number };

export function suggest(days: Record<ISODate, DayLog>, name: string, date: ISODate, m?: PlannedExercise): Suggestion {
  const last = lastBefore(days, name, date);
  if (!last) return { kind: 'first', kg: null, reps: m ? m.repLow : null };
  const top = Math.max(...last.sets.map((s) => s.kg));
  const working = last.sets.filter((s) => s.kg === top);
  const best = Math.max(...working.map((s) => s.reps));
  if (!m) return { kind: 'beat', last: last.sets, lastDate: last.date, kg: top, reps: best };
  const allTop = working.length >= Math.min(m.sets, last.sets.length) && working.every((s) => s.reps >= m.repHigh);
  if (allTop && m.stepKg > 0) return { kind: 'increase', last: last.sets, lastDate: last.date, kg: r1(top + m.stepKg), reps: m.repLow };
  if (allTop) return { kind: 'harder', last: last.sets, lastDate: last.date, kg: top, reps: m.repLow };
  return { kind: 'beat', last: last.sets, lastDate: last.date, kg: top, reps: Math.min(best + 1, m.repHigh) };
}

/**
 * Rough session length: 10 min warm-up + 5 min cool-down, ~1 min setup per exercise, work + rest per set.
 * Inside a superset only the last exercise of the round takes its full rest.
 */
export const sessionMinutes = (ex: PlannedExercise[]) =>
  Math.round(15 + ex.length + ex.reduce((a, e, i) => {
    const midSuperset = e.superset != null && ex[i + 1]?.superset === e.superset;
    return a + e.sets * ((e.restSec >= 120 ? 60 : 45) + (midSuperset ? 15 : e.restSec));
  }, 0) / 60);
