// Lets the user take one still photo or choose one from their library. The picture is handed straight to
// on-device storage. The camera is not used for anything else: no video, no movement tracking.
import * as ImagePicker from 'expo-image-picker';

export interface Picked { uri: string; w: number; h: number }

export async function pickPhoto(from: 'camera' | 'library'): Promise<Picked | 'cancelled' | 'denied'> {
  if (from === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return 'denied';
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
  const r = from === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const a = r.canceled ? null : r.assets?.[0];
  if (!a) return 'cancelled';
  return { uri: a.uri, w: a.width, h: a.height };
}
