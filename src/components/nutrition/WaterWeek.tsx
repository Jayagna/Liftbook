// Seven days of water against each day's own goal. One series, so no legend: the card title names it.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, CardHeader } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { T } from '@/components/ui/T';
import { addDays, DOW_SHORT, dow, shortDate } from '@/domain/dates';
import { waterTargetMl } from '@/domain/targets';
import type { ISODate } from '@/domain/types';
import { plannedWorkout } from '@/store/selectors';
import { useApp, type AppState } from '@/store/store';
import { color, font, space } from '@/theme/tokens';

const H = 104;
const L = (ml: number) => (Math.round(ml / 10) / 100).toString();

export function WaterWeek({ date, index = 0 }: { date: ISODate; index?: number }) {
  const days = useApp((s) => s.days);
  const plan = useApp((s) => s.plan);
  const profile = useApp((s) => s.profile);
  const overrides = useApp((s) => s.overrides);
  const [sel, setSel] = useState(6);
  if (!profile) return null;

  const rows = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(date, i - 6);
    const target = waterTargetMl(profile, overrides, days[d], !!plannedWorkout({ days, plan } as AppState, d));
    return { d, ml: days[d]?.waterMl ?? 0, target };
  });
  const max = Math.max(1, ...rows.map((r) => Math.max(r.ml, r.target)));
  const logged = rows.filter((r) => r.ml > 0);
  const met = rows.filter((r) => r.ml >= r.target).length;
  const avg = logged.length ? logged.reduce((a, r) => a + r.ml, 0) / logged.length : 0;
  const cur = rows[sel];

  return (
    <Card index={index}>
      <CardHeader title="Water · last 7 days" right={<T v="small">{logged.length ? `Avg ${L(avg)} L` : 'No logs yet'}</T>} />
      <T v="bodyMed">
        {DOW_SHORT[dow(cur.d)]} {shortDate(cur.d)}: {L(cur.ml)} L of {L(cur.target)} L
      </T>
      <T v="small" style={{ marginBottom: space.md }}>Goal reached on {met} of 7 days. Tap a bar to read it.</T>
      <View style={styles.plot}>
        {rows.map((r, i) => {
          const on = i === sel;
          const hit = r.ml >= r.target;
          return (
            <PressableScale key={r.d} haptics={false} scaleTo={1} style={styles.col} onPress={() => setSel(i)}
              accessibilityLabel={`${DOW_SHORT[dow(r.d)]} ${shortDate(r.d)}: ${L(r.ml)} of ${L(r.target)} litres${hit ? ', goal reached' : ''}`} accessibilityState={{ selected: on }}>
              <View style={styles.bars}>
                {/* The day's goal: a thin tick, quieter than the bar. */}
                <View style={[styles.goal, { bottom: (r.target / max) * H }]} />
                {hit && <Ionicons name="checkmark" size={12} color={color.text2} style={[styles.hit, { bottom: (r.ml / max) * H + 2 }]} />}
                <View style={[styles.bar, { height: Math.max(r.ml > 0 ? 3 : 0, (r.ml / max) * H), opacity: on ? 1 : 0.55 }]} />
              </View>
              <T style={[styles.day, on && { color: color.text }]}>{DOW_SHORT[dow(r.d)][0]}</T>
            </PressableScale>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', gap: 2 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  bars: { height: H + 16, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'flex-end', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.lineStrong },
  bar: { width: 16, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: color.water },
  goal: { position: 'absolute', left: '18%', right: '18%', height: 2, borderRadius: 1, backgroundColor: color.text3 },
  hit: { position: 'absolute' },
  day: { fontFamily: font.bodySemi, fontSize: 11, color: color.text3 },
});
