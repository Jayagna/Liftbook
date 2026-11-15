import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { color, font, radius, space } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { T } from './T';

export function Field({ label, suffix, style, ...rest }: TextInputProps & { label: string; suffix?: string }) {
  return (
    <View style={[styles.field, style as object]}>
      <T v="label">{label}</T>
      <View style={styles.inputRow}>
        <TextInput placeholderTextColor={color.text3} {...rest} style={styles.input} accessibilityLabel={label} />
        {suffix ? <T v="small">{suffix}</T> : null}
      </View>
    </View>
  );
}

/** Single-choice chip group. */
export function Choice<V extends string | number>({
  options, value, onChange, label,
}: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void; label?: string }) {
  return (
    <View style={{ gap: space.sm }}>
      {label ? <T v="label">{label}</T> : null}
      <View style={styles.chips} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <PressableScale
              key={String(o.value)} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <T style={[styles.chipText, on && { color: color.limeInk }]}>{o.label}</T>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexGrow: 1, flexBasis: 140, gap: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 14, borderRadius: radius.sm,
    backgroundColor: color.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  input: { flex: 1, color: color.text, fontFamily: font.bodySemi, fontSize: 17, height: '100%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, minHeight: 38, justifyContent: 'center', borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  chipOn: { backgroundColor: color.lime, borderColor: color.lime },
  chipText: { fontFamily: font.bodySemi, fontSize: 14, color: color.text },
});
