// The only place the app talks to the AI function. It sends what the caller passes and nothing else.
import { aiEndpoint, type AiConfig } from '@/domain/ai';

export class AiError extends Error { constructor(public code: string) { super(code); } }

export async function callAi<T>(config: AiConfig, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 30000);
  try {
    res = await fetch(aiEndpoint(config), {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', apikey: config.anonKey.trim(), Authorization: `Bearer ${config.anonKey.trim()}` },
      body: JSON.stringify({ ...body, passcode: config.passcode.trim() }),
    });
  } catch {
    throw new AiError(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'unknown');
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => null) as ({ error?: string } & T) | null;
  if (!res.ok || !data) throw new AiError(typeof data?.error === 'string' ? data.error : 'unknown');
  return data;
}
