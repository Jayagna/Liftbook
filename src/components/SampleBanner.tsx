import { StyleSheet, View } from 'react-native';
import { actions, useApp } from '@/store/store';
import { color, radius, space } from '@/theme/tokens';
import { Pill } from './ui/Pill';
import { T } from './ui/T';

/** Always visible while sample data is loaded, so it's never mistaken for real logs. */
export function SampleBanner() {
  const isSample = useApp((s) => s.isSample);
  if (!isSample) return null;
  return (
    <View style={styles.box} accessibilityRole="alert">
      <View style={{ flex: 1 }}>
        <T v="label" style={{ color: color.warn }}>Sample data</T>
        <T v="small">You’re previewing a made-up athlete. Your own data is safe and comes back when you exit.</T>
      </View>
      <Pill small label="Exit" onPress={() => actions.exitSample()} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md,
    backgroundColor: 'rgba(255,194,74,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,194,74,0.4)',
  },
});
