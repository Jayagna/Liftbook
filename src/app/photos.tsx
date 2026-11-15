// Progress photos: add a still photo, look back through them by day, and compare two days side by side.
// Images are kept on this phone only (see store/photoFiles). They are never uploaded and are not in the backup file.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoImage } from '@/components/photos/PhotoImage';
import { SampleBanner } from '@/components/SampleBanner';
import { Aurora } from '@/components/ui/Aurora';
import { Card, CardHeader } from '@/components/ui/Card';
import { Choice } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { T } from '@/components/ui/T';
import { addDays, daysBetween, parseISO, today } from '@/domain/dates';
import { byDate, comparablePoses, poseLabel, POSES, poseTimeline } from '@/domain/photos';
import type { DayLog, ISODate, PhotoPose, ProgressPhoto } from '@/domain/types';
import { haptic } from '@/hooks/haptics';
import { pickPhoto } from '@/hooks/pickPhoto';
import { deletePhoto, savePhoto } from '@/store/photoFiles';
import { actions, useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

const back = () => (router.canGoBack() ? router.back() : router.replace('/progress'));
/** "12 Nov", with the year added once it is not this year. */
const when = (d: ISODate) => parseISO(d).toLocaleDateString(undefined, {
  day: 'numeric', month: 'short', year: d.slice(0, 4) === today().slice(0, 4) ? undefined : 'numeric',
});
const weekday = (d: ISODate) => parseISO(d).toLocaleDateString(undefined, { weekday: 'short' });
const kg = (n: number) => `${Math.round(n * 10) / 10} kg`;

export default function Photos() {
  const insets = useSafeAreaInsets();
  const photos = useApp((s) => s.photos);
  const days = useApp((s) => s.days);
  const isSample = useApp((s) => s.isSample);
  const [pose, setPose] = useState<PhotoPose>('front');
  const [date, setDate] = useState<ISODate>(today());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState<ProgressPhoto | null>(null);
  const groups = byDate(photos);

  const add = async (from: 'camera' | 'library') => {
    if (busy) return;
    setMsg(null);
    try {
      const picked = await pickPhoto(from);
      if (picked === 'cancelled') return;
      if (picked === 'denied') {
        setMsg('Camera access is off for Liftbook. Turn it on in your phone settings, or choose a photo from your library instead.');
        return;
      }
      setBusy(true);
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const size = await savePhoto(id, picked.uri, picked.w, picked.h);
      actions.addPhoto({ id, date, pose, w: size.w, h: size.h, at: Date.now() });
      haptic.success();
    } catch {
      setMsg('That photo could not be saved. The file may not be a photo, or storage for this app may be full.');
    } finally {
      setBusy(false);
    }
  };

  const remove = (p: ProgressPhoto) => {
    actions.removePhoto(p.id);
    deletePhoto(p.id).catch(() => {});
    setOpen(null);
  };

  return (
    <View style={styles.root}>
      <Aurora />
      <View style={[styles.top, { paddingTop: insets.top + space.md }]}>
        <PressableScale style={styles.round} onPress={back} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={color.text} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <T v="label" style={{ color: color.lime }}>{photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'}` : 'See the change'}</T>
          <T v="title">Progress photos</T>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: insets.bottom + 40, gap: space.md }} showsVerticalScrollIndicator={false}>
        <SampleBanner />
        <View style={styles.private}>
          <Ionicons name="lock-closed" size={16} color={color.lime} />
          <T v="small" style={{ flex: 1 }}>Photos stay on this phone. They are not uploaded anywhere, and they are not part of your backup file, so removing the app removes them.</T>
        </View>

        {isSample ? (
          <Card><T v="small">The sample has no photos, because made-up ones would not mean anything. Exit the sample to add your own.</T></Card>
        ) : (
          <Card index={0}>
            <CardHeader title="Add a photo" />
            <View style={{ gap: space.md }}>
              <Choice<PhotoPose> label="Angle" options={POSES} value={pose} onChange={setPose} />
              <View style={{ gap: space.sm }}>
                <T v="label">Taken on</T>
                <View style={styles.dateRow}>
                  <PressableScale style={styles.step} onPress={() => setDate(addDays(date, -1))} accessibilityLabel="Day before">
                    <Ionicons name="chevron-back" size={18} color={color.text} />
                  </PressableScale>
                  <T v="bodyMed" style={{ flex: 1, textAlign: 'center' }} accessibilityLiveRegion="polite">{date === today() ? `Today, ${when(date)}` : `${weekday(date)}, ${when(date)}`}</T>
                  <PressableScale style={[styles.step, date >= today() && styles.off]} disabled={date >= today()} onPress={() => setDate(addDays(date, 1))} accessibilityLabel="Day after">
                    <Ionicons name="chevron-forward" size={18} color={color.text} />
                  </PressableScale>
                </View>
              </View>
              <View style={styles.actions}>
                <PressableScale style={[styles.action, styles.actionMain]} onPress={() => add('camera')} disabled={busy} accessibilityLabel="Take photo">
                  <Ionicons name="camera" size={18} color={color.limeInk} />
                  <T style={[styles.actionText, { color: color.limeInk }]}>Take photo</T>
                </PressableScale>
                <PressableScale style={styles.action} onPress={() => add('library')} disabled={busy} accessibilityLabel="Choose from library">
                  <Ionicons name="images" size={18} color={color.text} />
                  <T style={styles.actionText}>From library</T>
                </PressableScale>
              </View>
              {busy && <View style={styles.busy}><ActivityIndicator color={color.lime} /><T v="small">Saving on this phone…</T></View>}
              {msg && <T v="small" style={{ color: color.warn }} accessibilityRole="alert">{msg}</T>}
              <T v="small">Same spot, same light and the same time of day make a change much easier to see.</T>
            </View>
          </Card>
        )}

        {!isSample && <Compare photos={photos} days={days} />}

        {!isSample && groups.length === 0 && (
          <T v="small" style={{ textAlign: 'center', paddingVertical: space.lg }}>No photos yet. Add one today and another in a few weeks to compare them here.</T>
        )}
        {!isSample && groups.map((g) => (
          <View key={g.date} style={{ gap: space.sm }}>
            <T v="label">{when(g.date)}{days[g.date]?.bw ? `  ·  ${kg(days[g.date].bw as number)}` : ''}</T>
            <View style={styles.grid}>
              {g.items.map((p) => (
                <PressableScale key={p.id} scaleTo={0.98} style={styles.thumb} onPress={() => setOpen(p)} accessibilityLabel={`${poseLabel(p.pose)} photo, ${when(p.date)}, open`}>
                  <PhotoImage id={p.id} label={`${poseLabel(p.pose)} photo from ${when(p.date)}`} style={StyleSheet.absoluteFill} compact />
                  <View style={styles.badge}><T style={styles.badgeText}>{poseLabel(p.pose)}</T></View>
                </PressableScale>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Viewer photo={open} bw={open ? days[open.date]?.bw ?? null : null} onClose={() => setOpen(null)} onDelete={remove} />
    </View>
  );
}

/** Two days of the same angle side by side. The left one is always the earlier day. */
function Compare({ photos, days }: { photos: ProgressPhoto[]; days: Record<ISODate, DayLog> }) {
  const poses = comparablePoses(photos);
  const [pose, setPose] = useState<PhotoPose | null>(null);
  const [pick, setPick] = useState<{ a: ISODate | null; b: ISODate | null }>({ a: null, b: null });
  const cur = pose && poses.includes(pose) ? pose : poses[0];
  if (!cur) return null;
  const line = poseTimeline(photos, cur);
  const last = line.length - 1;
  let bi = line.findIndex((p) => p.date === pick.b);
  if (bi < 1) bi = last;
  let ai = line.findIndex((p) => p.date === pick.a);
  if (ai < 0 || ai >= bi) ai = pick.a && ai >= bi ? bi - 1 : 0;
  const a = line[ai], b = line[bi];
  const gap = daysBetween(a.date, b.date);
  const wa = days[a.date]?.bw, wb = days[b.date]?.bw;
  const diff = wa && wb ? Math.round((wb - wa) * 10) / 10 : null;

  return (
    <Card index={1}>
      <CardHeader title="Compare" right={<T v="small">{gap} day{gap === 1 ? '' : 's'} apart</T>} />
      {poses.length > 1 && (
        <View style={styles.posePills}>
          {poses.map((p) => <Pill key={p} small label={poseLabel(p)} solid={p === cur} onPress={() => { setPose(p); setPick({ a: null, b: null }); }} />)}
        </View>
      )}
      <View style={styles.pair}>
        <Side tag="Earlier" photo={a} bw={wa ?? null}
          onPrev={ai > 0 ? () => setPick({ a: line[ai - 1].date, b: b.date }) : null}
          onNext={ai < bi - 1 ? () => setPick({ a: line[ai + 1].date, b: b.date }) : null} />
        <Side tag="Later" photo={b} bw={wb ?? null}
          onPrev={bi > ai + 1 ? () => setPick({ a: a.date, b: line[bi - 1].date }) : null}
          onNext={bi < last ? () => setPick({ a: a.date, b: line[bi + 1].date }) : null} />
      </View>
      <T v="small" style={{ marginTop: space.sm }}>
        {diff == null ? 'Weigh in on photo days and the change in weight shows here too.'
          : diff === 0 ? 'Same weight on both days.'
          : `${kg(Math.abs(diff))} ${diff < 0 ? 'lighter' : 'heavier'} on the later day.`}
      </T>
    </Card>
  );
}

function Side({ tag, photo, bw, onPrev, onNext }: { tag: string; photo: ProgressPhoto; bw: number | null; onPrev: (() => void) | null; onNext: (() => void) | null }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <PhotoImage id={photo.id} label={`${tag} ${poseLabel(photo.pose).toLowerCase()} photo, ${when(photo.date)}`} style={styles.cmp} />
      <View style={styles.sideRow}>
        <PressableScale style={[styles.stepSm, !onPrev && styles.off]} disabled={!onPrev} onPress={onPrev ?? undefined} accessibilityLabel={`${tag} photo: earlier day`}>
          <Ionicons name="chevron-back" size={15} color={color.text} />
        </PressableScale>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <T v="bodyMed" style={{ fontSize: 13, lineHeight: 17 }} numberOfLines={1}>{when(photo.date)}</T>
          <T v="small" style={{ fontSize: 11.5, lineHeight: 15 }} numberOfLines={1}>{bw ? kg(bw) : 'No weigh-in'}</T>
        </View>
        <PressableScale style={[styles.stepSm, !onNext && styles.off]} disabled={!onNext} onPress={onNext ?? undefined} accessibilityLabel={`${tag} photo: later day`}>
          <Ionicons name="chevron-forward" size={15} color={color.text} />
        </PressableScale>
      </View>
    </View>
  );
}

/** Full-screen look at one photo, with a two-step delete so a stray tap cannot remove it. */
function Viewer({ photo, bw, onClose, onDelete }: { photo: ProgressPhoto | null; bw: number | null; onClose: () => void; onDelete: (p: ProgressPhoto) => void }) {
  const insets = useSafeAreaInsets();
  const [sure, setSure] = useState(false);
  const close = () => { setSure(false); onClose(); };
  return (
    <Modal visible={!!photo} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      {photo && (
        <View style={[styles.viewer, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.viewerTop}>
            <View style={{ flex: 1 }}>
              <T v="label" style={{ color: color.lime }}>{poseLabel(photo.pose)}</T>
              <T v="title" style={{ fontSize: 24, lineHeight: 26 }}>{weekday(photo.date)}, {when(photo.date)}{bw ? `  ·  ${kg(bw)}` : ''}</T>
            </View>
            <PressableScale style={styles.round} onPress={close} accessibilityLabel="Close photo">
              <Ionicons name="close" size={22} color={color.text} />
            </PressableScale>
          </View>
          <PhotoImage id={photo.id} label={`${poseLabel(photo.pose)} photo from ${when(photo.date)}`} fit="contain" style={styles.full} />
          {sure ? (
            <View style={{ gap: space.sm }}>
              <T v="small" style={{ textAlign: 'center' }}>Delete this photo from this phone? This cannot be undone.</T>
              <View style={styles.actions}>
                <PressableScale style={[styles.action, { backgroundColor: color.danger, borderColor: color.danger }]} onPress={() => { setSure(false); onDelete(photo); }} accessibilityLabel="Delete photo for good">
                  <T style={[styles.actionText, { color: color.bg }]}>Delete</T>
                </PressableScale>
                <PressableScale style={styles.action} onPress={() => setSure(false)} accessibilityLabel="Keep photo">
                  <T style={styles.actionText}>Keep</T>
                </PressableScale>
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <PressableScale style={styles.action} onPress={() => setSure(true)} accessibilityLabel="Delete photo">
                <Ionicons name="trash-outline" size={18} color={color.danger} />
                <T style={[styles.actionText, { color: color.danger }]}>Delete photo</T>
              </PressableScale>
            </View>
          )}
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  private: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, padding: space.md, borderRadius: radius.md,
    backgroundColor: color.limeDim, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(200,255,80,0.3)',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  step: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  stepSm: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
  off: { opacity: 0.3 },
  actions: { flexDirection: 'row', gap: space.sm },
  action: {
    flex: 1, height: 52, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  actionMain: { backgroundColor: color.lime, borderColor: color.lime },
  actionText: { fontFamily: font.bodySemi, fontSize: 15, color: color.text },
  busy: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  posePills: { flexDirection: 'row', gap: 8, marginBottom: space.md },
  pair: { flexDirection: 'row', gap: space.sm },
  cmp: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md },
  sideRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  thumb: { width: '31.5%', aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden', backgroundColor: color.bg2 },
  badge: { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 8, height: 22, borderRadius: 11, justifyContent: 'center', backgroundColor: 'rgba(13,16,16,0.72)' },
  badgeText: { fontFamily: font.bodySemi, fontSize: 11, color: color.text },
  viewer: { flex: 1, backgroundColor: '#080A0A', paddingHorizontal: space.lg, gap: space.md },
  viewerTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  full: { flex: 1, borderRadius: radius.md, backgroundColor: 'transparent' },
});
