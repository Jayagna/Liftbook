// SAMPLE DATA, for previewing the design before onboarding exists.
// Always shown under a "Sample data" banner and never mixed with real logs.
import { CHALLENGE_PRESETS, DEFAULT_DASHBOARD, DEFAULT_SPORTS, newCreatineProduct, newProteinProduct } from '@/domain/defaults';
import { addDays, dow, today } from '@/domain/dates';
import type { DayLog, Focus, PlannedExercise, WorkoutDay } from '@/domain/types';

const E = (name: string, sets: number, repLow: number, repHigh: number, stepKg: number, restSec: number): PlannedExercise =>
  ({ name, sets, repLow, repHigh, stepKg, restSec });

const PLAN: WorkoutDay[] = [
  { id: 'push', name: 'Chest + Triceps', dow: 1, focusIds: ['chest', 'triceps'], exercises: [E('Bench Press', 4, 6, 10, 2.5, 150), E('Incline Press', 3, 8, 12, 2, 120), E('Chest Fly', 3, 10, 12, 2.5, 75), E('Rope Pushdown', 3, 10, 12, 2.5, 75), E('Weighted Crunch', 3, 10, 12, 2.5, 60)] },
  { id: 'pull', name: 'Back + Biceps', dow: 2, focusIds: ['back', 'biceps'], exercises: [E('Barbell Row', 4, 6, 10, 2.5, 150), E('Lat Pulldown', 3, 8, 12, 2.5, 120), E('Face Pull (or reverse fly)', 3, 10, 12, 2.5, 60), E('Preacher Curl', 3, 8, 12, 1.25, 75), E('Hammer Curl', 3, 10, 12, 1, 75)] },
  { id: 'shoulders', name: 'Shoulders + Abs', dow: 4, focusIds: ['shoulders', 'abs'], exercises: [E('Shoulder Press', 4, 6, 10, 2.5, 120), E('Lateral Raise', 4, 10, 12, 1, 60), E('Dumbbell Shrug', 3, 10, 12, 2.5, 75), E('Leg Raise', 3, 10, 12, 0, 60), E('Plank (sec)', 3, 45, 60, 0, 60)] },
  { id: 'legs', name: 'Legs', dow: 5, focusIds: ['legs'], exercises: [E('Squat', 4, 6, 10, 2.5, 150), E('Romanian Deadlift', 3, 8, 10, 2.5, 150), E('Leg Extension', 3, 10, 12, 2.5, 75), E('Hamstring Curl', 3, 10, 12, 2.5, 75), E('Calf Raise', 4, 10, 12, 2.5, 60)] },
];

const START: Record<string, number> = {
  'Bench Press': 60, 'Incline Press': 22, 'Chest Fly': 40, 'Rope Pushdown': 25, 'Weighted Crunch': 30, 'Barbell Row': 55,
  'Lat Pulldown': 50, 'Face Pull (or reverse fly)': 20, 'Preacher Curl': 25, 'Hammer Curl': 12, 'Shoulder Press': 18,
  'Lateral Raise': 8, 'Dumbbell Shrug': 24, 'Leg Raise': 0, 'Plank (sec)': 0, Squat: 80, 'Romanian Deadlift': 70,
  'Leg Extension': 45, 'Hamstring Curl': 35, 'Calf Raise': 60,
};

// Deterministic pseudo-random so the preview looks the same every time.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

export function makeSample() {
  const days: Record<string, DayLog> = {};
  const t = today();
  for (let i = 27; i >= 0; i--) {
    const date = addDays(t, -i);
    const w = dow(date);
    const plan = PLAN.find((p) => p.dow === w);
    const weeks = Math.floor((27 - i) / 7);
    const isToday = i === 0;
    const sets = plan && !isToday
      ? plan.exercises.flatMap((e, ei) => Array.from({ length: e.sets }, (_, si) => ({
          id: `${date}-${ei}-${si}`, ex: e.name,
          kg: e.stepKg ? START[e.name] + weeks * e.stepKg : 0,
          reps: Math.max(e.repLow, e.repHigh - si - (rnd() > 0.6 ? 1 : 0)),
        })))
      : [];
    const meals = isToday
      ? [
          { id: 's1', name: 'Oats with milk and banana', qty: 1, kcal: 420, p: 17, c: 68, f: 9, slot: 'breakfast' as const },
          { id: 's2', name: 'Chicken rice bowl', qty: 1, kcal: 610, p: 46, c: 70, f: 14, slot: 'lunch' as const },
        ]
      : [{ id: `${date}-m`, name: 'Logged meals', qty: 1, kcal: 2000 + Math.round(rnd() * 500), p: 110 + Math.round(rnd() * 40), c: 230, f: 65 }];
    days[date] = {
      date, split: null, sets, meals,
      bw: i % 2 === 0 ? Math.round((74.5 - (27 - i) * 0.05 + (rnd() - 0.5) * 0.6) * 10) / 10 : null,
      waterMl: isToday ? 1750 : 2250 + Math.round(rnd() * 4) * 250,
      sport: w === 3 && !isToday ? [{ type: 'football', mins: 90 }] : [],
      challenges: isToday ? { pushups: 35, pullups: 6 } : { pushups: 40 + Math.round(rnd() * 10), pullups: 8 + Math.round(rnd() * 4) },
      supplements: [
        { id: `${date}-w`, productId: 'whey', amount: isToday ? 1 : plan ? 2 : 1, at: 0 },
        ...(isToday ? [] : [{ id: `${date}-c`, productId: 'creatine', amount: 5, at: 0 }]),
      ],
    };
  }
  return {
    profile: { name: 'Sample athlete', age: 26, heightCm: 178, weightKg: 74, targetWeightKg: 72, sex: 'male' as const, units: 'metric' as const, goal: 'recomp' as const, trainingDaysPerWeek: 4, steps: 'mid' as const },
    overrides: {},
    plan: PLAN,
    days,
    challenges: CHALLENGE_PRESETS.slice(0, 3).map((c, i) => ({ ...c, id: ['pushups', 'pullups', 'squats'][i] })),
    products: [{ ...newProteinProduct('whey'), dailyTarget: 2 }, { ...newCreatineProduct('creatine'), dailyTarget: 5, scoopG: 5 }],
    sports: DEFAULT_SPORTS,
    dashboard: DEFAULT_DASHBOARD,
    training: {
      week: { 1: ['chest', 'triceps'], 2: ['back', 'biceps'], 4: ['shoulders', 'abs'], 5: ['legs'] } as Record<number, Focus[]>,
      sessionMin: 75, location: 'gym' as const, equipment: [], experience: 'intermediate' as const, prefer: [], avoid: [], limitations: '',
    },
    nutrition: { diet: 'none' as const, mealsPerDay: 4, useProtein: true, useCreatine: true },
  };
}
