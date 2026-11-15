import type { DayLog, SupplementProduct, SupplementUnit } from './types';

export interface Totals { kcal: number; p: number; c: number; f: number }
export const ZERO: Totals = { kcal: 0, p: 0, c: 0, f: 0 };

/**
 * Meals plus logged protein-powder servings. Creatine and other supplements never
 * add calories or macros. A shake logged as a meal is not double-counted because
 * supplement logs are only created from the supplement tracker.
 */
export function dayTotals(day: DayLog | undefined, products: SupplementProduct[]): Totals {
  if (!day) return { ...ZERO };
  const t = day.meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { ...ZERO });
  for (const log of day.supplements) {
    const prod = products.find((x) => x.id === log.productId);
    if (!prod || prod.kind !== 'protein') continue;
    t.kcal += prod.kcal * log.amount;
    t.p += prod.proteinG * log.amount;
    t.c += prod.carbsG * log.amount;
    t.f += prod.fatG * log.amount;
  }
  return t;
}

/** Amount taken today in the product's own unit (scoops or grams). */
export const supplementTaken = (day: DayLog | undefined, productId: string) =>
  day ? day.supplements.filter((s) => s.productId === productId).reduce((a, s) => a + s.amount, 0) : 0;

/** "1 scoop", "2 scoops", "3 g", "2 tablets". */
export const unitWord = (unit: SupplementUnit, n: number) => (unit === 'g' ? 'g' : n === 1 ? unit : `${unit}s`);
const trim = (x: number) => (Math.round(x * 100) / 100).toString();
export const amountLabel = (unit: SupplementUnit, n: number) => `${trim(n)} ${unitWord(unit, n)}`;

/** Whether the product's own daily amount was reached on each of the 7 days ending at `end`. */
export function supplementWeek(days: Record<string, DayLog>, product: SupplementProduct, dates: string[]) {
  return dates.map((d) => {
    const taken = supplementTaken(days[d], product.id);
    return { date: d, taken, state: taken <= 0 ? 'none' as const : taken >= product.dailyTarget ? 'full' as const : 'part' as const };
  });
}
