import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Choice, Field } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { T } from '@/components/ui/T';
import { allExercises, EQUIPMENT_LABEL, MUSCLE_LABEL, type Equipment, type ExerciseDef } from '@/domain/exercises';
import { alternatives, prefsFromPlan } from '@/domain/planner';
import type { MuscleGroup } from '@/domain/types';
import { actions, useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

const GROUPS: { label: string; muscles: MuscleGroup[] }[] = [
  { label: 'Chest', muscles: ['chest'] }, { label: 'Back', muscles: ['back', 'lats', 'traps'] },
  { label: 'Shoulders', muscles: ['shoulders', 'rear_delts'] }, { label: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { label: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] }, { label: 'Core', muscles: ['abs', 'obliques'] },
];
const PRIMARY_OPTIONS: MuscleGroup[] = ['chest', 'back', 'lats', 'shoulders', 'rear_delts', 'traps', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'quads', 'hamstrings', 'glutes', 'calves'];
const EQUIP_OPTIONS: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'kettlebell'];

/**
 * Full-screen exercise chooser. With `replaceFor` it leads with same-muscle swaps
 * the user can do with their equipment. Also where custom exercises are created.
 */
export function ExercisePicker({ visible, onClose, onPick, replaceFor, exclude = [] }: {
  visible: boolean; onClose: () => void; onPick: (ex: ExerciseDef) => void; replaceFor?: string; exclude?: string[];
}) {
  const insets = useSafeAreaInsets();
  const training = useApp((s) => s.training);
  const plan = useApp((s) => s.plan);
  const custom = useApp((s) => s.customExercises);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [primary, setPrimary] = useState<MuscleGroup>('chest');
  const [equip, setEquip] = useState<Equipment>('dumbbell');
  const [compound, setCompound] = useState(false);

  const prefs = training ?? prefsFromPlan(plan);
  const swaps = useMemo(() => (replaceFor ? alternatives(replaceFor, prefs, exclude).slice(0, 6) : []), [replaceFor, prefs, exclude.join('|'), custom]);
  const list = useMemo(() => {
    const g = GROUPS.find((x) => x.label === group);
    const term = q.trim().toLowerCase();
    return allExercises()
      .filter((e) => e.name !== replaceFor && !exclude.includes(e.name))
      .filter((e) => !g || e.primary.some((m) => g.muscles.includes(m)))
      .filter((e) => !term || e.name.toLowerCase().includes(term) || e.primary.some((m) => MUSCLE_LABEL[m].toLowerCase().includes(term)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [q, group, replaceFor, exclude.join('|'), custom]);

  const close = () => { setQ(''); setGroup(null); setCreating(false); setName(''); onClose(); };
  const pick = (e: ExerciseDef) => { onPick(e); close(); };
  const taken = name.trim() !== '' && allExercises().some((e) => e.name.toLowerCase() === name.trim().toLowerCase());
  const create = () => {
    const n = name.trim();
    if (!n || taken) return;
    const ex: ExerciseDef = { name: n, primary: [primary], secondary: [], equipment: [equip], level: 'beginner', compound, custom: true };
    actions.addCustomExercise(ex);
    pick(ex);
  };

  const Row = ({ e, tag }: { e: ExerciseDef; tag?: string }) => (
    <PressableScale scaleTo={0.985} style={styles.row} onPress={() => pick(e)} accessibilityLabel={`Choose ${e.name}`}>
      <View style={{ flex: 1 }}>
        <T v="bodyMed">{e.name}</T>
        <T v="small">{e.primary.map((m) => MUSCLE_LABEL[m]).join(', ')} · {e.equipment.map((x) => EQUIPMENT_LABEL[x]).join(' / ')}{e.custom ? ' · yours' : ''}</T>
      </View>
      {tag ? <View style={styles.tag}><T style={styles.tagText}>{tag}</T></View> : null}
      <Ionicons name="add-circle" size={24} color={color.lime} />
    </PressableScale>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close} transparent={Platform.OS === 'web'}>
      <View style={[styles.root, { paddingTop: Platform.OS === 'ios' ? space.lg : insets.top + space.lg }]}>
        <View style={styles.head}>
          <T v="title">{replaceFor ? 'Replace exercise' : 'Add exercise'}</T>
          <PressableScale style={styles.close} onPress={close} accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={color.text} />
          </PressableScale>
        </View>
        {replaceFor ? <T v="small" style={{ paddingHorizontal: space.lg, marginTop: -4 }}>Swapping out {replaceFor}</T> : null}
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={color.text3} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search by name or muscle" placeholderTextColor={color.text3} style={styles.searchInput} accessibilityLabel="Search exercises" />
        </View>
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space.lg, paddingVertical: space.sm }}>
            <Pill small label="All" solid={group === null} onPress={() => setGroup(null)} />
            {GROUPS.map((g) => <Pill key={g.label} small label={g.label} solid={group === g.label} onPress={() => setGroup(g.label)} />)}
          </ScrollView>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          {swaps.length > 0 && !q && !group && (
            <View style={{ marginBottom: space.md }}>
              <T v="label" style={{ marginVertical: space.sm }}>Best swaps · same muscles, your equipment</T>
              {swaps.map((e) => <Row key={`s-${e.name}`} e={e} tag={e.compound ? 'Compound' : undefined} />)}
              <T v="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>All exercises</T>
            </View>
          )}
          {list.map((e) => <Row key={e.name} e={e} />)}
          {list.length === 0 && <T v="small" style={{ paddingVertical: space.lg }}>Nothing matches. Create it as your own exercise below.</T>}

          <View style={styles.create}>
            {!creating ? (
              <Pill label="+ Create a custom exercise" onPress={() => { setCreating(true); setName(q.trim()); }} />
            ) : (
              <View style={{ gap: space.md }}>
                <T v="h2">New exercise</T>
                <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" autoFocus />
                {taken && <T v="small" style={{ color: color.warn }}>An exercise with this name already exists.</T>}
                <Choice label="Main muscle" value={primary} onChange={setPrimary} options={PRIMARY_OPTIONS.map((m) => ({ value: m, label: MUSCLE_LABEL[m] }))} />
                <Choice label="Equipment" value={equip} onChange={setEquip} options={EQUIP_OPTIONS.map((e) => ({ value: e, label: EQUIPMENT_LABEL[e] }))} />
                <Choice label="Type" value={compound ? 'c' : 'i'} onChange={(v) => setCompound(v === 'c')} options={[{ value: 'i', label: 'Single-joint' }, { value: 'c', label: 'Multi-joint (compound)' }]} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pill solid label="Create and add" onPress={create} style={{ flex: 1, opacity: !name.trim() || taken ? 0.4 : 1 }} />
                  <Pill label="Cancel" onPress={() => setCreating(false)} />
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg2 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.sm },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.card },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, marginHorizontal: space.lg, marginTop: space.sm, paddingHorizontal: 14,
    borderRadius: radius.pill, backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  searchInput: { flex: 1, color: color.text, fontFamily: font.bodyMed, fontSize: 16, height: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: color.limeDim },
  tagText: { fontFamily: font.bodySemi, fontSize: 11, color: color.lime },
  create: { marginTop: space.xl, padding: space.lg, borderRadius: radius.lg, backgroundColor: color.card },
});
