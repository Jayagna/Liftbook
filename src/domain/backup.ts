// The app's own backup file: everything the user has logged and set up, as one JSON file they keep themselves.
// Photos are not included (they are images in on-device storage) and neither is a workout in progress.
import { DEFAULT_DASHBOARD, DEFAULT_SPORTS } from './defaults';
import type { ExerciseDef } from './exercises';
import type { FoodDef } from './foods';
import type {
  Challenge, DashboardConfig, DayLog, ISODate, NutritionPrefs, Profile, SavedMeal, SportDef, SupplementProduct,
  TargetOverrides, TrainingPrefs, WorkoutDay,
} from './types';

export const BACKUP_SCHEMA = 'liftbook.app.v1';
/** The original single-page Liftbook tracker's export, which the app can also read. */
export const LEGACY_SCHEMA = 'liftbook.v1';

export interface BackupData {
  profile: Profile | null;
  overrides: TargetOverrides;
  plan: WorkoutDay[];
  days: Record<ISODate, DayLog>;
  challenges: Challenge[];
  products: SupplementProduct[];
  sports: SportDef[];
  dashboard: DashboardConfig;
  training: TrainingPrefs | null;
  nutrition: NutritionPrefs | null;
  customExercises: ExerciseDef[];
  templates: WorkoutDay[];
  customFoods: FoodDef[];
  savedMeals: SavedMeal[];
}
export interface BackupFile { schema: typeof BACKUP_SCHEMA; app: 'Liftbook'; exportedAt: string; data: BackupData }

export type ReadResult =
  | { ok: true; kind: 'app'; data: BackupData; exportedAt: string | null }
  | { ok: true; kind: 'legacy'; raw: unknown }
  | { ok: false; error: string };

export const backupFileName = (date: ISODate) => `liftbook-backup-${date}.json`;

export const emptyDay = (date: ISODate): DayLog => ({
  date, split: null, sets: [], meals: [], bw: null, waterMl: 0, sport: [], challenges: {}, supplements: [],
});

/** Keeps widgets the user arranged, and slots in any widget added since at its default position. */
export function mergeDashboard(saved: Partial<DashboardConfig> | null | undefined): DashboardConfig {
  const dash = { ...DEFAULT_DASHBOARD, ...(saved ?? {}) };
  let order = Array.isArray(dash.order) ? dash.order.filter((id) => DEFAULT_DASHBOARD.order.includes(id)) : [...DEFAULT_DASHBOARD.order];
  for (const id of DEFAULT_DASHBOARD.order) {
    if (!order.includes(id)) {
      const at = DEFAULT_DASHBOARD.order.indexOf(id);
      order = [...order.slice(0, at), id, ...order.slice(at)];
    }
  }
  return { ...dash, order, hidden: Array.isArray(dash.hidden) ? dash.hidden : [] };
}

/** Picks exactly the fields that belong in a backup, so nothing else in app state can leak into the file. */
export function makeBackup(s: BackupData, now: Date): BackupFile {
  return {
    schema: BACKUP_SCHEMA, app: 'Liftbook', exportedAt: now.toISOString(),
    data: {
      profile: s.profile, overrides: s.overrides, plan: s.plan, days: s.days, challenges: s.challenges, products: s.products,
      sports: s.sports, dashboard: s.dashboard, training: s.training, nutrition: s.nutrition, customExercises: s.customExercises,
      templates: s.templates, customFoods: s.customFoods, savedMeals: s.savedMeals,
    },
  };
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const arr = <T>(x: unknown, fallback: T[] = []): T[] => (Array.isArray(x) ? (x as T[]) : fallback);
const objOrNull = <T>(x: unknown): T | null => (isObj(x) ? (x as T) : null);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const NOT_OURS = 'That is not a Liftbook backup.';

/**
 * Reads backup text and checks its shape before anything is replaced.
 * A file with the right label but the wrong structure is refused rather than half-loaded.
 */
export function readBackup(text: string): ReadResult {
  let x: unknown;
  try { x = JSON.parse(text); } catch { return { ok: false, error: `${NOT_OURS} The file could not be read.` }; }
  if (!isObj(x) || typeof x.schema !== 'string') return { ok: false, error: NOT_OURS };
  if (x.schema === LEGACY_SCHEMA) return { ok: true, kind: 'legacy', raw: x };
  if (x.schema !== BACKUP_SCHEMA) {
    return { ok: false, error: x.schema.startsWith('liftbook.app.') ? 'This backup was made by a newer version of Liftbook. Update the app, then try again.' : NOT_OURS };
  }
  const d = x.data;
  if (!isObj(d) || !isObj(d.days)) return { ok: false, error: 'This backup is damaged: its daily logs are missing.' };

  const days: Record<ISODate, DayLog> = {};
  for (const [date, v] of Object.entries(d.days)) {
    if (!ISO.test(date) || !isObj(v)) return { ok: false, error: 'This backup is damaged: one of its days could not be read.' };
    const base = emptyDay(date);
    days[date] = {
      ...base, ...(v as Partial<DayLog>), date,
      sets: arr(v.sets), meals: arr(v.meals), sport: arr(v.sport), supplements: arr(v.supplements),
      challenges: isObj(v.challenges) ? (v.challenges as Record<string, number>) : {},
      waterMl: typeof v.waterMl === 'number' && isFinite(v.waterMl) ? v.waterMl : 0,
      bw: typeof v.bw === 'number' && isFinite(v.bw) ? v.bw : null,
      split: typeof v.split === 'string' ? v.split : null,
    };
  }
  const sports = arr<SportDef>(d.sports);
  return {
    ok: true, kind: 'app', exportedAt: typeof x.exportedAt === 'string' ? x.exportedAt : null,
    data: {
      profile: objOrNull<Profile>(d.profile), overrides: isObj(d.overrides) ? (d.overrides as TargetOverrides) : {},
      plan: arr(d.plan), days, challenges: arr(d.challenges), products: arr(d.products),
      sports: sports.length ? sports : DEFAULT_SPORTS, dashboard: mergeDashboard(objOrNull<DashboardConfig>(d.dashboard)),
      training: objOrNull<TrainingPrefs>(d.training), nutrition: objOrNull<NutritionPrefs>(d.nutrition),
      customExercises: arr(d.customExercises), templates: arr(d.templates), customFoods: arr(d.customFoods), savedMeals: arr(d.savedMeals),
    },
  };
}

/** What a backup holds, shown before the user agrees to replace what is on the phone. */
export function backupSummary(days: Record<ISODate, DayLog>): { days: number; workouts: number; meals: number; first: ISODate | null; last: ISODate | null } {
  const used = Object.values(days).filter((d) => d.sets.length || d.meals.length || d.bw != null || d.waterMl > 0 || d.sport.length || d.supplements.length || Object.keys(d.challenges).length);
  const dates = used.map((d) => d.date).sort();
  return {
    days: used.length, workouts: used.filter((d) => d.sets.length > 0).length, meals: used.reduce((n, d) => n + d.meals.length, 0),
    first: dates[0] ?? null, last: dates[dates.length - 1] ?? null,
  };
}
