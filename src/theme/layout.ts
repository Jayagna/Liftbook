// Responsive layout: one hook every screen reads, so breakpoints live in one place.
// compact = phones, medium = tablets and small windows, wide = laptops and desktops (navigation moves to a left rail).
import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'compact' | 'medium' | 'wide';
export const RAIL_WIDTH = 220;

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const bp: Breakpoint = width >= 1024 ? 'wide' : width >= 700 ? 'medium' : 'compact';
  const rail = bp === 'wide' ? RAIL_WIDTH : 0;
  const gutter = width < 360 ? 12 : bp === 'compact' ? 16 : bp === 'medium' ? 24 : 32;
  const inner = Math.min(width - rail - gutter * 2, bp === 'wide' ? 1320 : bp === 'medium' ? 860 : width);
  return {
    width, height, bp, rail, gutter,
    compact: bp === 'compact', medium: bp === 'medium', wide: bp === 'wide',
    /** Phones narrower than an iPhone mini: tighten type and stack rows. */
    tiny: width < 360,
    /** Widest the content column may grow. */
    contentMax: bp === 'wide' ? 1320 : bp === 'medium' ? 860 : undefined,
    /** Width actually available to content. */
    inner,
    /** Card columns for dashboard-like screens. */
    cols: bp === 'compact' ? 1 : inner >= 1120 ? 3 : 2,
  };
}
