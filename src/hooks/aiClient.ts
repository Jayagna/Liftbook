// The only place the app talks to the AI function. It sends what the caller passes and nothing else.
import { AI_ERRORS, aiEndpoint, type AiConfig } from '@/domain/ai';

export class AiError extends Error { constructor(public code: string, public detail = '') { super(code); } }

/** Friendly message for an AI failure, with Gemini's own reason added when the server passed one on. */
export function aiErrorText(e: unknown): string {
  const err = e as AiError;
  const base = AI_ERRORS[err?.code] ?? AI_ERRORS.unknown;
  return err?.detail ? `${base} (${err.detail})` : base;
}

export async function callAi<T>(config: AiConfig, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 45000);
  try {
    res = await fetch(aiEndpoint(config), {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', apikey: config.anonKey.trim(), Authorization: `Bearer ${config.anonKey.trim()}` },
      body: JSON.stringify({ ...body, passcode: config.passcode.trim() }),
    });
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') throw new AiError('timeout');
    throw new AiError(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'unknown', String((e as Error)?.message ?? '').slice(0, 120));
  } finally {
    clearTimeout(timer);
  }
  const raw = await res.text().catch(() => '');
  let data: ({ error?: string; detail?: string } & T) | null = null;
  try { data = JSON.parse(raw); } catch { data = null; }
  if (!data) throw new AiError('http', `HTTP ${res.status}${raw ? `: ${raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140)}` : ''}`);
  if (!res.ok) throw new AiError(typeof data.error === 'string' ? data.error : 'http', typeof data.detail === 'string' && data.detail ? data.detail : typeof data.error === 'string' ? '' : `HTTP ${res.status}`);
  return data;
}
