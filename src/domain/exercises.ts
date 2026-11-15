// Seed exercise library. Names for the lifts Liftbook already logged are kept exactly,
// so imported history lines up. How-to text for each one lives in exerciseGuides.ts.
import type { MuscleGroup } from './types';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'bench' | 'band' | 'kettlebell';
export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface ExerciseDef {
  name: string;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  equipment: Equipment[];
  level: Level;
  /** True for big multi-joint lifts that tax recovery more. */
  compound: boolean;
  /** Created by the user. */
  custom?: boolean;
}

const X = (
  name: string,
  primary: MuscleGroup[],
  secondary: MuscleGroup[],
  equipment: Equipment[],
  compound = false,
  level: Level = 'beginner',
): ExerciseDef => ({ name, primary, secondary, equipment, compound, level });

export const EXERCISES: ExerciseDef[] = [
  // Chest
  X('Bench Press', ['chest'], ['triceps', 'shoulders'], ['barbell', 'bench'], true, 'intermediate'),
  X('Incline Press', ['chest'], ['shoulders', 'triceps'], ['dumbbell', 'bench'], true),
  X('Chest Fly', ['chest'], ['shoulders'], ['machine', 'cable']),
  X('Push-up', ['chest'], ['triceps', 'shoulders', 'abs'], ['bodyweight']),
  X('Dips', ['chest', 'triceps'], ['shoulders'], ['bodyweight'], true, 'intermediate'),
  X('Dumbbell Bench Press', ['chest'], ['triceps', 'shoulders'], ['dumbbell', 'bench'], true),
  X('Pike Push-up', ['shoulders'], ['triceps'], ['bodyweight'], true, 'intermediate'),
  // Back
  X('T-Bar Row', ['back', 'lats'], ['rear_delts', 'biceps'], ['barbell'], true, 'intermediate'),
  X('Lat Pulldown', ['lats'], ['biceps', 'rear_delts'], ['machine', 'cable'], true),
  X('Lat Row', ['back', 'lats'], ['biceps', 'rear_delts'], ['machine', 'cable']),
  X('Pull-up', ['lats'], ['biceps', 'back'], ['bodyweight'], true, 'intermediate'),
  X('Barbell Row', ['back', 'lats'], ['rear_delts', 'biceps'], ['barbell'], true, 'intermediate'),
  X('Dumbbell Row', ['back', 'lats'], ['biceps', 'rear_delts'], ['dumbbell'], true),
  X('Inverted Row', ['back', 'lats'], ['biceps', 'rear_delts'], ['bodyweight'], true),
  X('Band Pull-apart', ['rear_delts'], ['traps'], ['band']),
  X('Face Pull (or reverse fly)', ['rear_delts'], ['traps', 'back'], ['cable', 'band']),
  X('Dumbbell Shrug', ['traps'], ['forearms'], ['dumbbell']),
  X('Deadlift', ['back', 'hamstrings', 'glutes'], ['traps', 'forearms', 'quads'], ['barbell'], true, 'advanced'),
  // Shoulders
  X('Shoulder Press', ['shoulders'], ['triceps'], ['dumbbell', 'machine'], true),
  X('Lateral Raise', ['shoulders'], ['traps'], ['dumbbell', 'cable']),
  // Arms
  X('Preacher Curl', ['biceps'], ['forearms'], ['machine', 'dumbbell']),
  X('Hammer Curl', ['biceps', 'forearms'], [], ['dumbbell']),
  X('Bayesian Curl', ['biceps'], [], ['cable']),
  X('Rope Pushdown', ['triceps'], [], ['cable']),
  X('Overhead Triceps Extension', ['triceps'], [], ['cable', 'dumbbell']),
  // Legs
  X('Squat', ['quads', 'glutes'], ['hamstrings', 'abs'], ['barbell'], true, 'intermediate'),
  X('Romanian Deadlift', ['hamstrings', 'glutes'], ['back'], ['barbell', 'dumbbell'], true, 'intermediate'),
  X('Leg Press', ['quads', 'glutes'], ['hamstrings'], ['machine'], true),
  X('Hamstring Curl', ['hamstrings'], ['calves'], ['machine']),
  X('Leg Extension', ['quads'], [], ['machine']),
  X('Calf Raise', ['calves'], [], ['machine', 'bodyweight']),
  X('Walking Lunge', ['quads', 'glutes'], ['hamstrings'], ['dumbbell', 'bodyweight'], true),
  X('Goblet Squat', ['quads', 'glutes'], ['abs'], ['dumbbell', 'kettlebell'], true),
  X('Bulgarian Split Squat', ['quads', 'glutes'], ['hamstrings'], ['dumbbell', 'bodyweight'], true, 'intermediate'),
  X('Glute Bridge', ['glutes'], ['hamstrings'], ['bodyweight', 'barbell']),
  X('Bodyweight Squat', ['quads', 'glutes'], [], ['bodyweight']),
  X('Dumbbell Curl', ['biceps'], ['forearms'], ['dumbbell']),
  X('Bench Dip', ['triceps'], ['chest'], ['bodyweight', 'bench']),
  // Core
  X('Weighted Crunch', ['abs'], [], ['machine', 'cable', 'bodyweight']),
  X('Leg Raise', ['abs'], ['obliques'], ['bodyweight']),
  X('Russian Twist (per side)', ['obliques'], ['abs'], ['bodyweight']),
  X('Plank (sec)', ['abs'], ['obliques', 'shoulders'], ['bodyweight']),
  // Added with the exercise library. Kept at the end so earlier plans generate the same way.
  X('Hip Thrust', ['glutes'], ['hamstrings'], ['barbell', 'bench'], true, 'intermediate'),
  X('Cable Kickback', ['glutes'], ['hamstrings'], ['cable', 'band']),
  X('Step-up', ['quads', 'glutes'], ['hamstrings'], ['dumbbell', 'bodyweight'], true),
  X('Hack Squat', ['quads'], ['glutes'], ['machine'], true),
  X('Seated Calf Raise', ['calves'], [], ['machine', 'dumbbell']),
  X('Kettlebell Swing', ['glutes', 'hamstrings'], ['back', 'abs'], ['kettlebell'], true, 'intermediate'),
  X('Decline Push-up', ['chest'], ['shoulders', 'triceps'], ['bodyweight'], false, 'intermediate'),
  X('Chin-up', ['lats', 'biceps'], ['back'], ['bodyweight'], true, 'intermediate'),
  X('Arnold Press', ['shoulders'], ['triceps'], ['dumbbell'], true, 'intermediate'),
  X('Rear Delt Fly', ['rear_delts'], ['traps'], ['dumbbell', 'machine']),
  X('Incline Dumbbell Curl', ['biceps'], [], ['dumbbell']),
  X('Skull Crusher', ['triceps'], [], ['barbell', 'dumbbell'], false, 'intermediate'),
  X('Close-Grip Bench Press', ['triceps'], ['chest', 'shoulders'], ['barbell', 'bench'], true, 'intermediate'),
  X('Hanging Knee Raise', ['abs'], ['obliques', 'forearms'], ['bodyweight'], false, 'intermediate'),
  X('Side Plank (sec)', ['obliques'], ['abs', 'shoulders'], ['bodyweight']),
  X('Barbell Shrug', ['traps'], ['forearms'], ['barbell']),
  X('Wrist Curl', ['forearms'], [], ['dumbbell', 'barbell']),
];

const BY_NAME = new Map(EXERCISES.map((e) => [e.name.toLowerCase(), e]));
// The user's own exercises. The store registers them here so every lookup
// (planner, recovery, muscle map) sees them without threading state through.
const CUSTOM = new Map<string, ExerciseDef>();
export function setCustomExercises(list: ExerciseDef[]) {
  CUSTOM.clear();
  for (const e of list) if (!BY_NAME.has(e.name.toLowerCase())) CUSTOM.set(e.name.toLowerCase(), { ...e, custom: true });
}
export const findExercise = (name: string) => BY_NAME.get(name.toLowerCase()) ?? CUSTOM.get(name.toLowerCase());
export const allExercises = (): ExerciseDef[] => [...EXERCISES, ...CUSTOM.values()];
export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Barbell', dumbbell: 'Dumbbell', machine: 'Machine', cable: 'Cable', bodyweight: 'Bodyweight',
  bench: 'Bench', band: 'Band', kettlebell: 'Kettlebell',
};

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: 'Chest', back: 'Upper back', lats: 'Lats', traps: 'Traps', shoulders: 'Shoulders',
  rear_delts: 'Rear delts', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms',
  abs: 'Abs', obliques: 'Obliques', quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
};

/** Rough hours to feel recovered after hard work. Bigger muscles take longer. */
export const RECOVERY_HOURS: Record<MuscleGroup, number> = {
  chest: 60, back: 60, lats: 60, traps: 48, shoulders: 48, rear_delts: 36, biceps: 48, triceps: 48,
  forearms: 36, abs: 36, obliques: 36, quads: 72, hamstrings: 72, glutes: 72, calves: 48,
};
