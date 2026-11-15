// Liftbook AI function (Supabase Edge Function, Deno). The Gemini key lives here as a secret and never reaches the app.
// Secrets to set in Supabase:  GEMINI_API_KEY (required), LIFTBOOK_PASSCODE (required), GEMINI_MODEL (optional).
// The passcode is a phrase you choose. The app must send it, so a stranger who finds the address cannot spend your quota.
// Nothing is stored or logged here: a request comes in, goes to Gemini, and the answer goes back.
const KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const PASS = Deno.env.get('LIFTBOOK_PASSCODE') ?? '';
const MODEL = (Deno.env.get('GEMINI_MODEL') ?? '').trim() || 'gemini-flash-latest';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const COACH = `You are the assistant inside Liftbook, a personal training and nutrition tracker.
Be brief, practical and specific to the numbers you are given. Use metric units.
You are not a doctor or dietitian. For pain, injury, illness, medication or eating-disorder concerns, say so and point to a professional.
Never tell the user a supplement dose or timing; refer them to the product label or a professional.
Never invent data about the user. If the summary does not contain something, say you do not have it.
Suggested weight increases are suggestions only; the user decides.`;

const MEAL = `Estimate the nutrition of the meal the user describes. Split it into its separate foods.
Use typical home portions when the amount is not stated, and say which portion you assumed in "assumed".
All numbers are for the whole amount of that food as eaten, not per 100 g.
Set confidence to "low" when the description is vague. If the text is not food, return an empty items list and explain in "note".`;

const MEAL_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' }, assumed: { type: 'STRING' }, kcal: { type: 'NUMBER' }, p: { type: 'NUMBER' },
          c: { type: 'NUMBER' }, f: { type: 'NUMBER' }, confidence: { type: 'STRING', enum: ['low', 'medium', 'high'] },
        },
        required: ['name', 'assumed', 'kcal', 'p', 'c', 'f', 'confidence'],
      },
    },
    note: { type: 'STRING' },
  },
  required: ['items'],
};

// If the chosen model is retired or not offered to this key, try current general models before giving up.
// Meal estimates use the lighter, faster models first: a calorie guess does not need deep reasoning.
const CHAT_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite'];
const MEAL_MODELS = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];

async function gemini(system: string, contents: unknown[], json: boolean) {
  const list = json ? MEAL_MODELS : CHAT_MODELS;
  const models = [...new Set([...(Deno.env.get('GEMINI_MODEL') ? [MODEL] : []), ...list])];
  let last = { error: 'upstream', status: 0, detail: '' };
  for (const model of models) {
    // Turn off "thinking" so answers come back in a second or two. Some models do not accept this, so retry without it.
    for (const fast of [true, false]) {
      const base = json ? { responseMimeType: 'application/json', responseSchema: MEAL_SCHEMA, temperature: 0.2 } : { temperature: 0.6, maxOutputTokens: 700 };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: fast ? { ...base, thinkingConfig: { thinkingBudget: 0 } } : base,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // Google's own message, shortened, so the app can say what actually went wrong (it never contains the key).
        const detail = String(data?.error?.message ?? '').slice(0, 220);
        last = { error: res.status === 429 ? 'busy' : 'upstream', status: res.status, detail: `${model}: ${res.status} ${detail}`.trim() };
        if (fast && res.status === 400 && /think/i.test(detail)) continue;
        break;
      }
      const text = (data?.candidates?.[0]?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('');
      const why = data?.candidates?.[0]?.finishReason ?? data?.promptFeedback?.blockReason ?? '';
      return text ? { text } : { error: 'empty', status: 200, detail: why ? `${model}: ${why}` : '' };
    }
    if (last.status !== 404 && !(last.status === 400 && /model/i.test(last.detail))) return last;
  }
  return last;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method' });
  if (!KEY || !PASS) return reply(500, { error: 'not-configured' });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: 'bad-request' }); }
  if (body.passcode !== PASS) return reply(401, { error: 'passcode' });

  if (body.kind === 'ping') return reply(200, { ok: true });

  if (body.kind === 'meal') {
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 600) : '';
    if (!text) return reply(400, { error: 'bad-request' });
    const r = await gemini(MEAL, [{ role: 'user', parts: [{ text }] }], true);
    if ('error' in r) return reply(502, { error: r.error, detail: r.detail });
    try { return reply(200, { estimate: JSON.parse(r.text) }); } catch { return reply(502, { error: 'empty' }); }
  }

  if (body.kind === 'chat') {
    const msgs = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const contents = msgs
      .filter((m): m is { role: string; text: string } => !!m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'assistant'))
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text.slice(0, 2000) }] }));
    if (!contents.length || contents[contents.length - 1].role !== 'user') return reply(400, { error: 'bad-request' });
    const summary = typeof body.context === 'string' ? body.context.slice(0, 4000) : '';
    const r = await gemini(`${COACH}\n\nSummary of the user's own data from the app:\n${summary || '(none shared)'}`, contents, false);
    if ('error' in r) return reply(502, { error: r.error, detail: r.detail });
    return reply(200, { text: r.text });
  }
  return reply(400, { error: 'bad-request' });
});
