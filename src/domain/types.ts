// Core data model. Shapes mirror the Supabase schema in supabase/migrations so the
// local cache and the server can be synced row-for-row later.

export type ISODate = string; // YYYY-MM-DD in the user's local time zone

export type Sex = 'male' | 'female';
export type Units = 'metric' | 'imperial';

export type Goal =
  | 'bulk'
  | 'lean_bulk'
  | 'cut'
  | 'recomp'
  | 'maintain'
  | 'general'
  | 'strength'
  | 'muscle';

export type StepsBand = 'low' | 'mid' | 'high';
export type Climate = 'temperate' | 'hot';

export interface Profile {
  name?: string;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  sex: Sex;
  units: Units;
  goal: Goal;
  trainingDaysPerWeek: number;
  steps: StepsBand;
  climate?: Climate;
}

/** Anything left undefined falls back to the calculated value. */
export interface TargetOverrides {
  kcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  waterBaseMl?: number;
}

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'lats'
  | 'traps'
  | 'shoulders'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves';

export interface PlannedExercise {
  name: string;
  sets: number;
  repLow: number;
  repHigh: number;
  /** Smallest weight jump for this lift in kg (0 = bodyweight). */
  stepKg: number;
  restSec: number;
  /** Kept as-is when the day or week is regenerated. */
  locked?: boolean;
  /** Neighbouring exercises that share a number are done back to back, resting after the round. */
  superset?: number;
  /** Working weight the user set for this lift. Suggestions never change it on their own. */
  targetKg?: number;
}

export interface WorkoutDay {
  id: string;
  name: string;
  /** 0 = Sunday ... 6 = Saturday, or null for an unscheduled template. */
  dow: number | null;
  focus?: string;
  /** Muscle groups chosen for the day; drives "rebuild" suggestions. */
  focusIds?: Focus[];
  /** Kept as-is when the week is regenerated. */
  locked?: boolean;
  exercises: PlannedExercise[];
}

export interface LoggedSet {
  id: string;
  ex: string;
  kg: number;
  reps: number;
}

export interface Meal {
  id: string;
  name: string;
  qty: number;
  kcal: number;
  p: number;
  c: number;
  f: number;
  /** 'ai' marks values the user saw as an estimate before saving. */
  source?: 'manual' | 'library' | 'ai' | 'import';
  /** Which meal of the day it belongs to. Older and imported logs have none. */
  slot?: MealSlot;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type PhotoPose = 'front' | 'side' | 'back';
/** A progress photo. Only these details are kept in app state; the image itself stays in on-device storage. */
export interface ProgressPhoto {
  id: string;
  /** The day the photo shows, which can be earlier than the day it was added. */
  date: ISODate;
  pose: PhotoPose;
  w: number;
  h: number;
  /** When it was added, used to order photos taken on the same day. */
  at: number;
}

/** A set of foods the user eats together, logged in one tap. */
export interface SavedMeal {
  id: string;
  name: string;
  items: Omit<Meal, 'id' | 'slot'>[];
}

export type SportType = string;
export interface SportSession {
  type: SportType;
  mins: number;
}

export interface SupplementLog {
  id: string;
  productId: string;
  /** Scoops for powders, grams for creatine/other. */
  amount: number;
  at: number;
}

export interface DayLog {
  date: ISODate;
  split: string | null;
  sets: LoggedSet[];
  meals: Meal[];
  bw: number | null;
  waterMl: number;
  sport: SportSession[];
  challenges: Record<string, number>;
  supplements: SupplementLog[];
  notes?: string;
  /** Filled in when a live workout is finished. */
  workout?: { startedAt: number; finishedAt: number; durationSec: number; skipped: string[] };
  rev?: number;
}

/** A workout in progress. Uses timestamps so timers survive the app being closed. */
export interface WorkoutSession {
  date: ISODate;
  dayId: string | null;
  exercises: PlannedExercise[];
  startedAt: number;
  pausedAt: number | null;
  pausedMs: number;
  skipped: string[];
  restEndsAt: number | null;
  restTotalSec: number;
}

export interface Challenge {
  id: string;
  name: string;
  unit: string;
  target: number;
  increments: number[];
}

export type SupplementKind = 'protein' | 'creatine' | 'other';
export type SupplementUnit = 'scoop' | 'g' | 'tablet';
export interface SupplementProduct {
  id: string;
  kind: SupplementKind;
  brand?: string;
  name: string;
  /** For powders: grams per scoop. For creatine: grams per scoop. */
  scoopG: number;
  /** Per scoop. Only protein powders contribute to nutrition totals. */
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Daily target in scoops (protein) or grams (creatine/other). */
  dailyTarget: number;
  /** How the daily target and quick buttons are expressed. */
  unit: SupplementUnit;
  quick: number[];
}

export type WidgetId =
  | 'body'
  | 'calories'
  | 'macros'
  | 'hydration'
  | 'workout'
  | 'challenges'
  | 'supplements'
  | 'consistency';

export interface DashboardConfig {
  order: WidgetId[];
  hidden: WidgetId[];
  waterQuick: number[];
  /** Off = 2D fallback for older or low-power phones. */
  visuals3d: boolean;
}

export interface SportDef {
  id: string;
  name: string;
  met: number;
  defaultMins: number;
}

export type Focus = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'legs' | 'glutes' | 'abs' | 'cardio' | 'full_body';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type EquipmentId = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'bench' | 'band' | 'kettlebell';

export interface TrainingPrefs {
  /** Weekday (0 = Sunday) → muscle focus for that day. Days not listed are rest days. */
  week: Record<number, Focus[]>;
  sessionMin: number;
  location: 'gym' | 'home';
  equipment: EquipmentId[];
  experience: Experience;
  prefer: string[];
  avoid: string[];
  limitations: string;
}

export type Diet = 'none' | 'vegetarian' | 'eggetarian' | 'vegan' | 'pescatarian';
export interface NutritionPrefs {
  diet: Diet;
  mealsPerDay: number;
  useProtein: boolean;
  useCreatine: boolean;
}
