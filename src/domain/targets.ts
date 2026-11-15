// Daily targets. Ported from Liftbook's targets()/dayTargets()/waterTarget() and
// generalised: sex-aware Mifflin-St Jeor, every goal type, and user overrides.
// All results are estimates; the UI labels them that way.
import type { DayLog, Goal, Profile, SportDef, TargetOverrides } from './types';

export const GOALS: { id: Goal; label: string; adjust: number; proteinPerKg: number; blurb: string }[] = [
  { id: 'bulk', label: 'Bulking', adjust: 350, proteinPerKg: 1.8, blurb: 'Gain size fast with a clear surplus' },
  { id: 'lean_bulk', label: 'Lean bulking', adjust: 200, proteinPerKg: 1.8, blurb: 'Slow gain, minimal fat' },
  { id: 'cut', label: 'Cutting', adjust: -300, proteinPerKg: 2.0, blurb: 'Lose fat, keep muscle' },
  { id: 'recomp', label: 'Recomposition', adjust: -150, proteinPerKg: 2.0, blurb: 'Lose fat and build muscle slowly' },
  { id: 'maintain', label: 'Maintenance', adjust: 0, proteinPerKg: 1.6, blurb: 'Hold your current weight' },
  { id: 'general', label: 'General fitness', adjust: 0, proteinPerKg: 1.4, blurb: 'Feel better, move more' },
  { id: 'strength', label: 'Strength', adjust: 100, proteinPerKg: 1.8, blurb: 'Lift heavier on the big lifts' },
  { id: 'muscle', label: 'Muscle building', adjust: 250, proteinPerKg: 1.8, blurb: 'Hypertrophy first' },
];
export const goalInfo = (g: Goal) => GOALS.find((x) => x.id === g) ?? GOALS[4];

export const bmr = (p: Profile) =>
  10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'female' ? -161 : 5);

/** Activity multiplier from Liftbook: training days plus everyday steps. Sport is added per day. */
export const activityFactor = (p: Profile) =>
  1.35 + (p.trainingDaysPerWeek - 3) * 0.05 + ({ low: 0, mid: 0.1, high: 0.2 }[p.steps] ?? 0.1);

export interface Targets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  tdee: number;
  calculated: { kcal: number; protein: number; carbs: number; fat: number };
}

export function baseTargets(p: Profile, o: TargetOverrides = {}): Targets {
  const tdee = bmr(p) * activityFactor(p);
  const g = goalInfo(p.goal);
  const kcalCalc = Math.round((tdee + g.adjust) / 10) * 10;
  const proteinCalc = Math.round(p.weightKg * g.proteinPerKg);
  const fatCalc = Math.round(p.weightKg * 0.9);
  const kcal = o.kcal ?? kcalCalc;
  const protein = o.proteinG ?? proteinCalc;
  const fat = o.fatG ?? fatCalc;
  const carbsCalc = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const carbs = o.carbsG ?? carbsCalc;
  return {
    kcal,
    protein,
    carbs,
    fat,
    tdee: Math.round(tdee),
    calculated: { kcal: kcalCalc, protein: proteinCalc, carbs: carbsCalc, fat: fatCalc },
  };
}

/** Net burn above resting: (MET - 1) x kg x hours. */
export function sportKcal(day: DayLog | undefined, weightKg: number, sports: SportDef[]): number {
  if (!day) return 0;
  return Math.round(
    day.sport.reduce((a, s) => {
      const met = sports.find((x) => x.id === s.type)?.met ?? 5;
      return a + (met - 1) * weightKg * (s.mins / 60);
    }, 0),
  );
}

/** Sport calories are added as carbs, as in Liftbook. */
export function dayTargets(p: Profile, o: TargetOverrides, day: DayLog | undefined, sports: SportDef[]) {
  const t = baseTargets(p, o);
  const extra = sportKcal(day, p.weightKg, sports);
  return { ...t, kcal: t.kcal + extra, carbs: t.carbs + Math.round(extra / 4), sportExtra: extra };
}

/** General estimate: 35 ml/kg (min 2 L), +0.5 L in hot climates. Overridable. */
export const waterBaseMl = (p: Profile, o: TargetOverrides = {}) =>
  o.waterBaseMl ?? Math.max(2000, Math.round((p.weightKg * 35) / 50) * 50) + (p.climate === 'hot' ? 500 : 0);

/** Base + 0.5 L on training days + 0.7 L per hour of sport, rounded to 250 ml. */
export function waterTargetMl(p: Profile, o: TargetOverrides, day: DayLog | undefined, isTrainingDay: boolean) {
  const sportHours = day ? day.sport.reduce((a, s) => a + s.mins, 0) / 60 : 0;
  const ml = waterBaseMl(p, o) + (isTrainingDay ? 500 : 0) + 700 * sportHours;
  return Math.round(ml / 250) * 250;
}
