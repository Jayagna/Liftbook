// AI assistant: a short chat that knows the user's goal, targets and recent totals. The conversation is not saved.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from '@/components/ui/Aurora';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { T } from '@/components/ui/T';
import { aiReady, coachContext, type ChatMessage } from '@/domain/ai';
import { today } from '@/domain/dates';
import { aiErrorText, callAi } from '@/hooks/aiClient';
import { getState, useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

const IDEAS = ['How am I doing on protein this week?', 'What should I eat to hit today’s targets?', 'Is my weekly plan balanced?'];
const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

export default function Assistant() {
  const insets = useSafeAreaInsets();
  const ai = useApp((s) => s.ai);
  const isSample = useApp((s) => s.isSample);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const on = aiReady(ai);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy || !aiReady(ai)) return;
    const next: ChatMessage[] = [...msgs, { role: 'user', text: question }];
    setMsgs(next); setText(''); setErr(null); setBusy(true);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    try {
      const r = await callAi<{ text: string }>(ai, { kind: 'chat', messages: next, context: coachContext(getState(), today()) });
      setMsgs([...next, { role: 'assistant', text: String(r.text ?? '').trim() }]);
    } catch (e) {
      setErr(aiErrorText(e));
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora />
      <View style={[styles.top, { paddingTop: insets.top + space.md }]}>
        <PressableScale style={styles.round} onPress={back} accessibilityLabel="Back"><Ionicons name="chevron-back" size={22} color={color.text} /></PressableScale>
        <View style={{ flex: 1 }}>
          <T v="label" style={{ color: color.lime }}>Powered by Gemini</T>
          <T v="title">Assistant</T>
        </View>
        {msgs.length > 0 && <Pill small label="Clear" onPress={() => { setMsgs([]); setErr(null); }} />}
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ padding: space.lg, paddingTop: 0, gap: space.md }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!on ? (
          <View style={styles.note}>
            <T v="bodyMed">The assistant is not connected yet.</T>
            <T v="small">Connect it once in Profile, under AI assistant.</T>
            <Pill label="Go to Profile" onPress={() => router.replace('/profile')} style={{ alignSelf: 'flex-start' }} />
          </View>
        ) : (
          <>
            <View style={styles.note}>
              <T v="small">Answers come from an AI and can be wrong. It is not a doctor or dietitian. It sees your goal, targets and recent totals{isSample ? ' (the sample athlete’s, right now)' : ''}, not your name, photos or full logs. This chat is not saved.</T>
            </View>
            {msgs.length === 0 && IDEAS.map((q) => <Pill key={q} label={q} onPress={() => send(q)} style={{ alignSelf: 'flex-start' }} />)}
            {msgs.map((m, i) => (
              <View key={i} style={[styles.bubble, m.role === 'user' ? styles.mine : styles.theirs]}>
                <T style={[styles.msg, m.role === 'user' && { color: color.limeInk }]} selectable>{m.text}</T>
              </View>
            ))}
            {busy && <View style={[styles.bubble, styles.theirs, { flexDirection: 'row', gap: 8 }]}><ActivityIndicator color={color.lime} /><T v="small">Thinking…</T></View>}
            {err && <T v="small" style={{ color: color.warn }} accessibilityRole="alert">{err}</T>}
          </>
        )}
      </ScrollView>

      {on && (
        <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
          <TextInput value={text} onChangeText={setText} placeholder="Ask about your training or food" placeholderTextColor={color.text3} style={styles.input} multiline accessibilityLabel="Your question" maxLength={600} />
          <PressableScale style={[styles.send, (!text.trim() || busy) && { opacity: 0.4 }]} disabled={!text.trim() || busy} onPress={() => send(text)} accessibilityLabel="Send">
            <Ionicons name="arrow-up" size={20} color={color.limeInk} />
          </PressableScale>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  note: { gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  bubble: { maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  mine: { alignSelf: 'flex-end', backgroundColor: color.lime, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: color.card, borderBottomLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  msg: { fontFamily: font.body, fontSize: 15, lineHeight: 21, color: color.text },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line, backgroundColor: color.bg },
  input: { flex: 1, minHeight: 46, maxHeight: 120, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 23, backgroundColor: color.bg2, color: color.text, fontFamily: font.body, fontSize: 16 },
  send: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: color.lime },
});
