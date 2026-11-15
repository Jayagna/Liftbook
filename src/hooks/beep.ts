// A short tone for "rest is over" on the web / home-screen build, where the browser has no haptics.
// Native builds rely on the haptic instead.
import { Platform } from 'react-native';

type Ctx = { state: string; currentTime: number; destination: unknown; resume: () => Promise<void>; createOscillator: () => any; createGain: () => any };
let ctx: Ctx | null = null;

const make = (): Ctx | null => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: new () => Ctx; webkitAudioContext?: new () => Ctx };
  const C = w.AudioContext ?? w.webkitAudioContext;
  try { return C ? new C() : null; } catch { return null; }
};

/** Browsers only allow sound after a tap, so call this from a press handler before the tone is needed. */
export function primeBeep() {
  ctx = ctx ?? make();
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
}

export function beep(times = 2) {
  if (!ctx || ctx.state !== 'running') return;
  try {
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      const t = ctx.currentTime + i * 0.22;
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.18);
    }
  } catch { /* sound is a nicety, never a failure */ }
}
