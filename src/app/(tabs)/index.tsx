import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { MuscleMapWidget, TodayRingsWidget } from '@/components/dashboard/HeroWidgets';
import { MacrosWidget } from '@/components/dashboard/NutritionWidgets';
import { ChallengesWidget, ConsistencyWidget, HydrationWidget, SupplementsWidget, WorkoutWidget } from '@/components/dashboard/DailyWidgets';
import { SampleBanner } from '@/components/SampleBanner';
import { Welcome } from '@/components/Welcome';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { longDate, today } from '@/domain/dates';
import type { WidgetId } from '@/domain/types';
import { useDaySummary } from '@/store/selectors';
import { useApp } from '@/store/store';
import { Columns } from '@/components/ui/Columns';
import { useLayout } from '@/theme/layout';
import { color, radius, space } from '@/theme/tokens';

const WIDGETS: Record<WidgetId, typeof MacrosWidget> = {
  calories: TodayRingsWidget, body: MuscleMapWidget, macros: MacrosWidget, hydration: HydrationWidget, workout: WorkoutWidget,
  challenges: ChallengesWidget, supplements: SupplementsWidget, consistency: ConsistencyWidget,
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function Home() {
  const s = useDaySummary(today());
  const dash = useApp((st) => st.dashboard);
  const name = useApp((st) => st.profile?.name);
  const L = useLayout();
  if (!s) return <Welcome />;
  const visible = dash.order.filter((id) => !dash.hidden.includes(id));
  const hero = visible.includes('calories');
  const sideCard = visible.includes('workout');
  const rest = visible.filter((id) => id !== 'calories' && id !== 'workout');
  const render = (id: WidgetId, i: number) => { const W = WIDGETS[id]; return <View key={id}><W s={s} index={i} /></View>; };
  return (
    <Screen
      eyebrow={longDate(s.date)}
      title={name ? `${greeting()}, ${name.split(' ')[0]}` : greeting()}
      right={
        <PressableScale style={styles.iconBtn} onPress={() => router.push('/customize')} accessibilityLabel="Customize dashboard">
          <Ionicons name="options-outline" size={20} color={color.text} />
        </PressableScale>
      }
    >
      <SampleBanner />
      {L.compact ? visible.map((id, i) => render(id, i)) : (
        <>
          {/* Wide screens: today's numbers lead, the workout sits beside them, everything else fills a grid. */}
          {(hero || sideCard) && (
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'stretch' }}>
              {hero && <View style={{ flex: L.cols >= 3 ? 1.7 : 1.25, minWidth: 0 }}>{render('calories', 0)}</View>}
              {sideCard && <View style={{ flex: 1, minWidth: 0 }}>{render('workout', 1)}</View>}
            </View>
          )}
          <Columns cols={L.cols}>{rest.map((id, i) => render(id, i + 2))}</Columns>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
});
