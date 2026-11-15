import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { color, font, radius } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { T } from './T';

/** Quick-action pill. `tone` picks the accent used when `active`/`solid`. */
export function Pill({
  label, onPress, solid, tone = color.lime, style, accessibilityLabel, small,
}: {
  label: string; onPress?: () => void; solid?: boolean; tone?: string; style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string; small?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.pill, small && styles.small, solid ? { backgroundColor: tone, borderColor: tone } : null, style]}
    >
      <T style={[styles.text, small && { fontSize: 13 }, { color: solid ? color.limeInk : color.text }]}>{label}</T>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  small: { minHeight: 34, paddingHorizontal: 12 },
  text: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 18 },
});
