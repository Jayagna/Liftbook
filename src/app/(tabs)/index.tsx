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
import { color, radius } from '@/theme/tokens';

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
  if (!s) return <Welcome />;
  const visible = dash.order.filter((id) => !dash.hidden.includes(id));
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
      {visible.map((id, i) => {
        const W = WIDGETS[id];
        return <View key={id}><W s={s} index={i} /></View>;
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong,
  },
});
