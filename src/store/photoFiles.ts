// Where progress photo images live on iOS and Android: a folder inside the app's own documents.
// Nothing here uploads anything. The web build uses photoFiles.web.ts instead.
import { Directory, File, Paths } from 'expo-file-system';

const FOLDER = 'progress-photos';
const folder = () => {
  const d = new Directory(Paths.document, FOLDER);
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
};
const fileFor = (id: string) => new File(folder(), `${id}.jpg`);

/** Copies a picked image into the app's own storage. Returns the stored size. */
export async function savePhoto(id: string, sourceUri: string, w: number, h: number): Promise<{ w: number; h: number }> {
  await new File(sourceUri).copy(fileFor(id));
  return { w, h };
}

/** A URI an Image can show, or null if the file is gone. */
export async function photoUri(id: string): Promise<string | null> {
  const f = fileFor(id);
  return f.exists ? f.uri : null;
}

export async function deletePhoto(id: string): Promise<void> {
  const f = fileFor(id);
  if (f.exists) f.delete();
}

export async function deleteAllPhotos(): Promise<void> {
  const d = new Directory(Paths.document, FOLDER);
  if (d.exists) d.delete();
}
