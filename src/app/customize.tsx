import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { T } from '@/components/ui/T';
import { ALL_WIDGETS, DEFAULT_DASHBOARD } from '@/domain/defaults';
import type { WidgetId } from '@/domain/types';
import { actions, useApp } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';

/** Reorder, hide and tune dashboard widgets. Saved per user. */
export default function Customize() {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const dash = useApp((s) => s.dashboard);
  const [water, setWater] = useState(dash.waterQuick.join(', '));

  const move = (id: WidgetId, d: -1 | 1) => {
    const order = [...dash.order];
    const i = order.indexOf(id), j = i + d;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    actions.setDashboard({ ...dash, order });
  };
  const toggle = (id: WidgetId) =>
    actions.setDashboard({ ...dash, hidden: dash.hidden.includes(id) ? dash.hidden.filter((x) => x !== id) : [...dash.hidden, id] });
  const saveWater = () => {
    const vals = water.split(/[,\s]+/).map(Number).filter((n) => n > 0 && n <= 2000).slice(0, 4);
    if (vals.length) actions.setDashboard({ ...dash, waterQuick: vals });
    setWater((vals.length ? vals : dash.waterQuick).join(', '));
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg2 }}>
      <View style={[styles.head, { paddingTop: insets.top > 30 ? space.lg : insets.top + space.lg }]}>
        <T v="title">Customize</T>
        <PressableScale style={styles.close} onPress={() => router.back()} accessibilityLabel="Close">
          <Ionicons name="close" size={22} color={color.text} />
        </PressableScale>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: insets.bottom + 40 }}>
        <T v="label">Widgets · order and visibility</T>
        {dash.order.map((id, i) => {
          const w = ALL_WIDGETS.find((x) => x.id === id)!;
          const hidden = dash.hidden.includes(id);
          return (
            <Animated.View key={id} layout={reduce ? undefined : LinearTransition.springify().damping(18)}>
              <View style={[styles.row, hidden && { opacity: 0.5 }]}>
                <View style={{ flex: 1 }}>
                  <T v="bodyMed">{w.label}</T>
                  <T v="small">{w.desc}</T>
                </View>
                <PressableScale style={styles.icon} onPress={() => move(id, -1)} disabled={i === 0} accessibilityLabel={`Move ${w.label} up`}>
                  <Ionicons name="arrow-up" size={18} color={i === 0 ? color.text3 : color.text} />
                </PressableScale>
                <PressableScale style={styles.icon} onPress={() => move(id, 1)} disabled={i === dash.order.length - 1} accessibilityLabel={`Move ${w.label} down`}>
                  <Ionicons name="arrow-down" size={18} color={i === dash.order.length - 1 ? color.text3 : color.text} />
                </PressableScale>
                <PressableScale style={[styles.icon, !hidden && { backgroundColor: color.limeDim }]} onPress={() => toggle(id)} accessibilityLabel={hidden ? `Show ${w.label}` : `Hide ${w.label}`}>
                  <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={18} color={hidden ? color.text3 : color.lime} />
                </PressableScale>
              </View>
            </Animated.View>
          );
        })}
        <Card style={{ marginTop: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <T v="bodyMed">3D visuals</T>
              <T v="small">Turn off for flat 2D rings and a lighter battery load on older phones.</T>
            </View>
            <Pill small solid={dash.visuals3d} label={dash.visuals3d ? 'On' : 'Off'} onPress={() => actions.setDashboard({ ...dash, visuals3d: !dash.visuals3d })} accessibilityLabel="Toggle 3D visuals" />
          </View>
        </Card>
        <Card>
          <T v="label">Water quick-add buttons (ml)</T>
          <TextInput
            value={water} onChangeText={setWater} onBlur={saveWater} onSubmitEditing={saveWater}
            style={styles.input} keyboardType="numbers-and-punctuation" accessibilityLabel="Water quick-add amounts"
          />
          <T v="small">Up to four amounts, separated by commas.</T>
        </Card>
        <Pill label="Reset to default layout" onPress={() => { actions.setDashboard(DEFAULT_DASHBOARD); setWater(DEFAULT_DASHBOARD.waterQuick.join(', ')); }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.sm },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.card },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: space.md, borderRadius: radius.md,
    backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  input: {
    marginVertical: space.sm, height: 44, paddingHorizontal: 14, borderRadius: radius.sm, backgroundColor: color.bg2,
    color: color.text, fontFamily: font.bodySemi, fontSize: 16,
  },
});
