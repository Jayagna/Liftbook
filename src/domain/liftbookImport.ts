// Converts a Liftbook export (liftbook.v1) into this app's local state.
// Used once, for the original Liftbook owner's account only. New users never see it.
import { DEFAULT_DASHBOARD, DEFAULT_SPORTS, newCreatineProduct, newProteinProduct } from './defaults';
import { inferFocus, prefsFromPlan } from './planner';
import type { Challenge, DayLog, Goal, Profile, SupplementProduct, TargetOverrides, TrainingPrefs, WorkoutDay } from './types';

interface LBDay {
  date: string; split?: string | null; sets?: { id: string; ex: string; kg: number; reps: number }[];
  meals?: { id: string; name: string; qty: number; kcal: number; p: number; c: number; f: number }[];
  bw?: number | null; pushups?: number; pullups?: number; water?: number; creatine?: boolean;
  sport?: { type: string; mins: number }[]; rev?: number;
}
export interface LiftbookExport {
  schema: 'liftbook.v1';
  profile: { weight: number; height: number; age: number; days: number; steps: 'low' | 'mid' | 'high'; phase: string };
  days: Record<string, LBDay>;
  plan?: WorkoutDay[];
  settings?: {
    sex?: 'male' | 'female'; waterBaseMl?: number; pushupGoal?: number; pullupGoal?: number;
    creatineDailyG?: number; wheyScoopsOnGymDays?: number; sports?: Record<string, number>; sessionMin?: number;
  };
}

const PHASE: Record<string, Goal> = { cut: 'cut', recomp: 'recomp', maintain: 'maintain', build: 'lean_bulk' };

export function importLiftbook(x: LiftbookExport) {
  if (x.schema !== 'liftbook.v1' || !x.profile || typeof x.days !== 'object') throw new Error('Not a Liftbook export');
  const s = x.settings ?? {};
  const profile: Profile = {
    age: x.profile.age, heightCm: x.profile.height, weightKg: x.profile.weight, sex: s.sex ?? 'male',
    units: 'metric', goal: PHASE[x.profile.phase] ?? 'recomp', trainingDaysPerWeek: Number(x.profile.days) || 5,
    steps: x.profile.steps ?? 'mid',
  };
  const overrides: TargetOverrides = s.waterBaseMl ? { waterBaseMl: s.waterBaseMl } : {};
  const challenges: Challenge[] = [
    { id: 'pushups', name: 'Push-ups', unit: 'reps', target: s.pushupGoal ?? 50, increments: [10, 15, 25] },
    { id: 'pullups', name: 'Pull-ups', unit: 'reps', target: s.pullupGoal ?? 15, increments: [1, 3, 5] },
  ];
  const whey: SupplementProduct = { ...newProteinProduct('whey'), dailyTarget: s.wheyScoopsOnGymDays ?? 1 };
  const creatine: SupplementProduct = { ...newCreatineProduct('creatine'), dailyTarget: s.creatineDailyG ?? 2, scoopG: s.creatineDailyG ?? 2, quick: [1, 2, 3, 5] };
  const sports = DEFAULT_SPORTS.map((d) => (s.sports?.[d.id] ? { ...d, met: s.sports[d.id] } : d));

  const days: Record<string, DayLog> = {};
  for (const [date, d] of Object.entries(x.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const ch: Record<string, number> = {};
    if (d.pushups) ch.pushups = d.pushups;
    if (d.pullups) ch.pullups = d.pullups;
    days[date] = {
      date,
      split: d.split ?? null,
      sets: (d.sets ?? []).map((v) => ({ id: v.id, ex: v.ex, kg: Number(v.kg) || 0, reps: Number(v.reps) || 0 })),
      // Liftbook logged whey as a meal; it stays a meal so totals match history exactly.
      meals: (d.meals ?? []).map((m) => ({ ...m, source: 'import' as const })),
      bw: d.bw ?? null,
      waterMl: d.water ?? 0,
      sport: Array.isArray(d.sport) ? d.sport : [],
      challenges: ch,
      supplements: d.creatine ? [{ id: `cr-${date}`, productId: 'creatine', amount: creatine.dailyTarget, at: 0 }] : [],
      rev: d.rev,
    };
  }
  // The routine is the owner's own, so every day arrives locked: "regenerate" can't
  // overwrite it unless they unlock a day themselves.
  const plan: WorkoutDay[] = (x.plan ?? []).map((d) => ({ ...d, locked: true, focusIds: inferFocus(d) }));
  const training: TrainingPrefs = { ...prefsFromPlan(plan), sessionMin: s.sessionMin ?? 75 };
  return {
    profile, overrides, plan, days, challenges, products: [whey, creatine], sports, training,
    dashboard: DEFAULT_DASHBOARD,
  };
}
