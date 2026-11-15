// Saving and opening a backup file in the browser and the home-screen web app. On a phone the share sheet is
// used when the browser allows a file through it (so it can go to Files); otherwise it is a normal download.
export type SaveResult = 'saved' | 'shared' | 'cancelled';
export const canCopyText = typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;

export async function saveTextFile(name: string, text: string): Promise<SaveResult> {
  const file = new File([text], name, { type: 'application/json' });
  const phone = navigator.maxTouchPoints > 0;
  if (phone && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return 'shared';
    } catch (e) {
      if ((e as { name?: string } | null)?.name === 'AbortError') return 'cancelled';
      // Anything else: fall through to a plain download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'saved';
}

export function pickTextFile(): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.style.display = 'none';
    input.setAttribute('data-testid', 'backup-file-input');
    const done = () => input.remove();
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (!f) { done(); resolve(null); return; }
      // A backup is small. Refusing huge files stops the app freezing on something picked by mistake.
      if (f.size > 25 * 1024 * 1024) { done(); reject(new Error('too-big')); return; }
      f.text().then((text) => { done(); resolve({ name: f.name, text }); }).catch((e) => { done(); reject(e); });
    });
    input.addEventListener('cancel', () => { done(); resolve(null); });
    document.body.appendChild(input);
    input.click();
  });
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
