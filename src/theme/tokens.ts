// Liftbook design tokens. One dark theme, tuned for OLED and gym lighting.
export const color = {
  bg: '#0A0C0B',
  bg2: '#101311',
  card: '#151917',
  cardHi: '#1D2320',
  line: 'rgba(245,247,242,0.08)',
  lineStrong: 'rgba(245,247,242,0.14)',
  text: '#F5F7F2',
  text2: '#A3AAA2',
  text3: '#6E766F',
  lime: '#C8FF50',
  limeDim: 'rgba(200,255,80,0.14)',
  limeInk: '#0A0C0B',
  water: '#3FA9FF',
  waterDim: 'rgba(63,169,255,0.16)',
  protein: '#3DDC97',
  carbs: '#FF9A3D',
  fat: '#A78BFA',
  danger: '#FF6B5E',
  warn: '#FFC24A',
  ok: '#5BE38B',
} as const;

export const font = {
  display: 'BarlowCondensed_700Bold',
  displaySemi: 'BarlowCondensed_600SemiBold',
  body: 'Inter_400Regular',
  bodyMed: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 } as const;

/** Motion: springs for things you touch, short eases for state changes. */
export const motion = {
  micro: 160, state: 260, enter: 340, stagger: 45,
  press: { damping: 18, stiffness: 420 }, release: { damping: 15, stiffness: 320 }, slide: { damping: 22, stiffness: 260 },
} as const;

export const type = {
  hero: { fontFamily: font.display, fontSize: 56, lineHeight: 58, letterSpacing: -0.5, color: color.text },
  stat: { fontFamily: font.display, fontSize: 34, lineHeight: 36, color: color.text, fontVariant: ['tabular-nums'] as 'tabular-nums'[] },
  statSm: { fontFamily: font.display, fontSize: 24, lineHeight: 26, color: color.text, fontVariant: ['tabular-nums'] as 'tabular-nums'[] },
  title: { fontFamily: font.display, fontSize: 28, lineHeight: 30, letterSpacing: 0.3, color: color.text },
  h2: { fontFamily: font.displaySemi, fontSize: 20, lineHeight: 22, letterSpacing: 0.6, textTransform: 'uppercase' as const, color: color.text },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 21, color: color.text },
  bodyMed: { fontFamily: font.bodyMed, fontSize: 15, lineHeight: 21, color: color.text },
  small: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.text2 },
  label: { fontFamily: font.bodySemi, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' as const, color: color.text3 },
} as const;

export const shadow = {
  card: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  glow: { shadowColor: '#C8FF50', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
} as const;
