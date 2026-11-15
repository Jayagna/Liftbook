// Profile > AI: connect the app to the user's own AI function. The Gemini key is never entered here;
// it stays in the server function. What is entered is kept on this device and left out of backup files.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, CardHeader } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Pill';
import { T } from '@/components/ui/T';
import { AI_ERRORS, aiReady, type AiConfig } from '@/domain/ai';
import { AiError, callAi } from '@/hooks/aiClient';
import { actions, useApp } from '@/store/store';
import { color, space } from '@/theme/tokens';

export function AiCard({ index = 0 }: { index?: number }) {
  const saved = useApp((s) => s.ai);
  const [f, setF] = useState<AiConfig>(saved ?? { url: '', anonKey: '', passcode: '' });
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setF(saved ?? { url: '', anonKey: '', passcode: '' }); }, [saved]);
  const ready = aiReady(f);

  const connect = async () => {
    if (!ready || busy) return;
    setBusy(true); setNote(null);
    const cfg = { url: f.url.trim().replace(/\/+$/, ''), anonKey: f.anonKey.trim(), passcode: f.passcode.trim() };
    try {
      await callAi(cfg, { kind: 'ping' });
      actions.setAi(cfg);
      setNote({ ok: true, text: 'Connected. The assistant and AI meal estimates are on.' });
    } catch (e) {
      setNote({ ok: false, text: AI_ERRORS[(e as AiError).code] ?? AI_ERRORS.unknown });
    } finally { setBusy(false); }
  };

  return (
    <Card index={index}>
      <CardHeader title="AI assistant" right={saved ? <T v="small" style={{ color: color.ok }}>On</T> : undefined} />
      <View style={{ gap: space.md }}>
        <T v="small">Optional. It uses your own free Supabase project, where your Gemini key is kept secret. When you ask something, your question and a short summary (goal, targets, recent totals) are sent to Google Gemini through that project. Your name, photos and full logs are not sent.</T>
        <View style={styles.wrap}><Field label="Project URL" value={f.url} onChangeText={(v) => setF({ ...f, url: v })} placeholder="https://….supabase.co" autoCapitalize="none" autoCorrect={false} keyboardType="url" /></View>
        <View style={styles.wrap}><Field label="Publishable key" value={f.anonKey} onChangeText={(v) => setF({ ...f, anonKey: v })} placeholder="sb_publishable_…" autoCapitalize="none" autoCorrect={false} /></View>
        <View style={styles.wrap}><Field label="Passcode" value={f.passcode} onChangeText={(v) => setF({ ...f, passcode: v })} placeholder="The phrase you saved in Supabase" autoCapitalize="none" autoCorrect={false} secureTextEntry /></View>
        <View style={styles.wrap}>
          <Pill solid label={busy ? 'Checking…' : saved ? 'Reconnect' : 'Connect'} onPress={connect} style={{ opacity: ready ? 1 : 0.4 }} />
          {saved && <Pill label="Open assistant" onPress={() => router.push('/assistant')} />}
          {saved && <Pill label="Turn off" onPress={() => { actions.setAi(null); setNote(null); }} />}
        </View>
        {note && <T v="small" style={{ color: note.ok ? color.ok : color.warn }} accessibilityRole="alert">{note.text}</T>}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({ wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
