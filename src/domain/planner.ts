// Rule-based weekly plan generator and recovery-conflict checker. The AI assistant
// (Phase 4) suggests changes on top of this; the user always has the final say.
import { allExercises, findExercise, type ExerciseDef } from './exercises';
import type { Experience, Focus, Goal, MuscleGroup, PlannedExercise, TrainingPrefs, WorkoutDay } from './types';

export const FOCUS_LABEL: Record<Focus, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps', legs: 'Legs',
  glutes: 'Glutes', abs: 'Abs', cardio: 'Cardio', full_body: 'Full body',
};
export const FOCUS_MUSCLES: Record<Focus, MuscleGroup[]> = {
  chest: ['chest'], back: ['back', 'lats'], shoulders: ['shoulders', 'rear_delts'], biceps: ['biceps'], triceps: ['triceps'],
  legs: ['quads', 'hamstrings', 'calves'], glutes: ['glutes'], abs: ['abs', 'obliques'], cardio: [],
  full_body: ['chest', 'back', 'quads', 'shoulders', 'hamstrings', 'abs'],
};
/** Big groups get more exercises per session than small ones. */
const FOCUS_WEIGHT: Record<Focus, number> = {
  chest: 3, back: 3, legs: 4, shoulders: 2, biceps: 2, triceps: 2, glutes: 2, abs: 1, cardio: 0, full_body: 6,
};

/** Suggested split by training days per week. Weekday indices start Monday. */
export function suggestedWeek(days: number): Record<number, Focus[]> {
  const S: Record<number, Focus[][]> = {
    1: [['full_body']],
    2: [['full_body'], ['full_body']],
    3: [['chest', 'shoulders', 'triceps'], ['back', 'biceps'], ['legs', 'abs']],
    4: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'abs'], ['shoulders', 'abs']],
    5: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'abs'], ['shoulders', 'abs'], ['biceps', 'triceps']],
    6: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'abs'], ['chest', 'shoulders'], ['back', 'biceps'], ['legs', 'glutes']],
    7: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'abs'], ['cardio'], ['shoulders', 'abs'], ['biceps', 'triceps'], ['cardio']],
  };
  const DAYS: Record<number, number[]> = {
    1: [3], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 0],
  };
  const n = Math.max(1, Math.min(7, days));
  const out: Record<number, Focus[]> = {};
  DAYS[n].forEach((d, i) => (out[d] = S[n][i]));
  return out;
}

interface Scheme { sets: number; lo: number; hi: number; rest: number }
function scheme(goal: Goal, exp: Experience, compound: boolean): Scheme {
  const extra = exp === 'advanced' ? 1 : 0;
  if (goal === 'strength') return compound ? { sets: 4 + extra, lo: 4, hi: 6, rest: 180 } : { sets: 3, lo: 8, hi: 10, rest: 90 };
  if (goal === 'general') return compound ? { sets: 3, lo: 8, hi: 12, rest: 90 } : { sets: 2 + extra, lo: 10, hi: 12, rest: 60 };
  return compound ? { sets: exp === 'beginner' ? 3 : 4, lo: 6, hi: 10, rest: 120 } : { sets: 3, lo: 10, hi: 12, rest: 75 };
}

const minutesFor = (e: PlannedExercise) => 1 + (e.sets * ((e.restSec >= 120 ? 60 : 45) + e.restSec)) / 60;

const available = (ex: ExerciseDef, p: TrainingPrefs) => {
  const eq = new Set(p.location === 'gym' ? [...p.equipment, 'machine', 'cable', 'barbell', 'bench', 'dumbbell', 'bodyweight'] : [...p.equipment, 'bodyweight']);
  return ex.equipment.some((e) => eq.has(e)) && !p.avoid.some((a) => a.toLowerCase() === ex.name.toLowerCase());
};

const LEVEL_RANK = { beginner: 0, intermediate: 1, advanced: 2 };
const bwOnly = (e: ExerciseDef) => e.equipment.length === 1 && e.equipment[0] === 'bodyweight';

/** Default sets, reps, rest and weight step for an exercise, given the goal and experience. */
export function plannedFrom(ex: ExerciseDef, goal: Goal, experience: Experience): PlannedExercise {
  const s = scheme(goal, experience, ex.compound);
  const timed = /\(sec\)/.test(ex.name);
  return {
    name: ex.name, sets: s.sets, repLow: timed ? 30 : s.lo, repHigh: timed ? 60 : s.hi,
    stepKg: ex.equipment.includes('bodyweight') && ex.equipment.length === 1 ? 0 : ex.equipment.includes('dumbbell') && !ex.compound ? 1 : 2.5,
    restSec: s.rest,
  };
}

/** Builds one day: compound lifts first, shared out across the chosen groups, until the time budget is used. */
export function buildDay(focus: Focus[], p: TrainingPrefs, goal: Goal, locked: PlannedExercise[] = []): PlannedExercise[] {
  if (focus.includes('cardio') && focus.length === 1) return [];
  const budget = Math.max(20, p.sessionMin - 15); // 10 min warm-up + 5 min cool-down
  const out: PlannedExercise[] = [...locked];
  let used = out.reduce((a, e) => a + minutesFor(e), 0);
  const taken = new Set(out.map((e) => e.name));
  const SMALL: Focus[] = ['biceps', 'triceps', 'abs'];
  const maxCompounds = p.sessionMin <= 45 ? 1 : p.sessionMin <= 75 ? 2 : 3;
  const maxExercises = p.sessionMin <= 45 ? 4 : p.sessionMin <= 75 ? 6 : 7;
  let compounds = out.filter((e) => findExercise(e.name)?.compound).length;
  const queues = focus.filter((f) => f !== 'cardio').map((f) => {
    const muscles = FOCUS_MUSCLES[f];
    const small = SMALL.includes(f);
    const cands = allExercises().filter((e) => muscles.includes(e.primary[0]) && available(e, p) && LEVEL_RANK[e.level] <= LEVEL_RANK[p.experience] + 1)
      .sort((a, b) =>
        Number(p.prefer.includes(b.name)) - Number(p.prefer.includes(a.name)) ||
        (small ? Number(a.compound) - Number(b.compound) : Number(b.compound) - Number(a.compound)) ||
        // At the gym, loadable lifts beat bodyweight-only versions.
        (p.location === 'gym' ? Number(bwOnly(a)) - Number(bwOnly(b)) : 0));
    return { f, cands, left: FOCUS_WEIGHT[f], comp: 0, maxComp: ['chest', 'back', 'legs', 'full_body'].includes(f) ? 2 : 1 };
  });
  const make = (ex: ExerciseDef) => plannedFrom(ex, goal, p.experience);
  for (let pass = 0; pass < 2; pass++) {
  // Second pass: if time is left, allow a couple more per group.
  if (pass === 1) queues.forEach((q) => (q.left = q.cands.length ? 2 : 0));
  let progress = true;
  while (progress) {
    progress = false;
    for (const q of queues) {
      if (q.left <= 0) continue;
      // First candidate that is new, within the compound cap, and fits the remaining time.
      if (out.length >= maxExercises) { q.left = 0; continue; }
      const ex = q.cands.find((c) => !taken.has(c.name) && (!c.compound || (compounds < maxCompounds && q.comp < q.maxComp)) && used + minutesFor(make(c)) <= budget);
      if (!ex) { q.left = 0; continue; }
      const pe = make(ex);
      out.push(pe); taken.add(ex.name); used += minutesFor(pe); q.left--; progress = true;
      if (ex.compound) { compounds++; q.comp++; }
    }
  }
  }
  // Compounds first, then isolation, with core work last.
  const rank = (n: string) => {
    const e = findExercise(n);
    return e?.compound ? 0 : e && (e.primary[0] === 'abs' || e.primary[0] === 'obliques') ? 2 : 1;
  };
  return out.map((e, i) => ({ e, i })).sort((a, b) => rank(a.e.name) - rank(b.e.name) || a.i - b.i).map((x) => x.e);
}

const monFirst = (d: number | null) => (d == null ? 9 : (d + 6) % 7);
export const sortWeek = (plan: WorkoutDay[]) => [...plan].sort((a, b) => monFirst(a.dow) - monFirst(b.dow));

export const dayName = (focus: Focus[]) => focus.map((f) => FOCUS_LABEL[f]).join(' + ') || 'Rest';

export function generatePlan(p: TrainingPrefs, goal: Goal, existing: WorkoutDay[] = [], lockedDays: number[] = []): WorkoutDay[] {
  const days: WorkoutDay[] = [];
  for (const [k, focus] of Object.entries(p.week)) {
    const dow = Number(k);
    const keep = existing.find((d) => d.dow === dow);
    if (keep && lockedDays.includes(dow)) { days.push(keep); continue; }
    if (!focus.length) continue;
    days.push({ id: `d${dow}-${focus.join('-')}`, name: dayName(focus), dow, focus: focus.map((f) => FOCUS_LABEL[f]).join(', '), focusIds: focus, exercises: buildDay(focus, p, goal) });
  }
  return sortWeek(days);
}

export interface Conflict { dowA: number; dowB: number; muscles: MuscleGroup[] }

/** Flags the same large muscle trained hard on back-to-back days. */
export function recoveryConflicts(plan: WorkoutDay[]): Conflict[] {
  const big: MuscleGroup[] = ['chest', 'back', 'lats', 'quads', 'hamstrings', 'glutes', 'shoulders'];
  const hard = (d: WorkoutDay) => {
    const sets = new Map<MuscleGroup, number>();
    for (const e of d.exercises) for (const m of findExercise(e.name)?.primary ?? []) sets.set(m, (sets.get(m) ?? 0) + e.sets);
    return new Set([...sets.entries()].filter(([m, n]) => big.includes(m) && n >= 6).map(([m]) => m));
  };
  const byDow = new Map(plan.filter((d) => d.dow != null).map((d) => [d.dow as number, hard(d)]));
  const out: Conflict[] = [];
  for (const [dow, ms] of byDow) {
    const next = byDow.get((dow + 1) % 7);
    if (!next) continue;
    const shared = [...ms].filter((m) => next.has(m));
    if (shared.length) out.push({ dowA: dow, dowB: (dow + 1) % 7, muscles: shared });
  }
  return out;
}

// ---------- editing helpers (used by the planner screen) ----------

/** Best guess at a day's muscle groups when it has none saved (imported or hand-built days). */
export function inferFocus(day: WorkoutDay): Focus[] {
  if (day.focusIds?.length) return day.focusIds;
  const count = new Map<Focus, number>();
  const order: Focus[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'abs'];
  for (const e of day.exercises) {
    const m = findExercise(e.name)?.primary[0];
    const f = order.find((x) => m && FOCUS_MUSCLES[x].includes(m));
    if (f) count.set(f, (count.get(f) ?? 0) + e.sets);
  }
  return order.filter((f) => count.has(f)).sort((a, b) => (count.get(b) ?? 0) - (count.get(a) ?? 0));
}

/** Preferences to fall back on when the user never went through onboarding (e.g. a restored backup). */
export function prefsFromPlan(plan: WorkoutDay[]): TrainingPrefs {
  const week: Record<number, Focus[]> = {};
  for (const d of plan) if (d.dow != null) week[d.dow] = inferFocus(d);
  return {
    week, sessionMin: 75, location: 'gym', equipment: [], experience: 'intermediate',
    prefer: [...new Set(plan.flatMap((d) => d.exercises.map((e) => e.name)))], avoid: [], limitations: '',
  };
}

/** Rebuilds one day around its muscle groups, keeping locked exercises exactly as they are. */
export function rebuildDay(day: WorkoutDay, p: TrainingPrefs, goal: Goal, focus: Focus[] = inferFocus(day)): WorkoutDay {
  const locked = day.exercises.filter((e) => e.locked);
  return {
    ...day, focusIds: focus, focus: focus.map((f) => FOCUS_LABEL[f]).join(', '),
    exercises: normalizeSupersets(buildDay(focus, p, goal, locked)),
  };
}

/** Regenerates every unlocked day. Locked days and locked exercises are left untouched. */
export const regeneratePlan = (plan: WorkoutDay[], p: TrainingPrefs, goal: Goal): WorkoutDay[] =>
  plan.map((d) => (d.locked ? d : rebuildDay(d, p, goal)));

/** Moves a day to another weekday. If that weekday already has a workout, the two swap places. */
export function moveDay(plan: WorkoutDay[], fromDow: number, toDow: number): WorkoutDay[] {
  if (fromDow === toDow) return plan;
  return sortWeek(plan.map((d) => (d.dow === fromDow ? { ...d, dow: toDow } : d.dow === toDow ? { ...d, dow: fromDow } : d)));
}

/** Same-muscle swaps the user can actually do, best match first. */
export function alternatives(name: string, p: TrainingPrefs, exclude: string[] = []): ExerciseDef[] {
  const ex = findExercise(name);
  const all = allExercises().filter((e) => e.name !== name && !exclude.includes(e.name) && available(e, p));
  if (!ex) return all;
  const score = (e: ExerciseDef) =>
    (e.primary[0] === ex.primary[0] ? 4 : e.primary.some((m) => ex.primary.includes(m)) ? 2 : 0) +
    (e.compound === ex.compound ? 1 : 0) + (p.prefer.includes(e.name) ? 0.5 : 0);
  return all.filter((e) => score(e) >= 2).sort((a, b) => score(b) - score(a));
}

/** Supersets must be neighbours; a group left with one exercise stops being a superset. */
export function normalizeSupersets(list: PlannedExercise[]): PlannedExercise[] {
  let next = 1;
  const out = list.map((e) => ({ ...e }));
  let i = 0;
  while (i < out.length) {
    const g = out[i].superset;
    let j = i + 1;
    if (g != null) while (j < out.length && out[j].superset === g) j++;
    if (g != null && j - i >= 2) { for (let k = i; k < j; k++) out[k].superset = next; next++; }
    else delete out[i].superset;
    i = g != null && j - i >= 2 ? j : i + 1;
  }
  return out;
}

/** Links exercise i with the one after it, or unlinks them if they are already paired. */
export function toggleSuperset(list: PlannedExercise[], i: number): PlannedExercise[] {
  if (i < 0 || i >= list.length - 1) return list;
  const out = list.map((e) => ({ ...e }));
  const a = out[i], b = out[i + 1];
  if (a.superset != null && a.superset === b.superset) {
    // Split the group between i and i+1.
    const g = a.superset, fresh = Math.max(0, ...out.map((e) => e.superset ?? 0)) + 1;
    for (let k = i + 1; k < out.length && out[k].superset === g; k++) out[k].superset = fresh;
  } else {
    const g = a.superset ?? Math.max(0, ...out.map((e) => e.superset ?? 0)) + 1;
    a.superset = g;
    const old = b.superset;
    if (old != null) { for (let k = i + 1; k < out.length && out[k].superset === old; k++) out[k].superset = g; }
    else b.superset = g;
  }
  return normalizeSupersets(out);
}

export function moveExercise(list: PlannedExercise[], from: number, to: number): PlannedExercise[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const out = [...list];
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x);
  return normalizeSupersets(out);
}
