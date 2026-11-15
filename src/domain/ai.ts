// What the app shares with the AI function and how it reads the answer. Pure functions, no network here.
// The summary is deliberately small: goal, targets and recent totals. No name, no photos, no raw logs.
import { addDays } from './dates';
import { dayTotals } from './nutrition';
import { baseTargets, goalInfo } from './targets';
import type { DayLog, ISODate, Profile, SupplementProduct, TargetOverrides, WorkoutDay } from './types';

export interface AiConfig { url: string; anonKey: string; passcode: string }
export interface ChatMessage { role: 'user' | 'assistant'; text: string }
export interface EstimateItem { name: string; assumed: string; kcal: number; p: number; c: number; f: number; confidence: 'low' | 'medium' | 'high' }

export const aiReady = (c: AiConfig | null | undefined): c is AiConfig =>
  !!c && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(c.url.trim().replace(/\/+$/, '')) && c.anonKey.trim().length > 20 && c.passcode.trim().length > 0;

export const aiEndpoint = (c: AiConfig) => `${c.url.trim().replace(/\/+$/, '')}/functions/v1/ai`;

/** The short summary sent with a chat message, so answers fit the user's numbers. */
export function coachContext(s: { profile: Profile | null; overrides: TargetOverrides; plan: WorkoutDay[]; days: Record<ISODate, DayLog>; products: SupplementProduct[] }, end: ISODate): string {
  if (!s.profile) return '';
  const p = s.profile;
  const t = baseTargets(p, s.overrides);
  const lines = [
    `Age ${p.age}, ${p.sex}, ${p.heightCm} cm, ${p.weightKg} kg${p.targetWeightKg ? `, target ${p.targetWeightKg} kg` : ''}. Goal: ${goalInfo(p.goal).label}.`,
    `Daily targets: ${t.kcal} kcal, protein ${t.protein} g, carbs ${t.carbs} g, fat ${t.fat} g.`,
  ];
  if (s.plan.length) lines.push(`Weekly plan: ${s.plan.map((d) => `${d.name} (${d.exercises.length} exercises)`).join('; ')}.`);
  const week = Array.from({ length: 7 }, (_, i) => addDays(end, -i)).map((d) => s.days[d]).filter(Boolean) as DayLog[];
  const fed = week.filter((d) => d.meals.length > 0);
  if (fed.length) {
    const sum = fed.map((d) => dayTotals(d, s.products)).reduce((a, x) => ({ kcal: a.kcal + x.kcal, p: a.p + x.p }), { kcal: 0, p: 0 });
    lines.push(`Last 7 days: food logged on ${fed.length} days, average ${Math.round(sum.kcal / fed.length)} kcal and ${Math.round(sum.p / fed.length)} g protein.`);
  }
  const trained = week.filter((d) => d.sets.length > 0);
  lines.push(`Workouts in the last 7 days: ${trained.length}${trained.length ? ` (${trained.map((d) => d.split ?? 'workout').join(', ')})` : ''}.`);
  const weights = Object.values(s.days).filter((d) => d.bw != null && d.date <= end).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 2);
  if (weights[0]) lines.push(`Latest weigh-in: ${weights[0].bw} kg on ${weights[0].date}.`);
  const today = s.days[end];
  if (today) {
    const x = dayTotals(today, s.products);
    lines.push(`Today so far: ${Math.round(x.kcal)} kcal, ${Math.round(x.p)} g protein, ${today.waterMl} ml water.`);
  }
  return lines.join('\n');
}

const num = (x: unknown) => (typeof x === 'number' && isFinite(x) && x >= 0 ? x : null);

/**
 * Checks an AI meal estimate before it is shown. Items with missing or absurd numbers are dropped,
 * and an item whose calories disagree badly with its own macros is marked low confidence.
 */
export function readEstimate(raw: unknown): { items: EstimateItem[]; note: string } {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as { items?: unknown; note?: unknown };
  const items: EstimateItem[] = [];
  for (const it of Array.isArray(o.items) ? o.items.slice(0, 12) : []) {
    const x = (typeof it === 'object' && it !== null ? it : {}) as Record<string, unknown>;
    const kcal = num(x.kcal), p = num(x.p), c = num(x.c), f = num(x.f);
    const name = typeof x.name === 'string' ? x.name.trim().slice(0, 60) : '';
    if (!name || kcal == null || p == null || c == null || f == null || kcal > 3000 || p > 300 || c > 500 || f > 300) continue;
    const fromMacros = p * 4 + c * 4 + f * 9;
    const off = kcal > 0 && Math.abs(fromMacros - kcal) / Math.max(kcal, 50) > 0.35;
    const conf = x.confidence === 'high' || x.confidence === 'medium' ? x.confidence : 'low';
    items.push({
      name, assumed: typeof x.assumed === 'string' ? x.assumed.trim().slice(0, 80) : '',
      kcal: Math.round(kcal), p: Math.round(p * 10) / 10, c: Math.round(c * 10) / 10, f: Math.round(f * 10) / 10,
      confidence: off ? 'low' : conf,
    });
  }
  return { items, note: typeof o.note === 'string' ? o.note.trim().slice(0, 240) : '' };
}

export const AI_ERRORS: Record<string, string> = {
  passcode: 'The passcode does not match the one saved in Supabase.',
  'not-configured': 'The AI function is missing its Gemini key or passcode in Supabase.',
  busy: 'Gemini is busy or the free quota is used up for now. Try again in a little while.',
  upstream: 'Gemini refused the request. Check the key and model name in Supabase.',
  empty: 'The AI gave no usable answer. Try wording it differently.',
  offline: 'No connection. The AI needs the internet; everything else works offline.',
  timeout: 'The AI took too long to answer. Try again; if it keeps happening, check the function logs in Supabase.',
  http: 'The AI function answered with an error instead of a result. It may have failed to deploy: open Edge Functions > ai > Logs in Supabase.',
  unknown: 'The AI function could not be reached. Check the project URL and key in Profile.',
};
