// Shows one progress photo from on-device storage. Says so plainly if the image file is gone.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { photoUri } from '@/store/photoFiles';
import { color } from '@/theme/tokens';
import { T } from '../ui/T';

export function usePhoto(id: string | null): { uri: string | null; missing: boolean } {
  const [st, setSt] = useState<{ id: string | null; uri: string | null; missing: boolean }>({ id: null, uri: null, missing: false });
  useEffect(() => {
    let on = true;
    if (!id) return;
    photoUri(id)
      .then((uri) => { if (on) setSt({ id, uri, missing: !uri }); })
      .catch(() => { if (on) setSt({ id, uri: null, missing: true }); });
    return () => { on = false; };
  }, [id]);
  return st.id === id ? st : { uri: null, missing: false };
}

export function PhotoImage({ id, label, style, fit = 'cover', compact }: {
  id: string; label: string; style?: StyleProp<ViewStyle>; fit?: 'cover' | 'contain'; compact?: boolean;
}) {
  const { uri, missing } = usePhoto(id);
  return (
    <View style={[styles.box, style]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode={fit} accessibilityLabel={label} /> : null}
      {missing && (
        <View style={styles.missing} accessibilityLabel={`${label}. The image is no longer on this phone.`}>
          <Ionicons name="image-outline" size={compact ? 18 : 26} color={color.text3} />
          {!compact && <T v="small" style={{ textAlign: 'center' }}>The image is no longer on this phone.</T>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', backgroundColor: color.bg2 },
  missing: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 },
});
