import { StyleSheet, View } from 'react-native';
import { Card, CardHeader } from '@/components/ui/Card';
import { Ring } from '@/components/ui/Ring';
import { T } from '@/components/ui/T';
import { color, font, space } from '@/theme/tokens';
import type { useDaySummary } from '@/store/selectors';

type Summary = NonNullable<ReturnType<typeof useDaySummary>>;
const n = (x: number) => Math.round(x).toLocaleString();

export function CaloriesWidget({ s, index }: { s: Summary; index: number }) {
  const { kcal } = s.targets;
  const eaten = s.totals.kcal;
  const left = kcal - eaten;
  return (
    <Card index={index} tint="rgba(200,255,80,0.07)">
      <CardHeader title="Calories" right={<T v="small">Estimated target</T>} />
      <View style={styles.calRow}>
        <Ring size={164} stroke={14} progress={kcal ? eaten / kcal : 0} tint={color.lime} tint2="#E9FFB0">
          <T style={styles.calBig}>{n(Math.abs(left))}</T>
          <T v="label" style={{ color: left >= 0 ? color.text2 : color.danger }}>{left >= 0 ? 'kcal left' : 'kcal over'}</T>
        </Ring>
        <View style={styles.calStats}>
          <Stat label="Eaten" value={n(eaten)} />
          <Stat label="Goal" value={n(kcal)} />
          {s.targets.sportExtra > 0 ? <Stat label="Sport bonus" value={`+${n(s.targets.sportExtra)}`} tint={color.lime} /> : <Stat label="Maintenance" value={n(s.targets.tdee)} />}
        </View>
      </View>
    </Card>
  );
}

function Stat({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <T v="label">{label}</T>
      <T v="statSm" style={tint ? { color: tint } : undefined}>{value}</T>
    </View>
  );
}

const MACROS = [
  { key: 'p', target: 'protein', label: 'Protein', tint: color.protein },
  { key: 'c', target: 'carbs', label: 'Carbs', tint: color.carbs },
  { key: 'f', target: 'fat', label: 'Fat', tint: color.fat },
] as const;

export function MacrosWidget({ s, index }: { s: Summary; index: number }) {
  return (
    <Card index={index}>
      <CardHeader title="Macros" />
      <View style={styles.macroRow}>
        {MACROS.map((m, i) => {
          const val = s.totals[m.key];
          const tgt = s.targets[m.target];
          const left = tgt - val;
          return (
            <View key={m.key} style={styles.macro}>
              <Ring size={78} stroke={8} progress={tgt ? val / tgt : 0} tint={m.tint} delay={120 + i * 90}>
                <T style={styles.macroPct}>{tgt ? Math.min(999, Math.round((val / tgt) * 100)) : 0}%</T>
              </Ring>
              <T v="label" style={{ marginTop: space.sm }}>{m.label}</T>
              <T style={styles.macroVal}>
                {Math.round(val)}<T style={styles.macroOf}> / {tgt} g</T>
              </T>
              <T v="small" style={{ color: left < 0 ? color.danger : color.text3 }}>
                {left >= 0 ? `${Math.round(left)} g left` : `${Math.round(-left)} g over`}
              </T>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  calRow: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  calBig: { fontFamily: font.display, fontSize: 40, lineHeight: 42, color: color.text },
  calStats: { flex: 1, gap: space.md },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macro: { alignItems: 'center', flex: 1 },
  macroPct: { fontFamily: font.displaySemi, fontSize: 18, color: color.text },
  macroVal: { fontFamily: font.display, fontSize: 22, color: color.text, marginTop: 2 },
  macroOf: { fontFamily: font.body, fontSize: 12, color: color.text3 },
});
