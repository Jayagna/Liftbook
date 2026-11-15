import { useMemo } from 'react';
import { dow as dowOf, today } from '@/domain/dates';
import { dayTotals } from '@/domain/nutrition';
import { sessionMinutes } from '@/domain/progression';
import { dayTargets, waterTargetMl } from '@/domain/targets';
import type { AppState } from './store';
import { useApp } from './store';

export const plannedWorkout = (s: AppState, date: string) => {
  const d = s.days[date];
  if (d?.split === 'rest') return null;
  if (d?.split) return s.plan.find((p) => p.id === d.split) ?? null;
  return s.plan.find((p) => p.dow === dowOf(date)) ?? null;
};

/** Everything the dashboard needs for one date, derived from state with normal app logic. */
export function useDaySummary(date = today()) {
  const profile = useApp((s) => s.profile);
  const overrides = useApp((s) => s.overrides);
  const day = useApp((s) => s.days[date]);
  const products = useApp((s) => s.products);
  const sports = useApp((s) => s.sports);
  const plan = useApp((s) => s.plan);
  return useMemo(() => {
    if (!profile) return null;
    const workout = plannedWorkout({ days: { [date]: day }, plan } as AppState, date);
    const targets = dayTargets(profile, overrides, day, sports);
    const totals = dayTotals(day, products);
    const waterTarget = waterTargetMl(profile, overrides, day, !!workout);
    return {
      date, profile, day, targets, totals, workout, waterTarget,
      waterMl: day?.waterMl ?? 0,
      workoutMinutes: workout ? sessionMinutes(workout.exercises) : 0,
      setsDone: day?.sets.length ?? 0,
    };
  }, [profile, overrides, day, products, sports, plan, date]);
}
