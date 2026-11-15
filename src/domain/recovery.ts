// Estimated recovery per muscle group from logged sets. This is a rule-of-thumb
// estimate from training volume and time elapsed, not a physiological measurement.
import { RECOVERY_HOURS, findExercise } from './exercises';
import { parseISO } from './dates';
import type { DayLog, ISODate, MuscleGroup } from './types';

export interface MuscleRecovery {
  muscle: MuscleGroup;
  lastTrained: ISODate;
  /** 0 = just trained hard, 1 = fully recovered. */
  recovered: number;
  sets: number;
}

/** Assumes sessions end around 7 pm local time on the logged date. */
export function recoveryStatus(days: Record<ISODate, DayLog>, now: Date = new Date(), lookbackDays = 7): MuscleRecovery[] {
  const out = new Map<MuscleGroup, MuscleRecovery>();
  const cutoff = now.getTime() - lookbackDays * 86400000;
  for (const date of Object.keys(days).sort()) {
    const t = parseISO(date).getTime() + 19 * 3600000;
    if (t < cutoff || t > now.getTime() + 86400000) continue;
    const perMuscle = new Map<MuscleGroup, number>();
    for (const s of days[date].sets) {
      const ex = findExercise(s.ex);
      if (!ex) continue;
      ex.primary.forEach((m) => perMuscle.set(m, (perMuscle.get(m) ?? 0) + 1));
      ex.secondary.forEach((m) => perMuscle.set(m, (perMuscle.get(m) ?? 0) + 0.5));
    }
    for (const [m, sets] of perMuscle) {
      if (sets < 2) continue;
      // More than ~10 hard sets stretches recovery by up to 25%.
      const hours = RECOVERY_HOURS[m] * (1 + Math.min(0.25, Math.max(0, (sets - 10) / 40)));
      const elapsed = Math.max(0, (now.getTime() - t) / 3600000);
      out.set(m, { muscle: m, lastTrained: date, sets, recovered: Math.min(1, elapsed / hours) });
    }
  }
  return [...out.values()].sort((a, b) => a.recovered - b.recovered);
}

/** Consecutive days (ending today or yesterday) with any training, sport or challenge logged. */
export function activeStreak(days: Record<ISODate, DayLog>, todayIso: ISODate, isActive: (d: DayLog) => boolean): number {
  let n = 0;
  const d = parseISO(todayIso);
  const key = () => {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 10);
  };
  if (!(days[key()] && isActive(days[key()]))) d.setDate(d.getDate() - 1);
  while (days[key()] && isActive(days[key()])) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
