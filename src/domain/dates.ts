import type { ISODate } from './types';

export const iso = (d: Date): ISODate => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export const parseISO = (s: ISODate): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const today = (): ISODate => iso(new Date());
export const addDays = (s: ISODate, n: number): ISODate => {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
/** Monday of the week containing s. */
export const weekStart = (s: ISODate): ISODate => {
  const d = parseISO(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
};
export const dow = (s: ISODate): number => parseISO(s).getDay();
export const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const shortDate = (s: ISODate) =>
  parseISO(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
export const longDate = (s: ISODate) =>
  parseISO(s).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
export const daysBetween = (a: ISODate, b: ISODate) =>
  Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
