import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExercisePicker } from '@/components/train/ExercisePicker';
import { Aurora } from '@/components/ui/Aurora';
import { Choice } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { Stepper } from '@/components/ui/Stepper';
import { T } from '@/components/ui/T';
import { DOW_LONG, DOW_SHORT } from '@/domain/dates';
import { findExercise, MUSCLE_LABEL } from '@/domain/exercises';
import {
  dayName, FOCUS_LABEL, inferFocus, moveDay, moveExercise, plannedFrom, prefsFromPlan, rebuildDay, recoveryConflicts,
  regeneratePlan, toggleSuperset,
} from '@/domain/planner';
import { fmtKg, sessionMinutes } from '@/domain/progression';
import type { Focus, PlannedExercise, WorkoutDay } from '@/domain/types';
import { haptic } from '@/hooks/haptics';
import { actions, useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];
const FOCI: Focus[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'abs', 'cardio', 'full_body'];
const uid = () => Math.random().toString(36).slice(2, 8);
// The week strip is seven narrow chips, so long names are shortened there (and only there).
const SHORT: Record<string, string> = { Shoulders: 'Shldrs', 'Full body': 'Full', Hamstrings: 'Hams' };
const chipLines = (name: string) => {
  const parts = name.split(' + ').map((x) => SHORT[x] ?? x);
  return parts.length > 2 ? [parts[0], `+${parts.length - 1}`] : parts;
};
const restLabel = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`);

export default function Planner() {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const plan = useApp((s) => s.plan);
  const savedPrefs = useApp((s) => s.training);
  const goal = useApp((s) => s.profile?.goal ?? 'general');
  const templates = useApp((s) => s.templates);

  const [dow, setDow] = useState(() => new Date().getDay());
  const [open, setOpen] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ mode: 'add' } | { mode: 'replace'; index: number } | null>(null);
  const [undo, setUndo] = useState<{ plan: WorkoutDay[]; what: string } | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [newFocus, setNewFocus] = useState<Focus[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const prefs = useMemo(() => savedPrefs ?? prefsFromPlan(plan), [savedPrefs, plan]);
  const day = plan.find((d) => d.dow === dow) ?? null;
  const conflicts = useMemo(() => recoveryConflicts(plan), [plan]);
  const conflictDows = new Set(conflicts.flatMap((c) => [c.dowA, c.dowB]));
  const focus = day ? inferFocus(day) : [];
  const minutes = day ? sessionMinutes(day.exercises) : 0;

  /** Every change goes through here so it can be undone. */
  const commit = (next: WorkoutDay[], what?: string) => {
    if (what) setUndo({ plan, what });
    actions.setPlan(next);
  };
  const saveDay = (d: WorkoutDay, what?: string) => commit(plan.map((x) => (x.id === d.id ? d : x)), what);
  const setExercises = (ex: PlannedExercise[], what?: string) => day && saveDay({ ...day, exercises: ex }, what);
  const patchExercise = (i: number, patch: Partial<PlannedExercise>) => day && setExercises(day.exercises.map((e, k) => (k === i ? { ...e, ...patch } : e)));

  const toggleFocus = (f: Focus) => {
    if (!day) return;
    const next = focus.includes(f) ? focus.filter((x) => x !== f) : f === 'full_body' || f === 'cardio' ? [f] : [...focus.filter((x) => x !== 'full_body' && x !== 'cardio'), f];
    // Keep a name the user typed; only auto-rename names we generated.
    const auto = day.name === dayName(focus) || day.name.trim() === '';
    saveDay({ ...day, focusIds: next, focus: next.map((x) => FOCUS_LABEL[x]).join(', '), name: auto ? dayName(next) : day.name });
  };

  const createDay = (mode: 'build' | 'empty') => {
    const base: WorkoutDay = { id: `d${dow}-${uid()}`, name: dayName(newFocus) === 'Rest' ? 'Workout' : dayName(newFocus), dow, focusIds: newFocus, focus: newFocus.map((x) => FOCUS_LABEL[x]).join(', '), exercises: [] };
    actions.upsertPlanDay(mode === 'build' ? rebuildDay(base, prefs, goal, newFocus) : base);
    setNewFocus([]);
    haptic.success();
  };
  const useTemplate = (t: WorkoutDay) => { actions.upsertPlanDay({ ...t, id: `d${dow}-${uid()}`, dow }); haptic.success(); };

  const regenerate = () => { commit(regeneratePlan(plan, prefs, goal), 'Week regenerated'); setConfirmRegen(false); haptic.success(); };
  const lockedDays = plan.filter((d) => d.locked).length;
  const lockedEx = plan.reduce((a, d) => a + (d.locked ? 0 : d.exercises.filter((e) => e.locked).length), 0);

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <Aurora />
      <View style={[styles.top, { paddingTop: insets.top + space.md }]}>
        <PressableScale style={styles.round} onPress={() => router.back()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={color.text} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <T v="label" style={{ color: color.lime }}>Your split</T>
          <T v="title">Weekly plan</T>
        </View>
        <PressableScale style={styles.round} onPress={() => setShowSettings(!showSettings)} accessibilityLabel="Plan settings">
          <Ionicons name="options-outline" size={20} color={showSettings ? color.lime : color.text} />
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + 120, gap: space.md }} keyboardShouldPersistTaps="handled">
        {/* Week strip */}
        <View style={styles.week}>
          {MON_FIRST.map((d) => {
            const w = plan.find((p) => p.dow === d);
            const on = d === dow;
            return (
              <PressableScale key={d} onPress={() => { setDow(d); setOpen(null); setNewFocus([]); }} style={[styles.dayChip, on && styles.dayOn, !w && !on && { opacity: 0.6 }]} accessibilityLabel={`${DOW_LONG[d]}: ${w?.name ?? 'rest'}`} accessibilityState={{ selected: on }}>
                <T style={[styles.dayDow, on && { color: color.limeInk }]}>{DOW_SHORT[d]}</T>
                {(w ? chipLines(w.name) : ['Rest']).map((line, k) => (
                  <T key={k} numberOfLines={1} style={[styles.daySplit, on && { color: color.limeInk }]}>{line}</T>
                ))}
                <View style={styles.dayIcons}>
                  {w?.locked && <Ionicons name="lock-closed" size={11} color={on ? color.limeInk : color.text2} />}
                  {conflictDows.has(d) && <Ionicons name="warning" size={11} color={on ? color.limeInk : color.warn} />}
                </View>
              </PressableScale>
            );
          })}
        </View>

        {showSettings && (
          <Animated.View entering={reduce ? undefined : FadeIn} style={styles.card}>
            <T v="h2">Generator settings</T>
            <T v="small">Used when you rebuild a day or regenerate the week. Your own edits are never touched until you ask.</T>
            <Choice label="Session length" value={prefs.sessionMin} onChange={(v) => actions.setTraining({ ...prefs, sessionMin: v })} options={[30, 45, 60, 75, 90, 120].map((m) => ({ value: m, label: `${m} min` }))} />
            <Choice label="Experience" value={prefs.experience} onChange={(v) => actions.setTraining({ ...prefs, experience: v })} options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }]} />
            <Choice label="Where" value={prefs.location} onChange={(v) => actions.setTraining({ ...prefs, location: v })} options={[{ value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }]} />
          </Animated.View>
        )}

        {conflicts.map((c) => (
          <View key={`${c.dowA}-${c.dowB}`} style={styles.warn}>
            <Ionicons name="warning-outline" size={18} color={color.warn} />
            <T v="small" style={{ flex: 1, color: color.text }}>
              {DOW_LONG[c.dowA]} and {DOW_LONG[c.dowB]} both train {c.muscles.map((m) => MUSCLE_LABEL[m].toLowerCase()).join(' and ')} hard on back-to-back days. It’s your call, but a day between usually recovers better.
            </T>
          </View>
        ))}

        {/* Rest day */}
        {!day && (
          <View style={styles.card}>
            <T v="label">{DOW_LONG[dow]}</T>
            <T v="title">Rest day</T>
            <T v="small">Want to train instead? Pick the muscle groups and build a session, or start from a saved template.</T>
            <View style={styles.chips}>
              {FOCI.map((f) => {
                const on = newFocus.includes(f);
                return (
                  <PressableScale key={f} style={[styles.chip, on && styles.chipOn]} accessibilityState={{ selected: on }}
                    onPress={() => setNewFocus(on ? newFocus.filter((x) => x !== f) : f === 'full_body' || f === 'cardio' ? [f] : [...newFocus.filter((x) => x !== 'full_body' && x !== 'cardio'), f])}>
                    <T style={[styles.chipText, on && { color: color.limeInk }]}>{FOCUS_LABEL[f]}</T>
                  </PressableScale>
                );
              })}
            </View>
            <View style={styles.rowWrap}>
              <Pill solid label="Build it for me" onPress={() => createDay('build')} style={{ opacity: newFocus.length ? 1 : 0.4 }} />
              <Pill label="Start empty" onPress={() => createDay('empty')} />
            </View>
            {templates.length > 0 && (
              <View style={{ gap: space.sm, marginTop: space.sm }}>
                <T v="label">Your templates</T>
                {templates.map((t) => (
                  <View key={t.id} style={styles.between}>
                    <View style={{ flex: 1 }}>
                      <T v="bodyMed">{t.name}</T>
                      <T v="small">{t.exercises.length} exercises · ≈ {sessionMinutes(t.exercises)} min</T>
                    </View>
                    <Pill small label="Use" onPress={() => useTemplate(t)} />
                    <PressableScale style={styles.icon} onPress={() => actions.deleteTemplate(t.id)} accessibilityLabel={`Delete template ${t.name}`}>
                      <Ionicons name="trash-outline" size={16} color={color.text3} />
                    </PressableScale>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Workout day */}
        {day && (
          <>
            <View style={[styles.card, day.locked && { borderColor: 'rgba(200,255,80,0.35)' }]}>
              <View style={styles.between}>
                <T v="label">{DOW_LONG[dow]}</T>
                <T v="small" style={{ color: minutes > prefs.sessionMin + 5 ? color.warn : color.text2 }}>
                  ≈ {minutes} min{minutes > prefs.sessionMin + 5 ? ` · over your ${prefs.sessionMin}` : ''}
                </T>
              </View>
              <TextInput value={day.name} onChangeText={(v) => saveDay({ ...day, name: v })} style={styles.nameInput} placeholder="Workout name" placeholderTextColor={color.text3} accessibilityLabel="Workout name" />
              <View style={styles.chips}>
                {FOCI.map((f) => {
                  const on = focus.includes(f);
                  return (
                    <PressableScale key={f} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleFocus(f)} accessibilityState={{ selected: on }} accessibilityLabel={FOCUS_LABEL[f]}>
                      <T style={[styles.chipText, on && { color: color.limeInk }]}>{FOCUS_LABEL[f]}</T>
                    </PressableScale>
                  );
                })}
              </View>
              <View style={styles.rowWrap}>
                <Pill small label={day.locked ? 'Locked' : 'Lock day'} solid={!!day.locked} onPress={() => saveDay({ ...day, locked: !day.locked })} accessibilityLabel={day.locked ? 'Unlock day' : 'Lock day'} />
                <Pill small label="Rebuild exercises" onPress={() => { saveDay(rebuildDay(day, prefs, goal, focus), `${day.name} rebuilt`); haptic.success(); }} style={{ opacity: day.locked || focus.length === 0 ? 0.4 : 1 }} />
                <Pill small label="Save as template" onPress={() => { actions.saveTemplate(day); haptic.success(); }} />
                <Pill small label="Make rest day" onPress={() => commit(plan.filter((d) => d.id !== day.id), `${day.name} removed`)} />
              </View>
              {day.locked && <T v="small">Locked days stay exactly as they are when you regenerate the week. Unlock to rebuild.</T>}
              <View style={{ gap: 6 }}>
                <T v="label">Move to</T>
                <View style={styles.moveRow}>
                  {MON_FIRST.map((d) => {
                    const other = plan.find((p) => p.dow === d);
                    return (
                      <PressableScale key={d} disabled={d === dow} onPress={() => { commit(moveDay(plan, dow, d), other ? `${DOW_SHORT[dow]} and ${DOW_SHORT[d]} swapped` : `Moved to ${DOW_LONG[d]}`); setDow(d); haptic.select(); }}
                        style={[styles.move, d === dow && styles.moveOn]} accessibilityLabel={`Move to ${DOW_LONG[d]}${other ? `, swaps with ${other.name}` : ''}`}>
                        <T style={[styles.moveText, d === dow && { color: color.limeInk }]}>{DOW_SHORT[d][0]}</T>
                        {other && d !== dow && <View style={styles.moveDot} />}
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            </View>

            {day.exercises.length === 0 && (
              <View style={styles.card}>
                <T v="small">{focus.includes('cardio') ? 'Cardio day. Log your session from Home, or add exercises if you want to lift too.' : 'No exercises yet. Add your own, or tap “Rebuild exercises” to get a suggestion.'}</T>
              </View>
            )}

            {day.exercises.map((e, i) => {
              const isOpen = open === e.name;
              const def = findExercise(e.name);
              const linkedNext = e.superset != null && day.exercises[i + 1]?.superset === e.superset;
              const linkedPrev = e.superset != null && day.exercises[i - 1]?.superset === e.superset;
              const timed = /\(sec\)/.test(e.name);
              return (
                <Animated.View key={e.name} layout={reduce ? undefined : LinearTransition.springify().damping(20)} entering={reduce ? undefined : FadeInDown.delay(i * 30)}>
                  <View style={[styles.exCard, (linkedNext || linkedPrev) && styles.exLinked, linkedPrev && { borderTopLeftRadius: 6, borderTopRightRadius: 6 }, linkedNext && { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }]}>
                    <PressableScale scaleTo={0.99} style={styles.exHead} onPress={() => setOpen(isOpen ? null : e.name)} accessibilityLabel={`${e.name}, ${isOpen ? 'collapse' : 'edit'}`}>
                      <View style={styles.badge}><T style={styles.badgeText}>{i + 1}</T></View>
                      <View style={{ flex: 1 }}>
                        <T v="bodyMed" style={{ fontSize: 16 }}>{e.name}</T>
                        <T v="small">
                          {e.sets} × {e.repLow}–{e.repHigh}{timed ? ' s' : ''} · rest {restLabel(e.restSec)}{e.targetKg ? ` · ${fmtKg(e.targetKg)} kg` : ''}{def ? ` · ${def.primary.map((m) => MUSCLE_LABEL[m]).join(', ')}` : ''}
                        </T>
                      </View>
                      {e.locked && <Ionicons name="lock-closed" size={15} color={color.lime} />}
                      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={color.text3} />
                    </PressableScale>

                    {isOpen && (
                      <Animated.View entering={reduce ? undefined : FadeIn.duration(200)} style={styles.exBody}>
                        <View style={styles.rowWrap}>
                          <Stepper label="Sets" value={e.sets} min={1} max={10} onChange={(v) => patchExercise(i, { sets: v })} />
                          <Stepper label="Rest" value={e.restSec} step={15} min={15} max={600} format={restLabel} onChange={(v) => patchExercise(i, { restSec: v })} />
                        </View>
                        <View style={styles.rowWrap}>
                          <Stepper label={timed ? 'Seconds from' : 'Reps from'} value={e.repLow} step={timed ? 5 : 1} min={1} max={e.repHigh} onChange={(v) => patchExercise(i, { repLow: v })} />
                          <Stepper label={timed ? 'Seconds to' : 'Reps to'} value={e.repHigh} step={timed ? 5 : 1} min={e.repLow} max={timed ? 600 : 50} onChange={(v) => patchExercise(i, { repHigh: v })} />
                        </View>
                        {!timed && (
                          <View style={styles.rowWrap}>
                            <View style={styles.weightBox}>
                              <T v="label">Starting weight</T>
                              <View style={styles.weightRow}>
                                <TextInput
                                  defaultValue={e.targetKg ? String(e.targetKg) : ''} keyboardType="decimal-pad" placeholder="optional" placeholderTextColor={color.text3}
                                  style={styles.weightInput} accessibilityLabel={`Starting weight for ${e.name}`}
                                  onEndEditing={(ev) => { const v = Number(ev.nativeEvent.text.replace(',', '.')); patchExercise(i, { targetKg: v > 0 ? v : undefined }); }}
                                />
                                <T v="small">kg</T>
                              </View>
                            </View>
                            <Stepper label="Weight jump" value={e.stepKg} step={e.stepKg >= 2.5 ? 2.5 : e.stepKg >= 1 ? 0.25 : 0.5} min={0} max={10} unit="kg" format={(n) => fmtKg(n)} onChange={(v) => patchExercise(i, { stepKg: v })} />
                          </View>
                        )}
                        {!timed && <T v="small" style={{ color: color.text3 }}>Starting weight is used the first time you log this lift. After that the app follows what you actually lifted.</T>}
                        <View style={styles.rowWrap}>
                          <IconBtn icon="arrow-up" label="Move up" disabled={i === 0} onPress={() => setExercises(moveExercise(day.exercises, i, i - 1))} />
                          <IconBtn icon="arrow-down" label="Move down" disabled={i === day.exercises.length - 1} onPress={() => setExercises(moveExercise(day.exercises, i, i + 1))} />
                          <IconBtn icon="swap-horizontal" label="Replace" onPress={() => setPicker({ mode: 'replace', index: i })} />
                          {def && <IconBtn icon="book-outline" label="How to" onPress={() => router.push({ pathname: '/exercise', params: { name: e.name } })} />}
                          <IconBtn icon={e.locked ? 'lock-closed' : 'lock-open-outline'} label={e.locked ? 'Locked' : 'Lock'} active={!!e.locked} onPress={() => patchExercise(i, { locked: !e.locked })} />
                          <IconBtn icon="trash-outline" label="Remove" onPress={() => { setExercises(day.exercises.filter((_, k) => k !== i), `${e.name} removed`); setOpen(null); }} />
                        </View>
                        {e.locked && <T v="small">Locked exercises are kept when this day is rebuilt.</T>}
                      </Animated.View>
                    )}
                  </View>
                  {i < day.exercises.length - 1 && (
                    <PressableScale onPress={() => { setExercises(toggleSuperset(day.exercises, i)); haptic.select(); }} style={[styles.link, linkedNext && styles.linkOn]} accessibilityLabel={linkedNext ? `Unlink superset between ${e.name} and ${day.exercises[i + 1].name}` : `Superset ${e.name} with ${day.exercises[i + 1].name}`}>
                      <Ionicons name={linkedNext ? 'link' : 'add'} size={12} color={linkedNext ? color.limeInk : color.text3} />
                      <T style={[styles.linkText, linkedNext && { color: color.limeInk }]}>{linkedNext ? 'Superset' : 'Superset'}</T>
                    </PressableScale>
                  )}
                </Animated.View>
              );
            })}

            <PressableScale style={styles.add} onPress={() => setPicker({ mode: 'add' })} accessibilityLabel="Add exercise">
              <Ionicons name="add" size={20} color={color.lime} />
              <T v="bodyMed" style={{ color: color.lime }}>Add exercise</T>
            </PressableScale>
          </>
        )}

        {/* Regenerate week */}
        {plan.length > 0 && (
          <View style={[styles.card, { marginTop: space.md }]}>
            <T v="h2">Regenerate the week</T>
            <T v="small">
              Builds fresh suggestions for every unlocked day from your goal, experience and session length.
              {lockedDays || lockedEx ? ` ${lockedDays} locked day${lockedDays === 1 ? '' : 's'} and ${lockedEx} locked exercise${lockedEx === 1 ? '' : 's'} stay as they are.` : ' Lock any day or exercise you want to keep first.'}
            </T>
            {!confirmRegen ? (
              <Pill label="Regenerate unlocked days" onPress={() => setConfirmRegen(true)} style={{ opacity: plan.every((d) => d.locked) ? 0.4 : 1 }} />
            ) : (
              <View style={styles.rowWrap}>
                <Pill solid label="Yes, regenerate" onPress={regenerate} />
                <Pill label="Cancel" onPress={() => setConfirmRegen(false)} />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {undo && (
        <Animated.View entering={reduce ? undefined : FadeInDown} style={[styles.undo, { bottom: insets.bottom + space.lg }]}>
          <T v="bodyMed" style={{ flex: 1 }} numberOfLines={1}>{undo.what}</T>
          <Pill small solid label="Undo" onPress={() => { actions.setPlan(undo.plan); setUndo(null); haptic.tap(); }} />
          <PressableScale style={styles.icon} onPress={() => setUndo(null)} accessibilityLabel="Dismiss">
            <Ionicons name="close" size={16} color={color.text2} />
          </PressableScale>
        </Animated.View>
      )}

      <ExercisePicker
        visible={!!picker}
        onClose={() => setPicker(null)}
        replaceFor={picker?.mode === 'replace' && day ? day.exercises[picker.index]?.name : undefined}
        exclude={day?.exercises.map((e) => e.name) ?? []}
        onPick={(ex) => {
          if (!day || !picker) return;
          const fresh = plannedFrom(ex, goal, prefs.experience);
          if (picker.mode === 'add') { setExercises([...day.exercises, fresh]); setOpen(ex.name); }
          else {
            // Keep the sets, reps and rest the user already tuned; only the movement changes.
            const old = day.exercises[picker.index];
            setExercises(day.exercises.map((e, k) => (k === picker.index ? { ...old, name: ex.name, stepKg: fresh.stepKg, targetKg: undefined } : e)), `${old.name} replaced`);
            setOpen(ex.name);
          }
          haptic.success();
        }}
      />
    </View>
  );
}

function IconBtn({ icon, label, onPress, disabled, active }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} style={[styles.iconBtn, active && { backgroundColor: color.limeDim }, disabled && { opacity: 0.35 }]} accessibilityLabel={label}>
      <Ionicons name={icon} size={17} color={active ? color.lime : color.text} />
      <T style={[styles.iconBtnText, active && { color: color.lime }]}>{label}</T>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.sm },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  week: { flexDirection: 'row', gap: 5 },
  dayChip: {
    flex: 1, minHeight: 86, paddingVertical: 8, paddingHorizontal: 2, borderRadius: radius.md, alignItems: 'center', gap: 4,
    backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  dayOn: { backgroundColor: color.lime, borderColor: color.lime },
  dayDow: { fontFamily: font.bodySemi, fontSize: 11, color: color.text3, textTransform: 'uppercase', letterSpacing: 0.6 },
  daySplit: { fontFamily: font.displaySemi, fontSize: 12.5, lineHeight: 14, color: color.text, textAlign: 'center', maxWidth: '100%' },
  dayIcons: { flexDirection: 'row', gap: 3, marginTop: 'auto' },
  card: { padding: space.lg, borderRadius: radius.lg, backgroundColor: color.card, gap: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  warn: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: 'rgba(255,194,74,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,194,74,0.4)' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  nameInput: { fontFamily: font.display, fontSize: 30, lineHeight: 34, color: color.text, padding: 0, marginTop: -6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, minHeight: 34, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  chipOn: { backgroundColor: color.lime, borderColor: color.lime },
  chipText: { fontFamily: font.bodySemi, fontSize: 13, color: color.text },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moveRow: { flexDirection: 'row', gap: 6 },
  move: { flex: 1, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  moveOn: { backgroundColor: color.lime },
  moveText: { fontFamily: font.bodySemi, fontSize: 13, color: color.text },
  moveDot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: color.text3 },
  exCard: { borderRadius: radius.lg, backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong, overflow: 'hidden' },
  exLinked: { borderColor: 'rgba(200,255,80,0.45)' },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  badgeText: { fontFamily: font.displaySemi, fontSize: 15, color: color.text },
  exBody: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  weightBox: { gap: 6, flexGrow: 1, flexBasis: 140 },
  weightRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 46, paddingHorizontal: 14, borderRadius: radius.pill,
    backgroundColor: color.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  weightInput: { flex: 1, minWidth: 0, color: color.text, fontFamily: font.display, fontSize: 20, height: '100%' },
  iconBtn: { flexGrow: 1, minWidth: 58, alignItems: 'center', gap: 3, paddingVertical: 9, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.05)' },
  iconBtnText: { fontFamily: font.bodySemi, fontSize: 10.5, color: color.text2 },
  link: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 22, marginVertical: 3, borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  linkOn: { backgroundColor: color.lime },
  linkText: { fontFamily: font.bodySemi, fontSize: 10.5, color: color.text3, letterSpacing: 0.4, textTransform: 'uppercase' },
  add: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 54, borderRadius: radius.lg,
    borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(200,255,80,0.4)',
  },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  undo: {
    position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, paddingLeft: space.lg,
    borderRadius: radius.pill, backgroundColor: color.cardHi, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
});
