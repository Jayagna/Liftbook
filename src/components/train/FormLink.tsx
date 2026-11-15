// "Form" link: opens a YouTube search for how to do the exercise with good form and posture.
// A search, not a fixed video, so the link never goes dead and works for exercises the user adds.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, StyleSheet } from 'react-native';
import { PressableScale } from '@/components/ui/PressableScale';
import { T } from '@/components/ui/T';
import { color, font, radius } from '@/theme/tokens';

export function formVideoUrl(name: string): string {
  const clean = name.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${clean} proper form and posture`)}`;
}

export function FormLink({ name, big = false }: { name: string; big?: boolean }) {
  return (
    <PressableScale haptics={false} scaleTo={0.94} onPress={() => { void Linking.openURL(formVideoUrl(name)); }}
      style={[styles.pill, big && styles.big]} accessibilityRole="link" accessibilityLabel={`Form video for ${name} on YouTube`}>
      <Ionicons name="logo-youtube" size={big ? 18 : 13} color="#FF4E45" />
      <T style={[styles.text, big && styles.bigText]}>{big ? 'Watch the form on YouTube' : 'Form'}</T>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: 'rgba(255,78,69,0.12)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,78,69,0.35)' },
  text: { fontFamily: font.bodySemi, fontSize: 12, color: color.text, textDecorationLine: 'underline' },
  big: { height: 48, paddingHorizontal: 18, alignSelf: 'stretch', justifyContent: 'center' },
  bigText: { fontSize: 15, textDecorationLine: 'none' },
});
