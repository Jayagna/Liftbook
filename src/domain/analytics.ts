// Trends over a date range, split into buckets a phone-width chart can show:
// days for a week, weeks for 30 and 90 days, months for a year. Pure, so it can be tested.
import { addDays, parseISO, shortDate, weekStart } from './dates';
import { dayTotals } from './nutrition';
import { e1rm } from './progression';
import type { DayLog, ISODate, SupplementProduct } from './types';

export type Range = 7 | 30 | 90 | 365;

export interface Bucket {
  /** Short axis label: "Mon", "3 Nov", "Nov". */
  label: string;
  /** Longer label for the readout: "Mon 10 Nov", "Week of 3 Nov", "November". */
  title: string;
  from: ISODate;
  to: ISODate;
  workouts: number;
  sets: number;
  volumeKg: number;
  /** Averages over the days that have a log, or null when there is none. */
  kcal: number | null;
  protein: number | null;
  waterMl: number | null;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const volume = (d: DayLog | undefined) => (d ? d.sets.reduce((a, s) => a + s.kg * s.reps, 0) : 0);
const datesBetween = (from: ISODate, to: ISODate) => {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};

function summarise(days: Record<ISODate, DayLog>, products: SupplementProduct[], dates: ISODate[]) {
  const logs = dates.map((d) => days[d]).filter(Boolean) as DayLog[];
  const fed = logs.filter((d) => d.meals.length > 0).map((d) => dayTotals(d, products));
  return {
    workouts: logs.filter((d) => d.sets.length > 0).length,
    sets: logs.reduce((a, d) => a + d.sets.length, 0),
    volumeKg: Math.round(logs.reduce((a, d) => a + volume(d), 0)),
    kcal: avg(fed.map((t) => t.kcal)),
    protein: avg(fed.map((t) => t.p)),
    waterMl: avg(logs.filter((d) => d.waterMl > 0).map((d) => d.waterMl)),
  };
}

/** The buckets for a range ending on `end` (inclusive), oldest first. */
export function buckets(days: Record<ISODate, DayLog>, products: SupplementProduct[], end: ISODate, range: Range): Bucket[] {
  const start = addDays(end, -range + 1);
  const spans: { label: string; title: string; from: ISODate; to: ISODate }[] = [];
  if (range === 7) {
    for (const d of datesBetween(start, end)) {
      const dt = parseISO(d);
      spans.push({ label: dt.toLocaleDateString(undefined, { weekday: 'short' }), title: dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }), from: d, to: d });
    }
  } else if (range === 365) {
    let from = start;
    while (from <= end) {
      const dt = parseISO(from);
      const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
      const monthEnd = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
      const to = monthEnd < end ? monthEnd : end;
      spans.push({ label: dt.toLocaleDateString(undefined, { month: 'short' }), title: dt.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), from, to });
      from = addDays(to, 1);
    }
  } else {
    // Monday-to-Sunday weeks, with the first and last clipped to the range.
    let from = start;
    while (from <= end) {
      const sunday = addDays(weekStart(from), 6);
      const to = sunday < end ? sunday : end;
      spans.push({ label: shortDate(from), title: `Week of ${shortDate(weekStart(from))}`, from, to });
      from = addDays(to, 1);
    }
  }
  return spans.map((s) => ({ ...s, ...summarise(days, products, datesBetween(s.from, s.to)) }));
}

export interface PR { ex: string; date: ISODate; kg: number; reps: number; e1rm: number; gain: number }

/** New all-time bests set inside the range (first-ever sessions don't count), newest first, one per lift. */
export function personalBests(days: Record<ISODate, DayLog>, start: ISODate, end: ISODate): PR[] {
  const best = new Map<string, number>();
  const out = new Map<string, PR>();
  for (const date of Object.keys(days).sort()) {
    if (date > end) break;
    // Compare against earlier days only, so several sets in one session count as one record.
    const dayBest = new Map<string, { kg: number; reps: number; v: number }>();
    for (const s of days[date].sets) {
      const v = e1rm(s.kg, s.reps);
      if (v > (dayBest.get(s.ex)?.v ?? 0)) dayBest.set(s.ex, { kg: s.kg, reps: s.reps, v });
    }
    for (const [ex, top] of dayBest) {
      const prev = best.get(ex);
      if (prev != null && top.v > prev + 0.01 && date >= start) {
        const first = out.get(ex);
        out.set(ex, { ex, date, kg: top.kg, reps: top.reps, e1rm: Math.round(top.v * 10) / 10, gain: Math.round((top.v - (first ? first.e1rm - first.gain : prev)) * 10) / 10 });
      }
      if (prev == null || top.v > prev) best.set(ex, top.v);
    }
  }
  return [...out.values()].sort((a, b) => b.date.localeCompare(a.date) || b.gain - a.gain);
}

export interface Overview {
  workouts: number; sets: number; volumeKg: number;
  prev: { workouts: number; volumeKg: number };
  /** Days with food logged, and how many of them reached 90% of the protein target. */
  fedDays: number; proteinDays: number; kcal: number | null; protein: number | null;
  waterDays: number; waterMl: number | null;
  /** First and last weigh-in inside the range. */
  weight: { first: number; last: number; change: number } | null;
}

export function overview(days: Record<ISODate, DayLog>, products: SupplementProduct[], end: ISODate, range: Range, proteinTarget: number): Overview {
  const start = addDays(end, -range + 1);
  const dates = datesBetween(start, end);
  const now = summarise(days, products, dates);
  const before = summarise(days, products, datesBetween(addDays(start, -range), addDays(start, -1)));
  const fed = dates.map((d) => days[d]).filter((d): d is DayLog => !!d && d.meals.length > 0);
  const weighIns = dates.map((d) => days[d]?.bw).filter((x): x is number => typeof x === 'number' && x > 0);
  return {
    workouts: now.workouts, sets: now.sets, volumeKg: now.volumeKg,
    prev: { workouts: before.workouts, volumeKg: before.volumeKg },
    fedDays: fed.length,
    proteinDays: fed.filter((d) => dayTotals(d, products).p >= proteinTarget * 0.9).length,
    kcal: now.kcal == null ? null : Math.round(now.kcal),
    protein: now.protein == null ? null : Math.round(now.protein),
    waterDays: dates.filter((d) => (days[d]?.waterMl ?? 0) > 0).length,
    waterMl: now.waterMl == null ? null : Math.round(now.waterMl),
    weight: weighIns.length >= 2 ? { first: weighIns[0], last: weighIns[weighIns.length - 1], change: Math.round((weighIns[weighIns.length - 1] - weighIns[0]) * 10) / 10 } : null,
  };
}

/** One challenge's daily totals inside the range, skipping days with nothing logged. */
export function challengeSeries(days: Record<ISODate, DayLog>, id: string, start: ISODate, end: ISODate) {
  return datesBetween(start, end).map((d) => ({ date: d, value: days[d]?.challenges[id] ?? 0 })).filter((x) => x.value > 0);
}
