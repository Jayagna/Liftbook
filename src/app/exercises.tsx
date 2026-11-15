// Exercise library: browse and search every exercise, then open one for how-to steps and muscles.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from '@/components/ui/Aurora';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { T } from '@/components/ui/T';
import { FormLink } from '@/components/train/FormLink';
import { allExercises, EQUIPMENT_LABEL, MUSCLE_LABEL, type Equipment } from '@/domain/exercises';
import type { MuscleGroup } from '@/domain/types';
import { useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

const GROUPS: { label: string; muscles: MuscleGroup[] }[] = [
  { label: 'Chest', muscles: ['chest'] }, { label: 'Back', muscles: ['back', 'lats', 'traps'] },
  { label: 'Shoulders', muscles: ['shoulders', 'rear_delts'] }, { label: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { label: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] }, { label: 'Core', muscles: ['abs', 'obliques'] },
];
const GEAR: { label: string; any: Equipment[] }[] = [
  { label: 'No equipment', any: ['bodyweight'] }, { label: 'Dumbbells', any: ['dumbbell', 'kettlebell'] },
  { label: 'Barbell', any: ['barbell'] }, { label: 'Machines', any: ['machine', 'cable'] },
];
const back = () => (router.canGoBack() ? router.back() : router.replace('/train'));

export default function Exercises() {
  const insets = useSafeAreaInsets();
  // Subscribed so a newly created exercise shows up straight away.
  const custom = useApp((s) => s.customExercises);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [gear, setGear] = useState<string | null>(null);

  const list = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const g = GROUPS.find((x) => x.label === group);
    const e = GEAR.find((x) => x.label === gear);
    return allExercises()
      .filter((x) => !g || x.primary.some((m) => g.muscles.includes(m)))
      .filter((x) => !e || x.equipment.some((k) => e.any.includes(k)))
      .filter((x) => {
        const hay = `${x.name} ${[...x.primary, ...x.secondary].map((m) => MUSCLE_LABEL[m]).join(' ')} ${x.equipment.map((k) => EQUIPMENT_LABEL[k]).join(' ')}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [q, group, gear, custom]);

  return (
    <View style={styles.root}>
      <Aurora />
      <View style={[styles.top, { paddingTop: insets.top + space.md }]}>
        <PressableScale style={styles.round} onPress={back} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={color.text} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <T v="label" style={{ color: color.lime }}>{list.length} exercise{list.length === 1 ? '' : 's'}</T>
          <T v="title">Exercise library</T>
        </View>
      </View>

      <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={color.text3} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search by name, muscle or equipment" placeholderTextColor={color.text3} style={styles.searchInput} accessibilityLabel="Search exercises" autoCorrect={false} />
          {q.length > 0 && <PressableScale onPress={() => setQ('')} accessibilityLabel="Clear search"><Ionicons name="close-circle" size={18} color={color.text3} /></PressableScale>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <Pill small label="All muscles" solid={!group} onPress={() => setGroup(null)} />
          {GROUPS.map((g) => <Pill key={g.label} small label={g.label} solid={group === g.label} onPress={() => setGroup(group === g.label ? null : g.label)} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <Pill small label="Any equipment" solid={!gear} tone={color.text} onPress={() => setGear(null)} />
          {GEAR.map((g) => <Pill key={g.label} small label={g.label} solid={gear === g.label} tone={color.text} onPress={() => setGear(gear === g.label ? null : g.label)} />)}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {list.length === 0 && <T v="small">Nothing matches. Clear a filter, or add your own exercise from the plan editor.</T>}
        {list.length > 0 && (
          <View style={styles.listCard}>
            {list.map((e, i) => (
              <PressableScale key={e.name} scaleTo={0.99} style={[styles.row, i > 0 && styles.line]} onPress={() => router.push({ pathname: '/exercise', params: { name: e.name } })} accessibilityLabel={`${e.name}, open`}>
                <View style={{ flex: 1 }}>
                  <T v="bodyMed" style={{ fontSize: 16 }} numberOfLines={1}>{e.name}{e.custom ? '  ·  yours' : ''}</T>
                  <T v="small" numberOfLines={1}>{e.primary.map((m) => MUSCLE_LABEL[m]).join(', ')} · {e.equipment.map((k) => EQUIPMENT_LABEL[k]).join(' / ')}{e.compound ? ' · compound' : ''}</T>
                </View>
                <FormLink name={e.name} />
                <Ionicons name="chevron-forward" size={16} color={color.text3} />
              </PressableScale>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 50, paddingHorizontal: 16, borderRadius: radius.pill,
    backgroundColor: color.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  searchInput: { flex: 1, minWidth: 0, color: color.text, fontFamily: font.bodyMed, fontSize: 16, height: '100%' },
  listCard: { paddingHorizontal: space.lg, borderRadius: radius.lg, backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 13 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line },
  tag: { paddingHorizontal: 8, height: 22, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.06)' },
  tagText: { fontFamily: font.bodySemi, fontSize: 10.5, color: color.text2 },
});
