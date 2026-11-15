// Local-first app state, persisted on device with AsyncStorage.
// Phase 2 adds Supabase sync behind the same actions, so screens don't change.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import type { AiConfig } from '@/domain/ai';
import { emptyDay, mergeDashboard, type BackupData } from '@/domain/backup';
import { DEFAULT_DASHBOARD, DEFAULT_SPORTS } from '@/domain/defaults';
import { today } from '@/domain/dates';
import { setCustomExercises, type ExerciseDef } from '@/domain/exercises';
import type { FoodDef } from '@/domain/foods';
import { importLiftbook, type LiftbookExport } from '@/domain/liftbookImport';
import { sortWeek } from '@/domain/planner';
import { staleEnd } from '@/domain/session';
import { deleteAllPhotos } from './photoFiles';
import type {
  Challenge, DashboardConfig, DayLog, ISODate, LoggedSet, Meal, NutritionPrefs, PlannedExercise, Profile, ProgressPhoto, SavedMeal, SportDef,
  SportSession, SupplementProduct, TargetOverrides, TrainingPrefs, WorkoutDay, WorkoutSession,
} from '@/domain/types';

export interface AppState {
  version: 1;
  hydrated: boolean;
  /** True while the user is previewing the labelled sample data set. */
  isSample: boolean;
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
  /** Saved workouts that can be dropped onto any day. */
  templates: WorkoutDay[];
  /** The workout in progress, if any. */
  session: WorkoutSession | null;
  /** Foods the user entered themselves. */
  customFoods: FoodDef[];
  savedMeals: SavedMeal[];
  /** Details of each progress photo. The images themselves are in on-device storage (photoFiles). */
  photos: ProgressPhoto[];
  /** Where the user's own AI function lives. Kept on this device only and never put in a backup file. */
  ai: AiConfig | null;
  /** When the user last saved a backup file. */
  lastBackupAt: number | null;
  /** True while the last change could not be written to this device. Never saved itself. */
  storageError: boolean;
}

const KEY = 'liftbook.state.v1';
const SAMPLE_BACKUP = 'liftbook.state.v1.beforeSample';
/** If saved data ever cannot be read, the raw text is parked here instead of being overwritten. */
const UNREADABLE = 'liftbook.state.v1.unreadable';

const empty = (): AppState => ({
  version: 1, hydrated: true, isSample: false, profile: null, overrides: {}, plan: [], days: {},
  challenges: [], products: [], sports: DEFAULT_SPORTS, dashboard: DEFAULT_DASHBOARD,
  training: null, nutrition: null, customExercises: [], templates: [], session: null, customFoods: [], savedMeals: [], photos: [], ai: null, lastBackupAt: null, storageError: false,
});

let state: AppState = { ...empty(), hydrated: false };
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Updates the "could not save" flag without queueing another save. */
function flagStorage(failed: boolean) {
  if (state.storageError === failed) return;
  state = { ...state, storageError: failed };
  listeners.forEach((l) => l());
}

function writeNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const { hydrated, storageError, ...rest } = state;
  AsyncStorage.setItem(KEY, JSON.stringify(rest)).then(() => flagStorage(false)).catch(() => flagStorage(true));
}

function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(writeNow, 250);
}

// Web: if the page is reloaded, closed or sent to the background before the short save delay ends,
// write straight away so nothing logged in the last moment is lost.
if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof window.addEventListener === 'function') {
  const flush = () => { if (saveTimer && state.hydrated) writeNow(); };
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}

function set(next: AppState | ((s: AppState) => AppState)) {
  const prev = state;
  state = typeof next === 'function' ? next(state) : next;
  if (state.customExercises !== prev.customExercises) setCustomExercises(state.customExercises);
  listeners.forEach((l) => l());
  if (state.hydrated) persist();
}

export const getState = () => state;
export function useApp<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => selector(state),
    () => selector(state),
  );
}

export async function hydrate() {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<AppState>) : null;
    set({ ...empty(), ...(saved ?? {}), dashboard: mergeDashboard(saved?.dashboard), storageError: false, hydrated: true });
  } catch {
    // Saved data that cannot be read is kept aside, never silently replaced by an empty app.
    if (raw) await AsyncStorage.setItem(UNREADABLE, raw).catch(() => {});
    set(empty());
    return;
  }
  try {
    // A workout left open on an earlier day is closed at its last logged change.
    const open = state.session;
    if (open && open.date !== today()) actions.finishWorkout(staleEnd(open, state.days[open.date]));
  } catch {
    set((s) => ({ ...s, session: null }));
  }
}

// ---------- day helpers ----------
export const blankDay = emptyDay;
const uid = () => Math.random().toString(36).slice(2, 10);

function updateDay(date: ISODate, fn: (d: DayLog) => DayLog) {
  set((s) => {
    const d = fn({ ...(s.days[date] ?? blankDay(date)) });
    return { ...s, days: { ...s.days, [date]: { ...d, rev: Date.now() } } };
  });
}

// ---------- actions ----------
export const actions = {
  setProfile(profile: Profile) {
    set((s) => ({ ...s, profile }));
  },
  setOverrides(overrides: TargetOverrides) {
    set((s) => ({ ...s, overrides }));
  },
  addWater(ml: number, date = today()) {
    updateDay(date, (d) => ({ ...d, waterMl: Math.max(0, d.waterMl + ml) }));
  },
  addChallenge(id: string, delta: number, date = today()) {
    updateDay(date, (d) => ({ ...d, challenges: { ...d.challenges, [id]: Math.max(0, (d.challenges[id] ?? 0) + delta) } }));
  },
  setChallenges(challenges: Challenge[]) {
    set((s) => ({ ...s, challenges }));
  },
  logSupplement(productId: string, amount: number, date = today()) {
    updateDay(date, (d) => ({ ...d, supplements: [...d.supplements, { id: uid(), productId, amount, at: Date.now() }] }));
  },
  undoSupplement(productId: string, date = today()) {
    updateDay(date, (d) => {
      const idx = d.supplements.map((x) => x.productId).lastIndexOf(productId);
      return idx < 0 ? d : { ...d, supplements: d.supplements.filter((_, i) => i !== idx) };
    });
  },
  setProducts(products: SupplementProduct[]) {
    set((s) => ({ ...s, products }));
  },
  addMeal(meal: Omit<Meal, 'id'>, date = today()) {
    updateDay(date, (d) => ({ ...d, meals: [...d.meals, { ...meal, id: uid() }] }));
  },
  removeMeal(id: string, date = today()) {
    updateDay(date, (d) => ({ ...d, meals: d.meals.filter((m) => m.id !== id) }));
  },
  /** Logs several foods at once: a saved meal, or everything matched from a description. */
  addMeals(meals: Omit<Meal, 'id'>[], date = today()) {
    updateDay(date, (d) => ({ ...d, meals: [...d.meals, ...meals.map((m) => ({ ...m, id: uid() }))] }));
  },
  updateMeal(id: string, next: Meal, date = today()) {
    updateDay(date, (d) => ({ ...d, meals: d.meals.map((m) => (m.id === id ? { ...next, id } : m)) }));
  },
  saveMeal(name: string, items: Meal[]) {
    const meal: SavedMeal = { id: `m-${uid()}`, name, items: items.map(({ id, slot, ...rest }) => rest) };
    set((s) => ({ ...s, savedMeals: [...s.savedMeals.filter((x) => x.name.toLowerCase() !== name.toLowerCase()), meal] }));
  },
  deleteSavedMeal(id: string) {
    set((s) => ({ ...s, savedMeals: s.savedMeals.filter((m) => m.id !== id) }));
  },
  addCustomFood(food: FoodDef) {
    set((s) => ({ ...s, customFoods: [...s.customFoods.filter((f) => f.name.toLowerCase() !== food.name.toLowerCase()), { ...food, custom: true }] }));
  },
  removeCustomFood(name: string) {
    set((s) => ({ ...s, customFoods: s.customFoods.filter((f) => f.name !== name) }));
  },
  /** Adds or replaces one supplement product. */
  upsertProduct(product: SupplementProduct) {
    set((s) => ({ ...s, products: s.products.some((p) => p.id === product.id) ? s.products.map((p) => (p.id === product.id ? product : p)) : [...s.products, product] }));
  },
  /** Removes a product. Past logs stay in the day records but no longer count toward anything. */
  removeProduct(id: string) {
    set((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
  },
  addSet(set: Omit<LoggedSet, 'id'>, date = today()) {
    updateDay(date, (d) => ({ ...d, sets: [...d.sets, { ...set, id: uid() }] }));
  },
  removeSet(id: string, date = today()) {
    updateDay(date, (d) => ({ ...d, sets: d.sets.filter((x) => x.id !== id) }));
  },
  addSport(session: SportSession, date = today()) {
    updateDay(date, (d) => ({ ...d, sport: [...d.sport, session] }));
  },
  removeSport(index: number, date = today()) {
    updateDay(date, (d) => ({ ...d, sport: d.sport.filter((_, i) => i !== index) }));
  },
  setBodyweight(kg: number | null, date = today()) {
    updateDay(date, (d) => ({ ...d, bw: kg }));
  },
  setSplit(split: string | null, date = today()) {
    updateDay(date, (d) => ({ ...d, split }));
  },
  setDashboard(dashboard: DashboardConfig) {
    set((s) => ({ ...s, dashboard }));
  },
  setPlan(plan: WorkoutDay[]) {
    set((s) => ({ ...s, plan }));
  },
  setTraining(training: TrainingPrefs) {
    set((s) => ({ ...s, training }));
  },
  /** Adds or replaces one day of the weekly plan. */
  upsertPlanDay(day: WorkoutDay) {
    set((s) => ({ ...s, plan: sortWeek([...s.plan.filter((d) => d.id !== day.id), day]) }));
  },
  removePlanDay(id: string) {
    set((s) => ({ ...s, plan: s.plan.filter((d) => d.id !== id) }));
  },
  addCustomExercise(ex: ExerciseDef) {
    set((s) => ({ ...s, customExercises: [...s.customExercises.filter((e) => e.name.toLowerCase() !== ex.name.toLowerCase()), { ...ex, custom: true }] }));
  },
  saveTemplate(day: WorkoutDay) {
    const t: WorkoutDay = { ...day, id: `t-${uid()}`, dow: null, locked: false };
    set((s) => ({ ...s, templates: [...s.templates.filter((x) => x.name !== t.name), t] }));
  },
  deleteTemplate(id: string) {
    set((s) => ({ ...s, templates: s.templates.filter((t) => t.id !== id) }));
  },

  // ----- live workout -----
  startWorkout(day: { id: string | null; exercises: PlannedExercise[] }, date = today()) {
    set((s) => ({
      ...s,
      session: { date, dayId: day.id, exercises: day.exercises, startedAt: Date.now(), pausedAt: null, pausedMs: 0, skipped: [], restEndsAt: null, restTotalSec: 0 },
    }));
  },
  pauseWorkout() {
    set((s) => (s.session && !s.session.pausedAt ? { ...s, session: { ...s.session, pausedAt: Date.now(), restEndsAt: null } } : s));
  },
  resumeWorkout() {
    set((s) => (s.session?.pausedAt ? { ...s, session: { ...s.session, pausedMs: s.session.pausedMs + (Date.now() - s.session.pausedAt), pausedAt: null } } : s));
  },
  startRest(seconds: number) {
    set((s) => (s.session ? { ...s, session: { ...s.session, restEndsAt: seconds > 0 ? Date.now() + seconds * 1000 : null, restTotalSec: seconds } } : s));
  },
  adjustRest(deltaSec: number) {
    set((s) => {
      const x = s.session;
      if (!x?.restEndsAt) return s;
      const ends = Math.max(Date.now(), x.restEndsAt + deltaSec * 1000);
      return { ...s, session: { ...x, restEndsAt: ends, restTotalSec: Math.max(1, x.restTotalSec + deltaSec) } };
    });
  },
  clearRest() {
    set((s) => (s.session ? { ...s, session: { ...s.session, restEndsAt: null } } : s));
  },
  toggleSkip(name: string) {
    set((s) => {
      const x = s.session;
      if (!x) return s;
      return { ...s, session: { ...x, skipped: x.skipped.includes(name) ? x.skipped.filter((n) => n !== name) : [...x.skipped, name] } };
    });
  },
  /** Swaps an exercise for this session only. The weekly plan is not changed. */
  swapInSession(index: number, next: PlannedExercise) {
    set((s) => (s.session ? { ...s, session: { ...s.session, exercises: s.session.exercises.map((e, i) => (i === index ? next : e)) } } : s));
  },
  addToSession(ex: PlannedExercise) {
    set((s) => (s.session ? { ...s, session: { ...s.session, exercises: [...s.session.exercises, ex] } } : s));
  },
  setNotes(notes: string, date = today()) {
    updateDay(date, (d) => ({ ...d, notes }));
  },
  finishWorkout(endAt?: number) {
    const x = state.session;
    if (!x) return;
    const end = endAt ?? x.pausedAt ?? Date.now();
    const durationSec = Math.max(0, Math.round((end - x.startedAt - x.pausedMs) / 1000));
    updateDay(x.date, (d) => ({ ...d, workout: { startedAt: x.startedAt, finishedAt: end, durationSec, skipped: x.skipped } }));
    set((s) => ({ ...s, session: null }));
  },
  discardWorkout() {
    set((s) => ({ ...s, session: null }));
  },
  completeOnboarding(x: {
    profile: Profile; training: TrainingPrefs; nutrition: NutritionPrefs; plan: WorkoutDay[];
    challenges: Challenge[]; products: SupplementProduct[];
  }) {
    set((s) => ({ ...s, ...x, isSample: false }));
  },
  /** Imports a Liftbook backup into this device, replacing local data. */
  importLiftbook(json: unknown) {
    const x = importLiftbook(json as LiftbookExport);
    set((s) => ({ ...s, ...x, session: null, isSample: false }));
  },
  /** Labelled prototype data. The user's real data is set aside and restored on exit. */
  async enterSample() {
    const { makeSample } = await import('./sample');
    const { hydrated, storageError, ...rest } = state;
    await AsyncStorage.setItem(SAMPLE_BACKUP, JSON.stringify(rest)).catch(() => {});
    set((s) => ({ ...s, ...makeSample(), customExercises: [], templates: [], session: null, customFoods: [], savedMeals: [], photos: [], isSample: true }));
  },
  async exitSample() {
    const raw = await AsyncStorage.getItem(SAMPLE_BACKUP).catch(() => null);
    const saved = raw ? (JSON.parse(raw) as Partial<AppState>) : {};
    set({ ...empty(), ...saved, isSample: false, storageError: false });
    AsyncStorage.removeItem(SAMPLE_BACKUP).catch(() => {});
  },
  /** Replaces logs, plan and settings with a checked backup. Photos on this device are left alone. */
  restoreBackup(data: BackupData) {
    set((s) => ({ ...empty(), ...data, photos: s.photos, ai: s.ai, lastBackupAt: s.lastBackupAt, isSample: false }));
  },
  setAi(ai: AiConfig | null) {
    set((s) => ({ ...s, ai }));
  },
  markBackedUp() {
    set((s) => ({ ...s, lastBackupAt: Date.now() }));
  },
  /** Removes everything this app keeps on the device: logs, plan, settings and photos. */
  async eraseAll() {
    set(empty());
    await Promise.all([
      AsyncStorage.removeItem(SAMPLE_BACKUP).catch(() => {}),
      AsyncStorage.removeItem(UNREADABLE).catch(() => {}),
      deleteAllPhotos().catch(() => {}),
    ]);
  },
  addPhoto(photo: ProgressPhoto) {
    set((s) => ({ ...s, photos: [...s.photos, photo] }));
  },
  removePhoto(id: string) {
    set((s) => ({ ...s, photos: s.photos.filter((p) => p.id !== id) }));
  },
};
