// Defaults for a brand-new user. Nothing here is specific to any one person.
import type { Challenge, DashboardConfig, SportDef, SupplementProduct, WidgetId } from './types';

export const ALL_WIDGETS: { id: WidgetId; label: string; desc: string }[] = [
  { id: 'calories', label: 'Today rings', desc: 'Calories, protein and water at a glance' },
  { id: 'body', label: 'Muscle map', desc: '3D body: today\u2019s focus and recovery' },
  { id: 'macros', label: 'Macros', desc: 'Protein, carbs and fat' },
  { id: 'hydration', label: 'Hydration', desc: 'Water with quick add' },
  { id: 'workout', label: 'Workout of the day', desc: 'Today’s session' },
  { id: 'challenges', label: 'Daily challenges', desc: 'Push-ups, pull-ups and more' },
  { id: 'supplements', label: 'Supplements', desc: 'Protein powder and creatine' },
  { id: 'consistency', label: 'Recovery & streak', desc: 'Muscles, streak and week' },
];

export const DEFAULT_DASHBOARD: DashboardConfig = {
  order: ['calories', 'workout', 'body', 'macros', 'hydration', 'challenges', 'supplements', 'consistency'],
  hidden: [],
  waterQuick: [150, 250, 500],
  visuals3d: true,
};

export const DEFAULT_SPORTS: SportDef[] = [
  { id: 'football', name: 'Football', met: 6, defaultMins: 90 },
  { id: 'badminton', name: 'Badminton', met: 5, defaultMins: 60 },
  { id: 'jogging', name: 'Jogging', met: 7, defaultMins: 30 },
  { id: 'cycling', name: 'Cycling', met: 6, defaultMins: 45 },
  { id: 'swimming', name: 'Swimming', met: 6, defaultMins: 45 },
];

export const CHALLENGE_PRESETS: Omit<Challenge, 'id'>[] = [
  { name: 'Push-ups', unit: 'reps', target: 50, increments: [5, 10, 25] },
  { name: 'Pull-ups', unit: 'reps', target: 15, increments: [1, 3, 5] },
  { name: 'Squats', unit: 'reps', target: 50, increments: [10, 20] },
  { name: 'Plank', unit: 'sec', target: 120, increments: [30, 60] },
  { name: 'Steps', unit: 'steps', target: 8000, increments: [1000, 2000] },
];

export const newProteinProduct = (id: string): SupplementProduct => ({
  id, kind: 'protein', name: 'Whey protein', scoopG: 30, kcal: 120, proteinG: 24, carbsG: 3, fatG: 1.5,
  dailyTarget: 1, unit: 'scoop', quick: [0.5, 1, 1.5, 2],
});
export const newCreatineProduct = (id: string): SupplementProduct => ({
  id, kind: 'creatine', name: 'Creatine monohydrate', scoopG: 3, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0,
  dailyTarget: 3, unit: 'g', quick: [1, 3, 5],
});
export const newOtherProduct = (id: string): SupplementProduct => ({
  id, kind: 'other', name: 'Supplement', scoopG: 0, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0,
  dailyTarget: 1, unit: 'tablet', quick: [1],
});
