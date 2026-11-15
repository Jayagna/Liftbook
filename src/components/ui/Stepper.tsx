import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { haptic } from '@/hooks/haptics';
import { color, font, radius } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { T } from './T';

/** Thumb-sized − / + control. `big` is the live-workout size; `editable` lets the number be typed too. */
export function Stepper({
  label, value, onChange, step = 1, min = 0, max = 999, format = (n) => String(n), big, unit, editable,
}: {
  label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number;
  format?: (n: number) => string; big?: boolean; unit?: string; editable?: boolean;
}) {
  const [text, setText] = useState(String(value));
  // Follow outside changes (the − / + buttons, a new exercise) without fighting the keyboard.
  useEffect(() => { if (Number(text.replace(',', '.')) !== value) setText(String(value)); }, [value]);
  const set = (n: number) => {
    const v = Math.min(max, Math.max(min, Math.round(n * 100) / 100));
    if (v !== value) { haptic.select(); onChange(v); }
  };
  const size = big ? 52 : 38;
  return (
    <View style={[styles.wrap, big && styles.wrapBig]} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: `${format(value)} ${unit ?? ''}` }}>
      <T v="label">{label}</T>
      <View style={[styles.row, big && styles.rowBig]}>
        <PressableScale haptics={false} style={[styles.btn, { width: size, height: size, borderRadius: size / 2 }]} onPress={() => set(value - step)} disabled={value <= min} accessibilityLabel={`Decrease ${label}`}>
          <Ionicons name="remove" size={big ? 24 : 18} color={value <= min ? color.text3 : color.text} />
        </PressableScale>
        <View style={styles.valueBox}>
          {editable ? (
            <TextInput
              value={text} keyboardType="decimal-pad" selectTextOnFocus accessibilityLabel={`${label}, type a value`}
              onChangeText={(t) => {
                setText(t);
                const n = Number(t.replace(',', '.'));
                if (t.trim() !== '' && Number.isFinite(n) && n >= min && n <= max && n !== value) onChange(Math.round(n * 100) / 100);
              }}
              onBlur={() => setText(String(value))}
              style={[styles.value, big && styles.valueBig, styles.input, big && { width: 150, height: 46 }]}
            />
          ) : (
            <T style={[styles.value, big && styles.valueBig]}>{format(value)}</T>
          )}
          {unit ? <T v="small" style={{ marginTop: -2 }}>{unit}</T> : null}
        </View>
        <PressableScale haptics={false} style={[styles.btn, { width: size, height: size, borderRadius: size / 2 }]} onPress={() => set(value + step)} disabled={value >= max} accessibilityLabel={`Increase ${label}`}>
          <Ionicons name="add" size={big ? 24 : 18} color={value >= max ? color.text3 : color.text} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, flexGrow: 1, flexBasis: 140 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 4, borderRadius: radius.pill,
    backgroundColor: color.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  wrapBig: { flexGrow: 0, flexBasis: 'auto', alignSelf: 'stretch' },
  rowBig: { padding: 6, borderRadius: radius.lg },
  btn: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },
  valueBox: { alignItems: 'center', minWidth: 48 },
  value: { fontFamily: font.display, fontSize: 20, lineHeight: 22, color: color.text },
  valueBig: { fontSize: 40, lineHeight: 42 },
  input: { width: 70, height: 26, padding: 0, textAlign: 'center' },
});
