// Profile > Data: save a backup file, restore from one, preview the sample, or erase everything on this phone.
// Nothing here talks to a server. A backup goes only where the user sends it.
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Card, CardHeader } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { T } from '@/components/ui/T';
import { backupFileName, backupSummary, makeBackup, readBackup, type BackupData } from '@/domain/backup';
import { shortDate, today } from '@/domain/dates';
import { importLiftbook, type LiftbookExport } from '@/domain/liftbookImport';
import { canCopyText, copyText, pickTextFile, saveTextFile } from '@/hooks/backupFile';
import { haptic } from '@/hooks/haptics';
import { actions, getState, useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

type Pending =
  | { kind: 'app'; data: BackupData; made: string | null; info: ReturnType<typeof backupSummary> }
  | { kind: 'legacy'; raw: unknown; info: ReturnType<typeof backupSummary> };
type Note = { at: 'backup' | 'restore' | 'erase'; tone: 'ok' | 'warn'; text: string };

const plural = (n: number, one: string) => `${n.toLocaleString()} ${one}${n === 1 ? '' : 's'}`;
const ago = (at: number) => {
  const d = Math.floor((Date.now() - at) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

export function DataCard({ index = 0 }: { index?: number }) {
  const isSample = useApp((s) => s.isSample);
  const lastBackupAt = useApp((s) => s.lastBackupAt);
  const hasData = useApp((s) => !!s.profile || Object.keys(s.days).length > 0);
  const photoCount = useApp((s) => s.photos.length);
  const [note, setNote] = useState<Note | null>(null);
  const [paste, setPaste] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [erasing, setErasing] = useState(false);
  const [busy, setBusy] = useState(false);

  const backupText = () => JSON.stringify(makeBackup(getState(), new Date()));

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    const name = backupFileName(today());
    try {
      const r = await saveTextFile(name, backupText());
      if (r === 'cancelled') return;
      actions.markBackedUp();
      haptic.success();
      setNote({ at: 'backup', tone: 'ok', text: r === 'saved'
        ? `Saved ${name} to your downloads. Keep a copy somewhere other than this phone.`
        : `${name} was handed to the share sheet. Check it arrived where you sent it, and keep it somewhere other than this phone.` });
    } catch {
      setNote({ at: 'backup', tone: 'warn', text: canCopyText ? 'The file could not be saved here. Use “Copy as text” and paste it somewhere safe instead.' : 'The backup file could not be saved. Nothing on this phone was changed.' });
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    setNote(null);
    try {
      await copyText(backupText());
      setNote({ at: 'backup', tone: 'ok', text: 'Backup copied as text. Paste it into a note or an email to yourself. It only counts as a backup once it is saved somewhere.' });
    } catch {
      setNote({ at: 'backup', tone: 'warn', text: 'Copying was blocked by this browser.' });
    }
  };

  /** Checks backup text and shows what is inside. Nothing is replaced until the user confirms. */
  const load = (text: string) => {
    setNote(null);
    const r = readBackup(text);
    if (!r.ok) { setPending(null); setNote({ at: 'restore', tone: 'warn', text: r.error }); return; }
    if (r.kind === 'app') {
      setPending({ kind: 'app', data: r.data, made: r.exportedAt, info: backupSummary(r.data.days) });
    } else {
      try {
        const x = importLiftbook(r.raw as LiftbookExport);
        setPending({ kind: 'legacy', raw: r.raw, info: backupSummary(x.days) });
      } catch {
        setPending(null);
        setNote({ at: 'restore', tone: 'warn', text: 'That looks like an original Liftbook export, but it is incomplete and could not be read.' });
        return;
      }
    }
    setPaste(null);
  };

  const fromFile = async () => {
    setNote(null);
    try {
      const f = await pickTextFile();
      if (f) load(f.text);
    } catch (e) {
      setNote({ at: 'restore', tone: 'warn', text: (e as Error | null)?.message === 'too-big' ? 'That file is far too large to be a Liftbook backup.' : 'That file could not be opened.' });
    }
  };

  const restore = () => {
    if (!pending) return;
    try {
      if (pending.kind === 'app') actions.restoreBackup(pending.data); else actions.importLiftbook(pending.raw);
      haptic.success();
      setNote({ at: 'restore', tone: 'ok', text: `Restored. ${plural(pending.info.days, 'day')} of logs are on this phone now.` });
    } catch {
      setNote({ at: 'restore', tone: 'warn', text: 'The backup could not be restored. Nothing on this phone was changed.' });
    }
    setPending(null);
  };

  const erase = async () => {
    setErasing(false);
    await actions.eraseAll();
    setNote({ at: 'erase', tone: 'ok', text: 'Everything Liftbook kept on this phone has been erased.' });
  };

  if (isSample) {
    return (
      <Card index={index}>
        <CardHeader title="Data" />
        <T v="small">You are previewing sample data. Exit the sample to back up, restore or erase your own data.</T>
      </Card>
    );
  }

  const stale = hasData && (lastBackupAt == null || Date.now() - lastBackupAt > 14 * 86400000);
  return (
    <Card index={index}>
      <CardHeader title="Data" />
      <View style={{ gap: space.lg }}>
        <View style={{ gap: space.sm }}>
          <T v="bodyMed">Backup file</T>
          <T v="small">Everything you log lives on this phone only. A backup file is how you get it back if the phone, the browser data or the app is lost.{photoCount > 0 ? ' Photos are not in the file.' : ''}</T>
          {hasData ? (
            <>
              <T v="small" style={stale ? { color: color.warn } : undefined}>
                {lastBackupAt == null ? 'No backup saved from this phone yet.' : `Last backup saved ${ago(lastBackupAt)}.`}
              </T>
              <View style={styles.wrap}>
                <Pill solid label={busy ? 'Saving…' : 'Save a backup file'} onPress={save} />
                {canCopyText && <Pill label="Copy as text" onPress={copy} />}
              </View>
            </>
          ) : (
            <T v="small">There is nothing to back up yet.</T>
          )}
          {note?.at === 'backup' && <T v="small" style={{ color: note.tone === 'ok' ? color.ok : color.warn }} accessibilityRole="alert">{note.text}</T>}
        </View>

        <View style={[styles.section, { gap: space.sm }]}>
          <T v="bodyMed">Restore</T>
          {pending ? (
            <View style={styles.box} accessibilityRole="alert">
              <T v="bodyMed">{pending.kind === 'legacy' ? 'Export from the original Liftbook tracker' : `Liftbook backup${pending.made ? ` from ${new Date(pending.made).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`}</T>
              <T v="small">
                {pending.info.days === 0 ? 'It has settings but no daily logs.'
                  : `${plural(pending.info.days, 'day')} of logs${pending.info.first && pending.info.last ? `, ${shortDate(pending.info.first)} to ${shortDate(pending.info.last)}` : ''}: ${plural(pending.info.workouts, 'workout')} and ${pending.info.meals.toLocaleString()} food ${pending.info.meals === 1 ? 'entry' : 'entries'}.`}
              </T>
              <T v="small" style={{ color: color.warn }}>
                {hasData ? 'Restoring replaces the logs, plan and settings on this phone with the ones in this backup.' : 'This will load the backup onto this phone.'}{photoCount > 0 ? ' Your photos stay.' : ''}
              </T>
              <View style={styles.wrap}>
                <Pill small solid label={hasData ? 'Replace my data' : 'Restore'} onPress={restore} />
                <Pill small label="Cancel" onPress={() => setPending(null)} />
              </View>
            </View>
          ) : paste !== null ? (
            <View style={{ gap: space.sm }}>
              <T v="small">Paste the full text of a backup. You will see what is in it before anything is replaced.</T>
              <TextInput value={paste} onChangeText={setPaste} multiline style={styles.paste} placeholder={'{ "schema": "liftbook…'} placeholderTextColor={color.text3} accessibilityLabel="Backup contents" autoCapitalize="none" autoCorrect={false} />
              <View style={styles.wrap}>
                <Pill small solid label="Check backup" onPress={() => load(paste)} />
                <Pill small label="Cancel" onPress={() => setPaste(null)} />
              </View>
            </View>
          ) : (
            <>
              <T v="small">Works with a backup file from this app and with an export from the original Liftbook tracker.</T>
              <View style={styles.wrap}>
                <Pill label="Choose a backup file" onPress={fromFile} />
                <Pill label="Paste backup text" onPress={() => { setNote(null); setPaste(''); }} />
              </View>
            </>
          )}
          {note?.at === 'restore' && <T v="small" style={{ color: note.tone === 'ok' ? color.ok : color.warn }} accessibilityRole="alert">{note.text}</T>}
        </View>

        <View style={[styles.section, { gap: space.sm }]}>
          <T v="bodyMed">Sample</T>
          <T v="small">See the app filled with a made-up athlete. Your own data is set aside and comes back when you exit.</T>
          <View style={styles.wrap}><Pill label="Preview with sample data" onPress={() => actions.enterSample()} /></View>
        </View>

        {hasData && (
          <View style={[styles.section, { gap: space.sm }]}>
            <T v="bodyMed">Erase</T>
            {erasing ? (
              <View style={[styles.box, { borderColor: 'rgba(255,107,94,0.5)' }]} accessibilityRole="alert">
                <T v="small" style={{ color: color.text }}>This deletes every log, your plan, your settings{photoCount > 0 ? ` and your ${plural(photoCount, 'photo')}` : ''} from this phone. It cannot be undone. Save a backup file first if you might want any of it back.</T>
                <View style={styles.wrap}>
                  <Pill small solid tone={color.danger} label="Erase everything" onPress={erase} />
                  <Pill small label="Keep my data" onPress={() => setErasing(false)} />
                </View>
              </View>
            ) : (
              <View style={styles.wrap}><Pill label="Erase everything on this phone" onPress={() => { setNote(null); setErasing(true); }} /></View>
            )}
          </View>
        )}
        {note?.at === 'erase' && <T v="small" style={{ color: note.tone === 'ok' ? color.ok : color.warn }} accessibilityRole="alert">{note.text}</T>}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  section: { paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line },
  box: { gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  paste: {
    minHeight: 110, padding: space.md, borderRadius: radius.sm, backgroundColor: color.bg2, color: color.text,
    fontFamily: font.body, fontSize: 13, textAlignVertical: 'top',
  },
});
