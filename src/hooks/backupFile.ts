// Saving and opening a backup file on iOS and Android. The file goes wherever the user sends it from the
// share sheet (Files, their own email, a drive). The app itself sends it nowhere. Web uses backupFile.web.ts.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export type SaveResult = 'saved' | 'shared' | 'cancelled';
/** Copying the text is only offered where a file cannot always be saved, which is the web build. */
export const canCopyText = false;

export async function saveTextFile(name: string, text: string): Promise<SaveResult> {
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  await f.write(text);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this phone.');
  await Sharing.shareAsync(f.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your Liftbook backup' });
  return 'shared';
}

export async function pickTextFile(): Promise<{ name: string; text: string } | null> {
  const r = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain'] });
  if (r.canceled || !r.result) return null;
  return { name: r.result.name, text: await r.result.text() };
}

export async function copyText(_text: string): Promise<void> {
  throw new Error('Copying is not offered on this platform.');
}
